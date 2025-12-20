export type OpenAIRole = "system" | "developer" | "user" | "assistant" | "tool";

export type OpenAIMessage =
  | { role: "system" | "developer" | "user" | "assistant"; content: string }
  | { role: "tool"; tool_call_id: string; name?: string; content: string };

export type OpenAIToolSchema = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: unknown;
  };
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type ProviderStreamEvent =
  | { type: "content"; delta: string }
  | { type: "thinking"; delta: string }
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | { type: "final"; content: string; toolCalls: ToolCall[]; rawModel?: string };

export type Provider = {
  name: "openrouter" | "zai" | "minimax" | "lmstudio" | "anthropic" | "openai-compatible" | "anthropic-compatible";
  streamChat(params: {
    model: string;
    messages: OpenAIMessage[];
    tools: OpenAIToolSchema[];
    temperature: number;
    maxTokens: number;
    signal: AbortSignal;
    sessionId?: string;
  }): AsyncGenerator<ProviderStreamEvent>;
};
