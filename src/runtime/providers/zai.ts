import { readSSEDataLines } from "./sse.js";
import { openAICompatProvider } from "./openaiCompat.js";
import { OpenAIMessage, OpenAIToolSchema, Provider, ProviderStreamEvent, ToolCall } from "./types.js";

// Mirrors the Python mapping (Claude/OpenAI aliases -> GLM API names).
const MODEL_MAPPING: Record<string, string> = {
  "claude-3-5-sonnet-20241022": "GLM-4.5",
  "claude-3-5-haiku-20241022": "GLM-4.5-Air",
  "claude-3-haiku": "GLM-4.5-Air",
  "claude-3-sonnet": "GLM-4.5",
  "claude-3-opus": "GLM-4.5",
  "claude-3-5-sonnet": "GLM-4.5",
  "claude-3-5-haiku": "GLM-4.5-Air",

  "glm-4.5": "GLM-4.5",
  "glm-4.5-air": "GLM-4.5-Air",
  "GLM-4.5": "GLM-4.5",
  "GLM-4.5-Air": "GLM-4.5-Air",
  "glm-4.6": "GLM-4.6",
  "GLM-4.6": "GLM-4.6",
  "glm-4.6-air": "GLM-4.6-Air",
  "GLM-4.6-Air": "GLM-4.6-Air",
  "glm-4.6-flash": "GLM-4.6-Flash",
  "GLM-4.6-Flash": "GLM-4.6-Flash",

  "gpt-4": "GLM-4.5",
  "gpt-4-turbo": "GLM-4.5",
  "gpt-3.5-turbo": "GLM-4.5-Air",
  "gpt-5-mini": "GLM-4.5-Air"
};

function mapToZaiModel(requested: string): string {
  const m = (requested || "").trim();
  return MODEL_MAPPING[m] || MODEL_MAPPING[m.toLowerCase()] || m || "GLM-4.5-Air";
}

function textContentOf(msg: OpenAIMessage): string {
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

    if (m.role === "tool") {
      // Best-effort Anthropic tool result block. Some gateways accept this even without a prior tool_use block.
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

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractTextBlocks(blocks: any[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
  }
  return parts.join("");
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

function toolCallsFromAnthropicStream(toolByIndex: Map<number, { id?: string; name?: string; args: string }>): ToolCall[] {
  const out: ToolCall[] = [];
  for (const [idx, v] of [...toolByIndex.entries()].sort((a, b) => a[0] - b[0])) {
    const id = v.id || `tool_${idx}`;
    const name = v.name || "";
    const parsedArgs = safeJsonParse(v.args) ?? v.args;
    if (!name) continue;
    out.push({ id, name, arguments: parsedArgs });
  }
  return out;
}

function zaiAnthropicProvider(params: { apiKey: string; baseUrl: string; endpoint?: string }): Provider {
  let baseUrl = params.baseUrl.replace(/\/+$/, "");
  if (baseUrl.endsWith("/v1")) baseUrl = baseUrl.slice(0, -3);
  const debug = ["1", "true", "yes", "on"].includes(String(process.env.FF_DEBUG_PROVIDER || "").trim().toLowerCase());
  const debugLog = (...args: any[]) => {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.error(`[ff-terminal][provider:zai-anthropic]`, ...args);
  };

  const endpoint = params.endpoint !== undefined ? params.endpoint : "/v1/messages";

  return {
    name: "zai",
    async *streamChat({ model, messages, tools, temperature, maxTokens, signal }): AsyncGenerator<ProviderStreamEvent> {
      const url = endpoint ? `${baseUrl}${endpoint}` : baseUrl;
      const { anthropicMessages, system } = convertMessages(messages);
      const payload: any = {
        // Z.ai "Anthropic-compatible" endpoint expects GLM model IDs (e.g. GLM-4.6).
        model: mapToZaiModel(model),
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
          // Z.ai's Anthropic gateway uses Authorization, not x-api-key.
          Authorization: `Bearer ${params.apiKey}`,
          "x-api-key": params.apiKey,
          "anthropic-version": String(process.env.ANTHROPIC_VERSION || "2023-06-01"),
          "anthropic-beta": "prompt-caching-2024-07-31"
        },
        body: JSON.stringify(payload),
        signal
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        yield { type: "error", message: `Z.ai (Anthropic) error (${res.status}) at ${url}: ${text || res.statusText}` };
        return;
      }
      if (!res.body) {
        yield { type: "error", message: `Z.ai (Anthropic) response had no body at ${url}` };
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      debugLog("HTTP 200", { url, contentType });
      const isEventStream = contentType.toLowerCase().includes("text/event-stream");

      if (!isEventStream) {
        const raw = await new Response(res.body).text().catch(() => "");
        const obj: any = safeJsonParse(raw.trim());
        if (!obj) {
          yield { type: "error", message: `Z.ai (Anthropic) non-stream response was not JSON at ${url}: ${raw.slice(0, 200)}` };
          return;
        }
        const blocks = Array.isArray(obj.content) ? obj.content : [];
        const content = extractTextBlocks(blocks);
        const toolCalls = toolCallsFromBlocks(blocks);
        if (content) yield { type: "content", delta: content };
        yield { type: "final", content, toolCalls, rawModel: typeof obj.model === "string" ? obj.model : undefined };
        return;
      }

      let content = "";
      let rawModel: string | undefined;
      const toolByIndex = new Map<number, { id?: string; name?: string; args: string }>();

      for await (const data of readSSEDataLines(res.body)) {
        const obj: any = safeJsonParse(data);
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
          yield { type: "error", message: `Z.ai (Anthropic) stream error at ${url}: ${String(obj.message || "unknown error")}` };
        }

        if (obj.type === "message_stop") break;
      }

      const toolCalls = toolCallsFromAnthropicStream(toolByIndex);
      yield { type: "final", content, toolCalls, rawModel };
    }
  };
}

export function zaiProvider(params: { apiKey: string; baseUrl: string }): Provider {
  const common = {
    name: "zai" as const,
    baseUrl: params.baseUrl,
    apiKey: params.apiKey,
    extraHeaders: {
      "HTTP-Referer": "https://github.com/anthropics/ff-terminal",
      "X-Title": "FF-Terminal"
    },
    mapModel: (requested: string) => mapToZaiModel(requested)
  };

  // Z.ai gateways vary: some expose `/chat/completions` under the given base URL, others require an extra `/v1`.
  const noV1 = openAICompatProvider({ ...common, appendV1: false });
  const withV1 = openAICompatProvider({ ...common, appendV1: true });
  const rawAnthropic = zaiAnthropicProvider({ ...params, endpoint: "" });
  const anthropic = zaiAnthropicProvider(params);

  return {
    name: "zai",
    async *streamChat(args: Parameters<Provider["streamChat"]>[0]) {
      const preferAnthropic = params.baseUrl.toLowerCase().includes("anthropic");
      const attempts = preferAnthropic ? [rawAnthropic, anthropic, noV1, withV1] : [noV1, withV1, rawAnthropic, anthropic];
      const discardedErrors: string[] = [];

      for (let i = 0; i < attempts.length; i += 1) {
        const p = attempts[i];
        const buffered: ProviderStreamEvent[] = [];
        let sawError = false;
        let final: Extract<ProviderStreamEvent, { type: "final" }> | null = null;
        let sawContent = false;

        for await (const ev of p.streamChat(args)) {
          buffered.push(ev);
          if (ev.type === "error") sawError = true;
          if (ev.type === "content") sawContent = true;
          if (ev.type === "final") final = ev;
        }

        const ok = Boolean(sawContent || (final && ((final.content && String(final.content).length) || (final.toolCalls && final.toolCalls.length))));
        // Treat "no error but also no content/tool_calls" as a failure and fall through to the next variant.
        // Some gateways return 200 with an empty/unsupported shape; this otherwise looks like a silent success.
        if (!ok && !sawError) {
          discardedErrors.push(`Z.ai endpoint variant returned an empty response (no content/tool_calls).`);
          if (i < attempts.length - 1) continue;
        }

        if (ok || i === attempts.length - 1) {
          if (!ok && i === attempts.length - 1 && discardedErrors.length) {
            const uniq = [...new Set(discardedErrors)].slice(0, 6);
            yield {
              type: "error",
              message: `Z.ai failed across multiple endpoint styles. Previous errors:\n- ${uniq.join("\n- ")}`
            };
          }
          for (const ev of buffered) yield ev;
          return;
        }

        // Capture errors from this attempt so the user gets context if all variants fail.
        for (const ev of buffered) {
          if (ev.type === "error") discardedErrors.push(ev.message);
        }
        // Otherwise: discard this attempt and try the next variant.
      }
    }
  };
}
