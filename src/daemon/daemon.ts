import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { ToolRegistry } from "../runtime/tools/registry.js";
import { registerAllTools } from "../runtime/registerDefaultTools.js";
import { defaultWorkspaceDir, resolveWorkspaceDir } from "../runtime/config/paths.js";
import { runAgentTurn } from "../runtime/agentLoop.js";
import { toWire } from "../runtime/streamProtocol.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { withToolContext } from "../runtime/tools/context.js";
import { loadDefaultDotenv } from "../runtime/config/dotenv.js";
import { quickHealthCheck } from "../runtime/workspace/healthCheck.js";
import {
  ClientMessage,
  ServerMessage,
  isClientMessage,
  newSessionId,
  newTurnId,
  safeJsonParse
} from "./protocol.js";

const PORT = Number(process.env.FF_TERMINAL_PORT || 28888);
const DAEMON_VERSION = "0.0.0";

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

export async function startDaemon(): Promise<void> {
  const repoRoot = findRepoRoot();
  loadDefaultDotenv({ repoRoot });

  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  const workspaceDir = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR ?? undefined);
  const localWs = repoRoot ? path.join(repoRoot, "ff-terminal-workspace") : null;
  if (localWs && path.normalize(localWs) !== path.normalize(workspaceDir) && fs.existsSync(localWs)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Warning: found repo-local workspace at ${localWs} but using canonical workspace ${workspaceDir}. Files in the repo-local copy will be ignored.`
    );
  }

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

  wss.on("connection", (ws) => {
    let sessionId = newSessionId();
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
        if (msg.sessionId) sessionId = msg.sessionId;

        currentTurn?.controller.abort();
        const controller = new AbortController();
        const turnId = newTurnId();
        currentTurn = { id: turnId, controller };

        send(ws, { type: "turn_started", sessionId, turnId });

        let seq = 0;
        try {
          await withToolContext(
            { sessionId, workspaceDir, repoRoot },
            async () => {
              for await (const chunk of runAgentTurn({
                userInput: msg.input,
                registry,
                sessionId,
                signal: controller.signal
              })) {
                seq += 1;
                send(ws, { type: "chunk", turnId, seq, chunk: toWire(chunk) });
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
