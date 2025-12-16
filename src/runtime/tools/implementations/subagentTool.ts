import { ToolRegistry } from "../registry.js";
import { registerDefaultTools } from "../../registerDefaultTools.js";
import { runAgentTurn } from "../../agentLoop.js";
import { withToolContext, getToolContext } from "../context.js";
import { newId } from "../../../shared/ids.js";

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
  const workspaceDir = parent?.workspaceDir || process.cwd();
  const repoRoot = parent?.repoRoot || process.cwd();

  // Prevent recursive subagent spawning by using a registry without subagent_tool.
  const registry = new ToolRegistry();
  registerDefaultTools(registry, { workspaceDir });

  const sessionId = newId("subsession");
  const subagentId = newId("subagent");
  const input = `You are a specialist subagent.\n\nRole: ${description}\n\nTask:\n${prompt}`;
  const modelOverride = (process.env.FF_SUBAGENT_MODEL || "").trim() || undefined;

  const chunks: Array<{ kind: string; value: string }> = [];
  let content = "";
  let hadError = false;
  let error: string | undefined;

  await withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
    try {
      for await (const ch of runAgentTurn({ userInput: input, registry, sessionId, repoRoot, modelOverride, signal })) {
        if (ch.kind === "content") {
          content += ch.delta;
          chunks.push({ kind: "content", value: ch.delta });
        } else if (ch.kind === "thinking") {
          chunks.push({ kind: "thinking", value: ch.delta });
        } else if (ch.kind === "error") {
          hadError = true;
          error = ch.message;
          chunks.push({ kind: "error", value: ch.message });
        } else if (ch.kind === "status") {
          chunks.push({ kind: "status", value: ch.message });
        }
      }
    } catch (e) {
      hadError = true;
      error = e instanceof Error ? e.message : String(e);
    }
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
