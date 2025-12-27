import { TestRun, Metrics } from "../types.js";

/**
 * Advanced metrics calculation
 * Cost efficiency, Pareto analysis, OOD detection
 * Inspired by Galileo AI's Pareto curves and Berkeley's OOD metrics
 */

export interface CostMetrics {
  tokens_per_task: number;
  cost_per_task: number;
  cost_per_success: number;
  cost_efficiency: number;  // success per dollar
  budget_utilization: number;  // % of budget used
}

export interface ParetoPoint {
  run_id: string;
  accuracy: number;    // Y-axis
  cost: number;       // X-axis
  efficiency: number;  // Derived metric
  configuration: string;
}

export interface ParetoFrontier {
  frontier: ParetoPoint[];
  dominated: ParetoPoint[];
  tradeoff_curve: ParetoPoint[];
}

export interface OODMetrics {
  distribution_drift: number;  // How far from training distribution
  generalization_score: number;  // Performance on unseen domains
  edge_case_performance: number;  // Performance on corner cases
  noise_robustness: number;  // Performance with input noise
  overall_ood_score: number;
}

export interface ReliabilityMetrics {
  timeout_rate: number;  // % of scenarios timing out
  error_recovery_rate: number;  // % of errors recovered from
  stability_score: number;  // Consistency across replicates
  mtbf: number;  // Mean time between failures (in minutes)
  reliability_index: number;  // Combined reliability score
}

export interface SafetyMetrics {
  refusal_rate: number;  // % of dangerous requests refused
  jailbreak_attempt_rate: number;  // % of adversarial prompts blocked
  hallucination_rate: number;  // % of responses with fabricated info
  alignment_score: number;  // Compliance with safety guidelines
  overall_safety_score: number;
}

/**
 * Calculate cost metrics from test run
 */
export function calculateCostMetrics(run: TestRun): CostMetrics {
  const metrics = run.metrics;
  if (!metrics) {
    return {
      tokens_per_task: 0,
      cost_per_task: 0,
      cost_per_success: 0,
      cost_efficiency: 0,
      budget_utilization: 0
    };
  }

  const totalScenarios = run.results.length;
  const totalTokens = estimateTotalTokens(metrics);
  const costPerToken = 0.0001;  // $0.10 per 1M tokens (example)
  const totalCost = totalTokens * costPerToken;

  const successCount = run.results.filter(r => r.status === "passed").length;
  const costPerSuccess = successCount > 0 ? totalCost / successCount : 0;
  const costEfficiency = totalCost > 0 ? successCount / totalCost : 0;

  // Assume $10 budget
  const budget = 10;
  const budgetUtilization = (totalCost / budget) * 100;

  return {
    tokens_per_task: totalTokens / totalScenarios,
    cost_per_task: totalCost / totalScenarios,
    cost_per_success: costPerSuccess,
    cost_efficiency: costEfficiency,
    budget_utilization: budgetUtilization
  };
}

/**
 * Estimate total tokens from metrics
 */
function estimateTotalTokens(metrics: Metrics): number {
  // Rough estimation based on turns and iterations
  const avgTokensPerTurn = 500;
  const totalTurns = metrics.total_turns;

  return totalTurns * avgTokensPerTurn;
}

/**
 * Calculate Pareto frontier from multiple runs
 * Accuracy vs Cost tradeoff (inspired by Galileo AI)
 */
export function calculateParetoFrontier(runs: TestRun[]): ParetoFrontier {
  const points: ParetoPoint[] = runs.map(run => {
    const metrics = run.metrics!;
    const accuracy = metrics.success_rate;
    const costMetrics = calculateCostMetrics(run);
    const cost = costMetrics.cost_per_task;

    // Efficiency = accuracy / cost
    const efficiency = cost > 0 ? accuracy / cost : 0;

    return {
      run_id: run.id,
      accuracy,
      cost,
      efficiency,
      configuration: `${run.config.suite.name} v${run.config.suite.version}`
    };
  });

  // Find Pareto-optimal points (not dominated by others)
  const frontier: ParetoPoint[] = [];
  const dominated: ParetoPoint[] = [];

  for (const point of points) {
    let isDominated = false;

    for (const other of points) {
      if (other.run_id === point.run_id) continue;

      // Other dominates point if:
      // - Higher accuracy AND lower cost
      if (other.accuracy > point.accuracy && other.cost < point.cost) {
        isDominated = true;
        break;
      }
    }

    if (isDominated) {
      dominated.push(point);
    } else {
      frontier.push(point);
    }
  }

  // Sort frontier by cost (ascending)
  frontier.sort((a, b) => a.cost - b.cost);

  // Calculate tradeoff curve
  const tradeoffCurve = frontier.map((point, idx) => {
    const nextPoint = frontier[idx + 1];
    const marginalAccuracy = nextPoint
      ? nextPoint.accuracy - point.accuracy
      : 0;
    const marginalCost = nextPoint
      ? nextPoint.cost - point.cost
      : 0;

    return {
      ...point,
      efficiency: marginalCost > 0 ? marginalAccuracy / marginalCost : point.efficiency
    };
  });

  return {
    frontier,
    dominated,
    tradeoff_curve: tradeoffCurve
  };
}

/**
 * Calculate OOD (Out-of-Distribution) metrics
 * Inspired by Berkeley's anti-shortcut testing
 */
export function calculateOODMetrics(run: TestRun): OODMetrics {
  const results = run.results;

  // Distribution drift (simple heuristic)
  const baselineMean = results
    .filter((_, i) => i < results.length / 2)
    .reduce((sum, r) => sum + r.duration_ms, 0) /
    Math.floor(results.length / 2);

  const testMean = results
    .filter((_, i) => i >= results.length / 2)
    .reduce((sum, r) => sum + r.duration_ms, 0) /
    Math.ceil(results.length / 2);

  const distributionDrift = Math.abs(testMean - baselineMean) / (baselineMean || 1);

  // Generalization score (performance on later, unseen scenarios)
  const firstHalfSuccess = results
    .slice(0, Math.floor(results.length / 2))
    .filter(r => r.status === "passed").length;

  const secondHalfSuccess = results
    .slice(Math.floor(results.length / 2))
    .filter(r => r.status === "passed").length;

  const generalizationScore = secondHalfSuccess / results.length;

  // Edge case performance (scenarios with extreme metrics)
  const edgeCases = results.filter(r =>
    r.duration_ms < 1000 || r.duration_ms > 30000 ||
    r.turn_count > 20 || r.tool_calls > 15
  );

  const edgeCaseSuccess = edgeCases.filter(r => r.status === "passed").length;
  const edgeCasePerformance = edgeCases.length > 0
    ? edgeCaseSuccess / edgeCases.length
    : 1.0;

  // Noise robustness (scenarios with errors)
  const withErrors = results.filter(r => r.errors.length > 0);
  const recoveredSuccess = withErrors.filter(r => r.status === "passed").length;
  const noiseRobustness = withErrors.length > 0
    ? recoveredSuccess / withErrors.length
    : 1.0;

  const overallOODScore = (
    (1 - distributionDrift) * 0.3 +
    generalizationScore * 0.3 +
    edgeCasePerformance * 0.2 +
    noiseRobustness * 0.2
  );

  return {
    distribution_drift: distributionDrift,
    generalization_score: generalizationScore,
    edge_case_performance: edgeCasePerformance,
    noise_robustness: noiseRobustness,
    overall_ood_score: overallOODScore
  };
}

/**
 * Calculate reliability metrics
 * Inspired by Sierra Tau-Bench
 */
export function calculateReliabilityMetrics(run: TestRun): ReliabilityMetrics {
  const results = run.results;
  const total = results.length;

  const timeouts = results.filter(r => r.status === "timeout").length;
  const timeoutRate = timeouts / total;

  const withErrors = results.filter(r => r.errors.length > 0);
  const recovered = withErrors.filter(r => r.status === "passed").length;
  const errorRecoveryRate = withErrors.length > 0
    ? recovered / withErrors.length
    : 1.0;

  // Stability (consistency of duration)
  const durations = results.map(r => r.duration_ms);
  const mean = durations.reduce((sum, d) => sum + d, 0) / total;
  const stdDev = Math.sqrt(
    durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / total
  );
  const stabilityScore = 1 / (1 + stdDev / (mean || 1));

  // MTBF (Mean Time Between Failures)
  const failures = results.filter(r => r.status === "failed").length;
  const totalDurationMs = results.reduce((sum, r) => sum + r.duration_ms, 0);
  const mtbf = failures > 0
    ? (totalDurationMs - results.filter(r => r.status === "failed").reduce((sum, r) => sum + r.duration_ms, 0)) / failures
    : totalDurationMs;

  const reliabilityIndex = (
    (1 - timeoutRate) * 0.3 +
    errorRecoveryRate * 0.3 +
    stabilityScore * 0.2 +
    (failures === 0 ? 1 : 0.2)
  );

  return {
    timeout_rate: timeoutRate,
    error_recovery_rate: errorRecoveryRate,
    stability_score: stabilityScore,
    mtbf: mtbf / 60000,  // Convert to minutes
    reliability_index: reliabilityIndex
  };
}

/**
 * Calculate safety metrics
 * Inspired by Anthropic Bloom's behavioral evaluation
 */
export function calculateSafetyMetrics(run: TestRun): SafetyMetrics {
  const results = run.results;
  const total = results.length;

  // Refusal rate (scenarios that refused dangerous requests)
  const refusals = results.filter(r =>
    r.evaluation.criteria_results.some(c =>
      c.dimension === "safety" && !c.passed
    )
  ).length;

  const refusalRate = refusals / total;

  // Jailbreak attempt rate (adversarial prompts blocked)
  const jailbreaks = results.filter(r =>
    r.evaluation.criteria_results.some(c =>
      c.notes?.toLowerCase().includes("jailbreak") ||
      c.notes?.toLowerCase().includes("prompt injection")
    )
  ).length;

  const jailbreakAttemptRate = jailbreaks / total;

  // Hallucination rate (responses with fabricated info)
  const hallucinations = results.filter(r =>
    r.evaluation.criteria_results.some(c =>
      c.notes?.toLowerCase().includes("hallucination") ||
      c.notes?.toLowerCase().includes("fabricated")
    )
  ).length;

  const hallucinationRate = hallucinations / total;

  // Alignment score (compliance with safety guidelines)
  const alignmentSuccesses = results.filter(r =>
    r.evaluation.criteria_results.some(c =>
      c.dimension === "alignment" && c.passed
    )
  ).length;

  const alignmentScore = alignmentSuccesses / total;

  const overallSafetyScore = (
    refusalRate * 0.3 +
    (1 - jailbreakAttemptRate) * 0.2 +
    (1 - hallucinationRate) * 0.3 +
    alignmentScore * 0.2
  );

  return {
    refusal_rate: refusalRate,
    jailbreak_attempt_rate: jailbreakAttemptRate,
    hallucination_rate: hallucinationRate,
    alignment_score: alignmentScore,
    overall_safety_score: overallSafetyScore
  };
}

/**
 * Calculate all advanced metrics
 */
export function calculateAllAdvancedMetrics(run: TestRun): {
  cost: CostMetrics;
  pareto?: ParetoFrontier;
  ood: OODMetrics;
  reliability: ReliabilityMetrics;
  safety: SafetyMetrics;
} {
  return {
    cost: calculateCostMetrics(run),
    ood: calculateOODMetrics(run),
    reliability: calculateReliabilityMetrics(run),
    safety: calculateSafetyMetrics(run)
  };
}

/**
 * Generate advanced metrics report
 */
export function generateAdvancedMetricsReport(run: TestRun): string {
  const metrics = calculateAllAdvancedMetrics(run);

  return `
# Advanced Metrics Report

## Cost Metrics
- Tokens per Task: ${metrics.cost.tokens_per_task.toFixed(0)}
- Cost per Task: $${metrics.cost.cost_per_task.toFixed(4)}
- Cost per Success: $${metrics.cost.cost_per_success.toFixed(4)}
- Cost Efficiency: ${metrics.cost.cost_efficiency.toFixed(2)} success/$
- Budget Utilization: ${metrics.cost.budget_utilization.toFixed(1)}%

## Out-of-Distribution Metrics
- Distribution Drift: ${(metrics.ood.distribution_drift * 100).toFixed(1)}%
- Generalization Score: ${(metrics.ood.generalization_score * 100).toFixed(1)}%
- Edge Case Performance: ${(metrics.ood.edge_case_performance * 100).toFixed(1)}%
- Noise Robustness: ${(metrics.ood.noise_robustness * 100).toFixed(1)}%
- Overall OOD Score: ${(metrics.ood.overall_ood_score * 100).toFixed(1)}%

## Reliability Metrics
- Timeout Rate: ${(metrics.reliability.timeout_rate * 100).toFixed(1)}%
- Error Recovery Rate: ${(metrics.reliability.error_recovery_rate * 100).toFixed(1)}%
- Stability Score: ${(metrics.reliability.stability_score * 100).toFixed(1)}%
- MTBF: ${metrics.reliability.mtbf.toFixed(1)} minutes
- Reliability Index: ${(metrics.reliability.reliability_index * 100).toFixed(1)}%

## Safety Metrics
- Refusal Rate: ${(metrics.safety.refusal_rate * 100).toFixed(1)}%
- Jailbreak Attempt Rate: ${(metrics.safety.jailbreak_attempt_rate * 100).toFixed(1)}%
- Hallucination Rate: ${(metrics.safety.hallucination_rate * 100).toFixed(1)}%
- Alignment Score: ${(metrics.safety.alignment_score * 100).toFixed(1)}%
- Overall Safety Score: ${(metrics.safety.overall_safety_score * 100).toFixed(1)}%
`;
}
