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
import { buildRunnableTools, createPendingAction, isGatedTool } from "../tools/registry.js";

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
 * Run the agent loop against Anthropic's `toolRunner` helper.
 *
 * Persistence is incremental: after every assistant turn we append the new
 * provider messages to the backend. If the model calls a confirmation-gated
 * tool, we persist the assistant turn (with the tool_use block) but do NOT
 * persist a tool_result. The loop pauses before tools run; the approval
 * endpoint will later append the real tool_result. The next call to
 * runAgentLoop (with no new user message) picks up the completed history.
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

  const tools = buildRunnableTools(params.backendClient);

  const runner = params.client.beta.messages.toolRunner(
    {
      model: params.model,
      max_tokens: params.maxOutputTokens,
      system,
      messages: apiMessages,
      tools,
      stream: true,
      max_iterations: params.maxTurns,
      // Adaptive thinking: let the model decide when to think. On Sonnet 4.6
      // this also automatically enables interleaved thinking between tool
      // calls. Thinking blocks must be preserved across turns when tool use
      // is involved — see historyToApiMessages.
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      // Top-level cache_control auto-places a breakpoint on the last
      // cacheable block and walks it forward as the transcript grows. With
      // the explicit markers on `system` and the last tool, this gives us
      // up to 3 cache breakpoints covering the static prefix + the growing
      // conversation history. Tool results are picked up by lookback.
      cache_control: { type: "ephemeral" },
    },
    params.abortSignal ? { signal: params.abortSignal } : undefined,
  );

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let paused = false;

  for await (const stream of runner) {
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

    // Check for gated tools before the runner advances to execute them.
    const gatedToolUse = toolUses.find((t) => isGatedTool(t.name));
    const hasMixedGated =
      gatedToolUse && toolUses.length > 1;

    // Case 1: turn calls multiple tools and at least one is gated.
    // We can't pause cleanly because the API requires tool_results for every
    // tool_use. Refuse the gated one(s) with an error tool_result and let
    // the runner execute the non-gated ones. The model retries the gated
    // call alone on the next turn.
    if (hasMixedGated) {
      // Patch the runner: append assistant turn + push error tool_results for
      // gated tools. We let `toolRunner` run the non-gated tools — but since
      // tool_results must come in a single user message per turn, we have to
      // bypass the runner's auto-execution. Easiest path: emit error
      // tool_results for ALL tools in this turn (gated and non-gated) and
      // tell the model to retry separately.
      const errorBlocks: BetaToolResultBlockParam[] = toolUses.map((t) => ({
        type: "tool_result",
        tool_use_id: t.id,
        content: isGatedTool(t.name)
          ? "Confirmation-gated actions must be called alone. Please retry this tool call in a separate turn."
          : "Skipped because this turn also contained a confirmation-gated tool. Please retry in a separate turn.",
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
      for (const t of toolUses) params.emit({ type: "tool_end", tool: t.name });

      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage, ...toolProviderMessages],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });

      // Feed the error tool_results back into the runner and continue.
      runner.pushMessages({ role: "user", content: errorBlocks });
      continue;
    }

    // Case 2: single gated tool. Persist assistant turn, register pending
    // action, emit confirmation_required, break BEFORE the runner advances
    // to tool execution.
    if (gatedToolUse) {
      try {
        const action = await createPendingAction(
          params.backendClient,
          gatedToolUse.name,
          gatedToolUse.id,
          gatedToolUse.input,
        );
        params.emit({ type: "tool_end", tool: gatedToolUse.name });
        params.emit({ type: "confirmation_required", action });
      } catch (err) {
        logger.error({ err, tool: gatedToolUse.name }, "failed to create pending action");
        params.emit({ type: "tool_end", tool: gatedToolUse.name });
        params.emit({
          type: "error",
          message: "Failed to register confirmation prompt.",
        });
      }

      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
      paused = true;
      break;
    }

    // Case 3: no tools — model is done.
    if (toolUses.length === 0) {
      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
      break;
    }

    // Case 4: non-gated tools. Let the runner execute them on its next
    // iteration. We need the tool_results in our persistence too, so wait
    // for the runner to produce them, then persist.
    for (const t of toolUses) params.emit({ type: "tool_end", tool: t.name });

    const toolResponse = await runner.generateToolResponse();
    if (toolResponse) {
      const toolProviderMessages: AgentProviderMessage[] = [];
      if (Array.isArray(toolResponse.content)) {
        for (const block of toolResponse.content) {
          if (block.type === "tool_result") {
            toolProviderMessages.push({
              role: "tool",
              toolUseId: block.tool_use_id,
              content: typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content),
              isError: block.is_error ?? false,
            });
          }
        }
      }
      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage, ...toolProviderMessages],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
    } else {
      // No tool response generated (shouldn't happen if we have tool_uses,
      // but persist defensively).
      await params.backendClient.appendAgentConversation(params.conversationId, {
        messages: [assistantDisplayMessage],
        providerMessages: [assistantProviderMessage],
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });
    }
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
