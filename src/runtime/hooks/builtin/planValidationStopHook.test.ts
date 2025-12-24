import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createPlanValidationStopHook } from "./planValidationStopHook.js";
import { savePlanStore } from "../../planning/planStore.js";
import type { ExecutionPlan, PlanStore } from "../../planning/types.js";
import type { AgentStopContext } from "../types.js";

const testWorkspaceDir = path.join(process.cwd(), ".test-workspace-hook");
const testSessionId = "test-session-hook-123";

function cleanup() {
  if (fs.existsSync(testWorkspaceDir)) {
    fs.rmSync(testWorkspaceDir, { recursive: true });
  }
}

function createTestPlan(id: string, objective: string): ExecutionPlan {
  return {
    id,
    objective,
    steps: [
      { id: "step_1", description: "Step 1", status: "pending", attempts: 0 },
      { id: "step_2", description: "Step 2", status: "pending", attempts: 0 },
      { id: "step_3", description: "Step 3", status: "pending", attempts: 0 },
    ],
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalSteps: 3,
    completedSteps: 0,
  };
}

function createTestContext(overrides?: Partial<AgentStopContext>): AgentStopContext {
  return {
    type: "agent_stop",
    sessionId: testSessionId,
    repoRoot: "/test-repo",
    workspaceDir: testWorkspaceDir,
    userInput: "stop",
    assistantContent: "attempting to stop",
    iteration: 1,
    maxIterations: 8,
    toolExecutionsCount: 2,
    ...overrides,
  };
}

describe("planValidationStopHook", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("basic functionality", () => {
    it("should allow stop when no active plan exists", async () => {
      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("allow");
    });

    it("should allow stop when plan is disabled", async () => {
      const plan = createTestPlan("plan_1", "Test objective");
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan],
        activePlanId: "plan_1",
      };
      savePlanStore(testWorkspaceDir, testSessionId, store);

      const hook = createPlanValidationStopHook({
        enabled: false,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("allow");
    });

    it("should allow stop when workspace dir is not provided", async () => {
      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: undefined,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("allow");
    });
  });

  describe("plan completion checking", () => {
    it("should allow stop when plan is complete", async () => {
      const plan = createTestPlan("plan_1", "Test objective");
      plan.status = "completed";
      plan.completedSteps = 3;
      plan.steps.forEach((step) => {
        step.status = "completed";
      });

      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan],
        activePlanId: "plan_1",
      };
      savePlanStore(testWorkspaceDir, testSessionId, store);

      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("allow");
    });

    it("should block stop when plan has incomplete steps", async () => {
      const plan = createTestPlan("plan_1", "Test objective");
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan],
        activePlanId: "plan_1",
      };
      savePlanStore(testWorkspaceDir, testSessionId, store);

      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("block");
      if (result.action === "block") {
        expect((result as any).reason).toBe("plan_validation: incomplete steps remain");
        expect((result as any).statusMessage).toContain("3 steps incomplete");
      }
    });
  });

  describe("incomplete steps reporting", () => {
    it("should list incomplete steps in system prompt", async () => {
      const plan = createTestPlan("plan_1", "Build feature X");
      plan.steps[0].status = "completed";
      plan.completedSteps = 1;

      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan],
        activePlanId: "plan_1",
      };
      savePlanStore(testWorkspaceDir, testSessionId, store);

      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("block");
      if (result.action === "block") {
        expect(result.systemPrompt).toContain("Build feature X");
        expect(result.systemPrompt).toContain("step_2");
        expect(result.systemPrompt).toContain("step_3");
        expect(result.systemPrompt).toContain("1/3 steps");
      }
    });
  });

  describe("circuit breaker", () => {
    it("should allow stop after max block attempts", async () => {
      const plan = createTestPlan("plan_1", "Test objective");
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan],
        activePlanId: "plan_1",
      };
      savePlanStore(testWorkspaceDir, testSessionId, store);

      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 2,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();

      const result1 = await hook.run(ctx);
      expect(result1.action).toBe("block");

      const result2 = await hook.run(ctx);
      expect(result2.action).toBe("block");

      const result3 = await hook.run(ctx);
      expect(result3.action).toBe("allow");
    });
  });

  describe("error handling", () => {
    it("should allow stop on file read error", async () => {
      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: "/nonexistent/path",
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("allow");
    });

    it("should handle corrupted plan store gracefully", async () => {
      const planStorePath = path.join(
        testWorkspaceDir,
        "sessions",
        "plans",
        testSessionId + ".json"
      );
      fs.mkdirSync(path.dirname(planStorePath), { recursive: true });
      fs.writeFileSync(planStorePath, "invalid json {");

      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      const ctx = createTestContext();
      const result = await hook.run(ctx);

      expect(result.action).toBe("allow");
    });
  });

  describe("hook metadata", () => {
    it("should have correct hook properties", () => {
      const hook = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });

      expect(hook.type).toBe("agent_stop");
      expect(hook.name).toBe("plan_validation_stop");
      expect(hook.priority).toBe(50);
      expect(hook.enabled).toBe(true);
      expect(typeof hook.run).toBe("function");
    });

    it("should respect enabled parameter", () => {
      const hook1 = createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });
      expect(hook1.enabled).toBe(true);

      const hook2 = createPlanValidationStopHook({
        enabled: false,
        maxBlockAttempts: 3,
        workspaceDir: testWorkspaceDir,
      });
      expect(hook2.enabled).toBe(false);
    });
  });
});
