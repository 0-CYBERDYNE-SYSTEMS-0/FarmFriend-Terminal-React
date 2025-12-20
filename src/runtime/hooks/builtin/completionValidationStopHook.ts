import { AgentStopContext, AgentStopResult, Hook } from "../types.js";
import { extractPromises, unfulfilledHighConfidence, Promise as CVPromise } from "../completionValidator.js";
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

    // Promise-based validation (long-horizon autonomy): look at the assistant's latest message
    const promises = extractPromises(_ctx.assistantContent || "");

    // Heuristic: if no tools ran this turn but assistant text contains hallucinated tool tags,
    // synthesize a high-confidence promise to force a retry instead of silently stopping.
    const syntheticPromises: CVPromise[] = [];
    if (_ctx.toolExecutionsCount === 0) {
      const matches = [...(_ctx.assistantContent || "").matchAll(/\[tool:([^\]\s]+)\]/gi)];
      for (const m of matches.slice(0, 4)) {
        syntheticPromises.push({
          id: `promise_synth_${m[1] || "tool"}`,
          content: `[tool:${m[1]}] (no execution observed)`,
          promiseType: "tool_execution",
          extractedAction: "execute",
          extractedTarget: m[1] || "tool_call",
          confidence: 0.9,
          fulfilled: false,
          fulfillmentEvidence: []
        });
      }
    }

    const openPromises = unfulfilledHighConfidence([...promises, ...syntheticPromises]);

    if (!openTasks.length && !openPromises.length) return { action: "allow" };

    // ONE-SHOT NUDGE: Single gentle reminder, then allow stop
    // This catches ~80% of "forgot to finish" cases without creating loops
    if (blockAttempts < params.maxAttempts) {
      blockAttempts += 1;

      // Show exact task descriptions for this session.
      const taskList = openTasks
        .slice(0, 5)
        .map((t) => `- [${t.id}] ${t.description}`)
        .join("\n");

      const promiseList = openPromises
        .slice(0, 5)
        .map((p) => `- (${p.promiseType}) ${p.content}`)
        .join("\n");

      const sections = [] as string[];
      if (openTasks.length) {
        sections.push(
          `Tasks still marked as open for this session (${openTasks.length}):\n${taskList}`
        );
      }
      if (openPromises.length) {
        sections.push(
          `Commitments detected in your last reply that are not yet fulfilled (${openPromises.length}):\n${promiseList}`
        );
      }

      const systemPrompt =
        `Observation: You attempted to stop with outstanding work.\n\n` +
        sections.join("\n\n") +
        `\n\nIf tasks are done, close them with manage_task. If promises cannot be completed, explicitly explain why (environmental limits, missing context, etc.). Otherwise, continue and fulfill them.`;

      return {
        action: "block",
        reason: "completion_validation: outstanding tasks/promises (one nudge allowed)",
        statusMessage: `completion_validation: ${openTasks.length} tasks, ${openPromises.length} promises open - complete or explain`,
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
