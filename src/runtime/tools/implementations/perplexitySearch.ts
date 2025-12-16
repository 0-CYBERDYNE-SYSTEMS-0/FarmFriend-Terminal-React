type Args = {
  query?: string;
  search_type?: "research" | "quick" | string;
};

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function perplexitySearchTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  if (!query) throw new Error("perplexity_search: missing args.query");

  const apiKey = String(process.env.PERPLEXITY_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("perplexity_search: missing PERPLEXITY_API_KEY (set it in your env or profile launcher)");
  }

  const model = String(process.env.PERPLEXITY_MODEL || "sonar").trim() || "sonar";
  const searchType = String(args.search_type || "research").trim().toLowerCase();

  const url = "https://api.perplexity.ai/chat/completions";
  const payload: any = {
    model,
    temperature: searchType === "quick" ? 0.2 : 0.1,
    max_tokens: searchType === "quick" ? 800 : 1400,
    messages: [
      {
        role: "system",
        content:
          "You are a web research assistant. Answer the user's query with a concise roundup. If citations/sources are available, include them."
      },
      { role: "user", content: query }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    signal
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`perplexity_search: HTTP ${res.status}: ${raw || res.statusText}`);
  }

  const obj = safeJsonParse(raw);
  if (!obj) throw new Error(`perplexity_search: non-JSON response: ${raw.slice(0, 200)}`);

  const content = String(obj?.choices?.[0]?.message?.content || "");
  const citations = Array.isArray(obj?.citations) ? obj.citations : Array.isArray(obj?.choices?.[0]?.citations) ? obj.choices[0].citations : [];

  return JSON.stringify(
    {
      query,
      provider: "perplexity",
      model: String(obj?.model || model),
      content,
      citations
    },
    null,
    2
  );
}

