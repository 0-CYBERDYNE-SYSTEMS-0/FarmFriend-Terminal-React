import fs from "node:fs";
import type { GatewayMethodHandler } from "../server-shared.js";
import { resolveConfig, type RuntimeConfig } from "../../runtime/config/loadConfig.js";
import { resolveGatewayAuthConfig, resolveGatewayTailscaleMode } from "../config.js";
import { resolveGatewayAuth } from "../auth.js";
import { defaultConfigPath } from "../../runtime/config/paths.js";

function redactConfig(value: any): any {
  if (Array.isArray(value)) return value.map((item) => redactConfig(item));
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

export const configGetHandler: GatewayMethodHandler = async (_params, ctx) => {
  const cfg = resolveConfig({ repoRoot: ctx.repoRoot });
  const configPath = process.env.FF_CONFIG_PATH || defaultConfigPath();
  return {
    ok: true,
    payload: {
      config: redactConfig(cfg),
      configPath
    }
  };
};

export const configSetHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const next = record.config && typeof record.config === "object" ? (record.config as RuntimeConfig) : null;
  if (!next) {
    return { ok: false, error: { code: "invalid_params", message: "config object required" } };
  }
  const configPath = process.env.FF_CONFIG_PATH || defaultConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  } catch (err) {
    return { ok: false, error: { code: "write_failed", message: String(err) } };
  }
  return { ok: true, payload: { configPath } };
};

export const configReloadHandler: GatewayMethodHandler = async (_params, ctx) => {
  const cfg = resolveConfig({ repoRoot: ctx.repoRoot });
  ctx.cfg = cfg as RuntimeConfig;
  ctx.auth = resolveGatewayAuth({
    authConfig: resolveGatewayAuthConfig(ctx.cfg),
    tailscaleMode: resolveGatewayTailscaleMode(ctx.cfg)
  });
  const bridges = ctx.buildBridges(ctx.cfg);
  await ctx.bridgeManager.replaceAll(bridges);
  return { ok: true, payload: { reloaded: true, bridgeCount: bridges.length } };
};
