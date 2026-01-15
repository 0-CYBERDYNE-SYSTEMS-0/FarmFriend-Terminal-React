import type { ToolRegistry } from "../../runtime/tools/registry.js";
import { runAgentTurn } from "../../runtime/agentLoop.js";
import { withToolContext } from "../../runtime/tools/context.js";
import { buildSessionKey } from "../../runtime/session/sessionKey.js";
import { getOrCreateSessionIdForKey } from "../../runtime/session/sessionIndex.js";
import { evaluateSendPolicy } from "../../runtime/session/sendPolicy.js";
import { resetSessionWithArchive, compactSessionWithSummary } from "../../runtime/session/resetHelpers.js";
import { resolveConfig, type RuntimeConfig } from "../../runtime/config/loadConfig.js";
import type { GatewayBridge, GatewayChannelStatus } from "../types.js";

type TelegramConfig = {
  enabled?: boolean;
  token?: string;
  poll_interval_ms?: number;
  reply_prefix?: string;
  allow_from?: string[];
  allow_groups?: boolean;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    date: number;
    chat: { id: number; type: string; title?: string; username?: string; first_name?: string; last_name?: string };
    from?: { id: number; is_bot?: boolean; username?: string; first_name?: string; last_name?: string };
  };
};

function buildSenderName(msg: TelegramUpdate["message"]): string {
  const from = msg?.from;
  if (!from) return "unknown";
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (from.username) return from.username;
  return String(from.id);
}

function formatChatLabel(msg: TelegramUpdate["message"]): string {
  const chat = msg?.chat;
  if (!chat) return "unknown";
  return chat.title || chat.username || String(chat.id);
}

export class TelegramBridge implements GatewayBridge {
  name = "telegram";
  private config: TelegramConfig;
  private registry: ToolRegistry;
  private workspaceDir: string;
  private repoRoot: string;
  private lastError: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private runtimeCfg: RuntimeConfig;
  private lastUpdateId: number | null = null;
  private processing = false;
  private pollTimeoutSec = 0;

  constructor(opts: {
    config?: TelegramConfig;
    registry: ToolRegistry;
    workspaceDir: string;
    repoRoot: string;
  }) {
    this.config = opts.config || {};
    this.registry = opts.registry;
    this.workspaceDir = opts.workspaceDir;
    this.repoRoot = opts.repoRoot;
    this.runtimeCfg = resolveConfig({ repoRoot: this.repoRoot });
  }

  async start(): Promise<void> {
    this.lastError = null;
    if (!this.config.enabled) return;
    if (!this.config.token || !this.config.token.trim()) {
      this.lastError = "Telegram token missing";
      return;
    }
    const interval = Math.max(3000, Number(this.config.poll_interval_ms ?? 6000));
    // Avoid overlapping long-poll requests; keep timeout below the poll interval.
    const intervalSec = Math.max(1, Math.floor(interval / 1000));
    this.pollTimeoutSec = Math.min(10, Math.max(0, intervalSec - 1));
    await this.pollOnce();
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, interval);
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
            last_update_id: this.lastUpdateId ?? null,
            poll_interval_ms: this.config.poll_interval_ms ?? 6000
          }
        : { reason: "disabled" }
    };
  }

  private apiUrl(path: string): string {
    return `https://api.telegram.org/bot${this.config.token}${path}`;
  }

  private async pollOnce(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    if (!this.config.token) return;
    try {
      const params = new URLSearchParams();
      if (this.lastUpdateId !== null) params.set("offset", String(this.lastUpdateId + 1));
      if (this.pollTimeoutSec > 0) {
        params.set("timeout", String(this.pollTimeoutSec));
      }
      params.set("allowed_updates", JSON.stringify(["message"]));
      const url = this.apiUrl(`/getUpdates?${params.toString()}`);
      const res = await fetch(url, { signal: AbortSignal.timeout((this.pollTimeoutSec + 5) * 1000) });
      if (!res.ok) {
        this.lastError = `Telegram getUpdates failed: ${res.status}`;
        return;
      }
      const body = await res.json();
      if (!body || !Array.isArray(body.result)) return;
      const updates: TelegramUpdate[] = body.result;
      for (const update of updates) {
        this.lastUpdateId = Math.max(this.lastUpdateId ?? 0, update.update_id);
        const msg = update.message;
        if (!msg || !msg.text) continue;
        if (msg.from?.is_bot) continue;
        await this.handleInbound(update);
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false;
    }
  }

  private allowMessage(update: TelegramUpdate): boolean {
    const msg = update.message;
    if (!msg) return false;
    const allowList = this.config.allow_from ?? [];
    if (!allowList.length) return true;
    const chatId = String(msg.chat.id);
    const senderId = msg.from ? String(msg.from.id) : "";
    const username = msg.from?.username ? `@${msg.from.username}` : "";
    const chatType = msg.chat.type;
    const allowGroups = Boolean(this.config.allow_groups);
    if (chatType !== "private" && !allowGroups) return false;
    return allowList.some((entry) => {
      const v = String(entry).trim();
      return v === chatId || v === senderId || (username && v.toLowerCase() === username.toLowerCase());
    });
  }

  private resolveSessionId(update: TelegramUpdate): string {
    const msg = update.message!;
    const chatType = msg.chat.type === "private" ? "direct" : "group";
    const sessionKey = buildSessionKey({
      cfg: this.runtimeCfg,
      provider: "telegram",
      chatType,
      chatId: String(msg.chat.id)
    });
    const { sessionId } = getOrCreateSessionIdForKey({
      workspaceDir: this.workspaceDir,
      cfg: this.runtimeCfg,
      sessionKey,
      provider: "telegram",
      chatType,
      displayName: formatChatLabel(msg)
    });
    return sessionId;
  }

  private async handleInbound(update: TelegramUpdate): Promise<void> {
    const msg = update.message!;
    if (!this.allowMessage(update)) return;

    const sessionId = this.resolveSessionId(update);
    const chatType = msg.chat.type === "private" ? "direct" : "group";
    const decision = evaluateSendPolicy({
      cfg: this.runtimeCfg,
      provider: "telegram",
      chatType,
      sessionId
    });
    if (!decision.allowed) return;

    let content = msg.text || "";
    const trimmed = content.trim();
    if (/^\/(reset|new)\b/i.test(trimmed)) {
      const remainder = trimmed.replace(/^\/(reset|new)\b/i, "").trim();
      await resetSessionWithArchive({
        sessionId,
        workspaceDir: this.workspaceDir,
        repoRoot: this.repoRoot,
        cfg: this.runtimeCfg
      });
      if (!remainder) {
        await this.sendMessage(msg.chat.id, "✓ Session reset");
        return;
      }
      content = remainder;
    } else if (/^\/compact\b/i.test(trimmed)) {
      const remainder = trimmed.replace(/^\/compact\b/i, "").trim();
      const result = await compactSessionWithSummary({
        sessionId,
        workspaceDir: this.workspaceDir,
        repoRoot: this.repoRoot,
        cfg: this.runtimeCfg
      });
      if (!remainder) {
        const suffix = result.summarizedCount > 0
          ? ` (${result.summarizedCount} messages summarized)`
          : " (no changes needed)";
        await this.sendMessage(msg.chat.id, `✓ Session compacted${suffix}`);
        return;
      }
      content = remainder;
    }

    let responseText = "";
    let typingTimer: NodeJS.Timeout | null = null;
    const startTyping = () => {
      void this.sendChatAction(msg.chat.id, "typing");
      typingTimer = setInterval(() => {
        void this.sendChatAction(msg.chat.id, "typing");
      }, 4000);
    };
    const stopTyping = () => {
      if (typingTimer) clearInterval(typingTimer);
      typingTimer = null;
    };
    const sender = buildSenderName(msg);
    const prompt = `New Telegram message from ${sender} (chat: ${formatChatLabel(msg)}):\n${content}`.trim();

    try {
      startTyping();
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
    } finally {
      stopTyping();
    }

    const replyPrefix = String(this.config.reply_prefix ?? "").trim();
    const reply = `${replyPrefix ? `${replyPrefix}\n\n` : ""}${responseText}`.trim();
    if (!reply) return;
    await this.sendMessage(msg.chat.id, reply);
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      const url = this.apiUrl("/sendMessage");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) {
        this.lastError = `Telegram sendMessage failed: ${res.status}`;
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  private async sendChatAction(chatId: number, action: string): Promise<void> {
    try {
      const url = this.apiUrl("/sendChatAction");
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action }),
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      // Ignore typing failures to avoid interrupting the main flow.
    }
  }
}
