import fs from "node:fs";
import path from "node:path";
import { defaultSessionDir } from "../session/sessionStore.js";
import type { ExecutionPlan, PlanStore } from "./types.js";

function safeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function planStorePath(params: {
  workspaceDir: string;
  sessionId: string;
}): string {
  const sessionsDir = defaultSessionDir(params.workspaceDir);
  const safeId = safeSessionId(params.sessionId);
  return path.join(sessionsDir, "plans", `${safeId}.json`);
}

function readStore(p: string): PlanStore {
  if (!fs.existsSync(p)) {
    return {
      version: 1,
      sessionId: "",
      plans: [],
      activePlanId: undefined,
    };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as PlanStore;
  } catch {
    return {
      version: 1,
      sessionId: "",
      plans: [],
      activePlanId: undefined,
    };
  }
}

function writeStore(p: string, store: PlanStore): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export function loadPlanStore(params: {
  workspaceDir: string;
  sessionId: string;
}): PlanStore {
  const storePath = planStorePath(params);
  const store = readStore(storePath);
  store.sessionId = params.sessionId;
  return store;
}

export function savePlanStore(
  workspaceDir: string,
  sessionId: string,
  store: PlanStore
): void {
  const storePath = planStorePath({ workspaceDir, sessionId });
  writeStore(storePath, store);
}

export function addPlan(store: PlanStore, plan: ExecutionPlan): PlanStore {
  const updated = {
    ...store,
    plans: [...store.plans, plan],
  };

  if (!store.activePlanId) {
    updated.activePlanId = plan.id;
  }

  return updated;
}

export function getActivePlan(store: PlanStore): ExecutionPlan | null {
  if (!store.activePlanId) return null;
  return store.plans.find((p) => p.id === store.activePlanId) || null;
}

export function completePlan(
  store: PlanStore,
  planId: string
): PlanStore {
  const updated = {
    ...store,
    plans: store.plans.map((p) =>
      p.id === planId ? { ...p, status: "completed" as const } : p
    ),
  };

  if (store.activePlanId === planId) {
    updated.activePlanId = undefined;
  }

  return updated;
}

export function updatePlanStepStatus(
  plan: ExecutionPlan,
  stepId: string,
  status: "pending" | "in_progress" | "completed" | "blocked",
  errorMessage?: string
): ExecutionPlan {
  const updatedSteps = plan.steps.map((step) => {
    if (step.id === stepId) {
      const updated = { ...step, status };

      if (status === "completed") {
        updated.completedAt = new Date().toISOString();
      } else if (status === "blocked" && errorMessage) {
        updated.lastError = errorMessage;
      } else if (status === "in_progress" && !step.startedAt) {
        updated.startedAt = new Date().toISOString();
      }

      return updated;
    }
    return step;
  });

  const completedSteps = updatedSteps.filter((s) => s.status === "completed").length;
  const newStatus = completedSteps === plan.totalSteps ? ("completed" as const) : plan.status;

  return {
    ...plan,
    steps: updatedSteps,
    completedSteps,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}
