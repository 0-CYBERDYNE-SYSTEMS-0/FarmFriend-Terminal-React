import path from "node:path";
import { getToolContext } from "../context.js";
import { resolveWorkspaceDir } from "../../config/paths.js";
import { resolveConfig } from "../../config/loadConfig.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { resolveMainSessionId } from "../../session/sessionPolicy.js";
import { loadSession, saveSession } from "../../session/sessionStore.js";
import { resetSessionFile } from "../../session/sessionLifecycle.js";
import { summarizeSessionHistory } from "../../session/summarization.js";
import { appendMemoryBlock, extractMemoryFromConversation } from "../../workspace/memoryExtraction.js";

type Args = {
  action?: "archive" | "clear" | "summarize" | string;
  sessionId?: string;
  keepLast?: number;
};

export async function sessionResetTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase() || "archive";

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const cfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });
  const sessionId =
    String(args?.sessionId || "").trim() ||
    ctx?.sessionId ||
    resolveMainSessionId(cfg);
  const sessionDir = path.join(workspaceDir, "sessions");

  if (action === "archive") {
    const existing = loadSession(sessionId, sessionDir);
    let memoryExtracted = false;
    if (existing?.conversation?.length) {
      try {
        const extracted = await extractMemoryFromConversation({
          conversation: existing.conversation,
          cfg,
          repoRoot
        });
        if (extracted.trim()) {
          appendMemoryBlock({ workspaceDir, content: extracted });
          memoryExtracted = true;
        }
      } catch {
        memoryExtracted = false;
      }
    }
    const reset = resetSessionFile({
      sessionId,
      sessionDir,
      archive: true,
      reason: "manual"
    });
    return JSON.stringify({ ok: true, action, sessionId, archivePath: reset.archivePath || null, memoryExtracted }, null, 2);
  }

  if (action === "clear") {
    const session = loadSession(sessionId, sessionDir);
    if (!session) throw new Error(`reset_session: session not found (${sessionId})`);
    session.conversation = [];
    if (session.stats) session.stats.totalMessages = 0;
    saveSession(session, sessionDir);
    return JSON.stringify({ ok: true, action, sessionId }, null, 2);
  }

  if (action === "summarize") {
    const session = loadSession(sessionId, sessionDir);
    if (!session) throw new Error(`reset_session: session not found (${sessionId})`);
    const summarized = await summarizeSessionHistory({
      session,
      cfg,
      repoRoot,
      keepLast: args?.keepLast,
      sessionId
    });
    saveSession(summarized.session, sessionDir);
    return JSON.stringify({
      ok: true,
      action,
      sessionId,
      summarizedCount: summarized.summarizedCount
    }, null, 2);
  }

  throw new Error(`reset_session: unknown action "${action}"`);
}
