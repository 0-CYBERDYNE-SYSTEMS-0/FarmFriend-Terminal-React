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
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { loadDefaultDotenv } from "../runtime/config/dotenv.js";
import { quickHealthCheck } from "../runtime/workspace/healthCheck.js";
import {
  ClientMessage,
  ServerMessage,
  isClientMessage,
  newSessionId,
  newTurnId,
  safeJsonParse,
  isValidSessionId
} from "./protocol.js";

const PORT = Number(process.env.FF_TERMINAL_PORT || 28888);
const DAEMON_VERSION = "0.0.0";

function loadLastActiveSession(workspaceDir: string): string | null {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    if (!fs.existsSync(filePath)) return null;

    const sessionId = fs.readFileSync(filePath, "utf8").trim();
    if (!isValidSessionId(sessionId)) {
      console.debug(`Invalid session ID format in ${filePath}, cleaning up`);
      cleanupLastActiveSession(workspaceDir);
      return null;
    }

    const sessionPath = path.join(workspaceDir, "sessions", `${sessionId}.json`);
    if (!fs.existsSync(sessionPath)) {
      console.debug(`Session file not found: ${sessionPath}, cleaning up`);
      cleanupLastActiveSession(workspaceDir);
      return null;
    }

    return sessionId;
  } catch (err) {
    console.debug(`Failed to load last active session: ${err}`);
    return null;
  }
}

function saveLastActiveSession(workspaceDir: string, sessionId: string): void {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, sessionId, "utf8");
  } catch (err) {
    console.warn(`Failed to save last active session: ${err}`);
  }
}

function cleanupLastActiveSession(workspaceDir: string): void {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.debug(`Failed to cleanup last active session file: ${err}`);
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

export async function startDaemon(): Promise<void> {
  const repoRoot = findRepoRoot();
  loadDefaultDotenv({ repoRoot });

  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  const runtimeCfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(
    (runtimeCfg as any).workspace_dir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot }
  );

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

  // Start WhatsApp integration if enabled
  let whatsappServer: any = null;
  const whatsappConfig = (runtimeCfg as any).whatsapp;
  if (whatsappConfig?.enabled) {
    try {
      const { WhatsAppServer } = await import("../whatsapp/whatsappServer.js");
      whatsappServer = new WhatsAppServer(whatsappConfig, registry, workspaceDir, repoRoot);
      await whatsappServer.start();
      // eslint-disable-next-line no-console
      console.log("✓ WhatsApp integration started");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to start WhatsApp integration:", error);
    }
  }

  // Cleanup on process exit
  process.on("SIGINT", async () => {
    if (whatsappServer) {
      await whatsappServer.stop();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    if (whatsappServer) {
      await whatsappServer.stop();
    }
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

      if (msg.type === "cancel_turn") {
        if (currentTurn?.id === msg.turnId) {
          currentTurn.controller.abort();
          send(ws, { type: "chunk", turnId: currentTurn.id, seq: 0, chunk: "canceled" });
        }
        return;
      }

      if (msg.type === "start_turn") {
        // Determine sessionId - either from client or load/create from workspace
        const resolvedSessionId = msg.sessionId ?? loadLastActiveSession(workspaceDir) ?? newSessionId();
        // Update the session tracker and persist to workspace
        sessionId = resolvedSessionId;
        saveLastActiveSession(workspaceDir, resolvedSessionId);

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
              const sendTodoUpdate = () => {
                try {
                  const todosPath = path.join(workspaceDir, "todos", "sessions", `${resolvedSessionId}.json`);
                  if (fs.existsSync(todosPath)) {
                    const todosData = JSON.parse(fs.readFileSync(todosPath, "utf8"));
                    if (todosData?.todos && Array.isArray(todosData.todos)) {
                      send(ws, { type: "todo_update", todos: todosData.todos });
                    }
                  }
                } catch {
                  // Silently ignore todo read errors - not critical
                }
              };

              for await (const chunk of runAgentTurn({
                userInput: msg.input,
                registry,
                sessionId: resolvedSessionId,
                signal: controller.signal
              })) {
                seq += 1;
                send(ws, { type: "chunk", turnId, seq, chunk: toWire(chunk) });

                // Check for todo updates after each chunk (real-time updates)
                sendTodoUpdate();

                if (chunk.kind === "task_completed") break;
              }

              // Ensure the UI receives the final todo state for this turn.
              sendTodoUpdate();
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
