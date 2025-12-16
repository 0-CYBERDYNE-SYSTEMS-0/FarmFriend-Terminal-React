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

    const signature = signatureOf(unfulfilled);
    const noProgress = lastGuardSignature === signature && lastGuardExecutions === executions.length;
    const madeToolProgressSinceLastGuard = executions.length > lastGuardExecutions;

    if (madeToolProgressSinceLastGuard && !noProgress && blockAttempts < params.maxAttempts) {
      blockAttempts += 1;
      lastGuardSignature = signature;
      lastGuardExecutions = executions.length;
      const systemPrompt = buildContinuationFeedback(unfulfilled);
      return {
        action: "block",
        reason: "completion_validation: unfulfilled commitments",
        statusMessage: `completion_validation: continuing (${blockAttempts}/${params.maxAttempts})`,
        systemPrompt
      };
    }

    if (!madeToolProgressSinceLastGuard && !reasoningOnlyKickUsed) {
      reasoningOnlyKickUsed = true;
      lastGuardSignature = signature;
      lastGuardExecutions = executions.length;
      return {
        action: "block",
        reason: "completion_validation: reasoning-only kick",
        statusMessage: "completion_validation: continuing (reasoning-only kick; must resolve or ask user)",
        systemPrompt:
          "Stop-hook: you are about to stop with unfulfilled commitments. In your next message, do ONE of:\n" +
          "1) Call the necessary tools to actually complete the missing work, OR\n" +
          "2) Ask the user specific questions required to proceed, and clearly mark the task as waiting on user input.\n" +
          "Do not claim completion unless the missing commitments are satisfied."
      };
    }

    return {
      action: "need_user",
      reason: "completion_validation: blocked (no progress possible without user input or constraints change)",
      statusMessage: "need_user: blocked on missing info/progress (ask user or adjust constraints)"
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

