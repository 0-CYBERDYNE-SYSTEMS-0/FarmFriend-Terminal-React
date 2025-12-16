import { OpenAIMessage, OpenAIToolSchema, Provider, ProviderStreamEvent, ToolCall } from "./types.js";

function textContentOf(msg: OpenAIMessage): string {
  if (msg.role === "tool") return msg.content;
  return msg.content;
}

function convertMessages(messages: OpenAIMessage[]): { anthropicMessages: any[]; system?: string } {
  const systemParts: string[] = [];
  const out: any[] = [];

  for (const m of messages) {
    if (m.role === "system" || m.role === "developer") {
      systemParts.push(textContentOf(m));
      continue;
    }

    const role = m.role === "assistant" ? "assistant" : "user";
    out.push({ role, content: [{ type: "text", text: textContentOf(m) }] });
  }

  const system = systemParts.join("\n\n").trim();
  return { anthropicMessages: out, system: system.length ? system : undefined };
}

function convertTools(tools: OpenAIToolSchema[]): any[] {
  return tools
    .filter((t) => t.type === "function")
    .map((t) => ({
      name: t.function.name,
      description: t.function.description || "",
      input_schema: t.function.parameters || { type: "object", properties: {} }
    }));
}

export function minimaxProvider(params: {
  apiKey: string;
  baseUrl: string; // e.g. https://api.minimax.io/anthropic
  anthropicVersion?: string; // default 2023-06-01
}): Provider {
  const baseUrl = params.baseUrl.replace(/\/+$/, "");
  const anthropicVersion = params.anthropicVersion || "2023-06-01";

  const modelMapping: Record<string, string> = {
    "minimax-m2": "MiniMax-M2",
    "MiniMax-M2": "MiniMax-M2",
    "claude-3-5-sonnet-20241022": "MiniMax-M2",
    "claude-3-5-haiku-20241022": "MiniMax-M2",
    "claude-3-haiku": "MiniMax-M2",
    "claude-3-sonnet": "MiniMax-M2",
    "claude-3-opus": "MiniMax-M2",
    "claude-3-5-sonnet": "MiniMax-M2",
    "claude-3-5-haiku": "MiniMax-M2",
    "gpt-4": "MiniMax-M2",
    "gpt-4-turbo": "MiniMax-M2",
    "gpt-3.5-turbo": "MiniMax-M2",
    "gpt-4o": "MiniMax-M2",
    "gpt-4o-mini": "MiniMax-M2",
    default: "MiniMax-M2"
  };

  return {
    name: "minimax",
    async *streamChat({ model, messages, tools, temperature, maxTokens, signal }): AsyncGenerator<ProviderStreamEvent> {
      const url = `${baseUrl}/v1/messages`;
      const { anthropicMessages, system } = convertMessages(messages);
      const actualModel = modelMapping[model] || modelMapping.default;
      const payload: any = {
        model: actualModel,
        messages: anthropicMessages,
        max_tokens: maxTokens,
        temperature
      };
      if (system) payload.system = system;
      if (tools?.length) payload.tools = convertTools(tools);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": params.apiKey,
          "anthropic-version": anthropicVersion
        },
        body: JSON.stringify(payload),
        signal
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        yield { type: "error", message: `MiniMax error (${res.status}): ${text || res.statusText}` };
        return;
      }

      const data: any = await res.json().catch(() => null);
      if (!data) {
        yield { type: "error", message: "MiniMax returned invalid JSON" };
        return;
      }

      const contentBlocks = Array.isArray(data.content) ? data.content : [];
      const textParts: string[] = [];
      const toolCalls: ToolCall[] = [];

      for (const block of contentBlocks) {
        if (block?.type === "text") textParts.push(String(block.text || ""));
        if (block?.type === "tool_use") {
          toolCalls.push({
            id: String(block.id || `tool_${toolCalls.length}`),
            name: String(block.name || ""),
            arguments: block.input ?? {}
          });
        }
      }

      const content = textParts.join("\n").trim();
      if (content) yield { type: "content", delta: content };
      yield { type: "final", content, toolCalls, rawModel: String(data.model || model) };
    }
  };
}
