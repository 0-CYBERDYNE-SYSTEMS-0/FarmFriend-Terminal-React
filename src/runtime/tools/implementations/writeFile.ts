import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { defaultWorkspaceDir, resolveWorkspaceDir } from "../../config/paths.js";
import { guardWritePath } from "../guards/fsGuard.js";

export async function writeFileTool(args: unknown): Promise<string> {
  const filePath = typeof (args as any)?.path === "string" ? String((args as any).path) : null;
  const content = typeof (args as any)?.content === "string" ? (args as any).content : null;
  if (!filePath) throw new Error("write_file: missing args.path");
  if (content === null) throw new Error("write_file: missing args.content");

  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  // Canonicalize workspace hints to the home workspace to prevent scatter.
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? defaultWorkspaceDir());

  const { absPath, location } = guardWritePath({
    rawPath: filePath,
    repoRoot,
    workspaceDir,
    reason: "write_file"
  });

  const relToRepo = location === "repo" && absPath.startsWith(repoRoot + path.sep) ? absPath.slice(repoRoot.length + 1) : null;
  const warnings: string[] = [];

  if (relToRepo && (relToRepo.startsWith(".env") || relToRepo.includes(`${path.sep}.env`))) {
    warnings.push("writing to .env-like file; avoid committing secrets");
  }
  if (absPath.includes(`${path.sep}node_modules${path.sep}`)) {
    warnings.push("writing under node_modules is usually unintended");
  }

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf8");
  return JSON.stringify({ ok: true, path: absPath, bytes: content.length, warnings: warnings.length ? warnings : undefined }, null, 2);
}
