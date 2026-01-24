import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "../runtime/config/repoRoot.js";

const PORT = Number(process.env.FF_FIELDVIEW_PORT) || 8788;
const HOST = process.env.FF_FIELDVIEW_HOST || "localhost";

// FieldView frontend dist directory
const repoRoot = findRepoRoot();
// Check if running from source or dist
const isDevelopment = fs.existsSync(path.join(repoRoot, "src"));
const fieldviewDistDir = path.join(repoRoot, isDevelopment ? "src" : "dist", "web", "fieldview", "dist");

// Create HTTP server for static files
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  // Health endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }) + "\n");
    return;
  }

  // Serve static files from fieldview dist
  if (!fs.existsSync(fieldviewDistDir)) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("FieldView not built. Run 'npm run build:fieldview' first.\n");
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(fieldviewDistDir, rel);

  // Prevent path traversal
  if (!filePath.startsWith(fieldviewDistDir)) {
    res.writeHead(400);
    res.end();
    return;
  }

  let actualPath = filePath;
  if (!fs.existsSync(actualPath) || fs.statSync(actualPath).isDirectory()) {
    actualPath = path.join(fieldviewDistDir, "index.html");
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
  } catch {
    res.writeHead(500);
    res.end();
  }
});

// Create WebSocket server for fieldview on the same port as HTTP
let wss: WebSocketServer;
try {
  wss = new WebSocketServer({ server });
  console.log(`FieldView WebSocket server attached to http://${HOST}:${PORT}`);
} catch (error: any) {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use. Please try a different port.`);
    process.exit(1);
  }
  throw error;
}

type FileAttachment = {
  name: string;
  type: string;
  size: number;
  data: string;
};

type WebClientMessage =
  | { type: "command"; data: { command: string; files?: FileAttachment[] } }
  | { type: "ping" }
  | { type: "get_history" }
  | { type: "clear_session" };

type WebServerMessage =
  | { type: "system"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "response"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "thinking"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "thinking_xml"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "tool_call"; tool_name: string; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "error"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "pong"; session_id: string; timestamp: number; metadata?: any }
  | { type: "command_received"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "history"; content: string; session_id: string; timestamp: number; metadata?: any }
  | { type: "turn_finished"; session_id: string; timestamp: number; metadata?: any };

type DaemonClientMessage =
  | { type: "hello"; client: "ink" | "web"; version?: string }
  | { type: "start_turn"; input: string | any[]; sessionId?: string }
  | { type: "cancel_turn"; turnId: string }
  | { type: "list_tools" };

type DaemonServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "tools"; tools: string[] };

function sendWebMessage(ws: WebSocket, msg: WebServerMessage) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function parseWebClientMessage(raw: string): WebClientMessage | null {
  try {
    const obj = JSON.parse(raw) as any;
    if (!obj || typeof obj !== "object") return null;
    if (obj.type === "ping") return { type: "ping" };
    if (obj.type === "get_history") return { type: "get_history" };
    if (obj.type === "clear_session") return { type: "clear_session" };
    if (obj.type === "command" && typeof obj.data?.command === "string") {
      const files = Array.isArray(obj.data.files) ? obj.data.files : undefined;
      return { type: "command", data: { command: obj.data.command, files } };
    }
    return null;
  } catch {
    return null;
  }
}

function extractXmlTag(content: string, tagName: string): string {
  const startTag = `<${tagName}>`;
  const endTag = `</${tagName}>`;
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1) return content;
  return content.slice(startIndex + startTag.length, endIndex).trim();
}

function parseDaemonChunk(chunk: string): { kind: string; content?: string; metadata?: any } {
  if (chunk === "task_completed") return { kind: "task_completed" };
  if (chunk.startsWith("content:")) {
    const content = chunk.slice(8);
    if (content.includes("<thinking>")) {
      return { kind: "thinking_xml", content: extractXmlTag(content, "thinking") };
    }
    return { kind: "content", content };
  }
  if (chunk.startsWith("thinking:")) return { kind: "thinking", content: chunk.slice(9) };
  if (chunk.startsWith("error:")) return { kind: "error", content: chunk.slice(6) };
  if (chunk.startsWith("status:")) {
    const msg = chunk.slice(7);
    if (msg.startsWith("tool_start:")) {
      const parts = msg.split("|");
      const toolName = parts[0].replace("tool_start:", "").trim();
      const contextMsg = parts.slice(1).join("|").trim();
      return {
        kind: "tool_start",
        content: `Running: ${toolName}`,
        metadata: { toolName, input: contextMsg, phase: "start" }
      };
    }
    if (msg.startsWith("tool_end:")) {
      const parts = msg.split("|");
      const toolName = parts[0].replace("tool_end:", "").trim();
      const duration = parts[1];
      const status = parts[2];
      const preview = parts.slice(3).join("|").trim();
      return {
        kind: "tool_end",
        content: `${toolName} ${status} (${duration})`,
        metadata: { toolName, duration, status, output: preview, phase: "end" }
      };
    }
    if (msg.startsWith("update:")) return { kind: "update", content: msg.slice(7) };
    return { kind: "status", content: msg };
  }
  return { kind: "unknown" };
}

function parseSessionId(req?: IncomingMessage): string {
  const url = req?.url || "/";
  const match = url.match(/\/ws\/terminal\/([^/?#]+)/);
  if (match && match[1]) return decodeURIComponent(match[1]);
  const parsed = new URL(url, `http://${HOST}:${PORT}`);
  return parsed.searchParams.get("sessionId") || "default-session";
}

// Connect to daemon WebSocket
let daemonWs: WebSocket | null = null;

function connectToDaemon() {
  const daemonPort = Number(process.env.FF_TERMINAL_PORT) || 28888;
  daemonWs = new WebSocket(`ws://localhost:${daemonPort}`);

  daemonWs.on("open", () => {
    console.log("FieldView connected to daemon");
    // Send hello message
    daemonWs!.send(JSON.stringify({
      type: "hello",
      client: "web",
      version: "1.0.0"
    } as DaemonClientMessage));
  });

  daemonWs.on("message", (data) => {
    const msg = JSON.parse(data.toString()) as DaemonServerMessage;
    wss.clients.forEach((client: any) => {
      if (client.readyState !== WebSocket.OPEN) return;
      const sessionId = client.__sessionId || "default-session";

      if (msg.type === "chunk") {
        const parsed = parseDaemonChunk(msg.chunk);
        if (parsed.kind === "content") {
          sendWebMessage(client, {
            type: "response",
            content: parsed.content || "",
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        } else if (parsed.kind === "thinking") {
          sendWebMessage(client, {
            type: "thinking",
            content: parsed.content || "",
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        } else if (parsed.kind === "thinking_xml") {
          sendWebMessage(client, {
            type: "thinking_xml",
            content: parsed.content || "",
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        } else if (parsed.kind === "error") {
          sendWebMessage(client, {
            type: "error",
            content: parsed.content || "",
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
        } else if (parsed.kind === "tool_start" || parsed.kind === "tool_end") {
          sendWebMessage(client, {
            type: "tool_call",
            tool_name: parsed.metadata?.toolName || parsed.content || "",
            content: parsed.content || "",
            session_id: sessionId,
            timestamp: Date.now() / 1000,
            metadata: parsed.metadata
          });
        } else if (parsed.kind === "update" || parsed.kind === "status") {
          sendWebMessage(client, {
            type: "system",
            content: parsed.content || "",
            session_id: sessionId,
            timestamp: Date.now() / 1000,
            metadata: parsed.metadata
          });
        }
      }

      if (msg.type === "turn_finished") {
        sendWebMessage(client, {
          type: "turn_finished",
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
      }
    });
  });

  daemonWs.on("close", () => {
    console.log("FieldView disconnected from daemon");
    // Reconnect after 3 seconds
    setTimeout(connectToDaemon, 3000);
  });

  daemonWs.on("error", (error) => {
    console.error("Daemon WebSocket error:", error);
  });
}

// Handle fieldview client connections
wss.on("connection", (ws: any, req: IncomingMessage) => {
  console.log("FieldView client connected");
  ws.__sessionId = parseSessionId(req);

  sendWebMessage(ws, {
    type: "system",
    content: `Connected to FF-Terminal (TS) session ${ws.__sessionId}`,
    session_id: ws.__sessionId,
    timestamp: Date.now() / 1000
  });

  ws.on("message", (data: any) => {
    const msg = parseWebClientMessage(String(data));
    if (!msg) {
      sendWebMessage(ws, {
        type: "error",
        content: "Invalid message",
        session_id: ws.__sessionId,
        timestamp: Date.now() / 1000
      });
      return;
    }

    if (msg.type === "ping") {
      sendWebMessage(ws, { type: "pong", session_id: ws.__sessionId, timestamp: Date.now() / 1000 });
      return;
    }

    if (msg.type === "command") {
      const command = msg.data.command.trim();
      const files = msg.data.files;
      if (!command && (!files || files.length === 0)) return;

      sendWebMessage(ws, {
        type: "command_received",
        content: `Executing: ${command}`,
        session_id: ws.__sessionId,
        timestamp: Date.now() / 1000
      });

      let daemonInput: string | any[];

      if (files && files.length > 0) {
        const contentBlocks: any[] = [];

        for (const file of files) {
          if (file.type.startsWith("image/")) {
            contentBlocks.push({
              type: "image_url",
              image_url: { url: file.data }
            });
          } else {
            contentBlocks.push({
              type: "text",
              text: `[File attached: ${file.name}]`
            });
          }
        }

        if (command) {
          contentBlocks.push({ type: "text", text: command });
        }

        daemonInput = contentBlocks;
      } else {
        daemonInput = command;
      }

      if (daemonWs && daemonWs.readyState === WebSocket.OPEN) {
        daemonWs.send(JSON.stringify({
          type: "start_turn",
          input: daemonInput,
          sessionId: ws.__sessionId
        } as DaemonClientMessage));
      }
      return;
    }
  });

  ws.on("close", () => {
    console.log("FieldView client disconnected");
  });
});

// Start connection to daemon
connectToDaemon();

export async function startFieldviewServer(): Promise<void> {
  return new Promise((resolve) => {
    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} already in use. Please try a different port.`);
        process.exit(1);
      }
      throw error;
    });
    // Start server
    server.listen(PORT, HOST, () => {
      console.log(`FieldView server listening on http://${HOST}:${PORT}`);
      resolve();
    });
  });
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    wss.close(() => {
      daemonWs?.close();
      process.exit(0);
    });
  });
});

// Start the server if this file is run directly
startFieldviewServer();
