import path from "node:path";
import { getToolContext } from "../context.js";
import { resolveWorkspaceDir } from "../../config/paths.js";
import { resolveConfig } from "../../config/loadConfig.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { resolveMainSessionId } from "../../session/sessionPolicy.js";
import { loadSession } from "../../session/sessionStore.js";
import {
  appendMemoryBlock,
  extractMemoryFromConversation,
  searchMemory,
  updateMemorySection
} from "../../workspace/memoryExtraction.js";

type Args = {
  action?: "extract" | "update" | "search" | string;
  sessionId?: string;
  maxMessages?: number;
  section?: string;
  content?: string;
  query?: string;
};

export async function memoryManagementTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase();
  if (!action) throw new Error("manage_memory: missing args.action");

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const cfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });

  if (action === "search") {
    const query = String(args?.query || "").trim();
    if (!query) throw new Error("manage_memory: missing args.query");
    const results = searchMemory({ workspaceDir, query });
    return JSON.stringify({ ok: true, action, matches: results }, null, 2);
  }

  if (action === "update") {
    const section = String(args?.section || "").trim();
    const content = String(args?.content || "").trim();
    if (!section) throw new Error("manage_memory: missing args.section");
    if (!content) throw new Error("manage_memory: missing args.content");
    updateMemorySection({ workspaceDir, section, content });
    return JSON.stringify({ ok: true, action, section }, null, 2);
  }

  if (action === "extract") {
    const sessionId =
      String(args?.sessionId || "").trim() ||
      ctx?.sessionId ||
      resolveMainSessionId(cfg);
    const sessionDir = path.join(workspaceDir, "sessions");
    const session = loadSession(sessionId, sessionDir);
    if (!session) throw new Error(`manage_memory: session not found (${sessionId})`);
    const extracted = await extractMemoryFromConversation({
      conversation: session.conversation,
      cfg,
      repoRoot,
      maxMessages: args?.maxMessages
    });
    if (!extracted.trim()) return JSON.stringify({ ok: true, action, extracted: "" }, null, 2);
    const { memoryPath, dailyPath } = appendMemoryBlock({ workspaceDir, content: extracted });
    return JSON.stringify({ ok: true, action, memoryPath, dailyPath }, null, 2);
  }

  throw new Error(`manage_memory: unknown action "${action}"`);
}
