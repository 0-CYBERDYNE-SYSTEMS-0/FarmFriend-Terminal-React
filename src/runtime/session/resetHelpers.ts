import path from "node:path";
import type { RuntimeConfig } from "../config/loadConfig.js";
import { loadSession } from "./sessionStore.js";
import { resetSessionFile } from "./sessionLifecycle.js";
import { saveSession } from "./sessionStore.js";
import { extractMemoryFromConversation, appendMemoryBlock } from "../workspace/memoryExtraction.js";
import { summarizeSessionHistory } from "./summarization.js";

export async function resetSessionWithArchive(params: {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  cfg: RuntimeConfig;
}): Promise<void> {
  const sessionDir = path.join(params.workspaceDir, "sessions");
  const existing = loadSession(params.sessionId, sessionDir);
  if (existing?.conversation?.length) {
    try {
      const extracted = await extractMemoryFromConversation({
        conversation: existing.conversation,
        cfg: params.cfg,
        repoRoot: params.repoRoot
      });
      if (extracted.trim()) {
        appendMemoryBlock({ workspaceDir: params.workspaceDir, content: extracted });
      }
    } catch {
      // Best-effort extraction; ignore failures.
    }
  }
  resetSessionFile({ sessionId: params.sessionId, sessionDir, archive: true, reason: "manual" });
}

export async function compactSessionWithSummary(params: {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  cfg: RuntimeConfig;
  keepLast?: number;
}): Promise<{ summarizedCount: number; summary: string }> {
  const sessionDir = path.join(params.workspaceDir, "sessions");
  const existing = loadSession(params.sessionId, sessionDir);
  if (!existing) {
    throw new Error(`compact_session: session not found (${params.sessionId})`);
  }
  const summarized = await summarizeSessionHistory({
    session: existing,
    cfg: params.cfg,
    repoRoot: params.repoRoot,
    keepLast: params.keepLast,
    sessionId: params.sessionId
  });
  if (summarized.summarizedCount > 0) {
    saveSession(summarized.session, sessionDir);
  }
  return { summarizedCount: summarized.summarizedCount, summary: summarized.summary };
}
