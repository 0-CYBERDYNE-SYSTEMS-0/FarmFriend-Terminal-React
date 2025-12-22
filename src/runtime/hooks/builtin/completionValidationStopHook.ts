import { AgentStopContext, AgentStopResult, Hook } from "../types.js";
import { loadSessionTaskStore } from "../../session/sessionTaskStore.js";

type Task = {
  id: string;
  description: string;
  status: "open" | "completed";
  created_at: string;
  updated_at: string;
};

export function createCompletionValidationStopHook(params: {
  enabled: boolean;
  maxAttempts: number;
  workspaceDir?: string;
}): Hook & { type: "agent_stop" } {
  let blockAttempts = 0;

  const onStop = async (_ctx: AgentStopContext): Promise<AgentStopResult> => {
    if (!params.enabled) return { action: "allow" };
    if (!params.workspaceDir) return { action: "allow" }; // No workspace, can't check tasks

    // Read actual task status for this session.
    const { store } = loadSessionTaskStore({ workspaceDir: params.workspaceDir, sessionId: _ctx.sessionId });
    const openTasks = store.tasks.filter((t) => t.status === "open");

    if (!openTasks.length) return { action: "allow" };

    blockAttempts += 1;

    // Show exact task descriptions for this session.
    const taskList = openTasks
      .slice(0, 5)
      .map((t) => `- [${t.id}] ${t.description}`)
      .join("\n");

    const repeatedWarning = blockAttempts > params.maxAttempts ? `\n\nRepeated stop attempts are still blocked until all open tasks are cleared.` : "";

    const systemPrompt =
      `Observation: You attempted to stop with outstanding work.\n\n` +
      `Tasks still marked as open for this session (${openTasks.length}):\n${taskList}\n\n` +
      `Complete these tasks or close them with manage_task(action="complete", task_id="...") if they are no longer needed.` +
      repeatedWarning;

    const statusMessage =
      blockAttempts <= params.maxAttempts
        ? `completion_validation: ${openTasks.length} tasks open - complete them before stopping`
        : `completion_validation: ${openTasks.length} tasks open - stop blocked until tasks complete`;

    return {
      action: "block",
      reason: "completion_validation: open tasks remain",
      statusMessage,
      systemPrompt
    };
  };

  return {
    type: "agent_stop",
    name: "completion_validation_stop",
    priority: 50,
    enabled: true,
    run: onStop
  };
}
