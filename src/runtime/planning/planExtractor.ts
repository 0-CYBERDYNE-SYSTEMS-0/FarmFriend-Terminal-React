import type { ExecutionPlan, PlanStep } from "./types.js";
import { newId } from "../../shared/ids.js";

export function extractPlansFromContent(content: string): ExecutionPlan[] {
  const plans: ExecutionPlan[] = [];

  const planRegex = /<plan>([\s\S]*?)<\/plan>/g;
  let planMatch;

  while ((planMatch = planRegex.exec(content)) !== null) {
    const planContent = planMatch[1];

    const objectiveMatch = planContent.match(
      /<objective>([\s\S]*?)<\/objective>/
    );
    if (!objectiveMatch) continue;

    const objective = objectiveMatch[1].trim();
    const stepsContent = planContent.match(/<steps>([\s\S]*?)<\/steps>/);
    if (!stepsContent) continue;

    const steps: PlanStep[] = [];
    const stepRegex = /<step\s+id="([^"]+)"\s*>([\s\S]*?)<\/step>/g;
    let stepMatch;

    while ((stepMatch = stepRegex.exec(stepsContent[1])) !== null) {
      const stepId = stepMatch[1];
      const description = stepMatch[2].trim();

      steps.push({
        id: stepId,
        description,
        status: "pending",
        attempts: 0,
      });
    }

    if (steps.length > 0) {
      const now = new Date().toISOString();
      const plan: ExecutionPlan = {
        id: newId("plan"),
        objective,
        steps,
        status: "active",
        createdAt: now,
        updatedAt: now,
        totalSteps: steps.length,
        completedSteps: 0,
      };

      plans.push(plan);
    }
  }

  return plans;
}

export function updatePlanStepStatus(
  plan: ExecutionPlan,
  stepId: string,
  status: PlanStep["status"],
  error?: string
): ExecutionPlan {
  const updatedPlan = { ...plan };
  const stepIndex = updatedPlan.steps.findIndex((s) => s.id === stepId);

  if (stepIndex === -1) {
    return plan;
  }

  const step = updatedPlan.steps[stepIndex];
  const oldStatus = step.status;

  updatedPlan.steps[stepIndex] = {
    ...step,
    status,
    lastError: error,
    ...(status === "in_progress" &&
      !step.startedAt && { startedAt: new Date().toISOString() }),
    ...(status === "completed" && { completedAt: new Date().toISOString() }),
  };

  updatedPlan.updatedAt = new Date().toISOString();

  if (oldStatus !== "completed" && status === "completed") {
    updatedPlan.completedSteps += 1;
  } else if (oldStatus === "completed" && status !== "completed") {
    updatedPlan.completedSteps -= 1;
  }

  return updatedPlan;
}

export function isPlanComplete(plan: ExecutionPlan): boolean {
  return (
    plan.steps.length > 0 && plan.steps.every((s) => s.status === "completed")
  );
}

export function formatPlanForPrompt(plan: ExecutionPlan): string {
  const statusSymbols: Record<string, string> = {
    completed: "x",
    in_progress: ">",
    pending: "-",
    blocked: "!",
  };

  const progress = `${plan.completedSteps}/${plan.totalSteps}`;
  const statusIcon =
    plan.status === "completed"
      ? "Complete"
      : plan.status === "abandoned"
        ? "Abandoned"
        : "Active";

  let formatted = `## Execution Plan: ${plan.objective}\n`;
  formatted += `**Status**: ${statusIcon} (${progress} steps)\n\n`;
  formatted += `**Steps**:\n`;

  for (const step of plan.steps) {
    const symbol = statusSymbols[step.status] || "-";
    formatted += `- ${symbol} [${step.id}] ${step.description}`;

    if (step.status === "in_progress") {
      formatted += ` (attempt ${step.attempts + 1})`;
    } else if (step.status === "blocked") {
      formatted += ` (blocked: ${step.lastError || "unknown error"})`;
    } else if (step.attempts > 0) {
      formatted += ` (${step.attempts} ${step.attempts === 1 ? "attempt" : "attempts"})`;
    }

    formatted += "\n";
  }

  return formatted;
}

export function trackStepAttempt(
  plan: ExecutionPlan,
  stepId: string,
  error?: string
): ExecutionPlan {
  const updatedPlan = { ...plan };
  const stepIndex = updatedPlan.steps.findIndex((s) => s.id === stepId);

  if (stepIndex === -1) {
    return plan;
  }

  const step = updatedPlan.steps[stepIndex];
  const newAttempts = step.attempts + 1;

  updatedPlan.steps[stepIndex] = {
    ...step,
    attempts: newAttempts,
    lastError: error,
    status: newAttempts >= 3 ? "blocked" : step.status,
  };

  updatedPlan.updatedAt = new Date().toISOString();

  if (newAttempts >= 3 && step.status !== "blocked") {
    updatedPlan.completedSteps = updatedPlan.steps.filter(
      (s) => s.status === "completed"
    ).length;
  }

  return updatedPlan;
}

export function getIncompleteSteps(plan: ExecutionPlan): PlanStep[] {
  return plan.steps.filter(
    (s) => s.status !== "completed" && s.status !== "blocked"
  );
}
