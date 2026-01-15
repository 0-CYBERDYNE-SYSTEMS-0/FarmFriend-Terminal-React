import { randomUUID } from "node:crypto";
import type { RuntimeConfig } from "../runtime/config/loadConfig.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import {
  resolveGatewayAuthConfig,
  resolveGatewayMode,
  resolveGatewayRemote,
  resolveGatewayUrl,
  resolveGatewayPort
} from "./config.js";
import { GatewayClient } from "./client.js";
import { PROTOCOL_VERSION } from "./protocol/index.js";

export type CallGatewayOptions = {
  url?: string;
  token?: string;
  password?: string;
  method: string;
  params?: unknown;
  expectFinal?: boolean;
  timeoutMs?: number;
  clientName?: string;
  clientVersion?: string;
  platform?: string;
  mode?: string;
  instanceId?: string;
  minProtocol?: number;
  maxProtocol?: number;
  configPath?: string;
};

export type GatewayConnectionDetails = {
  url: string;
  urlSource: string;
  message: string;
};

export function buildGatewayConnectionDetails(options: { config?: RuntimeConfig; url?: string } = {}): GatewayConnectionDetails {
  const config = options.config ?? resolveConfig();
  const mode = resolveGatewayMode(config);
  const remote = resolveGatewayRemote(config);
  const localPort = resolveGatewayPort(config);
  const localUrl = `ws://127.0.0.1:${localPort}`;
  const urlOverride = typeof options.url === "string" && options.url.trim() ? options.url.trim() : undefined;
  const remoteUrl = typeof remote?.url === "string" && remote.url.trim() ? remote.url.trim() : undefined;
  const url = urlOverride || remoteUrl || localUrl;
  const urlSource = urlOverride
    ? "cli --url"
    : remoteUrl
      ? "config gateway.remote.url"
      : mode === "remote"
        ? "remote fallback -> local"
        : "local loopback";
  const message = `Gateway target: ${url}\nSource: ${urlSource}`;
  return { url, urlSource, message };
}

export async function callGateway<T = unknown>(opts: CallGatewayOptions): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const config = resolveConfig();
  const authConfig = resolveGatewayAuthConfig(config);
  const mode = resolveGatewayMode(config);
  const remote = resolveGatewayRemote(config);

  const token =
    opts.token ??
    authConfig?.token ??
    (mode === "remote" ? remote?.token : undefined) ??
    process.env.FF_GATEWAY_TOKEN ??
    undefined;
  const password =
    opts.password ??
    authConfig?.password ??
    (mode === "remote" ? remote?.password : undefined) ??
    process.env.FF_GATEWAY_PASSWORD ??
    undefined;

  const url = opts.url ?? resolveGatewayUrl(config);
  let readyResolve: (() => void) | null = null;
  let readyReject: ((err: unknown) => void) | null = null;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const client = new GatewayClient({
    url,
    token,
    password,
    instanceId: opts.instanceId ?? randomUUID(),
    clientName: opts.clientName ?? "ff-terminal",
    clientVersion: opts.clientVersion ?? "dev",
    platform: opts.platform ?? process.platform,
    mode: opts.mode ?? "cli",
    minProtocol: opts.minProtocol ?? PROTOCOL_VERSION,
    maxProtocol: opts.maxProtocol ?? PROTOCOL_VERSION,
    onHelloOk: () => {
      readyResolve?.();
    },
    onConnectError: (err) => {
      readyReject?.(err);
    }
  });

  let timeout: NodeJS.Timeout | null = null;
  const result = new Promise<T>((resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`gateway call timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    client.start();
    void ready
      .then(() => client.request<T>(opts.method, opts.params, { expectFinal: opts.expectFinal }))
      .then((value) => resolve(value))
      .catch(reject)
      .finally(() => {
        client.stop();
      });
  });

  try {
    return await result;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
