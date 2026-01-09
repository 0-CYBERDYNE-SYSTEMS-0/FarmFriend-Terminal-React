import fs from "node:fs";
import path from "node:path";
import type { RuntimeConfig } from "../config/loadConfig.js";
import type { SessionMode } from "./sessionPolicy.js";
import { createSession, loadSession, saveSession, sessionPath, type SessionFile } from "./sessionStore.js";

export type SessionIdleResult = {
  session: SessionFile;
  expired: boolean;
  idleMinutes: number;
  archivePath?: string;
  resetReason?: "idle";
};

export function ensureSessionStats(session: SessionFile, now = new Date().toISOString()): void {
  if (!session.stats) {
    session.stats = {
      totalMessages: session.conversation.length,
      totalTokens: session.conversation.reduce((sum, m) => sum + Math.max(1, Math.ceil((m.content || "").length / 4)), 0),
      createdAt: session.created_at || now,
      lastActiveAt: session.updated_at || now,
      archivedCount: 0
    };
    return;
  }
  if (!session.stats.createdAt) session.stats.createdAt = session.created_at || now;
  if (!session.stats.lastActiveAt) session.stats.lastActiveAt = session.updated_at || now;
  if (typeof session.stats.totalMessages !== "number") session.stats.totalMessages = session.conversation.length;
  if (typeof session.stats.totalTokens !== "number") {
    session.stats.totalTokens = session.conversation.reduce((sum, m) => sum + Math.max(1, Math.ceil((m.content || "").length / 4)), 0);
  }
  if (typeof session.stats.archivedCount !== "number") session.stats.archivedCount = 0;
}

export function getSessionLastActiveAt(session: SessionFile): number {
  const raw = session.stats?.lastActiveAt || session.updated_at || session.created_at;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function getIdleMinutes(cfg?: RuntimeConfig): number {
  const raw = (cfg as any)?.session?.idleMinutes;
  const val = typeof raw === "number" ? raw : Number(raw ?? 0);
  if (!Number.isFinite(val) || val < 0) return 0;
  return val;
}

export function isSessionExpired(session: SessionFile, cfg?: RuntimeConfig, now = Date.now()): boolean {
  const idleMinutes = getIdleMinutes(cfg);
  if (!idleMinutes) return false;
  const lastActiveAt = getSessionLastActiveAt(session);
  const idleMs = idleMinutes * 60 * 1000;
  return now - lastActiveAt >= idleMs;
}

export function archiveSessionFile(sessionId: string, sessionDir: string): string | null {
  const src = sessionPath(sessionId, sessionDir);
  if (!fs.existsSync(src)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(sessionDir, `${sessionId}_archive_${stamp}.json`);
  fs.renameSync(src, dest);
  return dest;
}

export function resetSessionFile(params: {
  sessionId: string;
  sessionDir: string;
  archive?: boolean;
  reason?: "idle" | "manual";
}): { session: SessionFile; archivePath?: string } {
  const existing = loadSession(params.sessionId, params.sessionDir);
  let archivePath: string | null = null;
  if (params.archive && existing) {
    archivePath = archiveSessionFile(params.sessionId, params.sessionDir);
  }
  const fresh = createSession(params.sessionId);
  if (existing?.stats?.archivedCount) {
    fresh.stats = fresh.stats || {
      totalMessages: 0,
      createdAt: fresh.created_at,
      lastActiveAt: fresh.updated_at,
      archivedCount: 0
    };
    fresh.stats.archivedCount = existing.stats.archivedCount + 1;
  }
  if (params.reason) {
    fresh.meta = { ...(existing?.meta || {}), reset_reason: params.reason };
  }
  saveSession(fresh, params.sessionDir);
  return { session: fresh, archivePath: archivePath || undefined };
}

export function handleIdleExpiry(params: {
  session: SessionFile;
  sessionId: string;
  sessionDir: string;
  cfg?: RuntimeConfig;
  mode: SessionMode;
}): SessionIdleResult {
  const idleMinutes = getIdleMinutes(params.cfg);
  if (!idleMinutes) {
    ensureSessionStats(params.session);
    return { session: params.session, expired: false, idleMinutes };
  }
  if (!isSessionExpired(params.session, params.cfg)) {
    ensureSessionStats(params.session);
    return { session: params.session, expired: false, idleMinutes };
  }

  // If we're already in "new" mode, we shouldn't reuse expired sessions.
  const shouldArchive = params.mode !== "new";
  const reset = resetSessionFile({
    sessionId: params.sessionId,
    sessionDir: params.sessionDir,
    archive: shouldArchive,
    reason: "idle"
  });
  return {
    session: reset.session,
    expired: true,
    idleMinutes,
    archivePath: reset.archivePath || undefined,
    resetReason: "idle"
  };
}
