import type { RuntimeConfig } from "../config/loadConfig.js";

export type SessionScope = "main" | "per-sender" | "bridge";

export function resolveSessionScope(cfg?: RuntimeConfig): SessionScope {
  const raw = String((cfg as any)?.session?.scope || "").trim().toLowerCase();
  if (raw === "main") return "main";
  if (raw === "per-sender" || raw === "per_sender" || raw === "persender") return "per-sender";
  if (raw === "bridge" || raw === "group" || raw === "clawdbot") return "bridge";
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
  if (scope === "bridge" && params.chatType === "direct") return "main";
  const chatKind = params.chatType === "group" ? "group" : "direct";
  return `${params.provider}:${chatKind}:${params.chatId}`;
}
