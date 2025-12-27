import { promises as fs } from "node:fs";
import path from "node:path";
import { TestRun, Metrics } from "../types.js";
import { MermaidGenerator } from "./mermaidGenerator.js";

/**
 * Generate comprehensive HTML reports for test runs
 */
export class HTMLReportGenerator {
  private workspaceDir: string;
  private mermaidGen: MermaidGenerator;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.mermaidGen = new MermaidGenerator(workspaceDir);
  }

  /**
   * Generate HTML report for a test run
   */
  async generateReport(run: TestRun): Promise<string> {
    const template = await this.loadTemplate();

    // Generate sections
    const sections = {
      header: this.generateHeader(run),
      summary: this.generateSummary(run),
      metrics: this.generateMetrics(run),
      scenarios: this.generateScenarios(run),
      toolUsage: this.generateToolUsage(run),
      mermaid: await this.generateMermaidSection(run),
      recommendations: this.generateRecommendations(run),
      footer: this.generateFooter()
    };

    // Replace placeholders
    let html = template;
    for (const [key, content] of Object.entries(sections)) {
      html = html.replace(`{{${key}}}`, content);
    }

    return html;
  }

  /**
   * Generate HTML report for A/B comparison
   */
  async generateComparisonReport(run1: TestRun, run2: TestRun): Promise<string> {
    const template = await this.loadComparisonTemplate();

    const sections = {
      header: this.generateComparisonHeader(run1, run2),
      summary: this.generateComparisonSummary(run1, run2),
      metricsComparison: this.generateMetricsComparison(run1, run2),
      toolUsageComparison: this.generateToolUsageComparison(run1, run2),
      mermaid: await this.generateComparisonMermaid(run1, run2),
      footer: this.generateFooter()
    };

    let html = template;
    for (const [key, content] of Object.entries(sections)) {
      html = html.replace(`{{${key}}}`, content);
    }

    return html;
  }

  /**
   * Save report to file
   */
  async saveReport(runId: string, html: string): Promise<string> {
    const reportsDir = path.join(this.workspaceDir, "tests", "reports", "html");
    await fs.mkdir(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, `${runId}.html`);
    await fs.writeFile(reportPath, html, "utf-8");

    return reportPath;
  }

  private async loadTemplate(): Promise<string> {
    const templatePath = path.join(__dirname, "templates", "report.html");
    try {
      return await fs.readFile(templatePath, "utf-8");
    } catch {
      return this.getDefaultTemplate();
    }
  }

  private async loadComparisonTemplate(): Promise<string> {
    const templatePath = path.join(__dirname, "templates", "comparison.html");
    try {
      return await fs.readFile(templatePath, "utf-8");
    } catch {
      return this.getDefaultComparisonTemplate();
    }
  }

  private generateHeader(run: TestRun): string {
    const date = new Date(run.started_at).toLocaleString();
    return `
      <header class="header">
        <h1>🧪 Agent Test Report</h1>
        <div class="meta">
          <span><strong>Run ID:</strong> ${run.id}</span>
          <span><strong>Suite:</strong> ${run.suite_name}</span>
          <span><strong>Date:</strong> ${date}</span>
          <span><strong>Status:</strong> ${this.getStatusBadge(run.status)}</span>
        </div>
      </header>
    `;
  }

  private generateComparisonHeader(run1: TestRun, run2: TestRun): string {
    return `
      <header class="header">
        <h1>📊 A/B Test Comparison</h1>
        <div class="meta">
          <span><strong>Baseline:</strong> ${run1.id}</span>
          <span><strong>Variant:</strong> ${run2.id}</span>
          <span><strong>Date:</strong> ${new Date().toLocaleString()}</span>
        </div>
      </header>
    `;
  }

  private generateSummary(run: TestRun): string {
    const passed = run.results.filter((r: any) => r.status === "passed").length;
    const failed = run.results.filter((r: any) => r.status === "failed").length;
    const partial = run.results.filter((r: any) => r.status === "partial").length;
    const total = run.results.length;

    const metrics = run.metrics;
    const successRate = metrics ? (metrics.success_rate * 100).toFixed(1) : "N/A";
    const avgDuration = metrics ? (metrics.avg_duration_ms / 1000).toFixed(2) : "N/A";

    return `
      <section class="section">
        <h2>📋 Executive Summary</h2>
        <div class="summary-cards">
          <div class="card">
            <div class="card-value">${total}</div>
            <div class="card-label">Total Scenarios</div>
          </div>
          <div class="card success">
            <div class="card-value">${passed}</div>
            <div class="card-label">Passed</div>
          </div>
          <div class="card failure">
            <div class="card-value">${failed}</div>
            <div class="card-label">Failed</div>
          </div>
          <div class="card warning">
            <div class="card-value">${partial}</div>
            <div class="card-label">Partial</div>
          </div>
          <div class="card">
            <div class="card-value">${successRate}%</div>
            <div class="card-label">Success Rate</div>
          </div>
          <div class="card">
            <div class="card-value">${avgDuration}s</div>
            <div class="card-label">Avg Duration</div>
          </div>
        </div>
      </section>
    `;
  }

  private generateMetrics(run: TestRun): string {
    if (!run.metrics) {
      return '<section class="section"><h2>📊 Metrics</h2><p>No metrics available</p></section>';
    }

    const m = run.metrics;
    const successRate = (m.success_rate * 100).toFixed(2);
    const completionRate = (m.completion_rate * 100).toFixed(2);
    const avgDuration = (m.avg_duration_ms / 1000).toFixed(2);
    const avgIterations = m.avg_iterations.toFixed(2);
    const avgToolCalls = m.avg_tool_calls.toFixed(2);

    return `
      <section class="section">
        <h2>📊 Detailed Metrics</h2>
        <table class="metrics-table">
          <tbody>
            <tr><td>Success Rate</td><td>${successRate}%</td></tr>
            <tr><td>Completion Rate</td><td>${completionRate}%</td></tr>
            <tr><td>Average Duration</td><td>${avgDuration}s</td></tr>
            <tr><td>Average Iterations/Turn</td><td>${avgIterations}</td></tr>
            <tr><td>Average Tool Calls/Turn</td><td>${avgToolCalls}</td></tr>
            <tr><td>Total Turns</td><td>${m.total_turns}</td></tr>
            <tr><td>Total Tool Calls</td><td>${m.total_tool_calls}</td></tr>
            <tr><td>Total Errors</td><td>${m.total_errors}</td></tr>
            <tr><td>Circuit Breaker Trips</td><td>${m.circuit_breaker_trips}</td></tr>
            <tr><td>Plan Validation Events</td><td>${m.plan_validation_events}</td></tr>
          </tbody>
        </table>
      </section>
    `;
  }

  private generateScenarios(run: TestRun): string {
    const rows = run.results.map((r: any) => `
      <tr>
        <td>${r.scenario_name}</td>
        <td>${this.getStatusBadge(r.status)}</td>
        <td>${r.turn_count}</td>
        <td>${r.tool_calls}</td>
        <td>${(r.duration_ms / 1000).toFixed(2)}s</td>
        <td>${r.errors.length}</td>
      </tr>
    `).join("");

    return `
      <section class="section">
        <h2>🧪 Scenario Results</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Status</th>
              <th>Turns</th>
              <th>Tool Calls</th>
              <th>Duration</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </section>
    `;
  }

  private generateToolUsage(run: TestRun): string {
    if (!run.metrics || Object.keys(run.metrics.tool_usage).length === 0) {
      return '<section class="section"><h2>🔧 Tool Usage</h2><p>No tool usage data available</p></section>';
    }

    const rows = Object.entries(run.metrics.tool_usage)
      .sort((a, b) => b[1].call_count - a[1].call_count)
      .map(([name, usage]: [string, any]) => `
      <tr>
        <td>${name}</td>
        <td>${usage.call_count}</td>
        <td>${usage.success_count}</td>
        <td>${usage.fail_count}</td>
        <td>${usage.avg_duration_ms.toFixed(0)}ms</td>
        <td>${((usage.fail_count / usage.call_count) * 100).toFixed(1)}%</td>
      </tr>
    `).join("");

    return `
      <section class="section">
        <h2>🔧 Tool Usage</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Calls</th>
              <th>Success</th>
              <th>Failures</th>
              <th>Avg Duration</th>
              <th>Failure Rate</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </section>
    `;
  }

  private async generateMermaidSection(run: TestRun): Promise<string> {
    const flowchart = await this.mermaidGen.generateFlowchart(run);
    const toolGraph = await this.mermaidGen.generateToolDependencyGraph(run);

    return `
      <section class="section">
        <h2>🔗 Execution Flow</h2>
        <div class="mermaid">
          ${flowchart}
        </div>

        <h2>🕸️ Tool Dependency Graph</h2>
        <div class="mermaid">
          ${toolGraph}
        </div>
      </section>
    `;
  }

  private generateRecommendations(run: TestRun): string {
    const recommendations: string[] = [];

    if (run.metrics) {
      if (run.metrics.circuit_breaker_trips > 0) {
        recommendations.push("⚠️ Circuit breaker was triggered. Review tool failure patterns.");
      }

      if (run.metrics.success_rate < 0.8) {
        recommendations.push("⚠️ Low success rate. Investigate tool failures and error messages.");
      }

      if (run.metrics.total_errors > 5) {
        recommendations.push("⚠️ High error count. Check logs for recurring issues.");
      }

      const failedScenarios = run.results.filter((r: any) => r.status === "failed");
      if (failedScenarios.length > 0) {
        recommendations.push(`⚠️ ${failedScenarios.length} scenario(s) failed. Review errors and prompts.`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ All scenarios passed. No critical issues found.");
    }

    return `
      <section class="section recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
          ${recommendations.map(r => `<li>${r}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  private generateFooter(): string {
    const timestamp = new Date().toISOString();
    return `
      <footer class="footer">
        <p>Generated by Agent Testing Suite v0.1.0</p>
        <p>${timestamp}</p>
      </footer>
    `;
  }

  private generateComparisonSummary(run1: TestRun, run2: TestRun): string {
    const m1 = run1.metrics;
    const m2 = run2.metrics;

    if (!m1 || !m2) {
      return '<p>Metrics comparison not available</p>';
    }

    const deltaSuccess = ((m2.success_rate - m1.success_rate) * 100).toFixed(2);
    const deltaDuration = ((m2.avg_duration_ms - m1.avg_duration_ms) / 1000).toFixed(2);
    const deltaIterations = (m2.avg_iterations - m1.avg_iterations).toFixed(2);

    return `
      <div class="comparison-summary">
        <div class="comparison-card">
          <h3>Success Rate</h3>
          <div class="baseline">${(m1.success_rate * 100).toFixed(1)}%</div>
          <div class="arrow">→</div>
          <div class="variant">${(m2.success_rate * 100).toFixed(1)}%</div>
          <div class="delta ${parseFloat(deltaSuccess) >= 0 ? "positive" : "negative"}">
            ${parseFloat(deltaSuccess) >= 0 ? "+" : ""}${deltaSuccess}%
          </div>
        </div>
        <div class="comparison-card">
          <h3>Avg Duration</h3>
          <div class="baseline">${(m1.avg_duration_ms / 1000).toFixed(2)}s</div>
          <div class="arrow">→</div>
          <div class="variant">${(m2.avg_duration_ms / 1000).toFixed(2)}s</div>
          <div class="delta ${parseFloat(deltaDuration) <= 0 ? "positive" : "negative"}">
            ${parseFloat(deltaDuration) <= 0 ? "-" : "+"}${Math.abs(parseFloat(deltaDuration)).toFixed(2)}s
          </div>
        </div>
        <div class="comparison-card">
          <h3>Avg Iterations</h3>
          <div class="baseline">${m1.avg_iterations.toFixed(2)}</div>
          <div class="arrow">→</div>
          <div class="variant">${m2.avg_iterations.toFixed(2)}</div>
          <div class="delta ${parseFloat(deltaIterations) <= 0 ? "positive" : "negative"}">
            ${parseFloat(deltaIterations) <= 0 ? "-" : "+"}${Math.abs(parseFloat(deltaIterations)).toFixed(2)}
          </div>
        </div>
      </div>
    `;
  }

  private generateMetricsComparison(run1: TestRun, run2: TestRun): string {
    // Simplified version - would use Comparator class
    return `<section class="section"><h2>📊 Detailed Comparison</h2><p>Use ff-test compare CLI command for detailed analysis</p></section>`;
  }

  private generateToolUsageComparison(run1: TestRun, run2: TestRun): string {
    return `<section class="section"><h2>🔧 Tool Usage Comparison</h2><p>Detailed tool comparison coming soon</p></section>`;
  }

  private async generateComparisonMermaid(run1: TestRun, run2: TestRun): Promise<string> {
    return `<div class="mermaid-placeholder">Comparison diagrams coming soon</div>`;
  }

  private getStatusBadge(status: string): string {
    const colors: Record<string, string> = {
      completed: "#10b981",
      passed: "#10b981",
      failed: "#ef4444",
      partial: "#f59e0b",
      running: "#3b82f6"
    };
    const color = colors[status] || "#6b7280";
    return `<span class="badge" style="background-color: ${color}; color: white;">${status}</span>`;
  }

  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header h1 { margin: 0 0 20px 0; color: #1f2937; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; color: #6b7280; }
    .section { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { margin-top: 0; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
    .card.success { background: #dcfce7; }
    .card.failure { background: #fee2e2; }
    .card.warning { background: #fef3c7; }
    .card-value { font-size: 32px; font-weight: bold; color: #1f2937; }
    .card-label { color: #6b7280; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .recommendations { background: #eff6ff; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .recommendations li { margin: 10px 0; color: #1e3a8a; }
    .footer { text-align: center; color: #6b7280; margin-top: 40px; }
    .mermaid { background: #f9fafb; padding: 20px; border-radius: 8px; overflow-x: auto; }
    .comparison-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .comparison-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
    .comparison-card h3 { margin: 0 0 15px 0; color: #6b7280; }
    .baseline, .variant, .arrow { font-size: 24px; margin: 5px 0; }
    .delta { font-size: 18px; font-weight: bold; padding: 5px 10px; border-radius: 4px; margin-top: 10px; }
    .delta.positive { background: #dcfce7; color: #059669; }
    .delta.negative { background: #fee2e2; color: #dc2626; }
  </style>
</head>
<body>
  {{header}}
  {{summary}}
  {{metrics}}
  {{scenarios}}
  {{toolUsage}}
  {{mermaid}}
  {{recommendations}}
  {{footer}}
</body>
</html>`;
  }

  private getDefaultComparisonTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>A/B Test Comparison</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { margin-top: 0; color: #1f2937; }
    .comparison-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .comparison-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
    .delta { font-size: 18px; font-weight: bold; padding: 5px 10px; border-radius: 4px; margin-top: 10px; }
    .delta.positive { background: #dcfce7; color: #059669; }
    .delta.negative { background: #fee2e2; color: #dc2626; }
  </style>
</head>
<body>
  {{header}}
  {{summary}}
  {{metricsComparison}}
  {{toolUsageComparison}}
  {{mermaid}}
  {{footer}}
</body>
</html>`;
  }
}
