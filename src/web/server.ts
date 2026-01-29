import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL, pathToFileURL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import fs from "node:fs";
import net from "node:net";
import type { Socket } from "node:net";
import path from "node:path";
import os from "node:os";
import Busboy from "busboy";
import { spawn, type ChildProcess } from "node:child_process";

import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { defaultConfigPath, resolveWorkspaceDir } from "../runtime/config/paths.js";
import { loadWorkspaceContractSnapshot } from "../runtime/workspace/contract.js";
import { loadSession } from "../runtime/session/sessionStore.js";
import { resolveMainSessionId } from "../runtime/session/sessionPolicy.js";
import { listSessionIndex, upsertSessionIndexEntry } from "../runtime/session/sessionIndex.js";
import { loadTaskStore } from "../runtime/scheduling/taskStore.js";
import { quickHealthCheck } from "../runtime/workspace/healthCheck.js";
import { listSkillStubs } from "../runtime/tools/implementations/skills.js";
import { callGateway } from "../gateway/call.js";

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
  | { type: "get_history"; limit?: number; includeSystem?: boolean; includeTool?: boolean; beforeIndex?: number }
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
  | { type: "async_message"; sessionId: string; content: string; label?: string }
  | { type: "tools"; tools: string[] };

const DAEMON_PORT = Number(process.env.FF_TERMINAL_PORT || 28888);
const WEB_PORT = Number(process.env.FF_WEB_PORT || 8787);
const DAEMON_HOST = process.env.FF_DAEMON_HOST || "127.0.0.1";
const AUTO_START_DAEMON = (() => {
  const raw = String(process.env.FF_WEB_AUTO_DAEMON || "").trim().toLowerCase();
  if (!raw) return true;
  return !["0", "false", "no", "off"].includes(raw);
})();
let daemonProcess: ChildProcess | null = null;
let daemonStartPromise: Promise<void> | null = null;

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

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2) + "\n");
}

function resolveRuntimeContext(repoRoot: string) {
  const runtimeCfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(
    (runtimeCfg as any).workspace_dir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot }
  );
  const configPath = process.env.FF_CONFIG_PATH?.trim() || defaultConfigPath();
  const controlToken =
    process.env.FF_CONTROL_BARN_TOKEN ||
    (runtimeCfg as any).control_barn_token ||
    (runtimeCfg as any).controlBarnToken ||
    "";

  return { runtimeCfg, workspaceDir, configPath, controlToken };
}

function readJsonFileSafe(p: string): any | null {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchGatewayStatus(workspaceDir: string): Promise<any | null> {
  try {
    const result = await callGateway({ method: "status" });
    return result;
  } catch {
    const statusPath = path.join(workspaceDir, "logs", "gateway", "status.json");
    return readJsonFileSafe(statusPath);
  }
}

function tailLines(raw: string, limit: number): string[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= limit) return lines;
  return lines.slice(lines.length - limit);
}

function tailJsonLines(filePath: string, limit: number): Array<Record<string, any> | { raw: string }> {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = tailLines(raw, limit);
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line };
    }
  });
}

function redactConfig(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => redactConfig(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (/(key|token|secret|password)/i.test(key)) {
        out[key] = typeof val === "string" && val.length ? "••••••••" : val;
      } else {
        out[key] = redactConfig(val);
      }
    }
    return out;
  }
  return value;
}

function listSessionsForControl(params: {
  workspaceDir: string;
  cfg: any;
  limit?: number;
  activeMinutes?: number;
}): Array<Record<string, unknown>> {
  const sessionDir = path.join(params.workspaceDir, "sessions");
  const mainSessionId = resolveMainSessionId(params.cfg);
  const limit = Math.max(1, Math.min(200, Number(params.limit ?? 50)));
  const activeMinutes = Number(params.activeMinutes ?? 0);
  const cutoff = activeMinutes > 0 ? Date.now() - activeMinutes * 60 * 1000 : null;
  const rows: Array<Record<string, unknown>> = [];

  const indexEntries = listSessionIndex(params.workspaceDir);
  const indexedIds = new Set(indexEntries.map((e) => e.sessionId));

  for (const entry of indexEntries) {
    const p = path.join(sessionDir, `${entry.sessionId}.json`);
    const needsSession = typeof entry.totalMessages !== "number" || typeof entry.totalTokens !== "number" || !entry.overrides;
    const session = needsSession ? loadSession(entry.sessionId, sessionDir) : null;
    const updatedAt = entry.updatedAt || entry.lastActiveAt || session?.stats?.lastActiveAt || session?.updated_at || session?.created_at;
    const updatedMs = Date.parse(updatedAt || "");
    if (cutoff && (!Number.isFinite(updatedMs) || updatedMs < cutoff)) continue;
    rows.push({
      sessionId: entry.sessionId,
      sessionKey: entry.sessionKey,
      provider: entry.provider,
      chatType: entry.chatType,
      displayName: entry.displayName,
      kind: entry.sessionId === mainSessionId ? "main" : "other",
      updatedAt,
      totalMessages: entry.totalMessages ?? session?.stats?.totalMessages ?? session?.conversation?.length ?? 0,
      totalTokens: entry.totalTokens ?? session?.stats?.totalTokens ?? undefined,
      overrides: entry.overrides ?? session?.meta?.overrides
    });
  }

  if (fs.existsSync(sessionDir)) {
    const extras = fs
      .readdirSync(sessionDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/, ""))
      .filter((sessionId) => !indexedIds.has(sessionId));

    for (const sessionId of extras) {
      const session = loadSession(sessionId, sessionDir);
      if (!session) continue;
      const updatedAt = session.stats?.lastActiveAt || session.updated_at || session.created_at;
      const updatedMs = Date.parse(updatedAt || "");
      if (cutoff && (!Number.isFinite(updatedMs) || updatedMs < cutoff)) continue;
      upsertSessionIndexEntry({
        workspaceDir: params.workspaceDir,
        sessionId: session.session_id,
        sessionKey: session.session_id,
        updatedAt,
        lastActiveAt: session.stats?.lastActiveAt,
        createdAt: session.stats?.createdAt,
        totalMessages: session.stats?.totalMessages ?? session.conversation.length,
        totalTokens: session.stats?.totalTokens,
        overrides: session.meta?.overrides as Record<string, unknown> | undefined
      });
      rows.push({
        sessionId: session.session_id,
        kind: session.session_id === mainSessionId ? "main" : "other",
        updatedAt,
        totalMessages: session.stats?.totalMessages ?? session.conversation.length,
        totalTokens: session.stats?.totalTokens ?? undefined,
        overrides: session.meta?.overrides
      });
    }
  }

  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return rows.slice(0, limit);
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function extractAuthToken(req: IncomingMessage, url: URL): string {
  const header = req.headers.authorization || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const direct = req.headers["x-ff-control-token"];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const query = url.searchParams.get("token");
  if (query && query.trim()) return query.trim();
  return "";
}

function requireAdmin(req: IncomingMessage, res: ServerResponse, url: URL, controlToken: string): boolean {
  if (!controlToken) return true;
  const provided = extractAuthToken(req, url);
  if (provided && provided === controlToken) return true;
  sendJson(res, 401, { error: "Unauthorized", hint: "Provide control token via Authorization: Bearer <token>" });
  return false;
}

const WORKSPACE_FILES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "USER.md",
  "IDENTITY.md",
  "MEMORY.md",
  "PLAN.md",
  "TASKS.md",
  "LOG.md",
  "commands.md"
];

function resolveWorkspaceFilePath(workspaceDir: string, name: string): string | null {
  if (!WORKSPACE_FILES.includes(name)) return null;
  return path.join(workspaceDir, name);
}

function isPathInside(baseDir: string, targetPath: string): boolean {
  const rel = path.relative(baseDir, targetPath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function parseFrontmatterSlug(text: string): string | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) return null;
  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 2) return null;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "---") break;
    const match = line.match(/^\s*slug:\s*(.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

function safeSlug(slugRaw: string): string | null {
  const s = slugRaw.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,64}$/.test(s)) return null;
  return s;
}

function copyDirectory(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      copyDirectory(src, dest);
    } else if (ent.isFile()) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

function registryBaseUrl(): string {
  const raw = process.env.CLAWDHUB_REGISTRY_URL || "https://clawdhub.com";
  return raw.trim().replace(/\/$/, "") || "https://clawdhub.com";
}

async function registryFetchJson<T>(pathName: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  const base = registryBaseUrl();
  const url = new URL(pathName, base);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Registry request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function registryFetchText(pathName: string, searchParams?: Record<string, string | number | undefined>): Promise<string> {
  const base = registryBaseUrl();
  const url = new URL(pathName, base);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Registry request failed (${res.status})`);
  }
  return await res.text();
}

function isPortOpen(port: number, host = DAEMON_HOST, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(timeoutMs);
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

async function waitForPortOpen(params: { port: number; host?: string; timeoutMs?: number }): Promise<boolean> {
  const timeoutMs = params.timeoutMs ?? 12000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(params.port, params.host ?? DAEMON_HOST, 1000)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function resolveDaemonCommand(repoRoot: string): { command: string; args: string[] } {
  const distDaemon = path.join(repoRoot, "dist", "daemon", "daemon.js");
  if (fs.existsSync(distDaemon)) {
    return { command: process.execPath, args: [distDaemon] };
  }
  const binExt = process.platform === "win32" ? ".cmd" : "";
  const tsxPath = path.join(repoRoot, "node_modules", ".bin", `tsx${binExt}`);
  if (fs.existsSync(tsxPath)) {
    return { command: tsxPath, args: ["src/daemon/daemon.ts"] };
  }
  return { command: "tsx", args: ["src/daemon/daemon.ts"] };
}

async function ensureDaemonRunning(repoRoot: string): Promise<void> {
  if (await isPortOpen(DAEMON_PORT, DAEMON_HOST)) return;
  if (!AUTO_START_DAEMON) {
    throw new Error(`Daemon not running at ${DAEMON_HOST}:${DAEMON_PORT}`);
  }
  if (daemonProcess && daemonProcess.exitCode !== null) {
    daemonProcess = null;
    daemonStartPromise = null;
  }
  if (!daemonStartPromise) {
    daemonStartPromise = (async () => {
      const { command, args } = resolveDaemonCommand(repoRoot);
      daemonProcess = spawn(command, args, {
        stdio: "inherit",
        env: {
          ...process.env,
          FF_TERMINAL_PORT: String(DAEMON_PORT)
        }
      });
      daemonProcess.on("exit", () => {
        daemonProcess = null;
        daemonStartPromise = null;
      });
      daemonProcess.on("error", () => {
        daemonProcess = null;
        daemonStartPromise = null;
      });
      const ready = await waitForPortOpen({ port: DAEMON_PORT, host: DAEMON_HOST });
      if (!ready) {
        daemonProcess = null;
        daemonStartPromise = null;
        throw new Error("Daemon failed to start in time.");
      }
    })();
  }
  await daemonStartPromise;
  if (!(await isPortOpen(DAEMON_PORT, DAEMON_HOST))) {
    daemonStartPromise = null;
    throw new Error("Daemon not running after start attempt.");
  }
}

function parseWebClientMessage(raw: string): WebClientMessage | null {
  try {
    const obj = JSON.parse(raw) as any;
    if (!obj || typeof obj !== "object") return null;
    if (obj.type === "ping") return { type: "ping" };
    if (obj.type === "get_history") {
      const limitRaw = Number((obj as any).limit ?? 0);
      const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
      const includeSystem = Boolean((obj as any).includeSystem);
      const includeTool = Boolean((obj as any).includeTool);
      const beforeRaw = Number((obj as any).beforeIndex);
      const beforeIndex = Number.isFinite(beforeRaw) ? beforeRaw : undefined;
      return { type: "get_history", limit, includeSystem, includeTool, beforeIndex };
    }
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

// Daemon connection pool - reuse connections per session
const daemonConnections = new Map<string, WebSocket>();

function getDaemonConnection(sessionId: string, repoRoot: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Check if we already have a connection
    const existing = daemonConnections.get(sessionId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      resolve(existing);
      return;
    }

    // Create new connection
    const ws = new WebSocket(`ws://${DAEMON_HOST}:${DAEMON_PORT}`);

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

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    // Health endpoint
    if (url.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const { workspaceDir, configPath, controlToken } = resolveRuntimeContext(repoRoot);

    if (req.method === "GET" && url.pathname === "/api/control/overview") {
      try {
        const gatewayStatus = await fetchGatewayStatus(workspaceDir);
        const store = loadTaskStore(workspaceDir);
        const healthIssues = await quickHealthCheck(workspaceDir);
        const contract = {
          files: [
            "AGENTS.md",
            "SOUL.md",
            "TOOLS.md",
            "USER.md",
            "IDENTITY.md",
            "MEMORY.md",
            "PLAN.md",
            "TASKS.md",
            "LOG.md"
          ].map((name) => ({
            name,
            exists: fs.existsSync(path.join(workspaceDir, name))
          }))
        };

        sendJson(res, 200, {
          timestamp: new Date().toISOString(),
          workspace_dir: workspaceDir,
          gateway: gatewayStatus,
          scheduler: {
            task_count: store.tasks.length,
            enabled_count: store.tasks.filter((t) => t.enabled).length,
            next_run_at:
              store.tasks
                .map((t) => t.next_run_at)
                .filter((v): v is number => typeof v === "number")
                .sort((a, b) => a - b)[0] ?? null
          },
          health: {
            ok: healthIssues.length === 0,
            issues: healthIssues
          },
          contract
        });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && (url.pathname === "/api/gateway/status" || url.pathname === "/api/control/gateway/status")) {
      try {
        const gatewayStatus = await fetchGatewayStatus(workspaceDir);
        if (!gatewayStatus) {
          sendJson(res, 404, { error: "Gateway status not available" });
          return;
        }
        sendJson(res, 200, gatewayStatus);
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/health") {
      try {
        const issues = await quickHealthCheck(workspaceDir);
        sendJson(res, 200, { ok: issues.length === 0, issues });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/sessions") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const activeMinutes = Number(url.searchParams.get("activeMinutes") ?? 0);
        const sessions = listSessionsForControl({
          workspaceDir,
          cfg: resolveConfig({ repoRoot }),
          limit,
          activeMinutes
        });
        sendJson(res, 200, { ok: true, sessions });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && (url.pathname === "/api/control/sessions/reset" || url.pathname === "/api/control/sessions/compact")) {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const sessionId = String(body?.sessionId || "").trim() || resolveMainSessionId(resolveConfig({ repoRoot }));
        await ensureDaemonRunning(repoRoot);
        const daemonWs = await getDaemonConnection(sessionId, repoRoot);
        const command = url.pathname.endsWith("/compact") ? "/compact" : "/reset";
        daemonWs.send(JSON.stringify({
          type: "start_turn",
          input: command,
          sessionId
        } as DaemonClientMessage));
        sendJson(res, 200, { ok: true, sessionId, command });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/scheduler/tasks") {
      try {
        const store = loadTaskStore(workspaceDir);
        sendJson(res, 200, { tasks: store.tasks });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/workspace/contract") {
      try {
        const snapshot = loadWorkspaceContractSnapshot(workspaceDir, 8000);
        sendJson(res, 200, { workspace_dir: workspaceDir, snapshot });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/logs/gateway") {
      const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit") || 120)));
      try {
        const result = await callGateway({ method: "logs.tail", params: { target: "gateway", limit } });
        sendJson(res, 200, result);
      } catch {
        const eventsPath = path.join(workspaceDir, "logs", "gateway", "events.jsonl");
        const events = tailJsonLines(eventsPath, limit);
        sendJson(res, 200, { path: eventsPath, events });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/logs/scheduler") {
      const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit") || 120)));
      const logPath = path.join(workspaceDir, "logs", "scheduler", "scheduler.jsonl");
      const events = tailJsonLines(logPath, limit);
      sendJson(res, 200, { path: logPath, events });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/config") {
      try {
        const rawConfig = readJsonFileSafe(configPath) ?? {};
        const authorized = !controlToken || extractAuthToken(req, url) === controlToken;
        const payload = authorized ? rawConfig : redactConfig(rawConfig);
        sendJson(res, 200, {
          path: configPath,
          authorized,
          config: payload
        });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/config/schema") {
      sendJson(res, 200, {
        schema: null,
        message: "Config schema endpoint not yet wired. Use raw JSON editing for now."
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/config") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const nextConfig = body?.config ?? body;
        if (!nextConfig || typeof nextConfig !== "object") {
          sendJson(res, 400, { error: "Missing config payload" });
          return;
        }
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(nextConfig, null, 2) + "\n", "utf8");
        sendJson(res, 200, { ok: true, path: configPath });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/config/apply") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      sendJson(res, 200, { ok: true, message: "Config saved. Restart the daemon to apply changes." });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/workspace/files") {
      const files = WORKSPACE_FILES.map((name) => {
        const filePath = resolveWorkspaceFilePath(workspaceDir, name);
        if (!filePath) return { name, exists: false };
        const exists = fs.existsSync(filePath);
        const size = exists && fs.statSync(filePath).isFile() ? fs.statSync(filePath).size : 0;
        return { name, exists, size };
      });
      sendJson(res, 200, { files });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/workspace/file") {
      const name = url.searchParams.get("name") || "";
      const filePath = resolveWorkspaceFilePath(workspaceDir, name);
      if (!filePath) {
        sendJson(res, 400, { error: "Unknown file name" });
        return;
      }
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: "File not found", name });
        return;
      }
      try {
        const content = fs.readFileSync(filePath, "utf8");
        sendJson(res, 200, { name, path: filePath, content });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/workspace/file") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const content = typeof body?.content === "string" ? body.content : "";
        const filePath = resolveWorkspaceFilePath(workspaceDir, name);
        if (!filePath) {
          sendJson(res, 400, { error: "Unknown file name" });
          return;
        }
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, "utf8");
        sendJson(res, 200, { ok: true, name, path: filePath });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/skills/installed") {
      try {
        const skills = listSkillStubs({ workspaceDir, repoRoot }).map((skill) => ({
          ...skill,
          editable:
            isPathInside(path.join(workspaceDir, "skills"), skill.path) ||
            isPathInside(path.join(workspaceDir, "commands"), skill.path)
        }));
        sendJson(res, 200, { skills });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/skills/read") {
      try {
        const pathParam = url.searchParams.get("path") || "";
        if (!pathParam) {
          sendJson(res, 400, { error: "Missing path" });
          return;
        }
        const abs = path.resolve(pathParam);
        const installed = listSkillStubs({ workspaceDir, repoRoot });
        const match = installed.find((skill) => path.resolve(skill.path) === abs);
        if (!match) {
          sendJson(res, 403, { error: "Skill not registered" });
          return;
        }
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
          sendJson(res, 404, { error: "Skill file not found" });
          return;
        }
        const content = fs.readFileSync(abs, "utf8");
        const slug =
          safeSlug(parseFrontmatterSlug(content) || "") ||
          safeSlug(path.basename(path.dirname(abs))) ||
          safeSlug(path.basename(abs, path.extname(abs))) ||
          null;

        let files: string[] = [];
        if (path.basename(abs).toLowerCase() === "skill.md") {
          const dir = path.dirname(abs);
          files = fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((ent) => ent.isFile())
            .map((ent) => ent.name);
        }
        const editable =
          isPathInside(path.join(workspaceDir, "skills"), abs) ||
          isPathInside(path.join(workspaceDir, "commands"), abs);
        sendJson(res, 200, { path: abs, slug, content, files, editable });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/skills/write") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const pathParam = typeof body?.path === "string" ? body.path.trim() : "";
        const content = typeof body?.content === "string" ? body.content : "";
        if (!pathParam) {
          sendJson(res, 400, { error: "Missing path" });
          return;
        }
        const abs = path.resolve(pathParam);
        const wsSkills = path.join(workspaceDir, "skills");
        const wsCommands = path.join(workspaceDir, "commands");
        if (!isPathInside(wsSkills, abs) && !isPathInside(wsCommands, abs)) {
          sendJson(res, 403, { error: "Writes are limited to workspace skills or commands" });
          return;
        }
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content, "utf8");
        sendJson(res, 200, { ok: true, path: abs });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/skills/copy") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const pathParam = typeof body?.path === "string" ? body.path.trim() : "";
        const overwrite = Boolean(body?.overwrite);
        if (!pathParam) {
          sendJson(res, 400, { error: "Missing path" });
          return;
        }
        const abs = path.resolve(pathParam);
        const installed = listSkillStubs({ workspaceDir, repoRoot });
        const match = installed.find((skill) => path.resolve(skill.path) === abs);
        if (!match) {
          sendJson(res, 403, { error: "Skill not registered" });
          return;
        }
        if (!fs.existsSync(abs)) {
          sendJson(res, 404, { error: "Skill not found" });
          return;
        }
        const content = fs.readFileSync(abs, "utf8");
        const slug =
          safeSlug(parseFrontmatterSlug(content) || "") ||
          safeSlug(path.basename(path.dirname(abs))) ||
          safeSlug(path.basename(abs, path.extname(abs)));
        if (!slug) {
          sendJson(res, 400, { error: "Unable to determine skill slug" });
          return;
        }

        const destDir = path.join(workspaceDir, "skills", slug);
        if (fs.existsSync(destDir)) {
          if (!overwrite) {
            sendJson(res, 409, { error: "Skill already exists in workspace", slug });
            return;
          }
          fs.rmSync(destDir, { recursive: true, force: true });
        }
        fs.mkdirSync(destDir, { recursive: true });

        if (path.basename(abs).toLowerCase() === "skill.md") {
          copyDirectory(path.dirname(abs), destDir);
        } else {
          fs.writeFileSync(path.join(destDir, "SKILL.md"), content, "utf8");
        }

        sendJson(res, 200, { ok: true, slug, path: destDir });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/skills/create") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const slugRaw = typeof body?.slug === "string" ? body.slug.trim() : "";
        const slug = safeSlug(slugRaw || "");
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
        const instructions = typeof body?.instructions === "string" ? body.instructions.trim() : "";
        if (!slug) {
          sendJson(res, 400, { error: "Invalid slug (use lowercase letters, numbers, and dashes)" });
          return;
        }
        if (!summary || !instructions) {
          sendJson(res, 400, { error: "Summary and instructions are required" });
          return;
        }
        const destDir = path.join(workspaceDir, "skills", slug);
        if (fs.existsSync(destDir)) {
          sendJson(res, 409, { error: "Skill already exists in workspace", slug });
          return;
        }
        fs.mkdirSync(destDir, { recursive: true });
        const skillName = name || slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
        const content = [
          "---",
          `name: ${skillName}`,
          `slug: ${slug}`,
          `summary: ${summary}`,
          "version: 0.1.0",
          "---",
          "",
          instructions,
          ""
        ].join("\n");
        fs.writeFileSync(path.join(destDir, "SKILL.md"), content, "utf8");
        sendJson(res, 200, { ok: true, slug, path: destDir });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/skills/registry/search") {
      try {
        const query = url.searchParams.get("q")?.trim() ?? "";
        const limit = url.searchParams.get("limit")?.trim() ?? "";
        const result = await registryFetchJson("/api/v1/search", {
          q: query,
          limit
        });
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/control/skills/registry/skill") {
      try {
        const slug = url.searchParams.get("slug")?.trim().toLowerCase() || "";
        if (!slug) {
          sendJson(res, 400, { error: "Missing slug" });
          return;
        }
        const skillMeta = await registryFetchJson(`/api/v1/skills/${encodeURIComponent(slug)}`);
        sendJson(res, 200, skillMeta);
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/control/skills/registry/install") {
      if (!requireAdmin(req, res, url, controlToken)) return;
      try {
        const body = await readJsonBody(req);
        const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
        const version = typeof body?.version === "string" ? body.version.trim() : "";
        const tag = typeof body?.tag === "string" ? body.tag.trim() : "";
        const overwrite = Boolean(body?.overwrite);
        if (!slug) {
          sendJson(res, 400, { error: "Missing slug" });
          return;
        }

        const meta = await registryFetchJson<any>(`/api/v1/skills/${encodeURIComponent(slug)}`);
        const resolvedVersion = version || meta?.latestVersion?.version;
        if (!resolvedVersion && !tag) {
          sendJson(res, 400, { error: "Unable to resolve version" });
          return;
        }
        const versionInfo = resolvedVersion
          ? await registryFetchJson<any>(`/api/v1/skills/${encodeURIComponent(slug)}/versions/${encodeURIComponent(resolvedVersion)}`)
          : null;
        const files = versionInfo?.version?.files ?? [];
        if (!files.length) {
          sendJson(res, 404, { error: "No files in version" });
          return;
        }

        const destDir = path.join(workspaceDir, "skills", slug);
        if (fs.existsSync(destDir)) {
          if (!overwrite) {
            sendJson(res, 409, { error: "Skill already exists in workspace", slug });
            return;
          }
          fs.rmSync(destDir, { recursive: true, force: true });
        }
        fs.mkdirSync(destDir, { recursive: true });

        for (const file of files) {
          const filePath = String(file.path || "").trim();
          if (!filePath) continue;
          if (filePath.includes("..")) continue;
          const text = await registryFetchText(`/api/v1/skills/${encodeURIComponent(slug)}/file`, {
            path: filePath,
            version: resolvedVersion,
            tag
          });
          const target = path.join(destDir, filePath);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, text, "utf8");
        }

        sendJson(res, 200, { ok: true, slug, path: destDir, version: resolvedVersion || tag || "latest" });
      } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
      }
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
    const sessionId = String(info?.sessionId || "main");
    let daemonWs: WebSocket | null = null;
    let currentTurnId: string | null = null;
    const { workspaceDir } = resolveRuntimeContext(repoRoot);
    let bootstrapActive = false;
    try {
      const snapshot = loadWorkspaceContractSnapshot(workspaceDir, 2000);
      bootstrapActive = Boolean(snapshot.bootstrap?.trim());
    } catch {
      bootstrapActive = false;
    }

    // Send initial connection message
    sendWebMessage(webWs, {
      type: "system",
      content: `Connected to FarmFriend Terminal session ${sessionId}`,
      session_id: sessionId,
      timestamp: Date.now() / 1000
    });
    if (bootstrapActive) {
      sendWebMessage(webWs, {
        type: "system",
        content: "Onboarding detected: BOOTSTRAP.md is present. Ask one question at a time and fill IDENTITY.md, USER.md, and SOUL.md.",
        session_id: sessionId,
        timestamp: Date.now() / 1000
      });
    }

    // Handle messages from web client early (before daemon connection) to avoid dropped history requests
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
        // Load history from session file
        const { workspaceDir } = resolveRuntimeContext(repoRoot);
        const sessionDir = path.join(workspaceDir, "sessions");
        const session = loadSession(sessionId, sessionDir);
        const limitRaw = Number(msg.limit ?? 0);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 0;
        const includeSystem = msg.includeSystem === true;
        const includeTool = msg.includeTool === true;
        const beforeIndex = typeof msg.beforeIndex === "number" ? msg.beforeIndex : undefined;
        const conversation = Array.isArray(session?.conversation) ? session!.conversation : [];
        const filtered = conversation
          .map((entry, index) => ({ entry, index }))
          .filter(({ entry }) => {
            if (entry.role === "user" || entry.role === "assistant") return true;
            if (entry.role === "system") return includeSystem;
            if (entry.role === "tool") return includeTool;
            return false;
          })
          .filter(({ index }) => (typeof beforeIndex === "number" ? index < beforeIndex : true));
        const sliced = limit > 0 ? filtered.slice(-limit) : filtered;
        const history = sliced.map(({ entry, index }) => ({
          role: entry.role,
          content: entry.content,
          timestamp: Date.parse(entry.created_at || "") || Date.now(),
          index
        }));
        sendWebMessage(webWs, {
          type: "history",
          content: JSON.stringify(history),
          session_id: sessionId,
          timestamp: Date.now() / 1000
        });
        return;
      }

      if (msg.type === "clear_session") {
        // Start a new turn with clear command
        try {
          await ensureDaemonRunning(repoRoot);
          daemonWs = await getDaemonConnection(sessionId, repoRoot);
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
          await ensureDaemonRunning(repoRoot);
          daemonWs = await getDaemonConnection(sessionId, repoRoot);

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
        return;
      }
    });

    // Set up daemon connection (web client messages are handled already)
    try {
      await ensureDaemonRunning(repoRoot);
      daemonWs = await getDaemonConnection(sessionId, repoRoot);

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
          } else if (parsed.kind === "thinking_xml") {
            sendWebMessage(webWs, {
              type: "thinking_xml",
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
          // Forward to web client to signal completion
          sendWebMessage(webWs, {
            type: "turn_finished",
            session_id: sessionId,
            timestamp: Date.now() / 1000
          });
          return;
        }

        if (msg.type === "async_message") {
          const label = msg.label ? `${msg.label}\n` : "";
          sendWebMessage(webWs, {
            type: "response",
            content: `${label}${msg.content}`,
            session_id: sessionId,
            timestamp: Date.now() / 1000,
            metadata: { async: true }
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

  const shutdown = () => {
    if (daemonProcess && !daemonProcess.killed) {
      try {
        daemonProcess.kill();
      } catch {
        // ignore shutdown errors
      }
    }
    try {
      server.close();
    } catch {
      // ignore
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
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
