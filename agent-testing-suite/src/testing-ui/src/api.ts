/**
 * API client for Agent Testing Suite
 */

const API_BASE = "http://localhost:8787/api";

export interface TestRun {
  id: string;
  suite_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  results?: ScenarioResult[];
  metrics?: Metrics;
}

export interface ScenarioResult {
  scenario_name: string;
  status: string;
  duration_ms: number;
  turn_count: number;
  tool_calls: number;
  errors: string[];
}

export interface Metrics {
  success_rate: number;
  completion_rate: number;
  avg_duration_ms: number;
  tool_usage: Record<string, ToolUsage>;
  avg_iterations: number;
  avg_tool_calls: number;
  total_turns: number;
  total_tool_calls: number;
  total_errors: number;
}

export interface ToolUsage {
  call_count: number;
  success_count: number;
  fail_count: number;
  avg_duration_ms: number;
}

export interface DashboardMetrics {
  total_runs: number;
  passed: number;
  failed: number;
  avg_success_rate: number;
  recent_runs: TestRun[];
}

/**
 * API Client
 */
export const api = {
  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  /**
   * List all test runs
   */
  async listRuns(): Promise<{ runs: TestRun[] }> {
    const res = await fetch(`${API_BASE}/runs`);
    return res.json();
  },

  /**
   * Get a specific test run
   */
  async getRun(runId: string): Promise<{ run: TestRun }> {
    const res = await fetch(`${API_BASE}/runs/${runId}`);
    if (!res.ok) {
      throw new Error(`Failed to load run: ${runId}`);
    }
    return res.json();
  },

  /**
   * List all test suites
   */
  async listSuites(): Promise<{ suites: Array<{ id: string; name: string }> }> {
    const res = await fetch(`${API_BASE}/suites`);
    return res.json();
  },

  /**
   * Get a specific test suite
   */
  async getSuite(suiteId: string): Promise<{ suite: any }> {
    const res = await fetch(`${API_BASE}/suites/${suiteId}`);
    return res.json();
  },

  /**
   * Run a test suite
   */
  async runSuite(suite: any, options: any = {}): Promise<{ runId: string; status: string }> {
    const res = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite, options })
    });
    return res.json();
  },

  /**
   * Generate report
   */
  async generateReport(runId: string): Promise<{ success: boolean; reportPath: string }> {
    const res = await fetch(`${API_BASE}/reports/${runId}`, {
      method: "POST"
    });
    return res.json();
  },

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/metrics/summary`);
    return res.json();
  },

  /**
   * Compare two runs
   */
  async compareRuns(runId1: string, runId2: string): Promise<any> {
    const res = await fetch(`${API_BASE}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId1, runId2 })
    });
    return res.json();
  }
};
