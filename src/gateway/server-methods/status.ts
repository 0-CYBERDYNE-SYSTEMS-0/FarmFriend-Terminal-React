import type { GatewayMethodHandler } from "../server-shared.js";

export const statusHandler: GatewayMethodHandler = async (_params, ctx) => {
  return {
    ok: true,
    payload: ctx.bridgeManager.getStatus()
  };
};
