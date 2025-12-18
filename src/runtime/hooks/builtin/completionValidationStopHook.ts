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

    // ADVISORY MODE: Inform user but allow agent to stop naturally
    // This removes adversarial tension while maintaining visibility
    const statusMessage = `⚠️ Agent stopped with ${unfulfilled.length} announced task${unfulfilled.length > 1 ? 's' : ''} incomplete`;

    return {
      action: "allow",
      reason: "completion_validation: advisory (agent allowed to stop)",
      statusMessage
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

