import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL, pathToFileURL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import fs from "node:fs";
import type { Socket } from "node:net";
import path from "node:path";
import os from "node:os";

import { ToolRegistry } from "../runtime/tools/registry.js";
import { registerAllTools } from "../runtime/registerDefaultTools.js";
import { resolveWorkspaceDir } from "../runtime/config/paths.js";
import { runAgentTurn } from "../runtime/agentLoop.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { createSession, loadSession, saveSession } from "../runtime/session/sessionStore.js";
import { loadDefaultDotenv } from "../runtime/config/dotenv.js";
import { withToolContext } from "../runtime/tools/context.js";

type ClientMessage =
  | { type: "command"; data: { command: string } }
  | { type: "ping" }
  | { type: "get_history" }
  | { type: "clear_session" };

function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const obj = JSON.parse(raw) as any;
    if (!obj || typeof obj !== "object") return null;
    if (obj.type === "ping") return { type: "ping" };
    if (obj.type === "get_history") return { type: "get_history" };
    if (obj.type === "clear_session") return { type: "clear_session" };
    if (obj.type === "command" && typeof obj.data?.command === "string") {
      return { type: "command", data: { command: obj.data.command } };
    }
    return null;
  } catch {
    return null;
  }
}

function sendJson(ws: WebSocket, payload: unknown): void {
  ws.send(JSON.stringify(payload));
}

const PORT = Number(process.env.FF_WEB_PORT || 8787);

export async function startWebServer(): Promise<void> {
  const repoRoot = findRepoRoot();
  loadDefaultDotenv({ repoRoot });
  const runtimeCfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(
    (runtimeCfg as any).workspace_dir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot }
  );
  const sessionDir = path.join(workspaceDir, "sessions");
  const frontendDistDirRaw = process.env.FF_FRONTEND_DIST_DIR;
  const frontendDistDir = frontendDistDirRaw && frontendDistDirRaw.trim()
    ? path.resolve(frontendDistDirRaw.trim().replace(/^~(?=$|\/)/, os.homedir()))
    : path.join(repoRoot, "web-frontend-dist");
  const bundledFrontendDistDir = path.join(
    repoRoot,
    "reference source code python ver",
    "ff_terminal",
    "web",
    "frontend",
    "dist"
  );

  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir });

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    // Minimal health endpoint to make local orchestration easier.
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }) + "\n");
      return;
    }

    // Serve the existing React frontend build if present.
    const selectedDistDir =
      fs.existsSync(frontendDistDir) && fs.statSync(frontendDistDir).isDirectory()
        ? frontendDistDir
        : fs.existsSync(bundledFrontendDistDir) && fs.statSync(bundledFrontendDistDir).isDirectory()
          ? bundledFrontendDistDir
          : null;
    if (selectedDistDir) {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const pathname = decodeURIComponent(url.pathname);
      const rel = pathname === "/" ? "/index.html" : pathname;
      const filePath = path.join(selectedDistDir, rel);

      // Prevent path traversal.
      if (!filePath.startsWith(selectedDistDir)) {
        res.writeHead(400);
        res.end();
        return;
      }

      let actualPath = filePath;
      if (!fs.existsSync(actualPath) || fs.statSync(actualPath).isDirectory()) {
        actualPath = path.join(selectedDistDir, "index.html");
      }

      try {
        const ext = path.extname(actualPath).toLowerCase();
        const contentType =
          ext === ".html"
            ? "text/html; charset=utf-8"
            : ext === ".js"
              ? "application/javascript; charset=utf-8"
              : ext === ".css"
                ? "text/css; charset=utf-8"
                : ext === ".svg"
                  ? "image/svg+xml"
                  : ext === ".json"
                    ? "application/json; charset=utf-8"
                    : "application/octet-stream";
        res.writeHead(200, { "content-type": contentType });
        res.end(fs.readFileSync(actualPath));
        return;
      } catch {
        res.writeHead(500);
        res.end();
        return;
      }
    }

    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const m = url.pathname.match(/^\/ws\/terminal\/([^/]+)$/);
    if (!m) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, req, { sessionId: m[1] });
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, info: any) => {
    const sessionId = String(info?.sessionId || "default-session");

    // Create or load session so that history endpoints are meaningful immediately.
    const session = loadSession(sessionId, sessionDir) ?? createSession(sessionId);
    saveSession(session, sessionDir);

    sendJson(ws, {
      type: "system",
      content: `Connected to FF-Terminal (TS) session ${sessionId}`,
      session_id: sessionId,
      timestamp: Date.now() / 1000
    });

    let controller: AbortController | null = null;

    ws.on("message", async (buf: WebSocket.RawData) => {
      const msg = parseClientMessage(String(buf));
      if (!msg) {
        sendJson(ws, {
          type: "error",
          content: "Invalid message",
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
        return;
      }

      if (msg.type === "ping") {
        sendJson(ws, { type: "pong", session_id: sessionId, timestamp: Date.now() / 1000 });
        return;
      }

      if (msg.type === "get_history") {
        const s = loadSession(sessionId, sessionDir) ?? createSession(sessionId);
        sendJson(ws, {
          type: "history",
          content: JSON.stringify(s.conversation, null, 2),
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
        return;
      }

      if (msg.type === "clear_session") {
        const cleared = createSession(sessionId);
        saveSession(cleared, sessionDir);
        sendJson(ws, {
          type: "system",
          content: "Session cleared",
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
        return;
      }

      if (msg.type === "command") {
        const command = msg.data.command.trim();
        if (!command) return;

        controller?.abort();
        controller = new AbortController();
        const localController = controller;

        sendJson(ws, {
          type: "command_received",
          content: `Executing: ${command}`,
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });

        try {
          await withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
            for await (const chunk of runAgentTurn({
              userInput: command,
              registry,
              sessionId,
              repoRoot,
              signal: localController.signal
            })) {
              if (chunk.kind === "content") {
                sendJson(ws, {
                  type: "response",
                  content: chunk.delta,
                  session_id: sessionId,
                  timestamp: Date.now() / 1000
                });
              } else if (chunk.kind === "thinking") {
                sendJson(ws, {
                  type: "thinking",
                  content: chunk.delta,
                  session_id: sessionId,
                  timestamp: Date.now() / 1000
                });
              } else if (chunk.kind === "status") {
                if (chunk.message.startsWith("tool_start:")) {
                  const tool_name = chunk.message.slice("tool_start:".length).trim();
                  sendJson(ws, {
                    type: "tool_call",
                    tool_name,
                    content: `Executing: ${tool_name}`,
                    session_id: sessionId,
                    timestamp: Date.now() / 1000
                  });
                  continue;
                }
                sendJson(ws, {
                  type: "system",
                  content: chunk.message,
                  session_id: sessionId,
                  timestamp: Date.now() / 1000
                });
              } else if (chunk.kind === "error") {
                sendJson(ws, {
                  type: "error",
                  content: chunk.message,
                  session_id: sessionId,
                  timestamp: Date.now() / 1000
                });
              }

              if (chunk.kind === "task_completed") break;
            }
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          sendJson(ws, {
            type: "error",
            content: message,
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        }
      }
    });

    ws.on("close", () => {
      controller?.abort();
      controller = null;
    });
  });

  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", () => resolve()));
  // eslint-disable-next-line no-console
  console.log(`ff-terminal web server listening on http://127.0.0.1:${PORT} (ws /ws/terminal/:session)`); 
}

const argv1 = process.argv[1] || "";
const isMain =
  argv1.endsWith("/server.ts") ||
  argv1.endsWith("\\server.ts") ||
  (argv1 ? import.meta.url === pathToFileURL(argv1).href : false);

if (isMain) {
  startWebServer().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
