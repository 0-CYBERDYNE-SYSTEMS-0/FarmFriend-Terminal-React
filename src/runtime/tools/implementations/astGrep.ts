import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { defaultWorkspaceDir } from "../../config/paths.js";

type Args = {
  pattern?: string;
  language?: string;
  path?: string;
  mode?: "search" | "count" | "rewrite" | string;
  replacement?: string;
  include_context?: boolean;
};

function normalizeLang(langRaw: string): string {
  const l = langRaw.trim().toLowerCase();
  const map: Record<string, string> = {
    bash: "Bash",
    sh: "Bash",
    c: "C",
    cpp: "Cpp",
    "c++": "Cpp",
    csharp: "CSharp",
    "c#": "CSharp",
    css: "Css",
    elixir: "Elixir",
    go: "Go",
    haskell: "Haskell",
    hcl: "Hcl",
    html: "Html",
    java: "Java",
    javascript: "JavaScript",
    js: "JavaScript",
    json: "Json",
    kotlin: "Kotlin",
    lua: "Lua",
    nix: "Nix",
    php: "Php",
    python: "Python",
    py: "Python",
    ruby: "Ruby",
    rust: "Rust",
    scala: "Scala",
    solidity: "Solidity",
    swift: "Swift",
    tsx: "Tsx",
    typescript: "TypeScript",
    ts: "TypeScript",
    yaml: "Yaml",
    yml: "Yaml"
  };
  return map[l] || langRaw.trim();
}

function resolveTargetPath(p: string | undefined, repoRoot: string): string {
  const raw = (p || "").trim();
  if (!raw) return repoRoot;
  if (path.isAbsolute(raw)) return path.resolve(raw);
  return path.resolve(repoRoot, raw);
}

function ensureAllowedRewriteTarget(targetAbs: string, repoRoot: string, workspaceDir: string): void {
  const roots = [repoRoot, workspaceDir].map((r) => (r.endsWith(path.sep) ? r : r + path.sep));
  const ok = roots.some((r) => targetAbs === r.slice(0, -1) || targetAbs.startsWith(r));
  if (!ok) {
    throw new Error(`ast_grep(rewrite): blocked (target must be under repo root or workspace)\n- repo: ${repoRoot}\n- workspace: ${workspaceDir}\n- got: ${targetAbs}`);
  }
  if (targetAbs.includes(`${path.sep}.git${path.sep}`) || targetAbs.endsWith(`${path.sep}.git`)) {
    throw new Error("ast_grep(rewrite): blocked (refusing to touch .git)");
  }
}

function snippetFor(params: { filePath: string; startLine: number; endLine: number; context: number }): string | null {
  try {
    const raw = fs.readFileSync(params.filePath, "utf8");
    const lines = raw.split("\n");
    const a = Math.max(1, params.startLine - params.context);
    const b = Math.min(lines.length, params.endLine + params.context);
    return lines
      .slice(a - 1, b)
      .map((line, idx) => `${String(a + idx).padStart(4, " ")}| ${line}`)
      .join("\n");
  } catch {
    return null;
  }
}

function resolveSgBinary(): string {
  // Prefer the local dependency binary to avoid relying on global installs.
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // `.../src/runtime/tools/implementations` -> up 4 = `ff-terminal-ts/`
    const ffTerminalTsDir = path.resolve(here, "../../../..");
    const bin = path.join(ffTerminalTsDir, "node_modules", ".bin", process.platform === "win32" ? "sg.cmd" : "sg");
    if (fs.existsSync(bin)) return bin;
  } catch {
    // ignore
  }
  return process.platform === "win32" ? "sg.cmd" : "sg";
}

export async function astGrepTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const pattern = typeof args?.pattern === "string" ? args.pattern.trim() : "";
  const language = typeof args?.language === "string" ? args.language.trim() : "";
  const mode = String(args?.mode || "search").trim().toLowerCase();
  const replacement = typeof args?.replacement === "string" ? args.replacement : "";
  const includeContext = !!args?.include_context;

  if (!pattern) throw new Error("ast_grep: missing args.pattern");
  if (!language) throw new Error("ast_grep: missing args.language");

  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = path.resolve(ctx?.workspaceDir ?? defaultWorkspaceDir(repoRoot));

  const targetAbs = resolveTargetPath(args?.path, repoRoot);
  if (!fs.existsSync(targetAbs)) throw new Error(`ast_grep: path not found: ${targetAbs}`);

  if (mode === "rewrite") {
    if (!replacement.trim()) throw new Error("ast_grep(rewrite): missing args.replacement");
    ensureAllowedRewriteTarget(targetAbs, repoRoot, workspaceDir);
  }

  const cmd = resolveSgBinary();

  const argv: string[] = ["run", "--json=stream", "--pattern", pattern, "--lang", normalizeLang(language)];
  if (includeContext) argv.push("--context", "2");
  if (mode === "rewrite") argv.push("--rewrite", replacement, "--update-all");
  argv.push(targetAbs);

  const started = Date.now();
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, argv, { shell: false, stdio: ["ignore", "pipe", "pipe"] });

    const chunksOut: Buffer[] = [];
    const chunksErr: Buffer[] = [];
    const MAX = 3 * 1024 * 1024;

    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (b: Buffer) => {
      chunksOut.push(b);
      const size = chunksOut.reduce((n, c) => n + c.length, 0);
      if (size > MAX) child.kill("SIGTERM");
    });
    child.stderr?.on("data", (b: Buffer) => {
      chunksErr.push(b);
      const size = chunksErr.reduce((n, c) => n + c.length, 0);
      if (size > MAX) child.kill("SIGTERM");
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code, sig) => {
      signal.removeEventListener("abort", onAbort);
      const stdout = Buffer.concat(chunksOut).toString("utf8");
      const stderr = Buffer.concat(chunksErr).toString("utf8");

      const matches: any[] = [];
      const warnings: string[] = [];

      // sg --json=stream prints one JSON object per match on stdout, but may also print warnings there.
      for (const line of stdout.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        if (!t.startsWith("{")) {
          warnings.push(t);
          continue;
        }
        try {
          matches.push(JSON.parse(t));
        } catch {
          warnings.push(t);
        }
      }

      const context = includeContext
        ? matches
            .map((m) => {
              const file = String(m?.file || m?.path || "");
              const r = m?.range;
              const start = Number(r?.start?.line ?? r?.start_line ?? 0);
              const end = Number(r?.end?.line ?? r?.end_line ?? 0);
              if (!file || !start || !end) return null;
              const snip = snippetFor({ filePath: file, startLine: start, endLine: end, context: 2 });
              return snip ? { file, snippet: snip } : null;
            })
            .filter(Boolean)
        : undefined;

      const durationMs = Date.now() - started;
      const base = {
        ok: code === 0,
        mode,
        pattern,
        language: normalizeLang(language),
        path: targetAbs,
        exitCode: code,
        signal: sig,
        duration_ms: durationMs,
        warnings: warnings.length ? warnings.slice(0, 20) : undefined,
        stderr: stderr.trim() ? stderr.trim().slice(0, 4000) : undefined
      };

      if (mode === "count") {
        resolve(JSON.stringify({ ...base, count: matches.length }, null, 2));
        return;
      }

      resolve(
        JSON.stringify(
          {
            ...base,
            matches: matches.slice(0, 500),
            context
          },
          null,
          2
        )
      );
    });
  });
}
