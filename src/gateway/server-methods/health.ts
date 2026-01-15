import { quickHealthCheck } from "../../runtime/workspace/healthCheck.js";
import type { GatewayMethodHandler } from "../server-shared.js";

export const healthHandler: GatewayMethodHandler = async (_params, ctx) => {
  const started = Date.now();
  const issues = await quickHealthCheck(ctx.workspaceDir);
  const durationMs = Date.now() - started;
  return {
    ok: true,
    payload: {
      ok: issues.length === 0,
      issues,
      durationMs
    }
  };
};
