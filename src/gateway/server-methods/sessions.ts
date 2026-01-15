import fs from "node:fs";
import path from "node:path";
import type { GatewayMethodHandler } from "../server-shared.js";
import { listSessionIndex, getOrCreateSessionIdForKey, upsertSessionIndexEntry } from "../../runtime/session/sessionIndex.js";
import { patchSessionOverrides, getSessionOverrides } from "../../runtime/session/sessionOverrides.js";
import { resetSessionWithArchive, compactSessionWithSummary } from "../../runtime/session/resetHelpers.js";
import { resolveMainSessionId } from "../../runtime/session/sessionPolicy.js";
import { loadSession } from "../../runtime/session/sessionStore.js";

function listSessions(workspaceDir: string, limit = 50, activeMinutes?: number, messageLimit?: number): any[] {
  const sessionDir = path.join(workspaceDir, "sessions");
  if (!fs.existsSync(sessionDir)) return [];
  const cutoff = activeMinutes && activeMinutes > 0 ? Date.now() - activeMinutes * 60 * 1000 : null;
  const indexEntries = listSessionIndex(workspaceDir);
  const indexedIds = new Set(indexEntries.map((e) => e.sessionId));
  const rows = (indexEntries.length
    ? indexEntries.map((entry) => {
        const p = path.join(sessionDir, `${entry.sessionId}.json`);
        const needsSession = typeof messageLimit === "number" && messageLimit > 0
          ? true
          : typeof entry.totalMessages !== "number" || typeof entry.totalTokens !== "number" || !entry.overrides;
        const session = needsSession && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
        const updatedAt = entry.updatedAt || entry.lastActiveAt || session?.stats?.lastActiveAt || session?.updated_at || session?.created_at;
        const updatedMs = Date.parse(updatedAt || "");
        if (cutoff && (!Number.isFinite(updatedMs) || updatedMs < cutoff)) return null;
        const messages =
          typeof messageLimit === "number" && messageLimit > 0 && Array.isArray(session?.conversation)
            ? session.conversation.slice(-messageLimit)
            : undefined;
        return {
          sessionId: entry.sessionId,
          sessionKey: entry.sessionKey,
          provider: entry.provider,
          chatType: entry.chatType,
          displayName: entry.displayName,
          updatedAt,
          totalMessages: entry.totalMessages ?? session?.stats?.totalMessages ?? session?.conversation?.length ?? 0,
          totalTokens: entry.totalTokens ?? session?.stats?.totalTokens ?? undefined,
          overrides: entry.overrides ?? session?.meta?.overrides,
          transcriptPath: p,
          messages
        };
      })
    : []) as any[];

  const extraRows = fs
    .readdirSync(sessionDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const sessionId = entry.name.replace(/\.json$/, "");
      if (indexedIds.has(sessionId)) return null;
      const p = path.join(sessionDir, entry.name);
      try {
        const session = JSON.parse(fs.readFileSync(p, "utf8"));
        const updatedAt = session?.stats?.lastActiveAt || session?.updated_at || session?.created_at;
        const updatedMs = Date.parse(updatedAt || "");
        if (cutoff && (!Number.isFinite(updatedMs) || updatedMs < cutoff)) return null;
        const messages =
          typeof messageLimit === "number" && messageLimit > 0 && Array.isArray(session?.conversation)
            ? session.conversation.slice(-messageLimit)
            : undefined;
        upsertSessionIndexEntry({
          workspaceDir,
          sessionId: session?.session_id || sessionId,
          sessionKey: session?.session_id || sessionId,
          updatedAt,
          lastActiveAt: session?.stats?.lastActiveAt,
          createdAt: session?.stats?.createdAt,
          totalMessages: session?.stats?.totalMessages ?? session?.conversation?.length ?? 0,
          totalTokens: session?.stats?.totalTokens ?? undefined,
          overrides: session?.meta?.overrides as Record<string, unknown> | undefined
        });
        return {
          sessionId: session?.session_id || sessionId,
          updatedAt,
          totalMessages: session?.stats?.totalMessages ?? session?.conversation?.length ?? 0,
          totalTokens: session?.stats?.totalTokens ?? undefined,
          overrides: session?.meta?.overrides,
          transcriptPath: p,
          messages
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as any[];

  rows.push(...extraRows);
  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return rows.slice(0, Math.max(1, Math.min(200, limit)));
}

function resolveSessionIdForPatch(params: {
  workspaceDir: string;
  cfg: any;
  sessionId?: string;
  sessionKey?: string;
  displayName?: string | null;
}): { sessionId: string; sessionKey?: string } {
  const requestedId = String(params.sessionId || "").trim();
  if (requestedId) return { sessionId: requestedId };
  const requestedKey = String(params.sessionKey || "").trim();
  if (!requestedKey) {
    const fallback = resolveMainSessionId(params.cfg);
    return { sessionId: fallback, sessionKey: fallback };
  }
  const resolved = getOrCreateSessionIdForKey({
    workspaceDir: params.workspaceDir,
    cfg: params.cfg,
    sessionKey: requestedKey,
    provider: "gateway",
    chatType: "direct",
    displayName: params.displayName ?? undefined
  });
  return { sessionId: resolved.sessionId, sessionKey: requestedKey };
}

export const sessionsListHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const limit = typeof record.limit === "number" ? record.limit : 50;
  const activeMinutes = typeof record.activeMinutes === "number" ? record.activeMinutes : undefined;
  const messageLimit = typeof record.messageLimit === "number" ? record.messageLimit : undefined;
  const sessions = listSessions(ctx.workspaceDir, limit, activeMinutes, messageLimit);
  return { ok: true, payload: { sessions } };
};

export const sessionsPatchHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const resolved = resolveSessionIdForPatch({
    workspaceDir: ctx.workspaceDir,
    cfg: ctx.cfg,
    sessionId: typeof record.sessionId === "string" ? record.sessionId : undefined,
    sessionKey: typeof record.sessionKey === "string" ? record.sessionKey : undefined,
    displayName: typeof record.displayName === "string" ? record.displayName : null
  });
  const sessionDir = path.join(ctx.workspaceDir, "sessions");
  const updated = patchSessionOverrides({
    sessionId: resolved.sessionId,
    sessionDir,
    patch: (record.overrides as Record<string, string | null>) || {}
  });
  upsertSessionIndexEntry({
    workspaceDir: ctx.workspaceDir,
    sessionId: updated.session_id,
    sessionKey: resolved.sessionKey,
    updatedAt: updated.updated_at,
    lastActiveAt: updated.stats?.lastActiveAt,
    createdAt: updated.stats?.createdAt,
    totalMessages: updated.stats?.totalMessages,
    totalTokens: updated.stats?.totalTokens,
    overrides: updated.meta?.overrides as Record<string, unknown> | undefined
  });
  const overrides = getSessionOverrides(updated);
  return {
    ok: true,
    payload: {
      sessionId: resolved.sessionId,
      sessionKey: resolved.sessionKey,
      overrides
    }
  };
};

export const sessionsResetHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const sessionId = typeof record.sessionId === "string" && record.sessionId.trim()
    ? record.sessionId.trim()
    : resolveMainSessionId(ctx.cfg);
  await resetSessionWithArchive({
    sessionId,
    workspaceDir: ctx.workspaceDir,
    repoRoot: ctx.repoRoot,
    cfg: ctx.cfg
  });
  return { ok: true, payload: { sessionId } };
};

export const sessionsCompactHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const sessionId = typeof record.sessionId === "string" && record.sessionId.trim()
    ? record.sessionId.trim()
    : resolveMainSessionId(ctx.cfg);
  const res = await compactSessionWithSummary({
    sessionId,
    workspaceDir: ctx.workspaceDir,
    repoRoot: ctx.repoRoot,
    cfg: ctx.cfg
  });
  return { ok: true, payload: { sessionId, summarizedCount: res.summarizedCount } };
};

export const sessionsHistoryHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const sessionId = typeof record.sessionId === "string" && record.sessionId.trim()
    ? record.sessionId.trim()
    : resolveMainSessionId(ctx.cfg);
  const limit = typeof record.limit === "number" ? Math.max(1, Math.min(500, record.limit)) : 200;
  const session = loadSession(sessionId, path.join(ctx.workspaceDir, "sessions"));
  if (!session) {
    return { ok: false, error: { code: "not_found", message: "session not found" } };
  }
  const conversation = Array.isArray(session.conversation)
    ? session.conversation.slice(-limit)
    : [];
  return { ok: true, payload: { sessionId, conversation } };
};
