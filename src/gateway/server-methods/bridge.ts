import type { GatewayMethodHandler } from "../server-shared.js";

export const bridgeSubscribeHandler: GatewayMethodHandler = async (params, ctx, meta) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const sessionKey = typeof record.sessionKey === "string" ? record.sessionKey.trim() : "";
  if (!sessionKey) {
    return { ok: false, error: { code: "invalid_params", message: "sessionKey required" } };
  }
  ctx.subscriptions.subscribe(meta.connId, sessionKey);
  return { ok: true, payload: { sessionKey } };
};

export const bridgeUnsubscribeHandler: GatewayMethodHandler = async (params, ctx, meta) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const sessionKey = typeof record.sessionKey === "string" ? record.sessionKey.trim() : "";
  if (!sessionKey) {
    return { ok: false, error: { code: "invalid_params", message: "sessionKey required" } };
  }
  ctx.subscriptions.unsubscribe(meta.connId, sessionKey);
  return { ok: true, payload: { sessionKey } };
};

export const bridgeUnsubscribeAllHandler: GatewayMethodHandler = async (_params, ctx, meta) => {
  ctx.subscriptions.unsubscribeAll(meta.connId);
  return { ok: true, payload: { cleared: true } };
};
