import OpenAI from "openai";
import type {
  Provider,
  CompletionParams,
  CompletionResult,
  ToolCall,
  ProviderMessage,
} from "./types.js";

export class OpenAIProvider implements Provider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async streamCompletion(params: CompletionParams): Promise<CompletionResult> {
    const messages = this.buildMessages(params.system, params.messages);

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      tools: params.tools as OpenAI.ChatCompletionTool[],
      max_tokens: params.maxTokens,
      stream: true,
    });

    let text = "";
    const toolCallMap = new Map<number, { id: string; name: string; args: string }>();
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      if (params.abortSignal?.aborted) break;

      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        text += delta.content;
        params.callbacks.onTextDelta(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id) {
            toolCallMap.set(tc.index, { id: tc.id, name: tc.function?.name ?? "", args: "" });
            params.callbacks.onToolStart(tc.id, tc.function?.name ?? "");
          }
          if (tc.function?.arguments) {
            const existing = toolCallMap.get(tc.index);
            if (existing) {
              existing.args += tc.function.arguments;
              params.callbacks.onToolInputDelta(existing.id, tc.function.arguments);
            }
          }
        }
      }

      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    const toolCalls: ToolCall[] = [...toolCallMap.values()].map((tc) => ({
      id: tc.id,
      name: tc.name,
      input: tc.args ? (JSON.parse(tc.args) as Record<string, unknown>) : {},
    }));

    return { text, toolCalls, inputTokens, outputTokens };
  }

  private buildMessages(
    system: string,
    messages: ProviderMessage[],
  ): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
    ];

    for (const msg of messages) {
      if (msg.role === "user" && msg.toolResults?.length) {
        for (const tr of msg.toolResults) {
          result.push({
            role: "tool",
            tool_call_id: tr.toolUseId,
            content: tr.content,
          });
        }
      } else if (msg.role === "assistant" && msg.toolCalls?.length) {
        result.push({
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.input),
            },
          })),
        });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }

    return result;
  }
}
