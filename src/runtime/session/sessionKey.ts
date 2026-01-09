import type { RuntimeConfig } from "../config/loadConfig.js";

export type SessionScope = "main" | "per-sender" | "clawdbot";

export function resolveSessionScope(cfg?: RuntimeConfig): SessionScope {
  const raw = String((cfg as any)?.session?.scope || "").trim().toLowerCase();
  if (raw === "main") return "main";
  if (raw === "per-sender" || raw === "per_sender" || raw === "persender") return "per-sender";
  if (raw === "clawdbot" || raw === "group") return "clawdbot";
  return "main";
}

export function buildSessionKey(params: {
  cfg: RuntimeConfig;
  provider: string;
  chatType: "direct" | "group";
  chatId: string;
}): string {
  const scope = resolveSessionScope(params.cfg);
  if (scope === "main") return "main";
  if (scope === "clawdbot" && params.chatType === "direct") return "main";
  const chatKind = params.chatType === "group" ? "group" : "direct";
  return `${params.provider}:${chatKind}:${params.chatId}`;
}
