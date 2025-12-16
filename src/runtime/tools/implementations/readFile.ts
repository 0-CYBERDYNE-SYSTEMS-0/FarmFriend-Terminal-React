import fs from "node:fs";
import path from "node:path";

type Args = { path?: string; lines?: string };

function sliceLines(text: string, spec: string): string {
  const s = spec.trim().toLowerCase();
  const all = text.split("\n");

  const mRange = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (mRange) {
    const a = Math.max(1, Number(mRange[1]));
    const b = Math.max(a, Number(mRange[2]));
    return all.slice(a - 1, b).join("\n");
  }

  const mFirst = s.match(/^first\s+(\d+)$/);
  if (mFirst) return all.slice(0, Number(mFirst[1])).join("\n");

  const mLast = s.match(/^last\s+(\d+)$/);
  if (mLast) return all.slice(Math.max(0, all.length - Number(mLast[1]))).join("\n");

  return text;
}

export async function readFileTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const p = typeof args?.path === "string" ? args.path : null;
  if (!p) throw new Error("read_file: missing args.path");

  const abs = path.isAbsolute(p) ? path.resolve(p) : path.resolve(process.cwd(), p);
  // NOTE: Only hard-block obviously sensitive system paths here (you asked to avoid over-hardening).
  // `write_file` and edit tools are where we keep stricter safety boundaries.
  if (abs.includes(`${path.sep}.git${path.sep}`) || abs.endsWith(`${path.sep}.git`)) {
    throw new Error("read_file: blocked (refusing to read under .git)");
  }
  if (abs.includes(`${path.sep}.ssh${path.sep}`) || abs.endsWith(`${path.sep}.ssh`)) {
    throw new Error("read_file: blocked (refusing to read under .ssh)");
  }

  const st = fs.statSync(abs);

  if (st.isDirectory()) {
    const entries = fs.readdirSync(abs).sort();
    return JSON.stringify({ path: abs, entries }, null, 2);
  }

  const MAX_BYTES = Number(process.env.FF_READ_FILE_MAX_BYTES || 1_000_000);
  if (st.size > MAX_BYTES) {
    throw new Error(`read_file: file too large (${st.size} bytes > ${MAX_BYTES}); narrow it down or increase FF_READ_FILE_MAX_BYTES`);
  }

  const content = fs.readFileSync(abs, "utf8");
  if (typeof args.lines === "string" && args.lines.trim()) return sliceLines(content, args.lines);
  return content;
}
