import Anthropic from "@anthropic-ai/sdk";
import type {
  Provider,
  CompletionParams,
  CompletionResult,
  ToolCall,
  ProviderMessage,
} from "./types.js";
import type { MessageParam, ToolResultBlockParam, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages.js";

export class AnthropicProvider implements Provider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async streamCompletion(params: CompletionParams): Promise<CompletionResult> {
    const messages = this.buildMessages(params.messages);

    const stream = this.client.messages.stream({
      model: params.model,
      system: params.system,
      messages,
      tools: params.tools as Anthropic.Messages.Tool[],
      max_tokens: params.maxTokens,
    });

    if (params.abortSignal) {
      params.abortSignal.addEventListener("abort", () => stream.abort(), { once: true });
    }

    let text = "";
    const toolCalls: ToolCall[] = [];
    let currentToolId = "";
    let currentToolName = "";
    let currentToolInput = "";

    stream.on("text", (delta) => {
      text += delta;
      params.callbacks.onTextDelta(delta);
    });

    stream.on("contentBlock", (block) => {
      if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    });

    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        currentToolId = event.content_block.id;
        currentToolName = event.content_block.name;
        currentToolInput = "";
        params.callbacks.onToolStart(currentToolId, currentToolName);
      }
      if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        currentToolInput += event.delta.partial_json;
        params.callbacks.onToolInputDelta(currentToolId, event.delta.partial_json);
      }
    });

    const finalMessage = await stream.finalMessage();

    return {
      text,
      toolCalls,
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  }

  private buildMessages(messages: ProviderMessage[]): MessageParam[] {
    const result: MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "user" && msg.toolResults?.length) {
        const content: ToolResultBlockParam[] = msg.toolResults.map((tr) => ({
          type: "tool_result" as const,
          tool_use_id: tr.toolUseId,
          content: tr.content,
          is_error: tr.isError,
        }));
        result.push({ role: "user", content });
      } else if (msg.role === "assistant" && msg.toolCalls?.length) {
        const content: ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          });
        }
        result.push({ role: "assistant", content });
      } else {
        result.push({ role: msg.role, content: msg.content });
      }
    }

    return result;
  }
}
