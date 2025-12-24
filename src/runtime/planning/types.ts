export type PlanStep = {
  id: string;                    // "step_1", "step_2", etc.
  description: string;           // "Create login form component"
  status: "pending" | "in_progress" | "completed" | "blocked";
  toolsUsed?: string[];         // ["write_file", "edit_file"]
  attempts: number;             // Track retry count
  lastError?: string;           // If blocked, why?
  startedAt?: string;           // ISO timestamp
  completedAt?: string;         // ISO timestamp
};

export type ExecutionPlan = {
  id: string;                   // "plan_abc123"
  objective: string;            // "Build user authentication system"
  steps: PlanStep[];
  status: "active" | "completed" | "abandoned";
  createdAt: string;
  updatedAt: string;
  totalSteps: number;
  completedSteps: number;
};

export type PlanStore = {
  version: 1;
  sessionId: string;
  plans: ExecutionPlan[];       // Can have multiple plans per session
  activePlanId?: string;        // Currently executing plan
};
