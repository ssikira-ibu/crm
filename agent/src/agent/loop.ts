import type { Provider, ProviderMessage, ToolCall } from "../providers/types.js";
import { executeTool, getAnthropicTools, getOpenAITools } from "../tools/registry.js";
import type { BackendClient } from "../lib/backend-client.js";
import type { AgentSSEEvent, AgentMessage } from "@crm/shared";
import { logger } from "../lib/logger.js";

const TOOL_DESCRIPTIONS: Record<string, string> = {
  search: "Searching CRM...",
  get_dashboard: "Loading dashboard...",
  list_companies: "Listing companies...",
  get_company: "Loading company details...",
  get_deals_overview: "Loading pipeline overview...",
  get_deal_detail: "Loading deal details...",
  list_tasks: "Loading tasks...",
  list_events: "Loading recent events...",
  list_contacts: "Loading contacts...",
  list_pipelines: "Loading pipelines...",
  create_activity: "Logging activity...",
  create_task: "Creating task...",
  create_note: "Creating note...",
  create_company: "Creating company...",
  create_contact: "Creating contact...",
  create_deal: "Creating deal...",
  update_deal: "Updating deal...",
  update_task: "Updating task...",
  update_company: "Updating company...",
  list_tags: "Loading tags...",
  add_tag_to_company: "Adding tag...",
  remove_tag_from_company: "Removing tag...",
};

export interface AgentLoopParams {
  userMessage: string;
  history: AgentMessage[];
  systemPrompt: string;
  provider: Provider;
  providerType: "anthropic" | "openai";
  model: string;
  backendClient: BackendClient;
  maxTurns: number;
  maxToolCalls: number;
  abortSignal?: AbortSignal;
}

export interface AgentLoopResult {
  messages: AgentMessage[];
  inputTokens: number;
  outputTokens: number;
}

export async function runAgentLoop(
  params: AgentLoopParams,
  emit: (event: AgentSSEEvent) => void,
): Promise<AgentLoopResult> {
  const tools = params.providerType === "anthropic" ? getAnthropicTools() : getOpenAITools();

  const providerMessages: ProviderMessage[] = historyToProviderMessages(params.history);
  providerMessages.push({ role: "user", content: params.userMessage });

  const newMessages: AgentMessage[] = [
    { role: "user", content: params.userMessage, createdAt: new Date().toISOString() },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let turns = 0;
  let totalToolCalls = 0;

  while (turns < params.maxTurns) {
    if (params.abortSignal?.aborted) break;
    turns++;

    let assistantText = "";

    const result = await params.provider.streamCompletion({
      model: params.model,
      system: params.systemPrompt,
      messages: providerMessages,
      tools,
      maxTokens: 4096,
      callbacks: {
        onTextDelta: (delta) => {
          assistantText += delta;
          emit({ type: "text_delta", delta });
        },
        onToolStart: (_id, name) => {
          emit({
            type: "tool_start",
            tool: name,
            description: TOOL_DESCRIPTIONS[name] ?? `Running ${name}...`,
          });
        },
        onToolInputDelta: () => {},
      },
      abortSignal: params.abortSignal,
    });

    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;

    if (result.toolCalls.length === 0) {
      newMessages.push({
        role: "assistant",
        content: result.text,
        createdAt: new Date().toISOString(),
      });
      providerMessages.push({ role: "assistant", content: result.text });
      break;
    }

    const assistantMsg: AgentMessage = {
      role: "assistant",
      content: result.text,
      toolCalls: result.toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        input: tc.input,
      })),
      createdAt: new Date().toISOString(),
    };
    newMessages.push(assistantMsg);

    providerMessages.push({
      role: "assistant",
      content: result.text,
      toolCalls: result.toolCalls,
    });

    const toolResults = [];
    for (const toolCall of result.toolCalls) {
      if (params.abortSignal?.aborted) break;
      totalToolCalls++;

      if (totalToolCalls > params.maxToolCalls) {
        logger.warn("Max tool calls reached, stopping loop");
        toolResults.push({
          toolUseId: toolCall.id,
          content: "Maximum number of tool calls reached. Please respond with what you have.",
          isError: true,
        });
        break;
      }

      const toolResult = await executeTool(toolCall.name, toolCall.input, params.backendClient);
      emit({ type: "tool_end", tool: toolCall.name });

      toolResults.push({
        toolUseId: toolCall.id,
        content: JSON.stringify(toolResult),
        isError: !toolResult.success,
      });
    }

    providerMessages.push({
      role: "user",
      toolResults,
      content: "",
    });

    if (totalToolCalls > params.maxToolCalls) break;
  }

  return {
    messages: newMessages,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };
}

function historyToProviderMessages(history: AgentMessage[]): ProviderMessage[] {
  const messages: ProviderMessage[] = [];

  for (const msg of history) {
    if (msg.role === "user") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      if (msg.toolCalls?.length) {
        messages.push({
          role: "assistant",
          content: msg.content,
          toolCalls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            input: tc.input,
          })),
        });
      } else {
        messages.push({ role: "assistant", content: msg.content });
      }
    }
  }

  return messages;
}
