const API_BASE = "/api";

export interface TestRun {
  id: string;
  suite_name: string;
  status: "running" | "completed" | "failed" | "partial";
  started_at: string;
  completed_at?: string;
  results?: TestResult[];
  metrics?: Metrics;
}

export interface TestResult {
  scenario_name: string;
  status: "passed" | "failed" | "partial" | "timeout";
  duration_ms: number;
  errors?: string[];
  error?: string;
  output?: string;
  turn_count?: number;
  tool_calls?: number;
  evaluation?: EvaluationResult;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  criteria_results: CriterionResult[];
  human_review_required: boolean;
}

export interface CriterionResult {
  dimension: string;
  passed: boolean;
  score: number;
  notes?: string;
}

export interface Metrics {
  success_rate: number;
  total_turns: number;
  total_tool_calls: number;
  total_errors: number;
  tool_usage: Record<string, ToolUsage>;
}

export interface ToolUsage {
  call_count: number;
  success_count: number;
  fail_count: number;
  avg_duration_ms: number;
}

export const api = {
  // Configuration
  async getConfig() {
    const response = await fetch(`${API_BASE}/config`);
    return response.json();
  },

  async getProviders() {
    const response = await fetch(`${API_BASE}/providers`);
    return response.json();
  },

  async getProviderModels(provider: string) {
    const response = await fetch(`${API_BASE}/providers/models?provider=${provider}`);
    return response.json();
  },

  async testProvider(provider: string, providerConfig: any) {
    const response = await fetch(`${API_BASE}/providers/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, providerConfig })
    });
    return response.json();
  },

  // Test Runs
  async listRuns() {
    const response = await fetch(`${API_BASE}/runs`);
    return response.json();
  },

  async getRun(runId: string) {
    const response = await fetch(`${API_BASE}/runs/${runId}`);
    return response.json();
  },

  async createRun(options: any) {
    const response = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options)
    });
    return response.json();
  },

  // Test Suites
  async listSuites() {
    const response = await fetch(`${API_BASE}/suites`);
    return response.json();
  },

  async getSuite(suiteId: string) {
    const response = await fetch(`${API_BASE}/suites/${suiteId}`);
    return response.json();
  },

  // Metrics
  async getMetrics() {
    const response = await fetch(`${API_BASE}/metrics/summary`);
    return response.json();
  },

  // Reports
  async generateReport(runId: string) {
    const response = await fetch(`${API_BASE}/reports/${runId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return response.json();
  },

  // Compare
  async compareRuns(runId1: string, runId2: string) {
    const response = await fetch(`${API_BASE}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId1, runId2 })
    });
    return response.json();
  }
};
