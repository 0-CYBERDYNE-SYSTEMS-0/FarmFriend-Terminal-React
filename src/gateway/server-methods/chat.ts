import type { GatewayMethodHandler } from "../server-shared.js";
import { runAgentTurn } from "../../runtime/agentLoop.js";
import { withToolContext } from "../../runtime/tools/context.js";
import { resolveSessionId, resolveMainSessionId, saveLastActiveSession } from "../../runtime/session/sessionPolicy.js";

export const chatSendHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
  if (!prompt) {
    return { ok: false, error: { code: "invalid_params", message: "prompt required" } };
  }
  const requestedSessionId = typeof record.sessionId === "string" ? record.sessionId : undefined;
  const sessionId = resolveSessionId({
    requested: requestedSessionId,
    workspaceDir: ctx.workspaceDir,
    cfg: ctx.cfg
  }) || resolveMainSessionId(ctx.cfg);
  saveLastActiveSession(ctx.workspaceDir, sessionId);

  let responseText = "";
  await withToolContext(
    {
      sessionId,
      workspaceDir: ctx.workspaceDir,
      repoRoot: ctx.repoRoot
    },
    async () => {
      for await (const chunk of runAgentTurn({
        userInput: prompt,
        registry: ctx.registry,
        sessionId,
        signal: new AbortController().signal
      })) {
        if (chunk.kind === "content") responseText += chunk.delta || "";
      }
    }
  );

  const payload = { sessionId, response: responseText };
  ctx.subscriptions.sendToSession(sessionId, "chat", payload);
  return { ok: true, payload };
};
