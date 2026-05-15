import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ContentBlockParam,
  TextBlockParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages/messages.js";
import type {
  AgentMessage,
  AgentProviderMessage,
  AgentSSEEvent,
  AgentToolCall,
} from "@crm/shared";
import type { BackendClient } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";
import {
  createPendingAction,
  executeReadOrCreateTool,
  getAnthropicTools,
  isGatedTool,
} from "../tools/registry.js";

const TOOL_PRESENT_TENSE: Record<string, string> = {
  search: "Searching CRM",
  get_dashboard: "Loading dashboard",
  list_companies: "Listing companies",
  get_company: "Loading company",
  get_deals_overview: "Loading pipeline overview",
  get_deal_detail: "Loading deal details",
  list_tasks: "Loading tasks",
  list_events: "Loading recent events",
  list_contacts: "Loading contacts",
  list_pipelines: "Loading pipelines",
  create_activity: "Logging activity",
  create_task: "Creating task",
  create_note: "Creating note",
  create_company: "Creating company",
  create_contact: "Creating contact",
  create_deal: "Creating deal",
  update_deal: "Updating deal",
  update_task: "Updating task",
  update_company: "Updating company",
  list_tags: "Loading tags",
  add_tag_to_company: "Adding tag",
  remove_tag_from_company: "Removing tag",
};

function toolLabel(name: string): string {
  return `${TOOL_PRESENT_TENSE[name] ?? `Running ${name}`}…`;
}

export interface RunAgentLoopParams {
  client: Anthropic;
  model: string;
  maxOutputTokens: number;
  systemPrompt: string;
  history: AgentProviderMessage[];
  userMessage?: string;
  conversationId: string;
  backendClient: BackendClient;
  maxTurns: number;
  maxToolCalls: number;
  abortSignal?: AbortSignal;
  emit: (event: AgentSSEEvent) => void;
}

export interface RunAgentLoopResult {
  inputTokens: number;
  outputTokens: number;
  /** True if the loop paused awaiting user confirmation on a gated tool call. */
  paused: boolean;
}

/**
 * Run the agent loop against Anthropic.
 *
 * Persistence is incremental: after every assistant turn we append the new
 * provider messages to the backend. If the model calls a confirmation-gated
 * tool, we persist the assistant turn (with the tool_use block) but do NOT
 * persist a tool_result. The loop pauses; the approval endpoint will later
 * append the real tool_result. The next call to runAgentLoop (with no new
 * user message) will pick up the completed history.
 */
export async function runAgentLoop(
  params: RunAgentLoopParams,
): Promise<RunAgentLoopResult> {
  const tools = getAnthropicTools();
  const apiMessages = historyToApiMessages(params.history);

  if (params.userMessage) {
    apiMessages.push({ role: "user", content: params.userMessage });
    await params.backendClient.appendAgentConversation(params.conversationId, {
      messages: [
        {
          role: "user",
          content: params.userMessage,
          createdAt: new Date().toISOString(),
        },
      ],
      providerMessages: [{ role: "user", content: params.userMessage }],
      inputTokens: 0,
      outputTokens: 0,
    });
  }

  const systemBlocks: TextBlockParam[] = [
    {
      type: "text",
      text: params.systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalToolCalls = 0;

  for (let turn = 0; turn < params.maxTurns; turn++) {
    if (params.abortSignal?.aborted) break;

    const stream = params.client.messages.stream({
      model: params.model,
      system: systemBlocks,
      messages: apiMessages,
      tools,
      max_tokens: params.maxOutputTokens,
    });

    if (params.abortSignal) {
      params.abortSignal.addEventListener("abort", () => stream.abort(), { once: true });
    }

    stream.on("text", (delta) => params.emit({ type: "text_delta", delta }));
    stream.on("streamEvent", (event) => {
      if (
        event.type === "content_block_start" &&
        event.content_block.type === "tool_use"
      ) {
        params.emit({
          type: "tool_start",
          tool: event.content_block.name,
          description: toolLabel(event.content_block.name),
        });
      }
    });

    const finalMessage = await stream.finalMessage();
    totalInputTokens += finalMessage.usage.input_tokens;
    totalOutputTokens += finalMessage.usage.output_tokens;

    // Extract text + tool_use blocks from the final message.
    let assistantText = "";
    const toolUses: AgentToolCall[] = [];
    for (const block of finalMessage.content) {
      if (block.type === "text") {
        assistantText += block.text;
      } else if (block.type === "tool_use") {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    // Append the assistant turn to the running API conversation.
    apiMessages.push({
      role: "assistant",
      content: finalMessage.content as ContentBlockParam[],
    });

    const assistantProviderMessage: AgentProviderMessage = {
      role: "assistant",
      content: assistantText,
      ...(toolUses.length ? { toolCalls: toolUses } : {}),
    };
    const assistantDisplayMessage: AgentMessage = {
      role: "assistant",
      content: assistantText,
      ...(toolUses.length ? { toolCalls: toolUses } : {}),
      createdAt: new Date().toISOString(),
    };

    // No tools → done.
    if (finalMessage.stop_reason !== "tool_use" || toolUses.length === 0) {
      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
      return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, paused: false };
    }

    // Resolve every tool_use in this turn.
    const hasGated = toolUses.some((t) => isGatedTool(t.name));
    const onlyOneGated = toolUses.length === 1 && hasGated;
    const toolResultBlocks: ToolResultBlockParam[] = [];
    const toolProviderMessages: AgentProviderMessage[] = [];
    let pausedForConfirmation = false;

    for (const toolUse of toolUses) {
      if (params.abortSignal?.aborted) break;
      totalToolCalls++;

      if (totalToolCalls > params.maxToolCalls) {
        logger.warn({ conversationId: params.conversationId }, "max tool calls reached");
        const errorContent = "Maximum number of tool calls reached. Respond with what you have.";
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: errorContent,
          is_error: true,
        });
        toolProviderMessages.push({
          role: "tool",
          toolUseId: toolUse.id,
          content: errorContent,
          isError: true,
        });
        continue;
      }

      // Gated tool combined with others → refuse and ask the model to retry alone.
      if (isGatedTool(toolUse.name) && !onlyOneGated) {
        const msg =
          "Confirmation-gated actions must be called alone. Please retry this tool call in a separate turn.";
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: msg,
          is_error: true,
        });
        toolProviderMessages.push({
          role: "tool",
          toolUseId: toolUse.id,
          content: msg,
          isError: true,
        });
        params.emit({ type: "tool_end", tool: toolUse.name });
        continue;
      }

      // Single gated tool → create pending action, persist assistant turn, pause.
      if (isGatedTool(toolUse.name) && onlyOneGated) {
        try {
          const action = await createPendingAction(
            params.backendClient,
            toolUse.name,
            toolUse.id,
            toolUse.input,
          );
          params.emit({ type: "tool_end", tool: toolUse.name });
          params.emit({ type: "confirmation_required", action });
        } catch (err) {
          logger.error({ err, tool: toolUse.name }, "failed to create pending action");
          params.emit({ type: "tool_end", tool: toolUse.name });
          params.emit({
            type: "error",
            message: "Failed to register confirmation prompt.",
          });
        }
        pausedForConfirmation = true;
        break;
      }

      // Non-gated tool → execute now.
      const result = await executeReadOrCreateTool(
        toolUse.name,
        toolUse.input,
        params.backendClient,
      );
      params.emit({ type: "tool_end", tool: toolUse.name });

      const content = result.success
        ? JSON.stringify(result.data)
        : JSON.stringify({ error: result.error });

      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content,
        is_error: !result.success,
      });
      toolProviderMessages.push({
        role: "tool",
        toolUseId: toolUse.id,
        content,
        isError: !result.success,
      });
    }

    if (pausedForConfirmation) {
      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
      return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, paused: true };
    }

    // Persist the assistant turn + every tool result for it as one batch.
    await params.backendClient.appendAgentConversation(params.conversationId, {
      messages: [assistantDisplayMessage],
      providerMessages: [assistantProviderMessage, ...toolProviderMessages],
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    });

    apiMessages.push({ role: "user", content: toolResultBlocks });

    if (totalToolCalls >= params.maxToolCalls) break;
  }

  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, paused: false };
}

/**
 * Convert persisted provider messages into Anthropic API messages, grouping
 * consecutive `tool` rows into a single user message of tool_result blocks
 * (required by the Anthropic API after an assistant turn that emitted tool_use).
 */
function historyToApiMessages(history: AgentProviderMessage[]): MessageParam[] {
  const out: MessageParam[] = [];
  let i = 0;
  while (i < history.length) {
    const msg = history[i];
    if (msg.role === "user") {
      out.push({ role: "user", content: msg.content });
      i++;
    } else if (msg.role === "assistant") {
      const content: ContentBlockParam[] = [];
      if (msg.content) content.push({ type: "text", text: msg.content });
      for (const tc of msg.toolCalls ?? []) {
        content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      }
      out.push({ role: "assistant", content });
      i++;
    } else {
      // Coalesce a run of `tool` rows into one user message of tool_results.
      const blocks: ToolResultBlockParam[] = [];
      while (i < history.length && history[i].role === "tool") {
        const t = history[i] as Extract<AgentProviderMessage, { role: "tool" }>;
        blocks.push({
          type: "tool_result",
          tool_use_id: t.toolUseId,
          content: t.content,
          is_error: t.isError,
        });
        i++;
      }
      if (blocks.length) out.push({ role: "user", content: blocks });
    }
  }
  return out;
}
