import type { RuntimeConfig } from "../runtime/config/loadConfig.js";

export type GatewayAuthMode = "none" | "token" | "password";

export type GatewayAuthConfig = {
  mode?: GatewayAuthMode;
  token?: string;
  password?: string;
  allowTailscale?: boolean;
};

export type GatewayRemoteConfig = {
  url?: string;
  token?: string;
  password?: string;
};

export type GatewayConfig = {
  mode?: "local" | "remote";
  bind?: "loopback" | "all" | "auto";
  port?: number;
  tailscale?: {
    mode?: "serve" | "funnel";
    resetOnExit?: boolean;
  };
  auth?: GatewayAuthConfig;
  remote?: GatewayRemoteConfig;
};

export function resolveGatewayPort(cfg?: RuntimeConfig): number {
  const raw = (cfg as any)?.gateway?.port;
  const port = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  return port && port > 0 ? Math.floor(port) : 18789;
}

export function resolveGatewayBind(cfg?: RuntimeConfig): string {
  const bind = String((cfg as any)?.gateway?.bind || "loopback").toLowerCase();
  if (bind === "all" || bind === "0.0.0.0") return "0.0.0.0";
  if (bind === "auto") return "0.0.0.0";
  return "127.0.0.1";
}

export function resolveGatewayMode(cfg?: RuntimeConfig): "local" | "remote" {
  const mode = String((cfg as any)?.gateway?.mode || "local").toLowerCase();
  return mode === "remote" ? "remote" : "local";
}

export function resolveGatewayRemote(cfg?: RuntimeConfig): GatewayRemoteConfig | undefined {
  const remote = (cfg as any)?.gateway?.remote;
  if (!remote || typeof remote !== "object") return undefined;
  return remote as GatewayRemoteConfig;
}

export function resolveGatewayAuthConfig(cfg?: RuntimeConfig): GatewayAuthConfig | undefined {
  const auth = (cfg as any)?.gateway?.auth;
  if (!auth || typeof auth !== "object") return undefined;
  return auth as GatewayAuthConfig;
}

export function resolveGatewayTailscaleMode(cfg?: RuntimeConfig): string | undefined {
  const raw = (cfg as any)?.gateway?.tailscale?.mode;
  if (!raw) return undefined;
  return String(raw).toLowerCase();
}

export function resolveGatewayUrl(cfg?: RuntimeConfig): string {
  const mode = resolveGatewayMode(cfg);
  const remote = resolveGatewayRemote(cfg);
  if (mode === "remote" && remote?.url) return String(remote.url);
  const port = resolveGatewayPort(cfg);
  return `ws://127.0.0.1:${port}`;
}
