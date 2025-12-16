import fs from "node:fs";
import path from "node:path";

export function parseDotenv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!key) continue;

    let value = withoutExport.slice(eq + 1).trim();

    // Strip inline comments for unquoted values: FOO=bar # comment
    if (!(value.startsWith("'") || value.startsWith("\""))) {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

export function loadDotenvFile(filePath: string): Record<string, string> {
  const raw = fs.readFileSync(filePath, "utf8");
  return parseDotenv(raw);
}

export function loadDotenvIntoProcess(
  filePaths: string[],
  opts?: { override?: boolean; debug?: boolean }
): { loadedFiles: string[]; appliedKeys: string[] } {
  const override = opts?.override === true;
  const debug = opts?.debug === true;
  const loadedFiles: string[] = [];
  const appliedKeys: string[] = [];

  for (const p of filePaths) {
    const abs = path.resolve(p);
    try {
      if (!fs.existsSync(abs)) continue;
      const st = fs.statSync(abs);
      if (!st.isFile()) continue;
      const vars = loadDotenvFile(abs);
      loadedFiles.push(abs);
      for (const [k, v] of Object.entries(vars)) {
        if (!override && typeof process.env[k] === "string" && process.env[k]!.length) continue;
        process.env[k] = v;
        appliedKeys.push(k);
      }
    } catch {
      // ignore invalid dotenv files
    }
  }

  if (debug) {
    const uniqKeys = [...new Set(appliedKeys)].sort();
    // eslint-disable-next-line no-console
    console.error(`[ff-terminal][dotenv] loaded ${loadedFiles.length} file(s):`, loadedFiles);
    // eslint-disable-next-line no-console
    console.error(`[ff-terminal][dotenv] applied ${uniqKeys.length} key(s):`, uniqKeys);
  }

  return { loadedFiles, appliedKeys: [...new Set(appliedKeys)].sort() };
}

export function loadDefaultDotenv(params?: { cwd?: string; repoRoot?: string }): { loadedFiles: string[]; appliedKeys: string[] } {
  const cwd = params?.cwd ? path.resolve(params.cwd) : process.cwd();
  const repoRoot = params?.repoRoot ? path.resolve(params.repoRoot) : cwd;
  const debug = ["1", "true", "yes", "on"].includes(String(process.env.FF_DEBUG_DOTENV || "").trim().toLowerCase());

  const candidates: string[] = [
    ...(process.env.FF_DOTENV_PATH ? [process.env.FF_DOTENV_PATH] : []),
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local")
  ];

  if (repoRoot !== cwd) {
    candidates.push(path.join(repoRoot, ".env"), path.join(repoRoot, ".env.local"));
  }

  return loadDotenvIntoProcess(candidates, { override: false, debug });
}
