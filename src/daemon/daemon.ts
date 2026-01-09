import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { ToolRegistry } from "../runtime/tools/registry.js";
import { registerAllTools } from "../runtime/registerDefaultTools.js";
import { resolveWorkspaceDir } from "../runtime/config/paths.js";
import { runAgentTurn } from "../runtime/agentLoop.js";
import { toWire } from "../runtime/streamProtocol.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { withToolContext, type SubagentEvent } from "../runtime/tools/context.js";
import { resolveConfig, type RuntimeConfig } from "../runtime/config/loadConfig.js";
import { loadDefaultDotenv } from "../runtime/config/dotenv.js";
import { quickHealthCheck } from "../runtime/workspace/healthCheck.js";
import { ensureCanonicalStructure } from "../runtime/workspace/migration.js";
import { loadMemorySnapshot, loadWorkspaceContractSnapshot, formatWorkspaceContractForPrompt, loadToolManifest } from "../runtime/workspace/contract.js";
import {
  saveLastActiveSession,
  resolveSessionId,
  resolveSessionMode,
  resolveMainSessionId
} from "../runtime/session/sessionPolicy.js";
import { resetSessionWithArchive, compactSessionWithSummary } from "../runtime/session/resetHelpers.js";
import { listSessionIndex, getOrCreateSessionIdForKey } from "../runtime/session/sessionIndex.js";
import { patchSessionOverrides, getSessionOverrides } from "../runtime/session/sessionOverrides.js";
import { buildSystemPrompt } from "../runtime/prompts/systemPrompt.js";
import { ALWAYS_ALLOWED_TOOLS } from "../runtime/hooks/builtin/skillAllowedToolsHook.js";
import { loadPlanStore, getActivePlan } from "../runtime/planning/planStore.js";
import { formatPlanForPrompt } from "../runtime/planning/planExtractor.js";
import { GatewayManager } from "../runtime/gateway/manager.js";
import { WhatsAppGateway } from "../runtime/gateway/channels/whatsappGateway.js";
import { IMessageGateway } from "../runtime/gateway/channels/imessageGateway.js";
import {
  ClientMessage,
  ServerMessage,
  isClientMessage,
  newTurnId,
  safeJsonParse
} from "./protocol.js";

const PORT = Number(process.env.FF_TERMINAL_PORT || 28888);
const DAEMON_VERSION = "0.0.0";

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

function listSessions(workspaceDir: string, limit = 50, activeMinutes?: number, messageLimit?: number): any[] {
  const sessionDir = path.join(workspaceDir, "sessions");
  if (!fs.existsSync(sessionDir)) return [];
  const cutoff = activeMinutes && activeMinutes > 0 ? Date.now() - activeMinutes * 60 * 1000 : null;
  const indexEntries = listSessionIndex(workspaceDir);
  const indexedIds = new Set(indexEntries.map((e) => e.sessionId));
  const rows = (indexEntries.length ? indexEntries.map((entry) => {
    const p = path.join(sessionDir, `${entry.sessionId}.json`);
    const session = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
    const updatedAt = entry.updatedAt || session?.stats?.lastActiveAt || session?.updated_at || session?.created_at;
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
      totalMessages: session?.stats?.totalMessages ?? session?.conversation?.length ?? 0,
      totalTokens: session?.stats?.totalTokens ?? undefined,
      overrides: session?.meta?.overrides,
      transcriptPath: p,
      messages
    };
  }) : []) as any[];

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

function buildSystemPromptForDebug(params: {
  sessionId: string;
  sessionMode: string;
  workspaceDir: string;
  repoRoot: string;
  cfg: RuntimeConfig;
  registry: ToolRegistry;
}): string {
  const snapshot = loadWorkspaceContractSnapshot(params.workspaceDir);
  const bootstrapActive = Boolean(snapshot.bootstrap?.trim());
  const contractSnapshot = formatWorkspaceContractForPrompt(snapshot);
  const memorySnapshot = loadMemorySnapshot(params.workspaceDir);

  const toolManifest = loadToolManifest(params.workspaceDir);
  const availableToolNames = (() => {
    if (!toolManifest?.tools?.length) return params.registry.listNames();
    const allowed = new Set<string>(toolManifest.tools);
    for (const t of ALWAYS_ALLOWED_TOOLS) allowed.add(t);
    return Array.from(allowed);
  })();
  const availableToolSet = new Set(availableToolNames);
  const enabledTools = Array.from(availableToolSet).sort((a, b) => a.localeCompare(b));
  const disabledTools = params.registry.listNames().filter((name) => !availableToolSet.has(name)).sort((a, b) => a.localeCompare(b));

  const planValidationEnabled = (params.cfg as any).plan_validation_enabled ?? false;
  let planContext = "";
  if (planValidationEnabled) {
    const planStore = loadPlanStore({ workspaceDir: params.workspaceDir, sessionId: params.sessionId });
    const plan = getActivePlan(planStore);
    if (plan) planContext = formatPlanForPrompt(plan);
  }

  const workingDir = process.cwd();

  return buildSystemPrompt({
    variant: (params.cfg.system_message_variant as any) ?? "a",
    repoRoot: params.repoRoot,
    workingDir,
    parallelMode: (params.cfg.parallel_mode as any) ?? true,
    skillSections: "",
    memorySnapshot,
    contractSnapshot,
    bootstrapActive,
    sessionId: params.sessionId,
    sessionMode: params.sessionMode,
    enabledTools,
    disabledTools,
    planContext,
    availableToolNames
  });
}

async function applyResetTrigger(params: {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  cfg: RuntimeConfig;
}): Promise<void> {
  await resetSessionWithArchive({
    sessionId: params.sessionId,
    workspaceDir: params.workspaceDir,
    repoRoot: params.repoRoot,
    cfg: params.cfg
  });
}

async function applyCompactTrigger(params: {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  cfg: RuntimeConfig;
}): Promise<{ summarizedCount: number }> {
  const res = await compactSessionWithSummary({
    sessionId: params.sessionId,
    workspaceDir: params.workspaceDir,
    repoRoot: params.repoRoot,
    cfg: params.cfg
  });
  return { summarizedCount: res.summarizedCount };
}

function resolveSessionIdForPatch(params: {
  workspaceDir: string;
  cfg: RuntimeConfig;
  sessionId?: string;
  sessionKey?: string;
  displayName?: string | null;
}): { sessionId: string; sessionKey?: string } {
  const requestedId = String(params.sessionId || "").trim();
  if (requestedId) return { sessionId: requestedId };

  const sessionKey = String(params.sessionKey || "").trim();
  if (sessionKey) {
    const entries = listSessionIndex(params.workspaceDir);
    const match = entries.find((e) => e.sessionKey === sessionKey);
    if (match?.sessionId) return { sessionId: match.sessionId, sessionKey };
    const created = getOrCreateSessionIdForKey({
      workspaceDir: params.workspaceDir,
      cfg: params.cfg,
      sessionKey,
      provider: "internal",
      chatType: "direct",
      displayName: params.displayName || undefined
    });
    return { sessionId: created.sessionId, sessionKey };
  }

  return { sessionId: resolveMainSessionId(params.cfg) };
}

export async function startDaemon(): Promise<void> {
  const repoRoot = findRepoRoot();
  loadDefaultDotenv({ repoRoot });

  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  const runtimeCfg = resolveConfig({ repoRoot });
  const sessionMode = resolveSessionMode(runtimeCfg);
  const mainSessionId = resolveMainSessionId(runtimeCfg);
  const workspaceDir = resolveWorkspaceDir(
    (runtimeCfg as any).workspace_dir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot }
  );
  ensureCanonicalStructure(workspaceDir);

  // eslint-disable-next-line no-console
  console.log(`[daemon] Session policy: mode=${sessionMode}, mainSessionId=${mainSessionId}`);

  const healthIssues = await quickHealthCheck(workspaceDir);
  if (healthIssues.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`⚠️  Workspace health issues detected. Run '/doctor' to fix.`);
    healthIssues.forEach((issue) => {
      // eslint-disable-next-line no-console
      console.warn(`   - ${issue.message}`);
    });
  }

  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir });

  const gateway = new GatewayManager({ workspaceDir });
  gateway.register(
    new WhatsAppGateway({
      config: (runtimeCfg as any).whatsapp,
      registry,
      workspaceDir,
      repoRoot,
      sessionMode,
      mainSessionId
    })
  );
  gateway.register(
    new IMessageGateway({
      config: (runtimeCfg as any).imessage,
      registry,
      workspaceDir,
      repoRoot
    })
  );

  try {
    await gateway.start();
    // eslint-disable-next-line no-console
    console.log("✓ Gateway started");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start gateway:", error);
  }

  // Cleanup on process exit
  process.on("SIGINT", async () => {
    await gateway.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await gateway.stop();
    process.exit(0);
  });

  wss.on("connection", (ws) => {
    let sessionId: string | null = null;
    let currentTurn: { id: string; controller: AbortController } | null = null;

    send(ws, { type: "hello", daemonVersion: DAEMON_VERSION });

    ws.on("message", async (raw) => {
      const parsed = safeJsonParse(raw);
      if (!isClientMessage(parsed)) {
        send(ws, { type: "chunk", turnId: currentTurn?.id ?? "", seq: 0, chunk: toWire({ kind: "error", message: "Invalid message" }) });
        return;
      }

      const msg = parsed as ClientMessage;

      if (msg.type === "hello") {
        return;
      }

      if (msg.type === "list_tools") {
        send(ws, { type: "tools", tools: registry.listNames() });
        return;
      }

      if (msg.type === "list_sessions") {
        const rows = listSessions(
          workspaceDir,
          Number(msg.limit ?? 50),
          msg.activeMinutes,
          msg.messageLimit
        );
        send(ws, { type: "sessions_list", sessions: rows });
        return;
      }

      if (msg.type === "patch_session") {
        try {
          const resolved = resolveSessionIdForPatch({
            workspaceDir,
            cfg: runtimeCfg,
            sessionId: msg.sessionId,
            sessionKey: msg.sessionKey,
            displayName: msg.displayName ?? null
          });
          const sessionDir = path.join(workspaceDir, "sessions");
          const updated = patchSessionOverrides({
            sessionId: resolved.sessionId,
            sessionDir,
            patch: msg.overrides || {}
          });
          const overrides = getSessionOverrides(updated);
          send(ws, {
            type: "session_patched",
            ok: true,
            sessionId: resolved.sessionId,
            sessionKey: resolved.sessionKey,
            overrides
          });
        } catch (err) {
          send(ws, {
            type: "session_patched",
            ok: false,
            sessionId: msg.sessionId,
            sessionKey: msg.sessionKey,
            error: err instanceof Error ? err.message : String(err)
          });
        }
        return;
      }

      if (msg.type === "cancel_turn") {
        if (currentTurn?.id === msg.turnId) {
          currentTurn.controller.abort();
          send(ws, { type: "chunk", turnId: currentTurn.id, seq: 0, chunk: "canceled" });
        }
        return;
      }

      if (msg.type === "start_turn") {
        // Determine sessionId - either from client or load/create from workspace
        const resolvedSessionId = resolveSessionId({
          requested: msg.sessionId,
          workspaceDir,
          cfg: runtimeCfg,
          mode: sessionMode
        });
        // Update the session tracker and persist to workspace
        sessionId = resolvedSessionId;
        saveLastActiveSession(workspaceDir, resolvedSessionId);

        // eslint-disable-next-line no-console
        console.log(`[daemon] Starting turn for session: ${resolvedSessionId}`);

        if (resolvedSessionId === mainSessionId) {
          getOrCreateSessionIdForKey({
            workspaceDir,
            cfg: runtimeCfg,
            sessionKey: "main",
            provider: "internal",
            chatType: "direct",
            displayName: "main"
          });
        }

        let input = msg.input;
        let resetTriggered = false;
        let resetRemainder = "";
        let compactTriggered = false;
        let compactRemainder = "";
        let systemTriggered = false;
        if (typeof input === "string") {
          const trimmed = input.trim();
          if (/^\/(reset|new)\b/i.test(trimmed)) {
            resetTriggered = true;
            resetRemainder = trimmed.replace(/^\/(reset|new)\b/i, "").trim();
          } else if (/^\/compact\b/i.test(trimmed)) {
            compactTriggered = true;
            compactRemainder = trimmed.replace(/^\/compact\b/i, "").trim();
          } else if (/^\/system\b/i.test(trimmed)) {
            systemTriggered = true;
          }
        }

        if (resetTriggered) {
          await applyResetTrigger({ sessionId: resolvedSessionId, workspaceDir, repoRoot, cfg: runtimeCfg });
          if (!resetRemainder) {
            const resetTurnId = newTurnId();
            send(ws, { type: "turn_started", sessionId: resolvedSessionId, turnId: resetTurnId });
            let seq = 0;
            send(ws, { type: "chunk", turnId: resetTurnId, seq: (seq += 1), chunk: toWire({ kind: "content", delta: "Session reset. Start a new conversation." }) });
            send(ws, { type: "turn_finished", turnId: resetTurnId, ok: true });
            return;
          }
          input = resetRemainder;
        }

        if (compactTriggered) {
          const result = await applyCompactTrigger({ sessionId: resolvedSessionId, workspaceDir, repoRoot, cfg: runtimeCfg });
          if (!compactRemainder) {
            const compactTurnId = newTurnId();
            send(ws, { type: "turn_started", sessionId: resolvedSessionId, turnId: compactTurnId });
            let seq = 0;
            send(ws, {
              type: "chunk",
              turnId: compactTurnId,
              seq: (seq += 1),
              chunk: toWire({
                kind: "content",
                delta: result.summarizedCount > 0
                  ? `Session compacted (${result.summarizedCount} messages summarized).`
                  : "Session compacted (no changes needed)."
              })
            });
            send(ws, { type: "turn_finished", turnId: compactTurnId, ok: true });
            return;
          }
          input = compactRemainder;
        }

        if (systemTriggered) {
          const systemPrompt = buildSystemPromptForDebug({
            sessionId: resolvedSessionId,
            sessionMode,
            workspaceDir,
            repoRoot,
            cfg: runtimeCfg,
            registry
          });
          const sysTurnId = newTurnId();
          send(ws, { type: "turn_started", sessionId: resolvedSessionId, turnId: sysTurnId });
          let seq = 0;
          send(ws, { type: "chunk", turnId: sysTurnId, seq: (seq += 1), chunk: toWire({ kind: "content", delta: systemPrompt }) });
          send(ws, { type: "turn_finished", turnId: sysTurnId, ok: true });
          return;
        }

        currentTurn?.controller.abort();
        const controller = new AbortController();
        const turnId = newTurnId();
        currentTurn = { id: turnId, controller };

        send(ws, { type: "turn_started", sessionId: resolvedSessionId, turnId });

        let seq = 0;
        try {
          await withToolContext(
            {
              sessionId: resolvedSessionId,
              workspaceDir,
              repoRoot,
              emitSubagentEvent: (event: SubagentEvent) => {
                // Convert subagent event to WebSocket message and send immediately
                if (event.event === "start") {
                  send(ws, {
                    type: "subagent_start",
                    agentId: event.agentId,
                    task: event.task || ""
                  });
                } else if (event.event === "progress") {
                  send(ws, {
                    type: "subagent_progress",
                    agentId: event.agentId,
                    action: event.action || "",
                    file: event.file,
                    toolCount: event.toolCount || 0,
                    tokens: event.tokens || 0
                  });
                } else if (event.event === "complete") {
                  send(ws, {
                    type: "subagent_complete",
                    agentId: event.agentId,
                    status: event.status || "done",
                    error: event.error
                  });
                }
              }
            },
            async () => {
              for await (const chunk of runAgentTurn({
                userInput: input,
                registry,
                sessionId: resolvedSessionId,
                signal: controller.signal
              })) {
                seq += 1;
                send(ws, { type: "chunk", turnId, seq, chunk: toWire(chunk) });

                // Check for todo updates after each chunk (real-time updates)
                try {
                  const todosPath = path.join(workspaceDir, "todos", "sessions", `${resolvedSessionId}.json`);
                  if (fs.existsSync(todosPath)) {
                    const todosData = JSON.parse(fs.readFileSync(todosPath, "utf8"));
                    if (todosData?.todos && Array.isArray(todosData.todos)) {
                      send(ws, { type: "todo_update", todos: todosData.todos });
                    }
                  }
                } catch (err) {
                  // Silently ignore todo read errors - not critical
                }

                if (chunk.kind === "task_completed") break;
              }
            }
          );

          send(ws, { type: "turn_finished", turnId, ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          seq += 1;
          send(ws, { type: "chunk", turnId, seq, chunk: toWire({ kind: "error", message }) });
          send(ws, { type: "chunk", turnId, seq: seq + 1, chunk: toWire({ kind: "task_completed" }) });
          send(ws, { type: "turn_finished", turnId, ok: false, error: message });
        }
      }
    });

    ws.on("close", () => {
      currentTurn?.controller.abort();
      currentTurn = null;
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(PORT, "127.0.0.1", () => resolve());
  });

  // eslint-disable-next-line no-console
  console.log(`ff-terminal daemon listening on ws://127.0.0.1:${PORT}`);
}

const argv1 = process.argv[1] || "";
const isMain =
  argv1.endsWith("/daemon.ts") ||
  argv1.endsWith("\\daemon.ts") ||
  (argv1 ? import.meta.url === pathToFileURL(argv1).href : false);

if (isMain) {
  startDaemon().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
