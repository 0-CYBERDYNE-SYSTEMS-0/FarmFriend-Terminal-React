import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL, pathToFileURL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import fs from "node:fs";
import type { Socket } from "node:net";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import Busboy from "busboy";

import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveWorkspaceDir } from "../runtime/config/paths.js";

// File attachment from web client
type FileAttachment = {
  name: string;
  type: string;
  size: number;
  data: string; // base64 data URL
};

// Types for web client messages (existing protocol)
type WebClientMessage =
  | { type: "command"; data: { command: string; files?: FileAttachment[] } }
  | { type: "ping" }
  | { type: "get_history" }
  | { type: "clear_session" };

// Types for web server responses (existing protocol)
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
const FIELDVIEW_AUTO_OPEN = process.env.FF_FIELDVIEW_AUTO_OPEN === "1";
const FIELDVIEW_PORT = Number(process.env.FF_FIELDVIEW_PORT || 8788);

const statusState = {
  lastTurnAt: 0,
  lastErrorAt: 0
};

// File upload configuration
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_TYPES = [
  'image/',
  'application/pdf',
  'text/',
  'application/json',
  'application/javascript',
  'text/html',
  'text/markdown',
  'text/x-python',
  'text/x-java',
  'text/x-c',
  'text/x-c++',
  'application/typescript',
  'text/typescript',
  'text/xml',
  'application/xml',
];

type FileUploadResult = { file: { name: string; type: string; size: number; data: string } } | { error: string } | null;

async function parseFileUpload(req: IncomingMessage): Promise<FileUploadResult> {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let fileName = '';
    let fileType = '';
    let fileSize = 0;

    try {
      const busboy = Busboy({
        headers: { 'content-type': contentType },
        limits: { fileSize: MAX_FILE_SIZE },
      });

      busboy.on('file', (_fieldName, file, info) => {
        fileName = info.filename;
        fileType = info.mimeType || 'application/octet-stream';

        // Check if file type is allowed
        const allowed = ALLOWED_TYPES.some(t => fileType.startsWith(t));
        if (!allowed) {
          file.resume();
          resolve({ error: `File type not allowed: ${fileType}` });
          return;
        }

        file.on('data', (chunk: Buffer) => {
          fileSize += chunk.length;
          if (fileSize > MAX_FILE_SIZE) {
            file.resume();
            resolve({ error: 'File too large (max 25MB)' });
            return;
          }
          chunks.push(chunk);
        });

        file.on('end', () => {
          // File received completely
        });
      });

      busboy.on('error', (err: Error) => {
        reject(err);
      });

      busboy.on('finish', () => {
        if (fileName && chunks.length > 0) {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve({
            file: {
              name: fileName,
              type: fileType,
              size: fileSize,
              data: `data:${fileType};base64,${base64}`
            }
          });
        } else {
          resolve(null);
        }
      });

      req.pipe(busboy);
    } catch (err) {
      reject(err);
    }
  });
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

function parseDaemonChunk(chunk: string): { kind: string; content?: string; metadata?: any } {
  if (chunk === "task_completed") return { kind: "task_completed" };
  if (chunk.startsWith("content:")) {
    const content = chunk.slice(8);
    // Check for <thinking> XML tags in content
    if (content.includes("<thinking>")) {
      return { kind: "thinking_xml", content: extractXmlTag(content, "thinking") };
    }
    return { kind: "content", content };
  }
  if (chunk.startsWith("thinking:")) return { kind: "thinking", content: chunk.slice(9) };
  if (chunk.startsWith("error:")) return { kind: "error", content: chunk.slice(6) };
  if (chunk.startsWith("status:")) {
    const msg = chunk.slice(7);
    
    // Parse tool_start with full context
    if (msg.startsWith("tool_start:")) {
      const parts = msg.split("|");
      const toolName = parts[0].replace("tool_start:", "").trim();
      const contextMsg = parts.slice(1).join("|").trim();
      return {
        kind: "tool_start",
        content: `Running: ${toolName}`,
        metadata: {
          toolName,
          input: contextMsg,
          phase: "start"
        }
      };
    }

    // Parse tool_end with results
    if (msg.startsWith("tool_end:")) {
      const parts = msg.split("|");
      const toolName = parts[0].replace("tool_end:", "").trim();
      const duration = parts[1];
      const status = parts[2];
      const preview = parts.slice(3).join("|").trim();
      return {
        kind: "tool_end",
        content: `${toolName} ${status} (${duration})`,
        metadata: {
          toolName,
          duration,
          status,
          output: preview,
          phase: "end"
        }
      };
    }

    // Parse quick_update messages
    if (msg.startsWith("update:")) {
      const updateMsg = msg.replace("update:", "").trim();
      return {
        kind: "update",
        content: updateMsg,
        metadata: { type: "progress" }
      };
    }

    return { kind: "status", content: msg };
  }
  return { kind: "unknown", content: chunk };
}

// Extract content between XML tags, handling multi-line and nested content
function extractXmlTag(content: string, tagName: string): string {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const openIndex = content.indexOf(openTag);
  
  if (openIndex === -1) return content;
  
  const start = openIndex + openTag.length;
  const closeIndex = content.indexOf(closeTag, start);
  
  if (closeIndex === -1) {
    // Unclosed tag, return everything after open tag
    return content.slice(start);
  }
  
  return content.slice(start, closeIndex);
}

function sendWebMessage(ws: WebSocket, msg: WebServerMessage): void {
  ws.send(JSON.stringify(msg));
}

function extractHtmlArtifacts(content: string): string[] {
  const results: string[] = [];
  const re = /```html\n([\s\S]*?)\n```/g;
  for (const match of content.matchAll(re)) {
    results.push(match[1] || "");
  }
  return results;
}

function writeArtifactFile(content: string, sessionId: string, repoRoot: string): string {
  const workspaceRoot = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR, { repoRoot });
  const artifactsDir = path.join(workspaceRoot, "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const safeSession = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = path.join(artifactsDir, `artifact-${safeSession}-${Date.now()}.html`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function getArtifactStats(repoRoot: string): { count: number; latest_mtime_ms: number } {
  const workspaceRoot = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR, { repoRoot });
  const artifactsDir = path.join(workspaceRoot, "artifacts");
  if (!fs.existsSync(artifactsDir)) return { count: 0, latest_mtime_ms: 0 };
  const entries = fs.readdirSync(artifactsDir);
  let latest = 0;
  let count = 0;
  for (const entry of entries) {
    if (!entry.endsWith(".html")) continue;
    count += 1;
    const full = path.join(artifactsDir, entry);
    try {
      const stat = fs.statSync(full);
      latest = Math.max(latest, stat.mtimeMs);
    } catch {
      // ignore
    }
  }
  return { count, latest_mtime_ms: latest };
}

function getSchedulerStatus(repoRoot: string): { active: boolean; age_ms: number } {
  const workspaceRoot = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR, { repoRoot });
  const lockPath = path.join(workspaceRoot, "memory_core", "scheduled_tasks", "scheduler.lock");
  if (!fs.existsSync(lockPath)) return { active: false, age_ms: 0 };
  try {
    const stat = fs.statSync(lockPath);
    return { active: true, age_ms: Math.max(0, Date.now() - stat.mtimeMs) };
  } catch {
    return { active: false, age_ms: 0 };
  }
}

function openArtifactInSafariSplit(filePath: string, fieldUrl: string, repoRoot: string): void {
  if (process.platform !== "darwin") return;
  const fileUrl = pathToFileURL(filePath).toString();
  const workspaceRoot = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR, { repoRoot });
  const scriptPath = path.join(workspaceRoot, "artifacts", "fieldview_open_artifact.scpt");
  const script = [
    'set fieldUrl to "' + fieldUrl + '"',
    'set artifactUrl to "' + fileUrl + '"',
    'tell application "Safari"',
    "activate",
    "if (count of windows) = 0 then make new document",
    "set fieldWindow to window 1",
    "set URL of current tab of fieldWindow to fieldUrl",
    "set artWindow to make new document with properties {URL: artifactUrl}",
    "end tell",
    'tell application "Finder" to set screenBounds to bounds of window of desktop',
    "set screenWidth to item 3 of screenBounds",
    "set screenHeight to item 4 of screenBounds",
    "set halfWidth to screenWidth / 2",
    'tell application "Safari"',
    "set bounds of fieldWindow to {0, 0, halfWidth, screenHeight}",
    "set bounds of artWindow to {halfWidth, 0, screenWidth, screenHeight}",
    "end tell"
  ].join("\n");
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.writeFileSync(scriptPath, script, "utf8");
  const escaped = scriptPath.replace(/'/g, "'\\''");
  execFile("/bin/bash", ["-lc", `osascript '${escaped}'`], (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("FieldView auto-open failed:", err.message);
    }
  });
}

// Daemon connection pool - reuse connections per session
const daemonConnections = new Map<string, WebSocket>();
const turnBuffers = new Map<string, { turnId: string; content: string }>();

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

  // FieldView Classic frontend (highest priority)
  const fieldviewDistDir = path.join(repoRoot, "src", "web", "fieldview", "dist");
  // New Vite frontend
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

    if (req.url === "/fieldview/status") {
      const artifactStats = getArtifactStats(repoRoot);
      const scheduler = getSchedulerStatus(repoRoot);
      const daemonConnectionsCount = Array.from(daemonConnections.values()).filter((ws) => ws.readyState === WebSocket.OPEN).length;
      const body = {
        ok: true,
        timestamp: Date.now(),
        daemon_connected: daemonConnectionsCount > 0,
        daemon_connections: daemonConnectionsCount,
        ws_clients: wss.clients.size,
        last_turn_at: statusState.lastTurnAt,
        last_error_at: statusState.lastErrorAt,
        artifacts_count: artifactStats.count,
        artifacts_latest: artifactStats.latest_mtime_ms,
        scheduler_lock_active: scheduler.active,
        scheduler_lock_age_ms: scheduler.age_ms
      };
      res.writeHead(200, {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      });
      res.end(JSON.stringify(body) + "\n");
      return;
    }

    // File upload endpoint (POST /api/upload)
    if (req.method === "POST" && req.url?.startsWith("/api/upload")) {
      parseFileUpload(req).then(result => {
        if (!result) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid request" }) + "\n");
          return;
        }

        if ('error' in result) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: result.error }) + "\n");
          return;
        }

        if ('file' in result && result.file) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(result.file) + "\n");
        } else {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "No file uploaded" }) + "\n");
        }
      }).catch(err => {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: err.message }) + "\n");
      });
      return;
    }

    // Serve React frontend build - check in priority order
    const selectedDistDir =
      fs.existsSync(fieldviewDistDir) && fs.statSync(fieldviewDistDir).isDirectory()
        ? fieldviewDistDir
        : fs.existsSync(newFrontendDistDir) && fs.statSync(newFrontendDistDir).isDirectory()
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
          turnBuffers.set(sessionId, { turnId: msg.turnId, content: "" });
          return;
        }

        if (msg.type === "chunk") {
          const parsed = parseDaemonChunk(msg.chunk);

          if (parsed.kind === "content") {
            const buffer = turnBuffers.get(sessionId);
            if (buffer && buffer.turnId === msg.turnId) {
              buffer.content += parsed.content || "";
              turnBuffers.set(sessionId, buffer);
            }
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
          } else if (parsed.kind === "thinking_xml") {
            sendWebMessage(webWs, {
              type: "thinking_xml",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "error") {
            statusState.lastErrorAt = Date.now();
            sendWebMessage(webWs, {
              type: "error",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000
            });
          } else if (parsed.kind === "tool_start") {
            sendWebMessage(webWs, {
              type: "tool_call",
              tool_name: parsed.metadata?.toolName || parsed.content || "",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000,
              metadata: parsed.metadata
            });
          } else if (parsed.kind === "tool_end") {
            sendWebMessage(webWs, {
              type: "tool_call",
              tool_name: parsed.metadata?.toolName || "tool",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000,
              metadata: parsed.metadata
            });
          } else if (parsed.kind === "update") {
            sendWebMessage(webWs, {
              type: "system",
              content: parsed.content || "",
              session_id: sessionId,
              timestamp: Date.now() / 1000,
              metadata: parsed.metadata
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
          statusState.lastTurnAt = Date.now();
          if (FIELDVIEW_AUTO_OPEN) {
            const buffer = turnBuffers.get(sessionId);
            if (buffer && buffer.turnId === msg.turnId) {
              const htmlArtifacts = extractHtmlArtifacts(buffer.content);
              if (htmlArtifacts.length > 0) {
                const filePath = writeArtifactFile(htmlArtifacts[htmlArtifacts.length - 1], sessionId, repoRoot);
                const fieldUrl = `http://127.0.0.1:${FIELDVIEW_PORT}`;
                openArtifactInSafariSplit(filePath, fieldUrl, repoRoot);
              }
            }
          }
          turnBuffers.delete(sessionId);
          // Forward to web client to signal completion
          sendWebMessage(webWs, {
            type: "turn_finished",
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
          return;
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
        const files = msg.data.files;

        if (!command && (!files || files.length === 0)) return;

        try {
          daemonWs = await getDaemonConnection(sessionId);

          sendWebMessage(webWs, {
            type: "command_received",
            content: `Executing: ${command}`,
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });

          // Build content blocks for multimodal input
          let daemonInput: string | any[];

          if (files && files.length > 0) {
            const contentBlocks: any[] = [];

            // Add images as vision blocks
            for (const file of files) {
              if (file.type.startsWith('image/')) {
                contentBlocks.push({
                  type: "image_url",
                  image_url: { url: file.data }
                });
              } else {
                // Non-image files: inform AI but can't process
                contentBlocks.push({
                  type: "text",
                  text: `[File attached: ${file.name}]`
                });
              }
            }

            // Add user's text if present
            if (command) {
              contentBlocks.push({ type: "text", text: command });
            }

            daemonInput = contentBlocks;
          } else {
            daemonInput = command;
          }

          // Send to daemon
          daemonWs.send(JSON.stringify({
            type: "start_turn",
            input: daemonInput,
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
