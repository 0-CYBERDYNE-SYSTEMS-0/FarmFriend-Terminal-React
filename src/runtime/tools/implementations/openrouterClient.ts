export type OpenRouterChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "system" | "user" | "assistant"; content: any[] };

export async function openRouterChat(params: {
  apiKey: string;
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  maxTokens?: number;
  extra?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<{ json: any; headers: Record<string, string> }> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
      "HTTP-Referer": "https://github.com/FF-Terminal",
      "X-Title": "FF-Terminal"
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: typeof params.temperature === "number" ? params.temperature : undefined,
      max_tokens: typeof params.maxTokens === "number" ? params.maxTokens : undefined,
      ...(params.extra || {})
    }),
    signal: params.signal
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${text || res.statusText}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter returned non-JSON: ${text.slice(0, 200)}`);
  }

  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
  return { json, headers };
}

