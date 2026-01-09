import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolRegistry } from "../../tools/registry.js";
import { runAgentTurn } from "../../agentLoop.js";
import { withToolContext } from "../../tools/context.js";
import { buildSessionKey } from "../../session/sessionKey.js";
import { getOrCreateSessionIdForKey } from "../../session/sessionIndex.js";
import { evaluateSendPolicy } from "../../session/sendPolicy.js";
import { resetSessionWithArchive, compactSessionWithSummary } from "../../session/resetHelpers.js";
import { resolveConfig, type RuntimeConfig } from "../../config/loadConfig.js";
import { getScript, substituteParams, validateParams } from "../../tools/implementations/macos_control/scriptLoader.js";
import type { GatewayChannel, GatewayChannelStatus } from "../types.js";

type WatchTarget = {
  name: string;
  replyTo?: string;
  kind?: "direct" | "group";
};

type IMessageGatewayConfig = {
  enabled?: boolean;
  watch_chats?: Array<string | { name: string; reply_to?: string; replyTo?: string }>;
  watchChats?: Array<string | { name: string; reply_to?: string; replyTo?: string }>;
  poll_interval_ms?: number;
  pollIntervalMs?: number;
  auto_reply?: boolean;
  autoReply?: boolean;
  reply_prefix?: string;
  replyPrefix?: string;
};

function isMac(): boolean {
  return process.platform === "darwin";
}

function getKBDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  return join(currentDir, "..", "..", "tools", "implementations", "macos_control", "kb");
}

async function runAppleScript(
  script: string,
  signal: AbortSignal
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return await new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-e", script], { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];

    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (b) => out.push(b));
    child.stderr?.on("data", (b) => err.push(b));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      resolve({ stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8"), code });
    });
  });
}

function normalizeWatchList(raw?: IMessageGatewayConfig["watchChats"]): WatchTarget[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: WatchTarget[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    if (typeof entry === "string") {
      const name = entry.trim();
      if (name) out.push({ name });
      continue;
    }
    if (typeof entry === "object") {
      const name = String((entry as any).name || "").trim();
      if (!name) continue;
      const replyTo = String((entry as any).reply_to || (entry as any).replyTo || "").trim() || undefined;
      const kindRaw = String((entry as any).kind || "").trim().toLowerCase();
      const kind = kindRaw === "group" ? "group" : "direct";
      out.push({ name, replyTo, kind });
    }
  }
  return out;
}

function parseLatestMessage(raw: string): { sender: string; date: string; content: string } | null {
  const blocks = raw
    .split(/\n{2,}/g)
    .map((b) => b.trim())
    .filter(Boolean);

  const messages: { sender: string; date: string; content: string }[] = [];

  for (const block of blocks) {
    if (block.startsWith("Chat History with")) continue;
    if (block.startsWith("(")) continue;
    const lines = block.split("\n");
    if (!lines.length) continue;
    const header = lines[0].trim();
    const match = header.match(/^(.+?) \((.+?)\):$/);
    if (!match) continue;
    const sender = match[1].trim();
    const date = match[2].trim();
    const content = lines.slice(1).join("\n").trim();
    messages.push({ sender, date, content });
  }

  if (!messages.length) return null;
  return messages[messages.length - 1];
}

export class IMessageGateway implements GatewayChannel {
  name = "imessage";
  private config: IMessageGatewayConfig;
  private registry: ToolRegistry;
  private workspaceDir: string;
  private repoRoot: string;
  private lastError: string | null = null;
  private watchList: WatchTarget[] = [];
  private pollInterval: number;
  private autoReply: boolean;
  private replyPrefix: string;
  private timer: NodeJS.Timeout | null = null;
  private processing = false;
  private lastSeen: Map<string, string> = new Map();
  private primed = false;
  private runtimeCfg: RuntimeConfig;

  constructor(opts: {
    config?: IMessageGatewayConfig;
    registry: ToolRegistry;
    workspaceDir: string;
    repoRoot: string;
  }) {
    this.config = opts.config || {};
    this.registry = opts.registry;
    this.workspaceDir = opts.workspaceDir;
    this.repoRoot = opts.repoRoot;
    this.runtimeCfg = resolveConfig({ repoRoot: this.repoRoot });
    const rawWatch = this.config.watchChats ?? this.config.watch_chats ?? [];
    this.watchList = normalizeWatchList(rawWatch);
    this.pollInterval = Number(this.config.pollIntervalMs ?? this.config.poll_interval_ms ?? 8000);
    this.autoReply = Boolean(this.config.autoReply ?? this.config.auto_reply ?? false);
    this.replyPrefix = String(this.config.replyPrefix ?? this.config.reply_prefix ?? "").trim();
  }

  async start(): Promise<void> {
    this.lastError = null;
    if (!this.config.enabled) return;
    if (!isMac()) {
      this.lastError = "iMessage gateway requires macOS";
      return;
    }
    if (!this.watchList.length) {
      this.lastError = "No watch chats configured";
      return;
    }
    await this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, Math.max(3000, this.pollInterval));
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  status(): GatewayChannelStatus {
    const enabled = Boolean(this.config.enabled);
    const running = Boolean(this.timer);
    const healthy = enabled ? !this.lastError : true;
    return {
      name: this.name,
      enabled,
      running,
      healthy,
      last_error: this.lastError ?? undefined,
      details: enabled
        ? {
            watch_chats: this.watchList.map((c) => c.name),
            auto_reply: this.autoReply,
            poll_interval_ms: this.pollInterval
          }
        : { reason: "disabled" }
    };
  }

  private async pollOnce(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      for (const chat of this.watchList) {
        const latest = await this.fetchLatestMessage(chat.name);
        if (!latest) continue;
        const signature = `${latest.sender}|${latest.date}|${latest.content}`;
        const prev = this.lastSeen.get(chat.name);
        if (prev === signature) continue;
        this.lastSeen.set(chat.name, signature);
        if (!this.primed) continue;
        if (latest.sender.toLowerCase() === "me") continue;
        if (this.autoReply) {
          await this.handleInbound(chat, latest.sender, latest.content);
        }
      }
      this.primed = true;
    } finally {
      this.processing = false;
    }
  }

  private async fetchLatestMessage(chatName: string): Promise<{ sender: string; date: string; content: string } | null> {
    try {
      const kbDir = getKBDir();
      const script = getScript(kbDir, "messages_get_chat_history");
      if (!script) {
        this.lastError = "Missing Messages KB script: messages_get_chat_history";
        return null;
      }
      const params = { chatName };
      const missing = validateParams(script, params);
      if (missing.length > 0) {
        this.lastError = `Missing params for Messages KB script: ${missing.join(", ")}`;
        return null;
      }
      const content = substituteParams(script.content, params);
      const r = await runAppleScript(content, new AbortController().signal);
      if (r.code !== 0) {
        this.lastError = r.stderr || r.stdout || "AppleScript failed";
        return null;
      }
      const latest = parseLatestMessage(r.stdout.trim());
      return latest;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return null;
    }
  }

  private resolveSessionIdForChat(chat: WatchTarget): string {
    const chatType = chat.kind || "direct";
    const sessionKey = buildSessionKey({
      cfg: this.runtimeCfg,
      provider: "imessage",
      chatType,
      chatId: chat.name
    });
    const { sessionId } = getOrCreateSessionIdForKey({
      workspaceDir: this.workspaceDir,
      cfg: this.runtimeCfg,
      sessionKey,
      provider: "imessage",
      chatType,
      displayName: chat.name
    });
    return sessionId;
  }

  private async handleInbound(chat: WatchTarget, sender: string, content: string): Promise<void> {
    const sessionId = this.resolveSessionIdForChat(chat);
    const cfg = this.runtimeCfg;
    const decision = evaluateSendPolicy({
      cfg,
      provider: "imessage",
      chatType: (chat.kind || "direct") === "group" ? "group" : "direct",
      sessionId
    });
    if (!decision.allowed) {
      return;
    }

    const trimmed = content.trim();
    if (/^\/(reset|new)\b/i.test(trimmed)) {
      const remainder = trimmed.replace(/^\/(reset|new)\b/i, "").trim();
      await resetSessionWithArchive({
        sessionId,
        workspaceDir: this.workspaceDir,
        repoRoot: this.repoRoot,
        cfg
      });
      if (!remainder) {
        await this.sendMessage(chat.replyTo || chat.name, "✓ Session reset");
        return;
      }
      content = remainder;
    } else if (/^\/compact\b/i.test(trimmed)) {
      const remainder = trimmed.replace(/^\/compact\b/i, "").trim();
      const result = await compactSessionWithSummary({
        sessionId,
        workspaceDir: this.workspaceDir,
        repoRoot: this.repoRoot,
        cfg
      });
      if (!remainder) {
        const suffix = result.summarizedCount > 0
          ? ` (${result.summarizedCount} messages summarized)`
          : " (no changes needed)";
        await this.sendMessage(chat.replyTo || chat.name, `✓ Session compacted${suffix}`);
        return;
      }
      content = remainder;
    }

    let responseText = "";
    const prompt = `New iMessage from ${sender} (chat: ${chat.name}):\n${content}`.trim();

    try {
      await withToolContext(
        {
          sessionId,
          workspaceDir: this.workspaceDir,
          repoRoot: this.repoRoot
        },
        async () => {
          for await (const chunk of runAgentTurn({
            userInput: prompt,
            registry: this.registry,
            sessionId,
            signal: new AbortController().signal
          })) {
            if (chunk.kind === "content") responseText += chunk.delta || "";
          }
        }
      );
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return;
    }

    const reply = `${this.replyPrefix ? `${this.replyPrefix}\n\n` : ""}${responseText}`.trim();
    if (!reply) return;

    await this.sendMessage(chat.replyTo || chat.name, reply);
  }

  private async sendMessage(recipient: string, messageText: string): Promise<void> {
    try {
      const kbDir = getKBDir();
      const script = getScript(kbDir, "messages_send_message");
      if (!script) {
        this.lastError = "Missing Messages KB script: messages_send_message";
        return;
      }
      const params = { recipient, messageText };
      const missing = validateParams(script, params);
      if (missing.length > 0) {
        this.lastError = `Missing params for Messages KB script: ${missing.join(", ")}`;
        return;
      }
      const content = substituteParams(script.content, params);
      const r = await runAppleScript(content, new AbortController().signal);
      if (r.code !== 0) {
        this.lastError = r.stderr || r.stdout || "AppleScript failed";
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }
}
