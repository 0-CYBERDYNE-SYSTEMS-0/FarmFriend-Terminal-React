import { readSSEDataLines } from "./sse.js";
import { OpenAIMessage, OpenAIToolSchema, Provider, ProviderStreamEvent, ToolCall } from "./types.js";

function normalizeBaseUrl(baseUrl: string, appendV1: boolean): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (!appendV1) return trimmed;
  if (trimmed.endsWith("/v1")) return trimmed;
  return `${trimmed}/v1`;
}

function authHeader(apiKey: string): Record<string, string> {
  // Most OpenAI-compatible gateways accept Authorization Bearer.
  return { Authorization: `Bearer ${apiKey}` };
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (!block) continue;
      if (typeof block === "string") {
        parts.push(block);
        continue;
      }
      if (typeof block === "object") {
        const b: any = block;
        if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
        else if (typeof b.text === "string") parts.push(b.text);
        else if (typeof b.content === "string") parts.push(b.content);
      }
    }
    return parts.join("");
  }
  if (content && typeof content === "object") {
    const c: any = content;
    if (typeof c.text === "string") return c.text;
  }
  return "";
}

function normalizeMessages(messages: any[]): any[] {
  return messages.map(msg => {
    // If message content is already an array (content blocks), pass through as-is
    if (Array.isArray(msg.content)) {
      return msg;
    }
    // Otherwise keep as string
    return msg;
  });
}

function toolCallsFromMessage(message: any): ToolCall[] {
  const tc = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  return tc
    .filter((t: any) => t && (t.type === "function" || t.function))
    .map((t: any, idx: number) => ({
      id: String(t.id || `tool_${idx}`),
      name: String(t.function?.name || t.name || ""),
      arguments: safeJsonParse(String(t.function?.arguments || "")) ?? t.function?.arguments ?? {}
    }));
}

function toolCallsFromDeltas(toolCallDeltas: any[]): ToolCall[] {
  const byIndex = new Map<number, { id?: string; name?: string; args: string }>();
  for (const d of toolCallDeltas) {
    const idx = typeof d?.index === "number" ? d.index : 0;
    const prev = byIndex.get(idx) ?? { args: "" };
    const id = typeof d?.id === "string" ? d.id : prev.id;
    const name = typeof d?.function?.name === "string" ? d.function.name : prev.name;
    const argDelta = typeof d?.function?.arguments === "string" ? d.function.arguments : "";
    byIndex.set(idx, { id, name, args: prev.args + argDelta });
  }

  const out: ToolCall[] = [];
  for (const [idx, v] of [...byIndex.entries()].sort((a, b) => a[0] - b[0])) {
    const id = v.id || `tool_${idx}`;
    const name = v.name || "";
    const parsedArgs = safeJsonParse(v.args) ?? v.args;
    out.push({ id, name, arguments: parsedArgs });
  }
  return out;
}

function toolCallsFromAnthropicContentBlocks(blocks: any[]): ToolCall[] {
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

function extractFromJsonResponse(
  obj: any,
  opts?: { reasoningContentFallback?: boolean }
): { content: string; toolCalls: ToolCall[]; rawModel?: string } | null {
  if (!obj || typeof obj !== "object") return null;

  // OpenAI-style: { model, choices: [{ message: { content, tool_calls } }] }
  const choice = obj.choices?.[0];
  if (choice) {
    const msg = choice.message ?? choice.delta ?? {};
    let content = extractTextContent(msg?.content);
    if (!content && opts?.reasoningContentFallback) {
      const reasoning = extractTextContent(msg?.reasoning_content ?? msg?.reasoning);
      if (reasoning) content = reasoning;
    }
    const toolCalls = toolCallsFromMessage(msg);
    return { content, toolCalls, rawModel: typeof obj.model === "string" ? obj.model : undefined };
  }

  // Anthropic-style: { model, content: [{type:"text", text:"..."}, {type:"tool_use", ...}] }
  if (Array.isArray(obj.content)) {
    const content = extractTextContent(obj.content);
    const toolCalls = toolCallsFromAnthropicContentBlocks(obj.content);
    return { content, toolCalls, rawModel: typeof obj.model === "string" ? obj.model : undefined };
  }

  // Some gateways nest message under `message`.
  if (obj.message && typeof obj.message === "object") {
    let content = extractTextContent((obj.message as any).content);
    if (!content && opts?.reasoningContentFallback) {
      const reasoning = extractTextContent((obj.message as any).reasoning_content ?? (obj.message as any).reasoning);
      if (reasoning) content = reasoning;
    }
    const toolCalls = toolCallsFromMessage(obj.message);
    return { content, toolCalls, rawModel: typeof obj.model === "string" ? obj.model : undefined };
  }

  return null;
}

export function openAICompatProvider(params: {
  name: Provider["name"];
  baseUrl: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
  mapModel?: (requested: string) => string;
  appendV1?: boolean;
  preferStream?: boolean;
  reasoningContentFallback?: boolean;
}): Provider {
  const baseUrl = normalizeBaseUrl(params.baseUrl, params.appendV1 ?? true);
  const extraHeaders = params.extraHeaders ?? {};
  const mapModel = params.mapModel ?? ((m: string) => m);
  const preferStream = params.preferStream ?? true;
  const reasoningContentFallback = params.reasoningContentFallback ?? false;

  return {
    name: params.name,
    async *streamChat({ model, messages, tools, temperature, maxTokens, signal, tool_choice }): AsyncGenerator<ProviderStreamEvent> {
      const url = `${baseUrl}/chat/completions`;
      const debug = ["1", "true", "yes", "on"].includes(String(process.env.FF_DEBUG_PROVIDER || "").trim().toLowerCase());
      const debugLog = (...args: any[]) => {
        if (!debug) return;
        // eslint-disable-next-line no-console
        console.error(`[ff-terminal][provider:${params.name}]`, ...args);
      };

      const payloadBase: Record<string, any> = {
        model: mapModel(model),
        messages: normalizeMessages(messages)
      };

      // Only include optional parameters if they have defined values
      if (tools?.length) payloadBase.tools = tools;
      if (tool_choice !== undefined) payloadBase.tool_choice = tool_choice;
      if (temperature !== undefined && temperature !== null) payloadBase.temperature = temperature;
      if (maxTokens !== undefined && maxTokens !== null) payloadBase.max_tokens = maxTokens;

      let localRetryUsed = false;
      const canRetryEmptyStream = () => !localRetryUsed;
      const markRetryUsed = () => {
        localRetryUsed = true;
      };

      const requestOnce = async (stream: boolean) => {
        return fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...authHeader(params.apiKey),
            ...extraHeaders
          },
          body: JSON.stringify({ ...payloadBase, stream }),
          signal
        });
      };

      const consumeSSE = async (body: ReadableStream<Uint8Array>) => {
        let content = "";
        const toolCallDeltas: any[] = [];
        let messageToolCalls: ToolCall[] = [];
        let rawModel: string | undefined;
        const anthropicToolByIndex = new Map<number, { id?: string; name?: string; args: string }>();
        let sawAnyEvent = false;

        for await (const data of readSSEDataLines(body)) {
          if (data === "[DONE]") break;
          const obj: any = safeJsonParse(data);
          if (!obj) continue;
          sawAnyEvent = true;

          rawModel = typeof obj.model === "string" ? obj.model : rawModel;

          if (obj.error) {
            const msg =
              typeof obj.error?.message === "string"
                ? obj.error.message
                : typeof obj.error === "string"
                  ? obj.error
                  : JSON.stringify(obj.error);
            return { content: "", toolCalls: [], rawModel, sawAnyEvent, error: `Provider error (stream) at ${url}: ${msg}` };
          }

          const choice = obj.choices?.[0];
          const delta = choice?.delta;
          const deltaContentText = extractTextContent(delta?.content);
          if (deltaContentText) content += deltaContentText;
          else {
            const full = extractTextContent(choice?.message?.content);
            if (full) {
              if (full.startsWith(content)) content = full;
              else if (full !== content) content = full;
            }
          }

          const tc = Array.isArray(delta?.tool_calls) ? delta.tool_calls : null;
          if (tc && tc.length) toolCallDeltas.push(...tc);
          const messageToolCallSet = toolCallsFromMessage(choice?.message);
          if (messageToolCallSet.length) messageToolCalls = messageToolCallSet;

          const t = typeof obj.type === "string" ? obj.type : "";
          if (t === "content_block_delta") {
            const text = typeof obj.delta?.text === "string" ? obj.delta.text : "";
            if (text) content += text;
            const partial = typeof obj.delta?.partial_json === "string" ? obj.delta.partial_json : "";
            if (partial) {
              const idx = typeof obj.index === "number" ? obj.index : 0;
              const prev = anthropicToolByIndex.get(idx) ?? { args: "" };
              anthropicToolByIndex.set(idx, { ...prev, args: prev.args + partial });
            }
          }
          if (t === "content_block_start") {
            const block = obj.content_block;
            if (block?.type === "text" && typeof block.text === "string" && block.text) {
              content += block.text;
            }
            if (block?.type === "tool_use") {
              const idx = typeof obj.index === "number" ? obj.index : 0;
              const id = typeof block.id === "string" ? block.id : undefined;
              const name = typeof block.name === "string" ? block.name : undefined;
              const input = block.input;
              const prev = anthropicToolByIndex.get(idx) ?? { args: "" };
              if (input && typeof input === "object") {
                anthropicToolByIndex.set(idx, { id: id ?? prev.id, name: name ?? prev.name, args: JSON.stringify(input) });
              } else {
                anthropicToolByIndex.set(idx, { id: id ?? prev.id, name: name ?? prev.name, args: prev.args });
              }
            }
          }
        }

        const toolCalls = [
          ...toolCallsFromDeltas(toolCallDeltas),
          ...messageToolCalls,
          ...(() => {
            const out: ToolCall[] = [];
            for (const [idx, v] of [...anthropicToolByIndex.entries()].sort((a, b) => a[0] - b[0])) {
              const id = v.id || `tool_${idx}`;
              const name = v.name || "";
              const parsedArgs = safeJsonParse(v.args) ?? v.args;
              if (name) out.push({ id, name, arguments: parsedArgs });
            }
            return out;
          })()
        ];

        return { content, toolCalls, rawModel, sawAnyEvent };
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeader(params.apiKey),
          ...extraHeaders
        },
        body: JSON.stringify({ ...payloadBase, stream: preferStream }),
        signal
      });

      const initialRequestId = res.headers.get("x-openrouter-id") || res.headers.get("x-request-id") || "";
      if (initialRequestId) debugLog("request_id", { url, requestId: initialRequestId });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        yield {
          type: "error",
          message: `Provider error (${res.status}) at ${url}: ${text || res.statusText}`
        };
        return;
      }

      if (!res.body) {
        yield { type: "error", message: "Provider response had no body" };
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      const isEventStream = contentType.toLowerCase().includes("text/event-stream");
      debugLog("HTTP 200", { url, contentType });

      // If we requested non-stream or the gateway returns JSON, parse as non-stream.
      if (!isEventStream) {
        const raw = await new Response(res.body).text().catch(() => "");
        const obj: any = safeJsonParse(raw.trim());
        const extracted = extractFromJsonResponse(obj, { reasoningContentFallback });
        if (!extracted) {
          yield { type: "error", message: `Non-stream response was not recognized JSON at ${url}: ${raw.slice(0, 200)}` };
          return;
        }
        if (extracted.content) yield { type: "content", delta: extracted.content };
        yield { type: "final", ...extracted };
        return;
      }

      // Peek the first chunk to detect gateways that claim SSE but actually return JSON.
      const reader = res.body.getReader();
      const first = await reader.read();
      const firstChunk = first.value;
      const decoder = new TextDecoder("utf-8");
      const firstText = firstChunk ? decoder.decode(firstChunk, { stream: true }) : "";
      const looksLikeJson = firstText.trimStart().startsWith("{");
      debugLog("first chunk", { sample: firstText.slice(0, 200), looksLikeJson });

      if (looksLikeJson) {
        let raw = firstText;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) raw += decoder.decode(value, { stream: true });
        }
        raw += decoder.decode();
        raw = raw.trim();

        const obj: any = safeJsonParse(raw);
        const extracted = extractFromJsonResponse(obj, { reasoningContentFallback });
        if (!extracted) {
          yield { type: "error", message: `Non-stream response was not recognized JSON at ${url}: ${raw.slice(0, 200)}` };
          return;
        }
        if (extracted.content) yield { type: "content", delta: extracted.content };
        yield { type: "final", ...extracted };
        return;
      }

      const sseStream = new ReadableStream<Uint8Array>({
        start(controller) {
          if (firstChunk && firstChunk.length) controller.enqueue(firstChunk);
          const pump = async () => {
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                controller.close();
                return;
              }
              if (value) controller.enqueue(value);
            }
          };
          void pump();
        }
      });

      let content = "";
      const toolCallDeltas: any[] = [];
      let messageToolCalls: ToolCall[] = [];
      let rawModel: string | undefined;
      let lastReasoningContent = "";
      const anthropicToolByIndex = new Map<number, { id?: string; name?: string; args: string }>();

      let sawAnyEvent = false;
      for await (const data of readSSEDataLines(sseStream)) {
        if (data === "[DONE]") break;
        const obj: any = safeJsonParse(data);
        if (!obj) continue;
        sawAnyEvent = true;

        rawModel = typeof obj.model === "string" ? obj.model : rawModel;

        // Some gateways stream errors inside the SSE channel.
        if (obj.error) {
          const msg =
            typeof obj.error?.message === "string"
              ? obj.error.message
              : typeof obj.error === "string"
                ? obj.error
                : JSON.stringify(obj.error);
          yield { type: "error", message: `Provider error (stream) at ${url}: ${msg}` };
          return;
        }

        // OpenAI-style SSE: { choices: [{ delta: { content, tool_calls }, finish_reason }] }
        const choice = obj.choices?.[0];
        const delta = choice?.delta;
        const finishReason = choice?.finish_reason;
        if (reasoningContentFallback && typeof choice?.message?.reasoning_content === "string") {
          const rc = choice.message.reasoning_content.trim();
          if (rc) lastReasoningContent = rc;
        }

        const deltaContentText = extractTextContent(delta?.content);
        const deltaReasoningContent = typeof delta?.reasoning_content === "string" ? delta.reasoning_content : "";
        if (deltaContentText) {
          content += deltaContentText;
          yield { type: "content", delta: deltaContentText };
        } else if (deltaReasoningContent && reasoningContentFallback) {
          content += deltaReasoningContent;
          yield { type: "content", delta: deltaReasoningContent };
        } else {
          // Some gateways emit full message objects in SSE chunks.
          const full = extractTextContent(choice?.message?.content);
          if (full) {
            if (full.startsWith(content)) {
              const d = full.slice(content.length);
              if (d) {
                content = full;
                yield { type: "content", delta: d };
              }
            } else if (full !== content) {
              content = full;
              yield { type: "content", delta: full };
            }
          }
        }

        const reasoningDelta =
          typeof delta?.reasoning === "string"
            ? delta.reasoning
            : typeof delta?.thinking === "string"
              ? delta.thinking
              : deltaReasoningContent && !reasoningContentFallback
                ? deltaReasoningContent
                : "";
        if (reasoningDelta) yield { type: "thinking", delta: reasoningDelta };

        const tc = Array.isArray(delta?.tool_calls) ? delta.tool_calls : null;
        if (tc && tc.length) toolCallDeltas.push(...tc);
        const messageToolCallSet = toolCallsFromMessage(choice?.message);
        if (messageToolCallSet.length) messageToolCalls = messageToolCallSet;

        // Anthropic-style SSE (some “anthropic gateways” stream these events even for chat-completions).
        const t = typeof obj.type === "string" ? obj.type : "";
        if (t === "error" && obj.message) {
          yield { type: "error", message: `Provider error (stream) at ${url}: ${String(obj.message)}` };
        }
        if (t === "content_block_delta") {
          const text = typeof obj.delta?.text === "string" ? obj.delta.text : "";
          if (text) {
            content += text;
            yield { type: "content", delta: text };
          }

          // Tool input JSON deltas.
          const partial = typeof obj.delta?.partial_json === "string" ? obj.delta.partial_json : "";
          if (partial) {
            const idx = typeof obj.index === "number" ? obj.index : 0;
            const prev = anthropicToolByIndex.get(idx) ?? { args: "" };
            anthropicToolByIndex.set(idx, { ...prev, args: prev.args + partial });
          }
        }

        if (t === "content_block_start") {
          const block = obj.content_block;
          if (block?.type === "text" && typeof block.text === "string" && block.text) {
            content += block.text;
            yield { type: "content", delta: block.text };
          }
          if (block?.type === "tool_use") {
            const idx = typeof obj.index === "number" ? obj.index : 0;
            const id = typeof block.id === "string" ? block.id : undefined;
            const name = typeof block.name === "string" ? block.name : undefined;
            const input = block.input;
            const prev = anthropicToolByIndex.get(idx) ?? { args: "" };
            if (input && typeof input === "object") {
              anthropicToolByIndex.set(idx, { id: id ?? prev.id, name: name ?? prev.name, args: JSON.stringify(input) });
            } else {
              anthropicToolByIndex.set(idx, { id: id ?? prev.id, name: name ?? prev.name, args: prev.args });
            }
          }
        }

        if (t === "message_stop") break;

        if (finishReason === "tool_calls") {
          // Continue consuming until DONE, then emit final with tool calls.
        }
      }

      const toolCalls = [
        ...toolCallsFromDeltas(toolCallDeltas),
        ...messageToolCalls,
        ...(() => {
          const out: ToolCall[] = [];
          for (const [idx, v] of [...anthropicToolByIndex.entries()].sort((a, b) => a[0] - b[0])) {
            const id = v.id || `tool_${idx}`;
            const name = v.name || "";
            const parsedArgs = safeJsonParse(v.args) ?? v.args;
            if (name) out.push({ id, name, arguments: parsedArgs });
          }
          return out;
        })()
      ];

      if (!content && reasoningContentFallback && lastReasoningContent) {
        content = lastReasoningContent;
        yield { type: "content", delta: content };
      }

      const isEmpty = !content && toolCalls.length === 0;
      if (isEmpty && canRetryEmptyStream()) {
        markRetryUsed();
        debugLog("empty_stream_retry_notice", { url, provider: params.name });
        debugLog("empty_stream_retry_start", { url });
        try {
          const retryRes = await requestOnce(false);
          const retryRequestId = retryRes.headers.get("x-openrouter-id") || retryRes.headers.get("x-request-id") || "";
          if (retryRequestId) debugLog("retry_request_id", { url, requestId: retryRequestId });
          if (!retryRes.ok) {
            const text = await retryRes.text().catch(() => "");
            debugLog("empty_stream_retry_failed", { status: retryRes.status, message: text || retryRes.statusText });
          } else {
            const retryContentType = retryRes.headers.get("content-type") || "";
            if (retryContentType.toLowerCase().includes("text/event-stream") && retryRes.body) {
              debugLog("empty_stream_retry_sse", { url, contentType: retryContentType });
              const sseResult = await consumeSSE(retryRes.body);
              if (sseResult.error) {
                debugLog("empty_stream_retry_failed", { message: sseResult.error });
              } else if (sseResult.content || sseResult.toolCalls.length) {
                if (sseResult.content) yield { type: "content", delta: sseResult.content };
                yield { type: "final", content: sseResult.content, toolCalls: sseResult.toolCalls, rawModel: sseResult.rawModel };
                return;
              }
            } else {
              const raw = await retryRes.text().catch(() => "");
              const obj: any = safeJsonParse(raw.trim());
              const extracted = extractFromJsonResponse(obj, { reasoningContentFallback });
              if (extracted) {
                if (extracted.content) yield { type: "content", delta: extracted.content };
                yield { type: "final", ...extracted };
                return;
              }
              debugLog("empty_stream_retry_failed", { message: `Non-stream response was not recognized JSON at ${url}` });
            }
          }
        } catch (err) {
          debugLog("empty_stream_retry_failed", { message: String(err || "unknown error") });
          yield {
            type: "error",
            message: `Empty stream retry failed for ${url}. Provider returned no content or tool calls.`
          };
          return;
        }
      }

      if (isEmpty && debug) {
        debugLog("empty_stream_stats", {
          sawAnyEvent,
          contentLength: content.length,
          toolCallDeltas: toolCallDeltas.length,
          messageToolCalls: messageToolCalls.length,
          anthropicToolBlocks: anthropicToolByIndex.size
        });
      }
      if (!sawAnyEvent && isEmpty) {
        yield { type: "error", message: `No streaming events received from ${url} (content-type: ${contentType || "unknown"})` };
        return;
      }
      if (sawAnyEvent && isEmpty) {
        yield {
          type: "error",
          message: `Empty response from ${url} (no content/tool calls). Try a different base URL or set FF_DEBUG_PROVIDER=1.`
        };
        return;
      }
      yield { type: "final", content, toolCalls, rawModel };
    }
  };
}
