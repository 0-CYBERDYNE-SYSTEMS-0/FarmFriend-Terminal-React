import { TestRun, ScenarioResult } from "../../types.js";

/**
 * CSV Exporter
 * Export test runs to CSV format
 */

export class CSVExporter {
  private run: TestRun;

  constructor(run: TestRun) {
    this.run = run;
  }

  /**
   * Generate CSV report
   */
  async generate(): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(this.getHeader());

    // Run metadata
    lines.push("Run Metadata");
    lines.push(this.getRunMetadata());
    lines.push("");

    // Scenario results
    lines.push("Scenario Results");
    lines.push(this.getScenarioResultsHeader());

    for (const result of this.run.results) {
      lines.push(this.getScenarioResultRow(result));
    }

    lines.push("");

    // Tool usage
    if (this.run.metrics) {
      lines.push("Tool Usage");
      lines.push(this.getToolUsageHeader());

      for (const [toolName, usage] of Object.entries(
        this.run.metrics.tool_usage
      )) {
        lines.push(this.getToolUsageRow(toolName, usage));
      }
    }

    return lines.join("\n");
  }

  /**
   * Get header
   */
  private getHeader(): string {
    return `Agent Testing Suite - CSV Export
Generated: ${new Date().toISOString()}
`;
  }

  /**
   * Get run metadata
   */
  private getRunMetadata(): string {
    const run = this.run;
    const metrics = run.metrics;

    return `Run ID,${run.id}
Suite Name,${run.suite_name}
Status,${run.status}
Started,${new Date(run.started_at).toISOString()}
Completed,${run.completed_at ? new Date(run.completed_at).toISOString() : ""}
Total Scenarios,${run.results.length}
Success Rate,${metrics?.success_rate.toFixed(3) || "N/A"}
Completion Rate,${metrics?.completion_rate.toFixed(3) || "N/A"}
Avg Duration (ms),${metrics?.avg_duration_ms.toFixed(0) || "N/A"}
Total Turns,${metrics?.total_turns || 0}
Total Tool Calls,${metrics?.total_tool_calls || 0}
Total Errors,${metrics?.total_errors || 0}
Circuit Breaker Trips,${metrics?.circuit_breaker_trips || 0}
Plan Validation Events,${metrics?.plan_validation_events || 0}`;
  }

  /**
   * Get scenario results header
   */
  private getScenarioResultsHeader(): string {
    return "Scenario Name,Status,Duration (ms),Turns,Tool Calls,Errors,Passed,Score,Human Review Required";
  }

  /**
   * Get scenario result row
   */
  private getScenarioResultRow(result: ScenarioResult): string {
    const errors = result.errors.join("; ").replace(/,/g, ";");
    const evaluation = result.evaluation;

    return [
      this.escapeCSV(result.scenario_name),
      this.escapeCSV(result.status),
      result.duration_ms,
      result.turn_count,
      result.tool_calls,
      this.escapeCSV(errors),
      evaluation?.passed || false,
      evaluation?.score?.toFixed(3) || "N/A",
      evaluation?.human_review_required || false
    ].join(",");
  }

  /**
   * Get tool usage header
   */
  private getToolUsageHeader(): string {
    return "Tool Name,Calls,Success,Failures,Avg Duration (ms),Total Duration (ms)";
  }

  /**
   * Get tool usage row
   */
  private getToolUsageRow(toolName: string, usage: any): string {
    return [
      this.escapeCSV(toolName),
      usage.call_count,
      usage.success_count,
      usage.fail_count,
      usage.avg_duration_ms.toFixed(0),
      usage.total_duration_ms
    ].join(",");
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: any): string {
    const str = String(value);

    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Save CSV to file
   */
  async saveToFile(outputPath: string): Promise<void> {
    const csv = await this.generate();

    const { promises } = await import("node:fs/promises");
    await promises.mkdir(outputPath.split("/").slice(0, -1).join("/"), {
      recursive: true
    });
    await promises.writeFile(outputPath, csv, "utf-8");

    console.log(`✅ CSV report saved to ${outputPath}`);
  }

  /**
   * Generate metrics CSV
   */
  async generateMetricsCSV(): Promise<string> {
    const metrics = this.run.metrics;
    if (!metrics) throw new Error("No metrics available");

    const lines: string[] = [];

    // Header
    lines.push("Metric,Value");

    // Core metrics
    lines.push(`Success Rate,${metrics.success_rate.toFixed(3)}`);
    lines.push(`Completion Rate,${metrics.completion_rate.toFixed(3)}`);
    lines.push(`Avg Duration (ms),${metrics.avg_duration_ms.toFixed(0)}`);
    lines.push(`Avg Iterations,${metrics.avg_iterations.toFixed(2)}`);
    lines.push(`Avg Tool Calls,${metrics.avg_tool_calls.toFixed(2)}`);

    lines.push("");

    // Turn-level metrics
    lines.push("Turn-Level Metrics");
    lines.push(`Total Turns,${metrics.total_turns}`);
    lines.push(`Avg Tool Calls/Turn,${metrics.avg_tool_calls.toFixed(2)}`);

    lines.push("");

    // System-level metrics
    lines.push("System-Level Metrics");
    lines.push(`Total Tool Calls,${metrics.total_tool_calls}`);
    lines.push(`Total Errors,${metrics.total_errors}`);
    lines.push(`Circuit Breaker Trips,${metrics.circuit_breaker_trips}`);
    lines.push(
      `Plan Validation Events,${metrics.plan_validation_events}`
    );

    lines.push("");

    // Tool-level metrics
    lines.push("Tool-Level Metrics");
    lines.push("Tool Name,Calls,Success Rate,Avg Duration (ms),Error Count");

    for (const [toolName, usage] of Object.entries(metrics.tool_usage)) {
      const successRate =
        usage.call_count > 0 ? usage.success_count / usage.call_count : 0;

      lines.push(
        [
          this.escapeCSV(toolName),
          usage.call_count,
          successRate.toFixed(3),
          usage.avg_duration_ms.toFixed(0),
          usage.fail_count
        ].join(",")
      );
    }

    return lines.join("\n");
  }

  /**
   * Generate evaluation criteria CSV
   */
  async generateEvaluationCriteriaCSV(): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(
      "Scenario Name,Dimension,Passed,Score,Notes"
    );

    // Results
    for (const result of this.run.results) {
      if (result.evaluation && result.evaluation.criteria_results) {
        for (const criteria of result.evaluation.criteria_results) {
          lines.push(
            [
              this.escapeCSV(result.scenario_name),
              this.escapeCSV(criteria.dimension),
              criteria.passed,
              criteria.score.toFixed(3),
              this.escapeCSV(criteria.notes || "")
            ].join(",")
          );
        }
      }
    }

    return lines.join("\n");
  }
}
