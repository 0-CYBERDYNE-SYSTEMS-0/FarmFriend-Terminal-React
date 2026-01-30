import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ToolRegistry } from "../registry.js";
import { registerDefaultTools } from "../../registerDefaultTools.js";
import { runAgentTurn } from "../../agentLoop.js";
import { withToolContext, getToolContext } from "../context.js";
import { resolveWorkspaceDir } from "../../config/paths.js";
import { resolveConfig } from "../../config/loadConfig.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { resolveMainSessionId } from "../../session/sessionPolicy.js";
import { loadSession, type SessionFile } from "../../session/sessionStore.js";
import type { AnnouncebackRequest } from "../../announceback/queue.js";
import { listSessionIndex, upsertSessionIndexEntry } from "../../session/sessionIndex.js";

type ListArgs = {
  limit?: number;
  activeMinutes?: number;
  messageLimit?: number;
};

type HistoryArgs = {
  sessionId?: string;
  limit?: number;
};

type SendArgs = {
  sessionId?: string;
  message?: string;
};

type SpawnArgs = {
  task?: string;
  label?: string;
  model?: string;
  cleanup?: "delete" | "keep" | string;
};

type SpawnAsyncArgs = {
  task?: string;
  label?: string;
  model?: string;
  announce_prefix?: string;
};

function safeLoadSession(p: string): SessionFile | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as SessionFile;
  } catch {
    return null;
  }
}

export async function sessionsListTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as ListArgs;
  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const cfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });
  const sessionDir = path.join(workspaceDir, "sessions");
  const mainSessionId = resolveMainSessionId(cfg);

  const limit = Math.max(1, Math.min(200, Number(args?.limit ?? 50)));
  const activeMinutes = Number(args?.activeMinutes ?? 0);
  const messageLimit = Math.max(0, Math.min(50, Number(args?.messageLimit ?? 0)));

  const cutoff = activeMinutes > 0 ? Date.now() - activeMinutes * 60 * 1000 : null;

  const indexEntries = listSessionIndex(workspaceDir);
  const indexedIds = new Set(indexEntries.map((e) => e.sessionId));
  const rows = (indexEntries.length ? indexEntries
    .map((entry) => {
      const p = path.join(sessionDir, `${entry.sessionId}.json`);
      const needsSession = messageLimit > 0 || typeof entry.totalMessages !== "number" || typeof entry.totalTokens !== "number" || !entry.overrides;
      const session = needsSession ? safeLoadSession(p) : null;
      const updatedAt = entry.updatedAt || entry.lastActiveAt || session?.stats?.lastActiveAt || session?.updated_at || session?.created_at;
      const updatedMs = Date.parse(updatedAt || "");
      if (cutoff && (!Number.isFinite(updatedMs) || updatedMs < cutoff)) return null;
      const messages = messageLimit > 0 ? session?.conversation?.slice(-messageLimit) : undefined;
      return {
        sessionId: entry.sessionId,
        sessionKey: entry.sessionKey,
        provider: entry.provider,
        chatType: entry.chatType,
        displayName: entry.displayName,
        kind: entry.sessionId === mainSessionId ? "main" : "other",
        updatedAt,
        totalMessages: entry.totalMessages ?? session?.stats?.totalMessages ?? session?.conversation?.length ?? 0,
        totalTokens: entry.totalTokens ?? session?.stats?.totalTokens ?? undefined,
        overrides: entry.overrides ?? session?.meta?.overrides,
        transcriptPath: p,
        messages
      };
    }) : [])
    .filter(Boolean) as Array<Record<string, unknown>>;

  const extraRows = fs
    .readdirSync(sessionDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const sessionId = entry.name.replace(/\.json$/, "");
      if (indexedIds.has(sessionId)) return null;
      const p = path.join(sessionDir, entry.name);
      const session = safeLoadSession(p);
      if (!session) return null;
      const updatedAt = session.stats?.lastActiveAt || session.updated_at || session.created_at;
      const updatedMs = Date.parse(updatedAt || "");
      if (cutoff && (!Number.isFinite(updatedMs) || updatedMs < cutoff)) return null;
      const messages = messageLimit > 0 ? session.conversation.slice(-messageLimit) : undefined;
      upsertSessionIndexEntry({
        workspaceDir,
        sessionId: session.session_id,
        sessionKey: session.session_id,
        updatedAt,
        lastActiveAt: session.stats?.lastActiveAt,
        createdAt: session.stats?.createdAt,
        totalMessages: session.stats?.totalMessages ?? session.conversation.length,
        totalTokens: session.stats?.totalTokens,
        overrides: session.meta?.overrides as Record<string, unknown> | undefined
      });
      return {
        sessionId: session.session_id,
        kind: session.session_id === mainSessionId ? "main" : "other",
        updatedAt,
        totalMessages: session.stats?.totalMessages ?? session.conversation.length,
        totalTokens: session.stats?.totalTokens ?? undefined,
        overrides: session?.meta?.overrides,
        transcriptPath: p,
        messages
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  rows.push(...extraRows);

  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  return JSON.stringify({ ok: true, sessions: rows.slice(0, limit) }, null, 2);
}

export async function sessionsHistoryTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as HistoryArgs;
  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const cfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });
  const sessionDir = path.join(workspaceDir, "sessions");
  const sessionId =
    String(args?.sessionId || "").trim() ||
    ctx?.sessionId ||
    resolveMainSessionId(cfg);

  const session = loadSession(sessionId, sessionDir);
  if (!session) throw new Error(`sessions_history: session not found (${sessionId})`);

  const limit = Math.max(0, Math.min(200, Number(args?.limit ?? 0)));
  const messages = limit > 0 ? session.conversation.slice(-limit) : session.conversation;

  return JSON.stringify(
    {
      ok: true,
      sessionId,
      messages
    },
    null,
    2
  );
}

export async function sessionsSendTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as SendArgs;
  const message = String(args?.message || "").trim();
  if (!message) throw new Error("sessions_send: missing args.message");

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const cfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });
  const sessionId =
    String(args?.sessionId || "").trim() ||
    resolveMainSessionId(cfg);

  const registry = new ToolRegistry();
  registerDefaultTools(registry, { workspaceDir });
  registry.unregister("sessions_list");
  registry.unregister("sessions_history");
  registry.unregister("sessions_send");
  registry.unregister("sessions_spawn");
  registry.unregister("sessions_spawn_async");

  let content = "";
  let error: string | null = null;

  await withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
    try {
      for await (const chunk of runAgentTurn({
        userInput: message,
        registry,
        sessionId,
        repoRoot,
        signal
      })) {
        if (chunk.kind === "content") content += chunk.delta;
        if (chunk.kind === "error") error = chunk.message;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  });

  return JSON.stringify(
    {
      ok: !error,
      sessionId,
      content: content.trim(),
      error: error || undefined
    },
    null,
    2
  );
}

export async function sessionsSpawnTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as SpawnArgs;
  const task = String(args?.task || "").trim();
  if (!task) throw new Error("sessions_spawn: missing args.task");

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const cfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });
  const sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const modelOverride = String(args?.model || "").trim() || undefined;

  const registry = new ToolRegistry();
  registerDefaultTools(registry, { workspaceDir });
  registry.unregister("sessions_list");
  registry.unregister("sessions_history");
  registry.unregister("sessions_send");
  registry.unregister("sessions_spawn");
  registry.unregister("sessions_spawn_async");
  registry.unregister("subagent_tool");

  let content = "";
  let error: string | null = null;

  await withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
    try {
      for await (const chunk of runAgentTurn({
        userInput: task,
        registry,
        sessionId,
        repoRoot,
        modelOverride,
        signal
      })) {
        if (chunk.kind === "content") content += chunk.delta;
        if (chunk.kind === "error") error = chunk.message;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  });

  if (String(args?.cleanup || "").toLowerCase() === "delete") {
    const sessionPath = path.join(workspaceDir, "sessions", `${sessionId}.json`);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.unlinkSync(sessionPath);
      } catch {
        // ignore cleanup failures
      }
    }
  }

  return JSON.stringify(
    {
      ok: !error,
      sessionId,
      label: args?.label,
      content: content.trim(),
      error: error || undefined
    },
    null,
    2
  );
}

export async function sessionsSpawnAsyncTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as SpawnAsyncArgs;
  const task = String(args?.task || "").trim();
  if (!task) throw new Error("sessions_spawn_async: missing args.task");

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ?? findRepoRoot();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined, { repoRoot });
  const sessionId = `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const replyTarget = ctx?.replyTarget ?? (ctx?.sessionId ? { kind: "daemon", sessionId: ctx.sessionId } : undefined);
  const announceback: AnnouncebackRequest | null = replyTarget
    ? {
        target: replyTarget,
        label: args?.label,
        prefix: args?.announce_prefix,
        parentSessionId: ctx?.sessionId,
        sourceSessionId: sessionId
      }
    : null;

  const distCli = path.join(repoRoot, "dist", "bin", "ff-terminal.js");
  const hasDist = fs.existsSync(distCli);

  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  if (workspaceDir) env.FF_WORKSPACE_DIR = workspaceDir;
  if (args?.model?.trim()) env.FF_MODEL = args.model.trim();
  if (announceback) env.FF_ANNOUNCEBACK = JSON.stringify(announceback);

  const cliArgs = hasDist
    ? [distCli, "run", "--headless", "--prompt", task, "--session", sessionId]
    : ["src/bin/ff-terminal.ts", "run", "--headless", "--prompt", task, "--session", sessionId];

  const localTsx = path.join(repoRoot, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  const tsxCmd = fs.existsSync(localTsx) ? localTsx : "tsx";
  const cliCmd = hasDist ? process.execPath : tsxCmd;

  const child = spawn(cliCmd, cliArgs, {
    env,
    stdio: "ignore",
    detached: true,
    shell: !hasDist
  });
  child.unref();

  return JSON.stringify(
    {
      ok: true,
      sessionId,
      label: args?.label,
      announceback: Boolean(announceback)
    },
    null,
    2
  );
}
