import {
  buildContinuationFeedback,
  ExecutionRecord,
  markFulfilled,
  Promise as CompletionPromise,
  unfulfilledHighConfidence
} from "../completionValidator.js";
import { AgentStopContext, AgentStopResult, Hook } from "../types.js";

export function createCompletionValidationStopHook(params: {
  enabled: boolean;
  maxAttempts: number;
  getPromises: () => CompletionPromise[];
  getExecutions: () => ExecutionRecord[];
}): Hook & { type: "agent_stop" } {
  let blockAttempts = 0;
  let lastGuardSignature: string | null = null;
  let lastGuardExecutions = 0;
  let reasoningOnlyKickUsed = false;

  const signatureOf = (promises: CompletionPromise[]): string =>
    promises
      .map((p) => `${p.promiseType}:${p.extractedAction.toLowerCase()}:${p.extractedTarget.toLowerCase()}`)
      .sort()
      .join("|");

  const onStop = async (_ctx: AgentStopContext): Promise<AgentStopResult> => {
    if (!params.enabled) return { action: "allow" };

    const promises = params.getPromises();
    const executions = params.getExecutions();
    markFulfilled(promises, executions);

    const unfulfilled = unfulfilledHighConfidence(promises);
    if (!unfulfilled.length) return { action: "allow" };

    // ONE-SHOT NUDGE: Single gentle reminder, then allow stop
    // This catches ~80% of "forgot to finish" cases without creating loops
    if (blockAttempts < params.maxAttempts) {
      blockAttempts += 1;
      lastGuardSignature = signatureOf(unfulfilled);
      lastGuardExecutions = executions.length;

      // Non-adversarial observation prompt (not "you MUST")
      const itemList = unfulfilled
        .slice(0, 5)
        .map((p) => `- ${p.promiseType}: "${p.content}" (target: ${p.extractedTarget})`)
        .join("\n");

      const systemPrompt =
        `Observation: The following items mentioned earlier do not appear to be resolved yet:\n` +
        `${itemList}\n\n` +
        `If these are done or no longer needed, please explain why and stop. Otherwise, please continue with the work.`;

      return {
        action: "block",
        reason: "completion_validation: unfulfilled items (one nudge allowed)",
        statusMessage: `completion_validation: 1 nudge offered - continue or explain why items are complete`,
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

