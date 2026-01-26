import fs from "node:fs";
import path from "node:path";
import type { ToolRegistry } from "../../runtime/tools/registry.js";
import { runAgentTurn } from "../../runtime/agentLoop.js";
import { withToolContext } from "../../runtime/tools/context.js";
import { buildSessionKey } from "../../runtime/session/sessionKey.js";
import { getOrCreateSessionIdForKey } from "../../runtime/session/sessionIndex.js";
import { evaluateSendPolicy } from "../../runtime/session/sendPolicy.js";
import { resetSessionWithArchive, compactSessionWithSummary } from "../../runtime/session/resetHelpers.js";
import { resolveConfig, type RuntimeConfig } from "../../runtime/config/loadConfig.js";
import type { GatewayBridge, GatewayChannelStatus } from "../types.js";
import { TelegramPairingManager } from "../../telegram/pairingManager.js";

type TelegramConfig = {
  enabled?: boolean;
  token?: string;
  poll_interval_ms?: number;
  reply_prefix?: string;
  allow_from?: string[];
  allow_groups?: boolean;
  admin_from?: string[];
  mention_gate?: boolean;
  reply_gate?: boolean;
  session_scope?: "main" | "per-sender" | "bridge";
  pairing?: {
    enabled?: boolean;
    code_ttl_minutes?: number;
  };
  webhook?: {
    enabled?: boolean;
    url?: string;
    secret_token?: string;
    path?: string;
  };
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    caption?: string;
    date: number;
    chat: { id: number; type: string; title?: string; username?: string; first_name?: string; last_name?: string };
    from?: { id: number; is_bot?: boolean; username?: string; first_name?: string; last_name?: string };
    reply_to_message?: {
      message_id: number;
      from?: { id: number; is_bot?: boolean; username?: string };
      text?: string;
    };
    entities?: Array<{
      type: string;
      offset: number;
      length: number;
    }>;
    caption_entities?: Array<{
      type: string;
      offset: number;
      length: number;
    }>;
    photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
    document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
    audio?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
    voice?: { file_id: string; mime_type?: string; file_size?: number };
    video?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
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
  private botUsername: string | null = null;
  private botId: number | null = null;
  private pairingManager: TelegramPairingManager;
  private webhookEnabled = false;
  private webhookConfigured = false;
  private downloadsDir: string;

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
    this.pairingManager = new TelegramPairingManager(this.workspaceDir);
    this.downloadsDir = path.join(this.workspaceDir, "telegram", "downloads");
  }

  async start(): Promise<void> {
    this.lastError = null;
    if (!this.config.enabled) return;
    if (!this.config.token || !this.config.token.trim()) {
      this.lastError = "Telegram token missing";
      return;
    }
    await this.loadBotIdentity();
    this.webhookEnabled = Boolean(this.config.webhook?.enabled);
    if (this.webhookEnabled) {
      await this.configureWebhook();
      return;
    }
    await this.clearWebhook();
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
    const running = Boolean(this.timer) || (this.webhookEnabled && this.webhookConfigured);
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
            poll_interval_ms: this.config.poll_interval_ms ?? 6000,
            webhook_enabled: this.webhookEnabled,
            webhook_configured: this.webhookConfigured
          }
        : { reason: "disabled" }
    };
  }

  private apiUrl(path: string): string {
    return `https://api.telegram.org/bot${this.config.token}${path}`;
  }

  private async loadBotIdentity(): Promise<void> {
    try {
      const res = await fetch(this.apiUrl("/getMe"), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const body = await res.json();
      const result = body?.result;
      if (result?.id) this.botId = Number(result.id);
      if (result?.username) this.botUsername = String(result.username);
    } catch {
      // Ignore failures; mention gate will be best-effort.
    }
  }

  private async configureWebhook(): Promise<void> {
    const url = String(this.config.webhook?.url || "").trim();
    if (!url) {
      this.lastError = "Telegram webhook url missing";
      this.webhookConfigured = false;
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        url,
        allowed_updates: ["message"]
      };
      const secret = String(this.config.webhook?.secret_token || "").trim();
      if (secret) payload.secret_token = secret;
      const res = await fetch(this.apiUrl("/setWebhook"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) {
        this.lastError = `Telegram setWebhook failed: ${res.status}`;
        this.webhookConfigured = false;
        return;
      }
      this.webhookConfigured = true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.webhookConfigured = false;
    }
  }

  private async clearWebhook(): Promise<void> {
    try {
      await fetch(this.apiUrl("/deleteWebhook"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: true }),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      // ignore
    }
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
        await this.processUpdate(update);
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false;
    }
  }

  async handleWebhookUpdate(update: TelegramUpdate): Promise<void> {
    if (!this.config.enabled || !this.config.token) return;
    await this.processUpdate(update);
  }

  private async processUpdate(update: TelegramUpdate): Promise<void> {
    this.lastUpdateId = Math.max(this.lastUpdateId ?? 0, update.update_id);
    const msg = update.message;
    if (!msg) return;
    if (msg.from?.is_bot) return;
    await this.handleInbound(update);
  }

  private async downloadTelegramFile(fileId: string, filenameHint?: string): Promise<string | null> {
    try {
      const res = await fetch(this.apiUrl(`/getFile?file_id=${encodeURIComponent(fileId)}`), {
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) return null;
      const body = await res.json();
      const filePath = body?.result?.file_path;
      if (!filePath) return null;
      const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
      const fileUrl = `https://api.telegram.org/file/bot${this.config.token}${normalizedPath}`;
      const fileRes = await fetch(fileUrl, { signal: AbortSignal.timeout(20000) });
      if (!fileRes.ok) return null;
      const arrayBuffer = await fileRes.arrayBuffer();
      const safeName = (filenameHint || path.basename(filePath) || "file").replace(/[^\w.\-]+/g, "_");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outName = `${stamp}_${safeName}`;
      fs.mkdirSync(this.downloadsDir, { recursive: true });
      const outPath = path.join(this.downloadsDir, outName);
      fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
      return outPath;
    } catch {
      return null;
    }
  }

  private async extractAttachments(msg: TelegramUpdate["message"]): Promise<Array<{ label: string; path: string }>> {
    const attachments: Array<{ label: string; path: string }> = [];
    if (!msg) return attachments;
    if (Array.isArray(msg.photo) && msg.photo.length) {
      const sorted = [...msg.photo].sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
      const best = sorted[0];
      const path = await this.downloadTelegramFile(best.file_id, "photo.jpg");
      if (path) attachments.push({ label: "photo", path });
    }
    if (msg.document?.file_id) {
      const path = await this.downloadTelegramFile(msg.document.file_id, msg.document.file_name);
      if (path) attachments.push({ label: "document", path });
    }
    if (msg.audio?.file_id) {
      const path = await this.downloadTelegramFile(msg.audio.file_id, msg.audio.file_name || "audio");
      if (path) attachments.push({ label: "audio", path });
    }
    if (msg.voice?.file_id) {
      const path = await this.downloadTelegramFile(msg.voice.file_id, "voice.ogg");
      if (path) attachments.push({ label: "voice", path });
    }
    if (msg.video?.file_id) {
      const path = await this.downloadTelegramFile(msg.video.file_id, msg.video.file_name || "video.mp4");
      if (path) attachments.push({ label: "video", path });
    }
    return attachments;
  }

  private allowMessage(update: TelegramUpdate, pairingEnabled: boolean): boolean {
    const msg = update.message;
    if (!msg) return false;
    const allowList = this.config.allow_from ?? [];
    const chatId = String(msg.chat.id);
    const senderId = msg.from ? String(msg.from.id) : "";
    const username = msg.from?.username ? `@${msg.from.username}` : "";
    const chatType = msg.chat.type;
    const allowGroups = Boolean(this.config.allow_groups);
    if (chatType !== "private" && !allowGroups) return false;
    if (!allowList.length) return !pairingEnabled;
    return allowList.some((entry) => {
      const v = String(entry).trim();
      return v === chatId || v === senderId || (username && v.toLowerCase() === username.toLowerCase());
    });
  }

  private isAdmin(update: TelegramUpdate): boolean {
    const msg = update.message;
    if (!msg?.from) return false;
    const adminList = (this.config.admin_from ?? this.config.allow_from ?? []).map((v) => String(v).trim());
    if (!adminList.length) return false;
    const senderId = String(msg.from.id);
    const username = msg.from.username ? `@${msg.from.username}` : "";
    return adminList.some((entry) => {
      const v = String(entry).trim();
      return v === senderId || (username && v.toLowerCase() === username.toLowerCase());
    });
  }

  private messageMentionsBot(msg: TelegramUpdate["message"]): boolean {
    const username = this.botUsername ? `@${this.botUsername}`.toLowerCase() : "";
    const text = (msg?.text || msg?.caption || "").toLowerCase();
    if (username && text.includes(username)) return true;
    const entities = msg?.entities || msg?.caption_entities || [];
    if (!entities.length || !username) return false;
    for (const entity of entities) {
      if (entity.type !== "mention") continue;
      const slice = text.slice(entity.offset, entity.offset + entity.length);
      if (slice === username) return true;
    }
    return false;
  }

  private shouldRespondToMessage(msg: TelegramUpdate["message"]): boolean {
    if (!msg) return false;
    const chatType = msg.chat.type === "private" ? "direct" : "group";
    if (chatType === "direct") return true;
    const mentionGate = Boolean(this.config.mention_gate);
    const replyGate = Boolean(this.config.reply_gate);
    if (!mentionGate && !replyGate) return true;
    const isReplyToBot = Boolean(msg.reply_to_message?.from?.id && msg.reply_to_message?.from?.id === this.botId);
    if (replyGate && isReplyToBot) return true;
    if (mentionGate && this.messageMentionsBot(msg)) return true;
    return false;
  }

  private resolveSessionId(update: TelegramUpdate): string {
    const msg = update.message!;
    const chatType = msg.chat.type === "private" ? "direct" : "group";
    const senderId = msg.from ? String(msg.from.id) : String(msg.chat.id);
    const scopeOverride = String(this.config.session_scope || "").trim().toLowerCase();
    let sessionKey: string;
    if (scopeOverride === "main") {
      sessionKey = "main";
    } else if (scopeOverride === "bridge") {
      sessionKey = chatType === "direct" ? "main" : `telegram:group:${msg.chat.id}`;
    } else if (scopeOverride === "per-sender") {
      const chatKind = chatType === "group" ? "group" : "direct";
      const keyId = chatType === "group" ? senderId : String(msg.chat.id);
      sessionKey = `telegram:${chatKind}:${keyId}`;
    } else {
      sessionKey = buildSessionKey({
        cfg: this.runtimeCfg,
        provider: "telegram",
        chatType,
        chatId: String(msg.chat.id)
      });
    }
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
    if (!this.shouldRespondToMessage(msg)) return;

    const senderId = msg.from ? String(msg.from.id) : "";
    const allowList = this.config.allow_from ?? [];
    const pairingEnabled = Boolean(this.config.pairing?.enabled);
    const allowedByPairing = senderId ? this.pairingManager.isAllowed(senderId, allowList) : false;
    const allowed = this.allowMessage(update, pairingEnabled) || allowedByPairing;

    const text = msg.text || msg.caption || "";
    const trimmed = text.trim();
    if (this.isAdmin(update)) {
      if (/^\/approve\b/i.test(trimmed)) {
        const code = trimmed.replace(/^\/approve\b/i, "").trim();
        if (!code) {
          await this.sendMessage(msg.chat.id, "Usage: /approve <code>");
          return;
        }
        const result = this.pairingManager.approvePairing(code);
        const reply = result.success
          ? `✓ Approved ${result.senderId}`
          : "✗ Code not found or already approved";
        await this.sendMessage(msg.chat.id, reply);
        return;
      }
      if (/^\/pending\b/i.test(trimmed)) {
        const pending = this.pairingManager.getPendingPairings(this.config.pairing?.code_ttl_minutes);
        if (!pending.length) {
          await this.sendMessage(msg.chat.id, "No pending pairing requests.");
          return;
        }
        const lines = pending.slice(0, 10).map((p) => `- ${p.code} from ${p.from}`);
        const suffix = pending.length > 10 ? `\n...and ${pending.length - 10} more` : "";
        await this.sendMessage(msg.chat.id, `Pending pairings:\n${lines.join("\n")}${suffix}`);
        return;
      }
      if (/^\/allowlist\b/i.test(trimmed)) {
        const parts = trimmed.split(/\s+/);
        const sub = (parts[1] || "list").toLowerCase();
        if (sub === "list") {
          const list = this.pairingManager.listAllowed();
          const body = list.length ? list.map((v) => `- ${v}`).join("\n") : "(empty)";
          await this.sendMessage(msg.chat.id, `Allowlist:\n${body}`);
          return;
        }
        if (sub === "add") {
          const value = parts[2];
          if (!value) {
            await this.sendMessage(msg.chat.id, "Usage: /allowlist add <sender_id>");
            return;
          }
          this.pairingManager.addAllowed(value);
          await this.sendMessage(msg.chat.id, `✓ Added ${value}`);
          return;
        }
        if (sub === "remove") {
          const value = parts[2];
          if (!value) {
            await this.sendMessage(msg.chat.id, "Usage: /allowlist remove <sender_id>");
            return;
          }
          const removed = this.pairingManager.removeAllowed(value);
          await this.sendMessage(msg.chat.id, removed ? `✓ Removed ${value}` : `✗ ${value} not found`);
          return;
        }
        await this.sendMessage(msg.chat.id, "Usage: /allowlist [list|add|remove]");
        return;
      }
    }

    if (!allowed) {
      if (pairingEnabled && msg.chat.type === "private" && senderId) {
        const code = this.pairingManager.requestPairing({
          from: senderId,
          chatId: String(msg.chat.id),
          username: msg.from?.username,
          displayName: buildSenderName(msg),
          ttlMinutes: this.config.pairing?.code_ttl_minutes
        });
        await this.sendMessage(
          msg.chat.id,
          `🔐 First-time access requires approval.\n\nYour pairing code: ${code}\n\nAsk the bot owner to approve with:\n/approve ${code}`
        );
      }
      return;
    }

    const sessionId = this.resolveSessionId(update);
    const chatType = msg.chat.type === "private" ? "direct" : "group";
    const decision = evaluateSendPolicy({
      cfg: this.runtimeCfg,
      provider: "telegram",
      chatType,
      sessionId
    });
    if (!decision.allowed) return;

    const attachments = await this.extractAttachments(msg);
    let content = msg.text || msg.caption || "";
    const contentTrimmed = content.trim();
    if (/^\/(reset|new)\b/i.test(contentTrimmed)) {
      const remainder = contentTrimmed.replace(/^\/(reset|new)\b/i, "").trim();
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
    } else if (/^\/compact\b/i.test(contentTrimmed)) {
      const remainder = contentTrimmed.replace(/^\/compact\b/i, "").trim();
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
    const attachmentLines = attachments.map((a) => `- ${a.label}: ${a.path}`).join("\n");
    const attachmentBlock = attachmentLines ? `\n\nAttachments:\n${attachmentLines}` : "";
    const prompt = `New Telegram message from ${sender} (chat: ${formatChatLabel(msg)}):\n${content || "(no text)"}${attachmentBlock}`.trim();

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
