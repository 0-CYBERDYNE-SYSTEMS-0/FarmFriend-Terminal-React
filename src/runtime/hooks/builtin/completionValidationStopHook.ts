import fs from "node:fs";
import path from "node:path";
import { AgentStopContext, AgentStopResult, Hook } from "../types.js";

type Task = {
  id: string;
  description: string;
  status: "open" | "completed";
  created_at: string;
  updated_at: string;
};

type TaskStore = { tasks: Task[] };

function readTaskStore(workspaceDir: string): TaskStore {
  const storePath = path.join(workspaceDir, "tasks.json");
  if (!fs.existsSync(storePath)) return { tasks: [] };
  try {
    return JSON.parse(fs.readFileSync(storePath, "utf8")) as TaskStore;
  } catch {
    return { tasks: [] };
  }
}

export function createCompletionValidationStopHook(params: {
  enabled: boolean;
  maxAttempts: number;
  workspaceDir?: string;
}): Hook & { type: "agent_stop" } {
  let blockAttempts = 0;

  const onStop = async (_ctx: AgentStopContext): Promise<AgentStopResult> => {
    if (!params.enabled) return { action: "allow" };
    if (!params.workspaceDir) return { action: "allow" }; // No workspace, can't check tasks

    // Read actual task status from tasks.json
    const store = readTaskStore(params.workspaceDir);
    const openTasks = store.tasks.filter((t) => t.status === "open");

    if (!openTasks.length) return { action: "allow" };

    // ONE-SHOT NUDGE: Single gentle reminder, then allow stop
    // This catches ~80% of "forgot to finish" cases without creating loops
    if (blockAttempts < params.maxAttempts) {
      blockAttempts += 1;

      // Show exact task descriptions from tasks.json
      const taskList = openTasks
        .slice(0, 5)
        .map((t) => `- [${t.id}] ${t.description}`)
        .join("\n");

      const systemPrompt =
        `Observation: The following tasks are still marked as "open" in your task list:\n` +
        `${taskList}\n\n` +
        `If these tasks are complete, use manage_task to mark them as completed. ` +
        `If they are no longer needed, please explain why and stop. Otherwise, please continue with the work.`;

      return {
        action: "block",
        reason: "completion_validation: open tasks remain (one nudge allowed)",
        statusMessage: `completion_validation: ${openTasks.length} open task(s) - complete or explain`,
        systemPrompt
      };
    }

    // Second stop attempt: always allow (agent wins)
    return { action: "allow" };
  };

  return {
    type: "agent_stop",
    name: "completion_validation_stop",
    priority: 50,
    enabled: true,
    run: onStop
  };
}
