import path from "node:path";
import type { GatewayMethodHandler } from "../server-shared.js";
import { tailJsonLines } from "../logs.js";

export const logsTailHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const limit = Math.min(500, Math.max(10, Number(record.limit || 120)));
  const target = String(record.target || "gateway");
  let logPath: string;
  if (target === "gateway") {
    logPath = path.join(ctx.workspaceDir, "logs", "gateway", "events.jsonl");
  } else if (target === "scheduler") {
    logPath = path.join(ctx.workspaceDir, "logs", "scheduler", "scheduler.jsonl");
  } else {
    return { ok: false, error: { code: "invalid_target", message: "Unknown log target" } };
  }
  const events = tailJsonLines(logPath, limit);
  return { ok: true, payload: { path: logPath, events } };
};
