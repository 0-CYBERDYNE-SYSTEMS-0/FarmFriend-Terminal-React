import fs from "node:fs";
import path from "node:path";

type Args = {
  pattern?: string;
  path?: string;
  sort_by_mtime?: boolean;
  include_dirs?: boolean;
  head_limit?: number;
  show_details?: boolean;
};

const DEFAULT_IGNORES = new Set([".git", "node_modules", "dist"]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function braceExpandToRegex(fragment: string): string {
  // Minimal `{a,b}` support (non-nested).
  const m = fragment.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!m) return fragment;
  const [, pre, inner, post] = m;
  const alts = inner.split(",").map((x) => x.trim()).filter(Boolean).map(escapeRegex);
  return `${pre}(?:${alts.join("|")})${post}`;
}

function globToRegExp(pattern: string): RegExp {
  // Normalize to posix separators for matching.
  let p = pattern.replace(/\\/g, "/");
  p = braceExpandToRegex(p);

  // Escape regex specials first, then unescape our glob tokens by transforming them.
  let r = "";
  for (let i = 0; i < p.length; i += 1) {
    const ch = p[i];
    const next = p[i + 1];
    if (ch === "*" && next === "*") {
      // ** => match anything including /
      r += ".*";
      i += 1;
      continue;
    }
    if (ch === "*") {
      r += "[^/]*";
      continue;
    }
    if (ch === "?") {
      r += "[^/]";
      continue;
    }
    r += escapeRegex(ch);
  }

  return new RegExp(`^${r}$`);
}

function walk(dir: string, includeDirs: boolean, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    if (DEFAULT_IGNORES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (includeDirs) out.push(full);
      walk(full, includeDirs, out);
    } else if (e.isFile()) {
      out.push(full);
    }
  }
}

export async function globTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const pattern = typeof args?.pattern === "string" ? args.pattern : "";
  if (!pattern.trim()) throw new Error("glob: missing args.pattern");

  const base = typeof args?.path === "string" && args.path.trim() ? args.path.trim() : process.cwd();
  const includeDirs = !!args.include_dirs;
  const showDetails = !!args.show_details;
  const headLimit = typeof args.head_limit === "number" && args.head_limit > 0 ? args.head_limit : null;

  const absBase = path.resolve(base);
  const re = globToRegExp(pattern);

  const all: string[] = [];
  walk(absBase, includeDirs, all);

  const matched = all
    .map((p) => ({ abs: p, rel: path.relative(absBase, p).replace(/\\/g, "/") }))
    .filter((x) => re.test(x.rel));

  if (args.sort_by_mtime) {
    matched.sort((a, b) => {
      const am = fs.statSync(a.abs).mtimeMs;
      const bm = fs.statSync(b.abs).mtimeMs;
      return bm - am;
    });
  } else {
    matched.sort((a, b) => a.rel.localeCompare(b.rel));
  }

  const sliced = headLimit ? matched.slice(0, headLimit) : matched;

  if (!showDetails) {
    return JSON.stringify(sliced.map((x) => path.join(absBase, x.rel)), null, 2);
  }

  const detailed = sliced.map((x) => {
    const st = fs.statSync(x.abs);
    return { path: x.abs, size: st.size, mtime_ms: st.mtimeMs, is_dir: st.isDirectory() };
  });
  return JSON.stringify(detailed, null, 2);
}

