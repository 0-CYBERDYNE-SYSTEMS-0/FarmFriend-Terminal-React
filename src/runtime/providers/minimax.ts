import { OpenAIMessage, OpenAIToolSchema, Provider, ProviderStreamEvent, ToolCall } from "./types.js";
import { readSSEDataLines } from "./sse.js";

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

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
    "minimax-m2.1": "MiniMax-M2.1",
    "MiniMax-M2": "MiniMax-M2",
    "MiniMax-M2.1": "MiniMax-M2.1",
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
        temperature,
        stream: true
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

      if (!res.body) {
        yield { type: "error", message: `MiniMax response had no body` };
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const isEventStream = contentType.toLowerCase().includes("text/event-stream");

      // Non-stream fallback (shouldn't happen with stream: true)
      if (!isEventStream) {
        const raw = await new Response(res.body).text().catch(() => "");
        const obj = safeJsonParse(raw.trim());
        if (!obj) {
          yield { type: "error", message: `MiniMax non-stream response was not JSON: ${raw.slice(0, 200)}` };
          return;
        }
        const blocks = Array.isArray(obj.content) ? obj.content : [];
        const textParts: string[] = [];
        const toolCalls: ToolCall[] = [];
        for (const block of blocks) {
          if (block?.type === "text" && typeof block.text === "string") {
            textParts.push(block.text);
            yield { type: "content", delta: block.text };
          }
          if (block?.type === "thinking" && typeof block.thinking === "string") {
            yield { type: "thinking", delta: block.thinking };
          }
          if (block?.type === "tool_use") {
            toolCalls.push({
              id: String(block.id || `tool_${toolCalls.length}`),
              name: String(block.name || ""),
              arguments: block.input ?? {}
            });
          }
        }
        const content = textParts.join("\n").trim();
        yield { type: "final", content, toolCalls, rawModel: typeof obj.model === "string" ? obj.model : undefined };
        return;
      }

      // Stream processing
      let content = "";
      let rawModel: string | undefined;
      const toolByIndex = new Map<number, { id?: string; name?: string; args: string }>();

      for await (const data of readSSEDataLines(res.body)) {
        const obj = safeJsonParse(data);
        if (!obj || typeof obj !== "object") continue;

        if (obj.type === "message_start" && obj.message && typeof obj.message === "object") {
          rawModel = typeof obj.message.model === "string" ? obj.message.model : rawModel;
        }

        if (obj.type === "content_block_start") {
          const idx = typeof obj.index === "number" ? obj.index : 0;
          const block = obj.content_block;
          if (block?.type === "text" && typeof block.text === "string" && block.text) {
            content += block.text;
            yield { type: "content", delta: block.text };
          }
          if (block?.type === "thinking" && typeof block.thinking === "string" && block.thinking) {
            yield { type: "thinking", delta: block.thinking };
          }
          if (block?.type === "tool_use") {
            const prev = toolByIndex.get(idx) ?? { args: "" };
            toolByIndex.set(idx, {
              id: typeof block.id === "string" ? block.id : prev.id,
              name: typeof block.name === "string" ? block.name : prev.name,
              args: prev.args
            });
          }
        }

        if (obj.type === "content_block_delta") {
          const idx = typeof obj.index === "number" ? obj.index : 0;
          const text = typeof obj.delta?.text === "string" ? obj.delta.text : "";
          if (text) {
            content += text;
            yield { type: "content", delta: text };
          }
          const thinking = typeof obj.delta?.thinking === "string" ? obj.delta.thinking : "";
          if (thinking) {
            yield { type: "thinking", delta: thinking };
          }
          const partial = typeof obj.delta?.partial_json === "string" ? obj.delta.partial_json : "";
          if (partial) {
            const prev = toolByIndex.get(idx) ?? { args: "" };
            toolByIndex.set(idx, { ...prev, args: prev.args + partial });
          }
        }

        if (obj.type === "error") {
          yield { type: "error", message: `MiniMax stream error: ${String(obj.message || "unknown error")}` };
        }

        if (obj.type === "message_stop") break;
      }

      const toolCalls: ToolCall[] = [];
      for (const [idx, v] of [...toolByIndex.entries()].sort((a, b) => a[0] - b[0])) {
        const id = v.id || `tool_${idx}`;
        const name = v.name || "";
        const parsedArgs = safeJsonParse(v.args) ?? v.args;
        if (name) toolCalls.push({ id, name, arguments: parsedArgs });
      }

      yield { type: "final", content, toolCalls, rawModel };
    }
  };
}
