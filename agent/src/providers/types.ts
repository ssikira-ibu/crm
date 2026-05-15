export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface CompletionResult {
  text: string;
  toolCalls: ToolCall[];
  inputTokens: number;
  outputTokens: number;
}

export interface StreamCallbacks {
  onTextDelta: (delta: string) => void;
  onToolStart: (id: string, name: string) => void;
  onToolInputDelta: (id: string, delta: string) => void;
}

export interface ToolResultMessage {
  toolUseId: string;
  content: string;
  isError: boolean;
}

export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResultMessage[];
}

export interface CompletionParams {
  model: string;
  system: string;
  messages: ProviderMessage[];
  tools: unknown[];
  maxTokens: number;
  callbacks: StreamCallbacks;
  abortSignal?: AbortSignal;
}

export interface Provider {
  streamCompletion(params: CompletionParams): Promise<CompletionResult>;
}
