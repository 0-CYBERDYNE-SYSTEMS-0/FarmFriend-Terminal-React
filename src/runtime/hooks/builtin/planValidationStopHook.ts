import type { AgentStopContext, AgentStopResult } from "../types.js";
import { loadPlanStore, getActivePlan } from "../../planning/planStore.js";
import { isPlanComplete, getIncompleteSteps } from "../../planning/planExtractor.js";

export function createPlanValidationStopHook(params: {
  enabled: boolean;
  maxBlockAttempts: number;
  workspaceDir?: string;
}) {
  let blockAttempts = 0;

  const onStop = async (ctx: AgentStopContext): Promise<AgentStopResult> => {
    if (!params.enabled || !params.workspaceDir) {
      return { action: "allow" };
    }

    try {
      const planStore = loadPlanStore({
        workspaceDir: params.workspaceDir,
        sessionId: ctx.sessionId,
      });
      const activePlan = getActivePlan(planStore);

      if (!activePlan) {
        return { action: "allow" };
      }

      if (isPlanComplete(activePlan)) {
        return { action: "allow" };
      }

      blockAttempts++;
      const incompleteSteps = getIncompleteSteps(activePlan);

      if (blockAttempts > params.maxBlockAttempts) {
        return { action: "allow" };
      }

      const stepList = incompleteSteps
        .slice(0, 5)
        .map((s) => `- Step ${s.id}: ${s.description}`)
        .join("\n");

      return {
        action: "block",
        reason: "plan_validation: incomplete steps remain",
        statusMessage: `${incompleteSteps.length} steps incomplete`,
        systemPrompt:
          `Plan Status:\n` +
          `Objective: ${activePlan.objective}\n` +
          `Progress: ${activePlan.completedSteps}/${activePlan.totalSteps} steps\n\n` +
          `Incomplete steps:\n${stepList}\n\n` +
          `Continue execution or mark steps as blocked with explanation.`,
      };
    } catch {
      return { action: "allow" };
    }
  };

  return {
    type: "agent_stop" as const,
    name: "plan_validation_stop",
    priority: 50,
    enabled: params.enabled,
    run: onStop,
  };
}
