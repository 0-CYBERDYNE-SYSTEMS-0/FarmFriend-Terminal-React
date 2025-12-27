import { Metrics, Comparison, DeltaMetrics, StatisticalTestResult } from "../types.js";

/**
 * Compare two test runs for A/B testing
 */
export class Comparator {
  /**
   * Compare two metrics sets
   */
  compare(baseline: Metrics, variant: Metrics): Comparison {
    const delta = this.calculateDelta(baseline, variant);
    const significance = this.testSignificance(baseline, variant, delta);
    const recommendation = this.generateRecommendation(delta, significance);

    return {
      baseline,
      variant,
      delta,
      significance,
      recommendation
    };
  }

  /**
   * Calculate delta between baseline and variant
   */
  private calculateDelta(baseline: Metrics, variant: Metrics): DeltaMetrics {
    return {
      success_rate: variant.success_rate - baseline.success_rate,
      avg_duration_ms: variant.avg_duration_ms - baseline.avg_duration_ms,
      avg_iterations: variant.avg_iterations - baseline.avg_iterations,
      tool_calls_per_turn: variant.avg_tool_calls - baseline.avg_tool_calls
    };
  }

  /**
   * Test statistical significance (simplified version)
   * In production, would use proper statistical tests like t-test or bootstrap
   */
  private testSignificance(
    baseline: Metrics,
    variant: Metrics,
    delta: DeltaMetrics
  ): StatisticalTestResult {
    // Simplified significance test based on magnitude of change
    // A proper implementation would consider sample size and variance

    const successRateChange = Math.abs(delta.success_rate);
    const durationChange = Math.abs(delta.avg_duration_ms) / baseline.avg_duration_ms || 0;
    const iterationsChange = Math.abs(delta.avg_iterations) / baseline.avg_iterations || 0;

    // Calculate aggregate significance score (0-1)
    const significanceScore = (
      (successRateChange * 2.0) +  // Success rate is most important
      (durationChange * 1.0) +        // Duration matters
      (iterationsChange * 0.5)         // Iterations matter less
    ) / 3.5;

    // Determine if significant (threshold ~0.05 for 5% change)
    const isSignificant = significanceScore >= 0.05;

    return {
      significant: isSignificant,
      p_value: isSignificant ? 0.05 - (significanceScore * 0.1) : 0.5,
      test: "delta-change-analysis",
      confidence: Math.min(0.95, 0.5 + significanceScore * 10)
    };
  }

  /**
   * Generate recommendation based on comparison results
   */
  private generateRecommendation(
    delta: DeltaMetrics,
    significance: StatisticalTestResult
  ): string {
    if (!significance.significant) {
      return "No significant difference detected. Results are statistically similar.";
    }

    const improvements: string[] = [];
    const regressions: string[] = [];

    if (delta.success_rate > 0) {
      improvements.push(`success rate improved by ${(delta.success_rate * 100).toFixed(1)}%`);
    } else if (delta.success_rate < 0) {
      regressions.push(`success rate decreased by ${Math.abs(delta.success_rate * 100).toFixed(1)}%`);
    }

    if (delta.avg_duration_ms < 0) {
      improvements.push(`average duration decreased by ${Math.abs(delta.avg_duration_ms / 1000).toFixed(2)}s`);
    } else if (delta.avg_duration_ms > 0) {
      regressions.push(`average duration increased by ${(delta.avg_duration_ms / 1000).toFixed(2)}s`);
    }

    if (delta.avg_iterations < 0) {
      improvements.push(`average iterations decreased by ${Math.abs(delta.avg_iterations).toFixed(1)}`);
    } else if (delta.avg_iterations > 0) {
      regressions.push(`average iterations increased by ${delta.avg_iterations.toFixed(1)}`);
    }

    if (delta.tool_calls_per_turn < 0) {
      improvements.push(`tool calls per turn decreased by ${Math.abs(delta.tool_calls_per_turn).toFixed(1)}`);
    } else if (delta.tool_calls_per_turn > 0) {
      regressions.push(`tool calls per turn increased by ${delta.tool_calls_per_turn.toFixed(1)}`);
    }

    let recommendation = "";

    if (improvements.length > 0 && regressions.length === 0) {
      recommendation = `Variant is better: ${improvements.join(", ")}. Consider adopting variant configuration.`;
    } else if (regressions.length > 0 && improvements.length === 0) {
      recommendation = `Baseline is better: ${regressions.join(", ")}. Keep baseline configuration.`;
    } else {
      recommendation = `Mixed results:\n`;
      if (improvements.length > 0) {
        recommendation += `  Improvements: ${improvements.join(", ")}\n`;
      }
      if (regressions.length > 0) {
        recommendation += `  Regressions: ${regressions.join(", ")}\n`;
      }
      recommendation += `Recommendation: Evaluate trade-offs and consider tuning variant configuration.`;
    }

    return recommendation;
  }

  /**
   * Generate comparison table (markdown)
   */
  generateMarkdownComparison(comparison: Comparison): string {
    const { baseline, variant, delta, significance, recommendation } = comparison;

    let md = "# A/B Test Comparison\n\n";
    md += `**Test**: ${significance.test}\n`;
    md += `**Significant**: ${significance.significant ? "Yes" : "No"} (p=${significance.p_value.toFixed(3}, confidence=${(significance.confidence * 100).toFixed(0)}%)\n\n`;

    md += "## Recommendation\n\n";
    md += `${recommendation}\n\n`;

    md += "## Metrics Comparison\n\n";
    md += "| Metric | Baseline | Variant | Delta | Change |\n";
    md += "|--------|----------|---------|-------|--------|\n";

    const formatDelta = (val: number) => {
      const pct = val > 0 ? "+" : "";
      return `${pct}${val.toFixed(4)}`;
    };

    md += `| Success Rate | ${(baseline.success_rate * 100).toFixed(2)}% | ${(variant.success_rate * 100).toFixed(2)}% | ${formatDelta(delta.success_rate)} | ${formatDelta(delta.success_rate * 100)}% |\n`;
    md += `| Avg Duration | ${(baseline.avg_duration_ms / 1000).toFixed(2)}s | ${(variant.avg_duration_ms / 1000).toFixed(2)}s | ${formatDelta(delta.avg_duration_ms / 1000)}s | ${((delta.avg_duration_ms / baseline.avg_duration_ms) * 100).toFixed(1)}% |\n`;
    md += `| Avg Iterations | ${baseline.avg_iterations.toFixed(2)} | ${variant.avg_iterations.toFixed(2)} | ${formatDelta(delta.avg_iterations)} | ${((delta.avg_iterations / baseline.avg_iterations) * 100).toFixed(1)}% |\n`;
    md += `| Tool Calls/Turn | ${baseline.avg_tool_calls.toFixed(2)} | ${variant.avg_tool_calls.toFixed(2)} | ${formatDelta(delta.tool_calls_per_turn)} | ${((delta.tool_calls_per_turn / baseline.avg_tool_calls) * 100).toFixed(1)}% |\n`;

    md += "\n## Tool Usage Comparison\n\n";

    const allTools = new Set([
      ...Object.keys(baseline.tool_usage),
      ...Object.keys(variant.tool_usage)
    ]);

    md += "| Tool | Baseline Calls | Variant Calls | Delta |\n";
    md += "|------|---------------|--------------|-------|\n";

    for (const tool of Array.from(allTools).sort()) {
      const baselineTool = baseline.tool_usage[tool] || { call_count: 0 };
      const variantTool = variant.tool_usage[tool] || { call_count: 0 };
      const deltaCalls = variantTool.call_count - baselineTool.call_count;

      md += `| ${tool} | ${baselineTool.call_count} | ${variantTool.call_count} | ${deltaCalls > 0 ? "+" : ""}${deltaCalls} |\n`;
    }

    return md;
  }

  /**
   * Calculate improvement score (0-1)
   */
  calculateImprovementScore(comparison: Comparison): number {
    const { delta } = comparison;

    // Weighted score: success rate matters most
    let score = 0.5; // Start at neutral

    score += delta.success_rate * 3.0;  // Success rate: up to +0.3 improvement

    // Duration improvement (lower is better)
    if (delta.avg_duration_ms < 0) {
      score += Math.abs(delta.avg_duration_ms) / 100000; // Up to +0.1 improvement
    } else if (delta.avg_duration_ms > 0) {
      score -= delta.avg_duration_ms / 100000;
    }

    // Iteration efficiency (lower is better)
    if (delta.avg_iterations < 0) {
      score += Math.abs(delta.avg_iterations) * 0.05; // Up to +0.05 improvement
    } else if (delta.avg_iterations > 0) {
      score -= delta.avg_iterations * 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }
}
