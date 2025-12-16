type CrawlArgs = {
  url?: string;
  max_depth?: number;
  limit?: number;
};

type ExtractArgs = {
  urls?: string[];
  include_images?: boolean;
};

type MapArgs = {
  url?: string;
  max_depth?: number;
};

function requireApiKey(): string {
  const apiKey = String(process.env.TAVILY_API_KEY || "").trim();
  if (!apiKey) throw new Error("tavily: missing TAVILY_API_KEY");
  return apiKey;
}

async function postJson(url: string, payload: any, signal: AbortSignal): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`tavily: HTTP ${res.status} at ${url}: ${text || res.statusText}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`tavily: non-JSON response at ${url}: ${text.slice(0, 200)}`);
  }
}

export async function tavilyExtractTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as ExtractArgs;
  const urls = Array.isArray(args?.urls) ? args.urls.filter((u) => typeof u === "string" && u.trim()).map((u) => u.trim()) : [];
  if (!urls.length) throw new Error("tavily_extract: missing args.urls");

  const apiKey = requireApiKey();
  const url = "https://api.tavily.com/extract";
  const obj = await postJson(
    url,
    {
      api_key: apiKey,
      urls,
      include_images: !!args.include_images
    },
    signal
  );

  return JSON.stringify({ provider: "tavily", endpoint: "extract", input: { urls, include_images: !!args.include_images }, output: obj }, null, 2);
}

export async function tavilyMapTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as MapArgs;
  const base = typeof args?.url === "string" ? args.url.trim() : "";
  if (!base) throw new Error("tavily_map: missing args.url");

  const apiKey = requireApiKey();
  const url = "https://api.tavily.com/map";
  const obj = await postJson(
    url,
    {
      api_key: apiKey,
      url: base,
      max_depth: typeof args.max_depth === "number" && Number.isFinite(args.max_depth) ? Math.max(1, Math.trunc(args.max_depth)) : undefined
    },
    signal
  );

  return JSON.stringify({ provider: "tavily", endpoint: "map", input: { url: base, max_depth: args.max_depth }, output: obj }, null, 2);
}

export async function tavilyCrawlTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as CrawlArgs;
  const base = typeof args?.url === "string" ? args.url.trim() : "";
  if (!base) throw new Error("tavily_crawl: missing args.url");

  const apiKey = requireApiKey();
  const url = "https://api.tavily.com/crawl";
  const obj = await postJson(
    url,
    {
      api_key: apiKey,
      url: base,
      max_depth: typeof args.max_depth === "number" && Number.isFinite(args.max_depth) ? Math.max(1, Math.trunc(args.max_depth)) : undefined,
      limit: typeof args.limit === "number" && Number.isFinite(args.limit) ? Math.max(1, Math.trunc(args.limit)) : undefined
    },
    signal
  );

  return JSON.stringify(
    { provider: "tavily", endpoint: "crawl", input: { url: base, max_depth: args.max_depth, limit: args.limit }, output: obj },
    null,
    2
  );
}

