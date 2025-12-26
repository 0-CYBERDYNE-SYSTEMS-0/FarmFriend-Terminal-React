import { OpenAIMessage, OpenAIToolSchema, Provider, ProviderStreamEvent, ToolCall } from "./types.js";

function textContentOf(msg: OpenAIMessage): string {
  if (msg.role === "tool") return msg.content;
  if (typeof msg.content === 'string') return msg.content;
  // If content is array (content blocks), extract text portions
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter(block => block && typeof block === 'object' && block.type === 'text')
      .map(block => block.text || '')
      .join('\n');
  }
  return String(msg.content || '');
}

function convertMessages(messages: OpenAIMessage[]): { anthropicMessages: any[]; system?: any[] } {
  const systemBlocks: any[] = [];
  const out: any[] = [];

  for (const m of messages) {
    if (m.role === "system" || m.role === "developer") {
      // System messages can be content blocks with cache_control
      if (typeof m.content === 'string') {
        systemBlocks.push({ type: "text", text: m.content });
      } else if (Array.isArray(m.content)) {
        for (const block of m.content) {
          if (block.type === 'text') {
            systemBlocks.push({
              type: "text",
              text: block.text,
              ...(block.cache_control && { cache_control: block.cache_control })
            });
          }
        }
      }
      continue;
    }

    const role = m.role === "assistant" ? "assistant" : "user";

    // Handle content blocks (text + images)
    if (Array.isArray(m.content)) {
      const contentBlocks = m.content.map(block => {
        if (block.type === "text" && block.text) {
          return {
            type: "text",
            text: block.text,
            ...(block.cache_control && { cache_control: block.cache_control })
          };
        }
        if (block.type === "image_url" && block.image_url?.url) {
          const url = block.image_url.url;
          // Handle base64 data URLs
          const base64Match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            return {
              type: "image",
              source: { type: "base64", media_type: base64Match[1], data: base64Match[2] },
              ...(block.cache_control && { cache_control: block.cache_control })
            };
          }
          // Handle regular URLs - return as URL source
          if (url.startsWith("http://") || url.startsWith("https://")) {
            return {
              type: "image",
              source: { type: "url", url },
              ...(block.cache_control && { cache_control: block.cache_control })
            };
          }
        }
        return null;
      }).filter(Boolean);
      out.push({ role, content: contentBlocks });
    } else {
      out.push({ role, content: [{ type: "text", text: String(m.content) }] });
    }
  }

  return { anthropicMessages: out, system: systemBlocks.length ? systemBlocks : undefined };
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
    async *streamChat({ model, messages, tools, temperature, maxTokens, signal, tool_choice }: Parameters<Provider["streamChat"]>[0]): AsyncGenerator<ProviderStreamEvent> {
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
      // MiniMax Anthropic API requires object format for tool_choice
      if (tool_choice === "auto") payload.tool_choice = { type: "auto" };
      else if (tool_choice === "any") payload.tool_choice = { type: "any" };

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
      yield { type: "final", content, toolCalls, rawModel: String(data.model || model) };
    }
  };
}
