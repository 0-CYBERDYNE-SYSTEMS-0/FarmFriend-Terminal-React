import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { defaultWorkspaceDir } from "../../config/paths.js";

export async function writeFileTool(args: unknown): Promise<string> {
  const filePath = typeof (args as any)?.path === "string" ? String((args as any).path) : null;
  const content = typeof (args as any)?.content === "string" ? (args as any).content : null;
  if (!filePath) throw new Error("write_file: missing args.path");
  if (content === null) throw new Error("write_file: missing args.content");

  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = path.resolve(ctx?.workspaceDir ?? defaultWorkspaceDir(repoRoot));

  const abs = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(repoRoot, filePath);
  const allowedRoots = [repoRoot, workspaceDir].map((p) => (p.endsWith(path.sep) ? p : p + path.sep));
  const isAllowed = allowedRoots.some((r) => abs === r.slice(0, -1) || abs.startsWith(r));
  if (!isAllowed) {
    throw new Error(`write_file: blocked (path must be under repo root or workspace)\n- repo: ${repoRoot}\n- workspace: ${workspaceDir}\n- got: ${abs}`);
  }

  const relToRepo = abs.startsWith(repoRoot + path.sep) ? abs.slice(repoRoot.length + 1) : null;
  const warnings: string[] = [];

  if (abs.includes(`${path.sep}.git${path.sep}`) || abs.endsWith(`${path.sep}.git`)) {
    throw new Error("write_file: blocked (refusing to write under .git)");
  }
  if (relToRepo && (relToRepo.startsWith(".env") || relToRepo.includes(`${path.sep}.env`))) {
    warnings.push("writing to .env-like file; avoid committing secrets");
  }
  if (abs.includes(`${path.sep}node_modules${path.sep}`)) {
    warnings.push("writing under node_modules is usually unintended");
  }

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return JSON.stringify({ ok: true, path: abs, bytes: content.length, warnings: warnings.length ? warnings : undefined }, null, 2);
}
