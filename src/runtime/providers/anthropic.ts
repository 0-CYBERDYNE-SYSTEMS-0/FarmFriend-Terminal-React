import { readSSEDataLines } from "./sse.js";
import { OpenAIMessage, OpenAIToolSchema, Provider, ProviderStreamEvent, ToolCall } from "./types.js";

function textContentOf(msg: OpenAIMessage): string {
  if (typeof msg.content === 'string') {
    return msg.content;
  }
  // If content is array (content blocks), extract text portions
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter(block => block && typeof block === 'object' && block.type === 'text')
      .map(block => block.text || '')
      .join('\n');
  }
  return String(msg.content || '');
}

function convertMessages(messages: OpenAIMessage[]): { anthropicMessages: any[]; system?: string } {
  const systemParts: string[] = [];
  const out: any[] = [];

  for (const m of messages) {
    if (m.role === "system" || m.role === "developer") {
      systemParts.push(textContentOf(m));
      continue;
    }

    if (m.role === "tool") {
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.tool_call_id,
            content: String(m.content || ""),
            is_error: false
          }
        ]
      });
      continue;
    }

    const role = m.role === "assistant" ? "assistant" : "user";

    // Handle content blocks
    let content;
    if (typeof m.content === 'string') {
      content = [{ type: "text", text: m.content }];
    } else if (Array.isArray(m.content)) {
      // Convert image_url blocks to Anthropic image format
      content = m.content.map(block => {
        if (block.type === 'image_url' && block.image_url?.url) {
          const match = block.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            return {
              type: "image",
              source: { type: "base64", media_type: match[1], data: match[2] }
            };
          }
        }
        return block;
      });
    } else {
      content = [{ type: "text", text: String(m.content || '') }];
    }

    out.push({ role, content });
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

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toolCallsFromBlocks(blocks: any[]): ToolCall[] {
  const out: ToolCall[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (b.type !== "tool_use") continue;
    out.push({
      id: String(b.id || `tool_${out.length}`),
      name: String(b.name || ""),
      arguments: b.input ?? {}
    });
  }
  return out;
}

export function anthropicProvider(params: { apiKey: string; baseUrl?: string; anthropicVersion?: string }): Provider {
  const baseUrl = (params.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
  const anthropicVersion = params.anthropicVersion || "2023-06-01";

  return {
    name: "anthropic",
    async *streamChat({ model, messages, tools, temperature, maxTokens, signal }: Parameters<Provider["streamChat"]>[0]): AsyncGenerator<ProviderStreamEvent> {
      const url = `${baseUrl}/v1/messages`;
      const { anthropicMessages, system } = convertMessages(messages);

      const payload: any = {
        model,
        messages: anthropicMessages,
        max_tokens: maxTokens,
        temperature,
        stream: true
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
        yield { type: "error", message: `Anthropic error (${res.status}) at ${url}: ${text || res.statusText}` };
        return;
      }
      if (!res.body) {
        yield { type: "error", message: `Anthropic response had no body at ${url}` };
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const isEventStream = contentType.toLowerCase().includes("text/event-stream");

      // Non-stream fallback.
      if (!isEventStream) {
        const raw = await new Response(res.body).text().catch(() => "");
        const obj = safeJsonParse(raw.trim());
        if (!obj) {
          yield { type: "error", message: `Anthropic non-stream response was not JSON at ${url}: ${raw.slice(0, 200)}` };
          return;
        }
        const blocks = Array.isArray(obj.content) ? obj.content : [];
        const text = blocks.filter((b: any) => b?.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("");
        const toolCalls = toolCallsFromBlocks(blocks);
        if (text) yield { type: "content", delta: text };
        yield { type: "final", content: text, toolCalls, rawModel: typeof obj.model === "string" ? obj.model : undefined };
        return;
      }

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
          const partial = typeof obj.delta?.partial_json === "string" ? obj.delta.partial_json : "";
          if (partial) {
            const prev = toolByIndex.get(idx) ?? { args: "" };
            toolByIndex.set(idx, { ...prev, args: prev.args + partial });
          }
        }

        if (obj.type === "error") {
          yield { type: "error", message: `Anthropic stream error at ${url}: ${String(obj.message || "unknown error")}` };
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
