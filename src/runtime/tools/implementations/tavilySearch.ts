type Args = {
  query?: string;
  search_depth?: "basic" | "advanced" | string;
  max_results?: number;
};

function asInt(n: unknown, def: number): number {
  if (typeof n === "number" && Number.isFinite(n)) return Math.trunc(n);
  if (typeof n === "string" && n.trim() && Number.isFinite(Number(n))) return Math.trunc(Number(n));
  return def;
}

export async function tavilySearchTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  if (!query) throw new Error("tavily_search: missing args.query");

  const apiKey = String(process.env.TAVILY_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("tavily_search: missing TAVILY_API_KEY (set it in your env or profile launcher)");
  }

  const searchDepth = (typeof args.search_depth === "string" && args.search_depth.trim() ? args.search_depth.trim() : "basic") as
    | "basic"
    | "advanced"
    | string;
  const maxResults = Math.max(1, Math.min(20, asInt(args.max_results, 8)));

  const url = "https://api.tavily.com/search";
  const payload: any = {
    api_key: apiKey,
    query,
    search_depth: searchDepth,
    max_results: maxResults,
    include_answer: false,
    include_images: false
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`tavily_search: HTTP ${res.status}: ${text || res.statusText}`);
  }

  let obj: any = null;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error(`tavily_search: non-JSON response: ${text.slice(0, 200)}`);
  }

  const results = Array.isArray(obj?.results) ? obj.results : [];
  const normalized = results.map((r: any) => ({
    title: typeof r?.title === "string" ? r.title : "",
    url: typeof r?.url === "string" ? r.url : "",
    content: typeof r?.content === "string" ? r.content : "",
    score: typeof r?.score === "number" ? r.score : undefined,
    published_date: typeof r?.published_date === "string" ? r.published_date : undefined
  }));

  return JSON.stringify(
    {
      query,
      provider: "tavily",
      results: normalized
    },
    null,
    2
  );
}

