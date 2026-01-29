import { ToolRegistry } from "../registry.js";
import { registerDefaultTools } from "../../registerDefaultTools.js";
import { runAgentTurn } from "../../agentLoop.js";
import { withToolContext, getToolContext } from "../context.js";
import { newId } from "../../../shared/ids.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

type Args = {
  description?: string;
  prompt?: string;
  model_tier?: "full" | "mini" | "nano" | string;
};

export async function subagentTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const description = typeof args?.description === "string" ? args.description.trim() : "";
  const prompt = typeof args?.prompt === "string" ? args.prompt.trim() : "";
  if (!description) throw new Error("subagent_tool: missing args.description");
  if (!prompt) throw new Error("subagent_tool: missing args.prompt");

  const parent = getToolContext();
  const workspaceDir = resolveWorkspaceDir(parent?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const repoRoot = parent?.repoRoot || process.cwd();

  // Prevent recursive subagent spawning by using a registry without subagent_tool.
  const registry = new ToolRegistry();
  registerDefaultTools(registry, { workspaceDir });
  registry.unregister("sessions_list");
  registry.unregister("sessions_history");
  registry.unregister("sessions_send");
  registry.unregister("sessions_spawn");
  registry.unregister("sessions_spawn_async");

  const sessionId = newId("subsession");
  const subagentId = newId("subagent");
  const input = `You are a specialist subagent.\n\nRole: ${description}\n\nTask:\n${prompt}`;
  const modelOverride = (process.env.FF_SUBAGENT_MODEL || "").trim() || undefined;

  const chunks: Array<{ kind: string; value: string }> = [];
  let content = "";
  let hadError = false;
  let error: string | undefined;
  let toolCount = 0;
  let tokens = 0;
  let lastProgressAt = Date.now();

  const emitProgress = (action: string, file?: string) => {
    lastProgressAt = Date.now();
    parent?.emitSubagentEvent?.({
      event: "progress",
      agentId: subagentId,
      action,
      file,
      toolCount,
      tokens: Math.floor(tokens)
    });
  };

  const extractFileFromText = (text: string): string | undefined => {
    const match = text.match(/([A-Za-z0-9_./\\-]+\.[A-Za-z0-9]{1,8})/);
    return match?.[1];
  };

  // Emit start event
  parent?.emitSubagentEvent?.({
    event: "start",
    agentId: subagentId,
    task: description
  });

  await withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
    try {
      for await (const ch of runAgentTurn({ userInput: input, registry, sessionId, repoRoot, modelOverride, signal })) {
        if (ch.kind === "content") {
          content += ch.delta;
          tokens += ch.delta.length / 4; // Rough token estimate
          chunks.push({ kind: "content", value: ch.delta });
        } else if (ch.kind === "thinking") {
          if (Date.now() - lastProgressAt > 45000) {
            emitProgress("Thinking...");
          }
          chunks.push({ kind: "thinking", value: ch.delta });
        } else if (ch.kind === "error") {
          hadError = true;
          error = ch.message;
          chunks.push({ kind: "error", value: ch.message });
        } else if (ch.kind === "status") {
          // Extract tool and update actions from status messages
          const statusMsg = ch.message;
          if (statusMsg.startsWith("tool_start:")) {
            toolCount++;
            const rest = statusMsg.slice("tool_start:".length);
            const [toolName, ...contextParts] = rest.split("|");
            const contextMsg = contextParts.join("|").trim();
            const action = contextMsg || toolName.trim();
            const file = contextMsg ? extractFileFromText(contextMsg) : undefined;
            emitProgress(action, file);
          } else if (statusMsg.startsWith("update:")) {
            const updateMsg = statusMsg.slice("update:".length).trim();
            if (updateMsg) emitProgress(updateMsg);
          } else if (statusMsg.startsWith("tool_end:")) {
            const rest = statusMsg.slice("tool_end:".length);
            const [toolName] = rest.split("|");
            if (toolName.trim()) emitProgress(`Completed ${toolName.trim()}`);
          } else if (statusMsg && Date.now() - lastProgressAt > 45000) {
            // Soft heartbeat if no visible updates for a while
            emitProgress("Working...");
          }
          chunks.push({ kind: "status", value: ch.message });
        }
      }
    } catch (e) {
      hadError = true;
      error = e instanceof Error ? e.message : String(e);
    }
  });

  // Emit complete event
  parent?.emitSubagentEvent?.({
    event: "complete",
    agentId: subagentId,
    status: hadError ? "error" : "done",
    error
  });

  return JSON.stringify(
    {
      ok: !hadError,
      subagent_id: subagentId,
      session_id: sessionId,
      model_tier: args.model_tier || "full",
      content: content.trim(),
      error,
      // Keep a lightweight trace for debugging (tool outputs are already in the session store).
      trace: chunks.slice(0, 60)
    },
    null,
    2
  );
}
