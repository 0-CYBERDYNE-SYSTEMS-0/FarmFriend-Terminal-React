import { grepTool } from "./grep.js";

type Args = {
  query?: string;
  path?: string;
};

function buildPattern(query: string): string {
  const tokens = query.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || [];
  const uniq = [...new Set(tokens)].slice(0, 8);
  if (!uniq.length) return query;
  // OR-regex of identifiers/keywords.
  return uniq.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

export async function searchCodeTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  if (!query) throw new Error("search_code: missing args.query");
  const path = typeof args?.path === "string" && args.path.trim() ? args.path.trim() : ".";

  const pattern = buildPattern(query);
  const out = await grepTool(
    {
      pattern,
      path,
      case_insensitive: true,
      output_mode: "content",
      context_before: 1,
      context_after: 1,
      head_limit: 120
    },
    signal
  );

  return JSON.stringify({ query, path, pattern, results: out }, null, 2);
}

export async function semanticSearchTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  // No embeddings yet in TS; fall back to keyword search so the tool is still usable.
  const out = await searchCodeTool(argsRaw, signal);
  return out;
}

