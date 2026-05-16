import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaContentBlockParam,
  BetaTextBlockParam,
  BetaToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/beta.js";
import type {
  AgentMessage,
  AgentProviderMessage,
  AgentRedactedThinkingBlock,
  AgentSSEEvent,
  AgentThinkingBlock,
  AgentToolCall,
} from "@crm/shared";
import type { BackendClient } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";
import {
  buildAnthropicTools,
  createPendingAction,
  executeTool,
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

function toolSummary(name: string, input: Record<string, unknown>): string {
  const str = (key: string) => (input[key] as string) ?? "";
  switch (name) {
    case "search":
      return `Searched for "${str("q")}"`;
    case "get_dashboard":
      return "Loaded dashboard";
    case "list_companies":
      return str("search") ? `Listed companies matching "${str("search")}"` : "Listed companies";
    case "get_company":
      return "Loaded company details";
    case "get_deals_overview":
      return "Loaded pipeline overview";
    case "get_deal_detail":
      return "Loaded deal details";
    case "list_tasks":
      return "Loaded tasks";
    case "list_events":
      return "Loaded recent events";
    case "list_contacts":
      return "Loaded contacts";
    case "list_pipelines":
      return "Loaded pipelines";
    case "create_activity":
      return `Logged activity: ${str("title")}`;
    case "create_task":
      return `Created task: ${str("title")}`;
    case "create_note":
      return `Created note: ${str("title")}`;
    case "create_company":
      return `Created company ${str("name")}`;
    case "create_contact":
      return `Created contact ${[str("firstName"), str("lastName")].filter(Boolean).join(" ")}`;
    case "create_deal":
      return `Created deal: ${str("title")}`;
    case "update_deal":
      return "Updated deal";
    case "update_task":
      return "Updated task";
    case "update_company":
      return "Updated company";
    case "list_tags":
      return "Loaded tags";
    case "add_tag_to_company":
      return "Added tag";
    case "remove_tag_from_company":
      return "Removed tag";
    default:
      return `Ran ${name}`;
  }
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
 * Run the agent loop with explicit ownership of the Anthropic transcript.
 *
 * Persistence is incremental: after every assistant turn we append the new
 * provider messages to the backend. If the model calls a tool that app policy
 * requires a user to approve, we persist the assistant turn (including the
 * tool_use and thinking blocks) but do not create a tool_result yet. The
 * approval endpoint later appends the real tool_result, and resume continues
 * from that exact Anthropic message history.
 */
export async function runAgentLoop(
  params: RunAgentLoopParams,
): Promise<RunAgentLoopResult> {
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

  const system: BetaTextBlockParam[] = [
    {
      type: "text",
      text: params.systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];

  const tools = buildAnthropicTools();

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let paused = false;

  for (let turn = 0; turn < params.maxTurns; turn++) {
    const stream = params.client.beta.messages.stream(
      {
        model: params.model,
        max_tokens: params.maxOutputTokens,
        system,
        messages: apiMessages,
        tools,
        // Adaptive thinking lets the model decide when to think. Thinking
        // blocks must be preserved across tool-use turns; historyToApiMessages
        // reconstructs them from providerPayload.
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
      },
      params.abortSignal ? { signal: params.abortSignal } : undefined,
    );

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
      } else if (
        event.type === "content_block_delta" &&
        event.delta.type === "thinking_delta"
      ) {
        params.emit({ type: "thinking_delta", delta: event.delta.thinking });
      }
    });

    const finalMessage = await stream.finalMessage();
    totalInputTokens += finalMessage.usage.input_tokens;
    totalOutputTokens += finalMessage.usage.output_tokens;

    let assistantText = "";
    const toolUses: AgentToolCall[] = [];
    const thinkingBlocks: AgentThinkingBlock[] = [];
    const redactedThinkingBlocks: AgentRedactedThinkingBlock[] = [];
    for (const block of finalMessage.content) {
      if (block.type === "text") {
        assistantText += block.text;
      } else if (block.type === "tool_use") {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      } else if (block.type === "thinking") {
        thinkingBlocks.push({
          thinking: block.thinking,
          signature: block.signature,
        });
      } else if (block.type === "redacted_thinking") {
        redactedThinkingBlocks.push({ data: block.data });
      }
    }

    const assistantProviderMessage: AgentProviderMessage = {
      role: "assistant",
      content: assistantText,
      ...(toolUses.length ? { toolCalls: toolUses } : {}),
      ...(thinkingBlocks.length ? { thinkingBlocks } : {}),
      ...(redactedThinkingBlocks.length ? { redactedThinkingBlocks } : {}),
    };
    const assistantDisplayMessage: AgentMessage = {
      role: "assistant",
      content: assistantText,
      ...(toolUses.length ? { toolCalls: toolUses } : {}),
      createdAt: new Date().toISOString(),
    };
    const assistantApiMessage = historyToApiMessages([assistantProviderMessage])[0];

    if (toolUses.length === 0) {
      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
      break;
    }

    const gatedToolUses = toolUses.filter((t) => isGatedTool(t.name));

    // A paused Anthropic transcript can only resume cleanly once every
    // tool_use from this assistant message has a corresponding tool_result.
    // The current approval UI/API is single-action oriented, so keep the
    // transcript valid by rejecting multi-tool batches and letting the model
    // retry as separate tool requests.
    if (gatedToolUses.length > 0 && toolUses.length > 1) {
      const errorBlocks: BetaToolResultBlockParam[] = toolUses.map((t) => ({
        type: "tool_result",
        tool_use_id: t.id,
        content: "This multi-tool request was not executed. Please retry the requested actions one at a time.",
        is_error: true,
      }));
      const toolProviderMessages: AgentProviderMessage[] = toolUses.map(
        (t, i) => ({
          role: "tool",
          toolUseId: t.id,
          content: errorBlocks[i].content as string,
          isError: true,
        }),
      );
      for (const t of toolUses) params.emit({ type: "tool_end", tool: t.name, summary: toolSummary(t.name, t.input) });

      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage, ...toolProviderMessages],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });

      apiMessages.push(assistantApiMessage, { role: "user", content: errorBlocks });
      continue;
    }

    const gatedToolUse = gatedToolUses[0];
    if (gatedToolUse) {
      try {
        const action = await createPendingAction(
          params.backendClient,
          gatedToolUse.name,
          gatedToolUse.id,
          gatedToolUse.input,
        );
        params.emit({ type: "tool_end", tool: gatedToolUse.name, summary: toolSummary(gatedToolUse.name, gatedToolUse.input) });
        params.emit({ type: "confirmation_required", action });
        await params.backendClient.appendAgentConversation(params.conversationId, {
          messages: [assistantDisplayMessage],
          providerMessages: [assistantProviderMessage],
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        });
        paused = true;
        break;
      } catch (err) {
        logger.error({ err, tool: gatedToolUse.name }, "failed to create pending action");
        params.emit({ type: "tool_end", tool: gatedToolUse.name, summary: toolSummary(gatedToolUse.name, gatedToolUse.input) });
        const toolProviderMessage: AgentProviderMessage = {
          role: "tool",
          toolUseId: gatedToolUse.id,
          content: JSON.stringify({ error: "Failed to register approval request." }),
          isError: true,
        };
        const toolResultBlock: BetaToolResultBlockParam = {
          type: "tool_result",
          tool_use_id: gatedToolUse.id,
          content: toolProviderMessage.content,
          is_error: true,
        };

        await params.backendClient.appendAgentConversation(params.conversationId, {
          messages: [assistantDisplayMessage],
          providerMessages: [assistantProviderMessage, toolProviderMessage],
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        });
        apiMessages.push(assistantApiMessage, { role: "user", content: [toolResultBlock] });
        continue;
      }
    }

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        const result = await executeTool(
          params.backendClient,
          toolUse.name,
          toolUse.input,
          params.abortSignal,
        );
        params.emit({ type: "tool_end", tool: toolUse.name, summary: toolSummary(toolUse.name, toolUse.input) });
        return {
          providerMessage: {
            role: "tool" as const,
            toolUseId: toolUse.id,
            content: result.content,
            isError: result.isError,
          },
          block: {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: result.content,
            is_error: result.isError,
          },
        };
      }),
    );

    await params.backendClient.appendAgentConversation(params.conversationId, {
      messages: [assistantDisplayMessage],
      providerMessages: [
        assistantProviderMessage,
        ...toolResults.map((r) => r.providerMessage),
      ],
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    });

    apiMessages.push(assistantApiMessage, {
      role: "user",
      content: toolResults.map((r) => r.block),
    });
  }

  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, paused };
}

/**
 * Convert persisted provider messages into Anthropic API messages, grouping
 * consecutive `tool` rows into a single user message of tool_result blocks
 * (required by the Anthropic API after an assistant turn that emitted tool_use).
 */
function historyToApiMessages(history: AgentProviderMessage[]): BetaMessageParam[] {
  const out: BetaMessageParam[] = [];
  let i = 0;
  while (i < history.length) {
    const msg = history[i];
    if (msg.role === "user") {
      out.push({ role: "user", content: msg.content });
      i++;
    } else if (msg.role === "assistant") {
      const content: BetaContentBlockParam[] = [];
      // Thinking/redacted_thinking blocks must appear first in the assistant
      // content array, and must be passed back unchanged when tool use is
      // involved — the API verifies the signature.
      for (const t of msg.thinkingBlocks ?? []) {
        content.push({ type: "thinking", thinking: t.thinking, signature: t.signature });
      }
      for (const r of msg.redactedThinkingBlocks ?? []) {
        content.push({ type: "redacted_thinking", data: r.data });
      }
      if (msg.content) content.push({ type: "text", text: msg.content });
      for (const tc of msg.toolCalls ?? []) {
        content.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      }
      out.push({ role: "assistant", content });
      i++;
    } else {
      const blocks: BetaToolResultBlockParam[] = [];
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
