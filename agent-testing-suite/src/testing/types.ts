// Core types for Agent Testing Suite

export interface TestSuite {
  name: string;
  description: string;
  category: "long-horizon" | "tool-usage" | "reasoning" | "safety";
  version: string;
  scenarios: TestScenario[];
}

export interface TestScenario {
  name: string;
  description: string;
  prompts: string[];
  evaluation: EvaluationConfig;
  timeout_minutes: number;
  expected_duration_minutes: number;
}

export interface EvaluationConfig {
  rubric: string;
  assertions: Assertion[];
  human_review: boolean;
}

export interface Assertion {
  type: "output" | "filesystem" | "tool_pattern" | "duration" | "exit_code";
  condition: string; // JSON path or regex
  expected: any;
}

export interface RunOptions {
  profile?: string;
  session_prefix?: string;
  timeout_minutes?: number;
  dry_run?: boolean;
  concurrency?: number;
}

export interface TestRun {
  id: string;
  suite_name: string;
  started_at: string;
  completed_at?: string;
  status: "running" | "completed" | "failed" | "timeout" | "cancelled";
  results: ScenarioResult[];
  metrics?: Metrics;
  config: RunConfig;
}

export interface RunConfig {
  profile: string;
  suite: TestSuite;
  options: RunOptions;
  workspace_dir: string;
}

export interface ScenarioResult {
  scenario_name: string;
  session_id: string;
  status: "passed" | "failed" | "partial" | "timeout";
  duration_ms: number;
  turn_count: number;
  tool_calls: number;
  errors: string[];
  evaluation: EvaluationResult;
}

export interface EvaluationResult {
  passed: boolean;
  score: number; // 0-1
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
  // Task-level
  success_rate: number;
  completion_rate: number;
  avg_duration_ms: number;

  // Tool-level
  tool_usage: Record<string, ToolMetrics>;

  // Turn-level
  avg_iterations: number;
  avg_tool_calls: number;

  // System-level
  circuit_breaker_trips: number;
  plan_validation_events: number;

  // Metadata
  total_turns: number;
  total_tool_calls: number;
  total_errors: number;
}

export interface ToolMetrics {
  call_count: number;
  success_count: number;
  fail_count: number;
  avg_duration_ms: number;
  total_duration_ms: number;
  error_types: Record<string, number>;
}

export interface LogEvent {
  ts: string;
  level: string;
  event: string;
  session_id: string;
  turn_id?: string;
  [key: string]: any;
}

export interface Comparison {
  baseline: Metrics;
  variant: Metrics;
  delta: DeltaMetrics;
  significance: StatisticalTestResult;
  recommendation: string;
}

export interface DeltaMetrics {
  success_rate: number;
  avg_duration_ms: number;
  avg_iterations: number;
  tool_calls_per_turn: number;
}

export interface StatisticalTestResult {
  significant: boolean;
  p_value: number;
  test: string;
  confidence: number; // 0-1
}

export interface Evaluator {
  name: string;
  evaluate: (result: ScenarioResult, context: any) => Promise<EvaluationResult>;
}

export interface Rubric {
  id: string;
  name: string;
  criteria: RubricCriterion[];
  scoring: "scale1-5" | "pass_fail" | "percentage";
}

export interface RubricCriterion {
  dimension: string;
  weight: number;
  description: string;
}
