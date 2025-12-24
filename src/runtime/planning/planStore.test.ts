import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  loadPlanStore,
  savePlanStore,
  addPlan,
  getActivePlan,
  completePlan,
  planStorePath,
} from "./planStore.js";
import type { ExecutionPlan, PlanStore } from "./types.js";

const testWorkspaceDir = path.join(process.cwd(), ".test-workspace");
const testSessionId = "test-session-123";

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
      {
        id: "step_1",
        description: "First step",
        status: "pending",
        attempts: 0,
      },
    ],
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalSteps: 1,
    completedSteps: 0,
  };
}

describe("planStore", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("planStorePath", () => {
    it("should generate correct path for session", () => {
      const p = planStorePath({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });

      expect(p).toContain("sessions/plans");
      expect(p).toContain(`${testSessionId}.json`);
    });

    it("should sanitize session ID with special characters", () => {
      const dirtySessionId = "session@#$%^&*()";
      const p = planStorePath({
        workspaceDir: testWorkspaceDir,
        sessionId: dirtySessionId,
      });

      expect(p).toContain("sessions/plans");
      expect(p).not.toContain("@");
      expect(p).not.toContain("#");
    });
  });

  describe("loadPlanStore", () => {
    it("should return empty store if file does not exist", () => {
      const store = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });

      expect(store).toEqual({
        version: 1,
        sessionId: testSessionId,
        plans: [],
        activePlanId: undefined,
      });
    });

    it("should load existing store from file", () => {
      const originalStore: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
        activePlanId: "plan_1",
      };

      savePlanStore(testWorkspaceDir, testSessionId, originalStore);
      const loaded = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });

      expect(loaded.plans).toHaveLength(1);
      expect(loaded.activePlanId).toBe("plan_1");
    });

    it("should set sessionId even if not in file", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: "old-session",
        plans: [],
      };

      savePlanStore(testWorkspaceDir, "old-session", store);
      const loaded = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });

      expect(loaded.sessionId).toBe(testSessionId);
    });

    it("should handle corrupted JSON gracefully", () => {
      const p = planStorePath({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "not valid json {");

      const store = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });

      expect(store).toEqual({
        version: 1,
        sessionId: testSessionId,
        plans: [],
        activePlanId: undefined,
      });
    });
  });

  describe("savePlanStore", () => {
    it("should create directories if they don't exist", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [],
      };

      savePlanStore(testWorkspaceDir, testSessionId, store);

      const p = planStorePath({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });
      expect(fs.existsSync(p)).toBe(true);
    });

    it("should write store as formatted JSON", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
        activePlanId: "plan_1",
      };

      savePlanStore(testWorkspaceDir, testSessionId, store);

      const p = planStorePath({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });
      const content = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(content);

      expect(parsed.plans).toHaveLength(1);
      expect(parsed.activePlanId).toBe("plan_1");
    });

    it("should overwrite existing store", () => {
      const store1: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "First plan")],
        activePlanId: "plan_1",
      };

      savePlanStore(testWorkspaceDir, testSessionId, store1);

      const store2: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_2", "Second plan")],
        activePlanId: "plan_2",
      };

      savePlanStore(testWorkspaceDir, testSessionId, store2);

      const loaded = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });

      expect(loaded.plans).toHaveLength(1);
      expect(loaded.plans[0].id).toBe("plan_2");
    });
  });

  describe("addPlan", () => {
    it("should add plan to empty store", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [],
      };

      const plan = createTestPlan("plan_1", "New plan");
      const updated = addPlan(store, plan);

      expect(updated.plans).toHaveLength(1);
      expect(updated.plans[0]).toEqual(plan);
    });

    it("should set activePlanId if store is empty", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [],
      };

      const plan = createTestPlan("plan_1", "New plan");
      const updated = addPlan(store, plan);

      expect(updated.activePlanId).toBe("plan_1");
    });

    it("should not override activePlanId if already set", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "First plan")],
        activePlanId: "plan_1",
      };

      const plan = createTestPlan("plan_2", "Second plan");
      const updated = addPlan(store, plan);

      expect(updated.plans).toHaveLength(2);
      expect(updated.activePlanId).toBe("plan_1");
    });

    it("should preserve original store", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [],
      };

      const plan = createTestPlan("plan_1", "New plan");
      addPlan(store, plan);

      expect(store.plans).toHaveLength(0);
    });
  });

  describe("getActivePlan", () => {
    it("should return null if no activePlanId", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
      };

      const plan = getActivePlan(store);
      expect(plan).toBeNull();
    });

    it("should return active plan if found", () => {
      const testPlan = createTestPlan("plan_1", "Test plan");
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [testPlan],
        activePlanId: "plan_1",
      };

      const plan = getActivePlan(store);
      expect(plan).toEqual(testPlan);
    });

    it("should return null if activePlanId doesn't exist", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
        activePlanId: "plan_2",
      };

      const plan = getActivePlan(store);
      expect(plan).toBeNull();
    });

    it("should return correct plan from multiple plans", () => {
      const plan1 = createTestPlan("plan_1", "First plan");
      const plan2 = createTestPlan("plan_2", "Second plan");
      const plan3 = createTestPlan("plan_3", "Third plan");

      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan1, plan2, plan3],
        activePlanId: "plan_2",
      };

      const active = getActivePlan(store);
      expect(active).toEqual(plan2);
    });
  });

  describe("completePlan", () => {
    it("should mark plan as completed", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
        activePlanId: "plan_1",
      };

      const updated = completePlan(store, "plan_1");
      expect(updated.plans[0].status).toBe("completed");
    });

    it("should clear activePlanId if completing active plan", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
        activePlanId: "plan_1",
      };

      const updated = completePlan(store, "plan_1");
      expect(updated.activePlanId).toBeUndefined();
    });

    it("should not clear activePlanId if completing different plan", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [
          createTestPlan("plan_1", "First plan"),
          createTestPlan("plan_2", "Second plan"),
        ],
        activePlanId: "plan_1",
      };

      const updated = completePlan(store, "plan_2");
      expect(updated.activePlanId).toBe("plan_1");
    });

    it("should only modify specified plan", () => {
      const plan1 = createTestPlan("plan_1", "First plan");
      const plan2 = createTestPlan("plan_2", "Second plan");

      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [plan1, plan2],
        activePlanId: "plan_1",
      };

      const updated = completePlan(store, "plan_2");
      expect(updated.plans[0].status).toBe("active");
      expect(updated.plans[1].status).toBe("completed");
    });

    it("should preserve original store", () => {
      const store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [createTestPlan("plan_1", "Test plan")],
        activePlanId: "plan_1",
      };

      completePlan(store, "plan_1");
      expect(store.plans[0].status).toBe("active");
      expect(store.activePlanId).toBe("plan_1");
    });
  });

  describe("integration", () => {
    it("should persist and reload plan state", () => {
      let store: PlanStore = {
        version: 1,
        sessionId: testSessionId,
        plans: [],
      };

      const plan1 = createTestPlan("plan_1", "First plan");
      store = addPlan(store, plan1);
      savePlanStore(testWorkspaceDir, testSessionId, store);

      let loaded = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });
      expect(loaded.activePlanId).toBe("plan_1");

      const plan2 = createTestPlan("plan_2", "Second plan");
      loaded = addPlan(loaded, plan2);
      savePlanStore(testWorkspaceDir, testSessionId, loaded);

      loaded = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });
      expect(loaded.plans).toHaveLength(2);
      expect(loaded.activePlanId).toBe("plan_1");

      loaded = completePlan(loaded, "plan_1");
      savePlanStore(testWorkspaceDir, testSessionId, loaded);

      const final = loadPlanStore({
        workspaceDir: testWorkspaceDir,
        sessionId: testSessionId,
      });
      expect(final.plans[0].status).toBe("completed");
      expect(final.activePlanId).toBeUndefined();
    });
  });
});
