import type { GatewayMethodHandler } from "../server-shared.js";

export const channelsStatusHandler: GatewayMethodHandler = async (_params, ctx) => {
  const status = ctx.bridgeManager.getStatus();
  return { ok: true, payload: { channels: status.channels, timestamp: status.timestamp } };
};
