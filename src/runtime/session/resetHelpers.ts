import path from "node:path";
import type { RuntimeConfig } from "../config/loadConfig.js";
import { loadSession } from "./sessionStore.js";
import { resetSessionFile } from "./sessionLifecycle.js";
import { saveSession } from "./sessionStore.js";
import { extractMemoryFromConversation, appendMemoryBlock } from "../workspace/memoryExtraction.js";
import { summarizeSessionHistory } from "./summarization.js";
import { upsertSessionIndexEntry } from "./sessionIndex.js";

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
  const reset = resetSessionFile({ sessionId: params.sessionId, sessionDir, archive: true, reason: "manual" });
  upsertSessionIndexEntry({
    workspaceDir: params.workspaceDir,
    sessionId: reset.session.session_id,
    updatedAt: reset.session.updated_at,
    lastActiveAt: reset.session.stats?.lastActiveAt,
    createdAt: reset.session.stats?.createdAt,
    totalMessages: reset.session.stats?.totalMessages,
    totalTokens: reset.session.stats?.totalTokens,
    overrides: reset.session.meta?.overrides as Record<string, unknown> | undefined
  });
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
    upsertSessionIndexEntry({
      workspaceDir: params.workspaceDir,
      sessionId: summarized.session.session_id,
      updatedAt: summarized.session.updated_at,
      lastActiveAt: summarized.session.stats?.lastActiveAt,
      createdAt: summarized.session.stats?.createdAt,
      totalMessages: summarized.session.stats?.totalMessages,
      totalTokens: summarized.session.stats?.totalTokens,
      overrides: summarized.session.meta?.overrides as Record<string, unknown> | undefined
    });
  }
  return { summarizedCount: summarized.summarizedCount, summary: summarized.summary };
}
