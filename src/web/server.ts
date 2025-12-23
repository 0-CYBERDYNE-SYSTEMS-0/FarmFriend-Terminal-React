import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL, pathToFileURL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import fs from "node:fs";
import type { Socket } from "node:net";
import path from "node:path";
import os from "node:os";

import { findRepoRoot } from "../runtime/config/repoRoot.js";

// Types for web client messages (existing protocol)
type WebClientMessage =
  | { type: "command"; data: { command: string } }
  | { type: "ping" }
  | { type: "get_history" }
  | { type: "clear_session" };

// Types for web server responses (existing protocol)
type WebServerMessage =
  | { type: "system"; content: string; session_id: string; timestamp: number }
  | { type: "response"; content: string; session_id: string; timestamp: number }
  | { type: "thinking"; content: string; session_id: string; timestamp: number }
  | { type: "tool_call"; tool_name: string; content: string; session_id: string; timestamp: number }
  | { type: "error"; content: string; session_id: string; timestamp: number }
  | { type: "pong"; session_id: string; timestamp: number }
  | { type: "command_received"; content: string; session_id: string; timestamp: number }
  | { type: "history"; content: string; session_id: string; timestamp: number };

// Daemon protocol types (from src/daemon/protocol.ts)
type DaemonClientMessage =
  | { type: "hello"; client: "ink" | "web"; version?: string }
  | { type: "start_turn"; input: string; sessionId?: string }
  | { type: "cancel_turn"; turnId: string }
  | { type: "list_tools" };

type DaemonServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "tools"; tools: string[] };

const DAEMON_PORT = Number(process.env.FF_TERMINAL_PORT || 28888);
const WEB_PORT = Number(process.env.FF_WEB_PORT || 8787);

function parseWebClientMessage(raw: string): WebClientMessage | null {
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

function parseDaemonChunk(chunk: string): { kind: string; content?: string } {
  if (chunk === "task_completed") return { kind: "task_completed" };
  if (chunk.startsWith("content:")) return { kind: "content", content: chunk.slice(8) };
  if (chunk.startsWith("thinking:")) return { kind: "thinking", content: chunk.slice(9) };
  if (chunk.startsWith("error:")) return { kind: "error", content: chunk.slice(6) };
  if (chunk.startsWith("status:")) {
    const msg = chunk.slice(7);
    if (msg.startsWith("tool_start:")) {
      const toolName = msg.split("|")[0].replace("tool_start:", "").trim();
      return { kind: "tool_start", content: toolName };
    }
    return { kind: "status", content: msg };
  }
  return { kind: "unknown", content: chunk };
}

function sendWebMessage(ws: WebSocket, msg: WebServerMessage): void {
  ws.send(JSON.stringify(msg));
}

// Daemon connection pool - reuse connections per session
const daemonConnections = new Map<string, WebSocket>();

function getDaemonConnection(sessionId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Check if we already have a connection
    const existing = daemonConnections.get(sessionId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      resolve(existing);
      return;
    }

    // Create new connection
    const ws = new WebSocket(`ws://127.0.0.1:${DAEMON_PORT}`);

    ws.on("open", () => {
      // Send hello to daemon
      ws.send(JSON.stringify({ type: "hello", client: "web", version: "1.0.0" } as DaemonClientMessage));
      daemonConnections.set(sessionId, ws);
      resolve(ws);
    });

    ws.on("error", (err) => {
      reject(err);
    });

    ws.on("close", () => {
      daemonConnections.delete(sessionId);
    });
  });
}

export async function startWebServer(): Promise<void> {
  const repoRoot = findRepoRoot();
  const frontendDistDirRaw = process.env.FF_FRONTEND_DIST_DIR;

  // New Vite frontend (highest priority)
  const newFrontendDistDir = path.join(repoRoot, "src", "web", "client", "dist");
  // Old cyberpunk frontend
  const frontendDistDir = frontendDistDirRaw && frontendDistDirRaw.trim()
    ? path.resolve(frontendDistDirRaw.trim().replace(/^~(?=$|\/)/, os.homedir()))
    : path.join(repoRoot, "web-frontend-dist");
  // Python reference frontend
  const bundledFrontendDistDir = path.join(
    repoRoot,
    "reference source code python ver",
    "ff_terminal",
    "web",
    "frontend",
    "dist"
  );

  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    // Health endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }) + "\n");
      return;
    }

    // Serve React frontend build - check in priority order
    const selectedDistDir =
      fs.existsSync(newFrontendDistDir) && fs.statSync(newFrontendDistDir).isDirectory()
        ? newFrontendDistDir
        : fs.existsSync(frontendDistDir) && fs.statSync(frontendDistDir).isDirectory()
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

  wss.on("connection", async (webWs: WebSocket, _req: IncomingMessage, info: any) => {
    const sessionId = String(info?.sessionId || "default-session");
    let daemonWs: WebSocket | null = null;
    let currentTurnId: string | null = null;

    // Send initial connection message
    sendWebMessage(webWs, {
      type: "system",
      content: `Connected to FF-Terminal (TS) session ${sessionId}`,
      session_id: sessionId,
      timestamp: Date.now() / 1000
    });

    // Set up daemon connection first BEFORE handling web client messages
    try {
      daemonWs = await getDaemonConnection(sessionId);

      // Set up daemon message listener
      daemonWs.on("message", (data: Buffer) => {
        const msg = JSON.parse(data.toString()) as DaemonServerMessage;

        if (msg.type === "turn_started") {
          currentTurnId = msg.turnId;
          return;
        }

        if (msg.type === "chunk") {
          const parsed = parseDaemonChunk(msg.chunk);

          if (parsed.kind === "content") {
            sendWebMessage(webWs, {
              type: "response",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "thinking") {
            sendWebMessage(webWs, {
              type: "thinking",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "error") {
            sendWebMessage(webWs, {
              type: "error",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "tool_start") {
            sendWebMessage(webWs, {
              type: "tool_call",
              tool_name: parsed.content || "",
              content: `Executing: ${parsed.content}`,
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "status") {
            sendWebMessage(webWs, {
              type: "system",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "task_completed") {
            // Turn complete
          }
        }

        if (msg.type === "turn_finished") {
          currentTurnId = null;
        }
      });

      daemonWs.on("error", (err) => {
        sendWebMessage(webWs, {
          type: "error",
          content: `Daemon connection error: ${err.message}`,
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
      });

      daemonWs.on("close", () => {
        daemonWs = null;
      });

    } catch (err) {
      sendWebMessage(webWs, {
        type: "error",
        content: err instanceof Error ? err.message : String(err),
        session_id: sessionId,
        timestamp: Date.now() / 1000
      });
    }

    // Handle messages from web client
    webWs.on("message", async (buf: WebSocket.RawData) => {
      const msg = parseWebClientMessage(String(buf));
      if (!msg) {
        sendWebMessage(webWs, {
          type: "error",
          content: "Invalid message",
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
        return;
      }

      if (msg.type === "ping") {
        sendWebMessage(webWs, { type: "pong", session_id: sessionId, timestamp: Date.now() / 1000 });
        return;
      }

      if (msg.type === "get_history") {
        // History is stored in daemon workspace - need to implement via daemon or file read
        // For now, return placeholder
        sendWebMessage(webWs, {
          type: "history",
          content: "[]",
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
        return;
      }

      if (msg.type === "clear_session") {
        // Start a new turn with clear command
        try {
          daemonWs = await getDaemonConnection(sessionId);
          daemonWs.send(JSON.stringify({
            type: "start_turn",
            input: "/clear",
            sessionId
          } as DaemonClientMessage));
        } catch (err) {
          sendWebMessage(webWs, {
            type: "error",
            content: err instanceof Error ? err.message : String(err),
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        }
        return;
      }

      if (msg.type === "command") {
        const command = msg.data.command.trim();
        if (!command) return;

        try {
          daemonWs = await getDaemonConnection(sessionId);

          sendWebMessage(webWs, {
            type: "command_received",
            content: `Executing: ${command}`,
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });

          // Send to daemon
          daemonWs.send(JSON.stringify({
            type: "start_turn",
            input: command,
            sessionId
          } as DaemonClientMessage));

        } catch (err) {
          sendWebMessage(webWs, {
            type: "error",
            content: err instanceof Error ? err.message : String(err),
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        }
      }
    });

    webWs.on("close", () => {
      // Cancel any active turn
      if (currentTurnId && daemonWs && daemonWs.readyState === WebSocket.OPEN) {
        daemonWs.send(JSON.stringify({
          type: "cancel_turn",
          turnId: currentTurnId
        } as DaemonClientMessage));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(WEB_PORT, "127.0.0.1", () => resolve()));
  // eslint-disable-next-line no-console
  console.log(`ff-terminal web server listening on http://127.0.0.1:${WEB_PORT} (proxy to daemon on port ${DAEMON_PORT})`);
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
