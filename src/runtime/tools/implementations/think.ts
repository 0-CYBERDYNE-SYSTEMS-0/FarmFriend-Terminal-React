import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

type Args = { thought?: string };

export async function thinkTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const thought = typeof args?.thought === "string" ? args.thought : "";

  // Be forgiving: If no thought provided, return success as no-op
  // This prevents infinite loops when models send malformed think calls
  if (!thought.trim()) {
    return JSON.stringify({ ok: true, note: "Empty thought - no action taken" });
  }

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const sessionId = ctx?.sessionId ? ctx.sessionId : "unknown-session";

  const dir = path.join(workspaceDir, "thoughts");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${sessionId}.md`);

  const stamp = new Date().toISOString();
  const block = `\n\n---\n${stamp}\n\n${thought.trim()}\n`;
  fs.appendFileSync(filePath, block, "utf8");

  return JSON.stringify({ ok: true, sessionId, path: filePath }, null, 2);
}
