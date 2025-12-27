import { spawn, ChildProcess } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { TestSuite, TestRun, ScenarioResult, RunOptions, RunConfig } from "./types.js";
import { MetricsCalculator } from "./metrics/metricsCalculator.js";

/**
 * E2E Test Runner - executes test suites against ff-terminal agent
 */
export class E2ERunner {
  private workspaceDir: string;
  private runsDir: string;
  private metricsCalculator: MetricsCalculator;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.runsDir = path.join(workspaceDir, "tests", "runs");
    this.metricsCalculator = new MetricsCalculator(workspaceDir);
  }

  /**
   * Initialize testing workspace
   */
  async init(): Promise<void> {
    const dirs = [
      this.runsDir,
      path.join(workspaceDir, "tests", "suites", "library"),
      path.join(workspaceDir, "tests", "suites", "custom"),
      path.join(workspaceDir, "tests", "reports", "html"),
      path.join(workspaceDir, "tests", "reports", "trends")
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Run a single test suite
   */
  async runSuite(suite: TestSuite, options: RunOptions = {}): Promise<TestRun> {
    const runId = this.generateRunId();
    const runDir = path.join(this.runsDir, runId);
    await fs.mkdir(runDir, { recursive: true });

    const config: RunConfig = {
      profile: options.profile || "env",
      suite,
      options,
      workspace_dir: this.workspaceDir
    };

    const run: TestRun = {
      id: runId,
      suite_name: suite.name,
      started_at: new Date().toISOString(),
      status: "running",
      results: [],
      config
    };

    await this.saveRun(run);

    try {
      for (const scenario of suite.scenarios) {
        const result = await this.runScenario(scenario, options);
        run.results.push(result);
        await this.saveRun(run); // Save incremental progress
      }

      run.completed_at = new Date().toISOString();
      run.status = this.determineRunStatus(run.results);
      run.metrics = await this.calculateRunMetrics(run);
      await this.saveRun(run);
    } catch (err) {
      run.status = "failed";
      run.completed_at = new Date().toISOString();
      await this.saveRun(run);
      throw err;
    }

    return run;
  }

  /**
   * Run multiple suites in parallel
   */
  async runParallel(
    suites: TestSuite[],
    concurrency: number = 3
  ): Promise<TestRun[]> {
    const chunks = this.chunkArray(suites, concurrency);
    const allRuns: TestRun[] = [];

    for (const chunk of chunks) {
      const promises = chunk.map((suite) => this.runSuite(suite));
      const chunkResults = await Promise.all(promises);
      allRuns.push(...chunkResults);
    }

    return allRuns;
  }

  /**
   * Run a single scenario (multi-prompt sequence)
   */
  private async runScenario(
    scenario: any,
    options: RunOptions
  ): Promise<ScenarioResult> {
    const sessionId = this.generateSessionId(options.session_prefix);
    const startTime = Date.now();

    const result: ScenarioResult = {
      scenario_name: scenario.name,
      session_id: sessionId,
      status: "passed",
      duration_ms: 0,
      turn_count: 0,
      tool_calls: 0,
      errors: [],
      evaluation: {
        passed: true,
        score: 1.0,
        criteria_results: [],
        human_review_required: scenario.evaluation.human_review || false
      }
    };

    try {
      for (const prompt of scenario.prompts) {
        await this.executeTurn(sessionId, prompt, options);
      }

      // Calculate metrics for this session
      const metrics = await this.metricsCalculator.calculateMetrics(sessionId);
      result.turn_count = metrics.total_turns;
      result.tool_calls = metrics.total_tool_calls;
      result.duration_ms = Date.now() - startTime;

      // Run evaluators
      result.evaluation = await this.evaluateScenario(result, scenario);
    } catch (err: any) {
      result.status = "failed";
      result.errors.push(err.message || String(err));
    }

    return result;
  }

  /**
   * Execute a single turn (prompt) using ff-terminal
   */
  private async executeTurn(
    sessionId: string,
    prompt: string,
    options: RunOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const binPath = path.join(this.workspaceDir, "..", "dist", "bin", "ff-terminal.js");

      if (!options.dry_run) {
        const args = [
          "run",
          "--session", sessionId,
          "--prompt", prompt,
          "--headless"
        ];

        if (options.profile && options.profile !== "env") {
          args.push("--profile", options.profile);
        }

        const proc = spawn("node", [binPath, ...args], {
          cwd: this.workspaceDir,
          env: {
            ...process.env,
            NODE_OPTIONS: "--max-old-space-size=4096"
          }
        });

        proc.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error(`ff-terminal exited with code ${code}`));
          } else {
            resolve();
          }
        });

        proc.on("error", (err) => {
          reject(err);
        });
      } else {
        // Dry-run mode - just simulate
        console.log(`[DRY RUN] Would execute: ${prompt}`);
        setTimeout(() => resolve(), 100);
      }
    });
  }

  /**
   * Evaluate scenario results
   */
  private async evaluateScenario(result: ScenarioResult, scenario: any): Promise<any> {
    // TODO: Implement evaluator system
    // For now, basic evaluation based on errors
    if (result.errors.length > 0) {
      return {
        passed: false,
        score: 0.0,
        criteria_results: [],
        human_review_required: true
      };
    }

    return {
      passed: true,
      score: 1.0,
      criteria_results: [],
      human_review_required: scenario.evaluation.human_review || false
    };
  }

  /**
   * Calculate aggregate metrics for a run
   */
  private async calculateRunMetrics(run: TestRun): Promise<any> {
    const sessionIds = run.results.map((r) => r.session_id);
    const sessionMetrics = [];

    for (const sessionId of sessionIds) {
      const metrics = await this.metricsCalculator.calculateMetrics(sessionId);
      sessionMetrics.push(metrics);
    }

    return this.metricsCalculator.aggregateMetrics(sessionMetrics);
  }

  /**
   * Determine overall run status
   */
  private determineRunStatus(results: ScenarioResult[]): TestRun["status"] {
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;

    if (failed > 0) return "failed";
    if (passed === results.length) return "completed";
    return "partial";
  }

  /**
   * Save run data to disk
   */
  private async saveRun(run: TestRun): Promise<void> {
    const runDir = path.join(this.runsDir, run.id);
    await fs.mkdir(runDir, { recursive: true });

    const configPath = path.join(runDir, "config.json");
    const resultsPath = path.join(runDir, "results.json");
    const metricsPath = path.join(runDir, "metrics.json");

    await fs.writeFile(configPath, JSON.stringify(run.config, null, 2));
    await fs.writeFile(resultsPath, JSON.stringify(run.results, null, 2));
    if (run.metrics) {
      await fs.writeFile(metricsPath, JSON.stringify(run.metrics, null, 2));
    }
  }

  /**
   * List all test runs
   */
  async listRuns(): Promise<TestRun[]> {
    const runDirs = await fs.readdir(this.runsDir);
    const runs: TestRun[] = [];

    for (const runId of runDirs) {
      const runPath = path.join(this.runsDir, runId, "config.json");
      try {
        const content = await fs.readFile(runPath, "utf-8");
        const config = JSON.parse(content);
        // Minimal run info
        runs.push({
          id: runId,
          suite_name: config.suite.name,
          started_at: config.started_at,
          status: "completed", // Would need to read full run for accurate status
          results: [],
          config
        } as TestRun);
      } catch {
        // Skip incomplete runs
      }
    }

    return runs.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }

  /**
   * Load a specific run
   */
  async loadRun(runId: string): Promise<TestRun | null> {
    const runPath = path.join(this.runsDir, runId);
    const configPath = path.join(runPath, "config.json");
    const resultsPath = path.join(runPath, "results.json");
    const metricsPath = path.join(runPath, "metrics.json");

    try {
      const [config, results, metricsContent] = await Promise.all([
        fs.readFile(configPath, "utf-8").then(JSON.parse),
        fs.readFile(resultsPath, "utf-8").then(JSON.parse),
        fs.readFile(metricsPath, "utf-8").catch(() => null)
      ]);

      const run: TestRun = {
        id: runId,
        suite_name: config.suite.name,
        started_at: config.started_at,
        completed_at: config.completed_at,
        status: config.status || "completed",
        results,
        metrics: metricsContent ? JSON.parse(metricsContent) : undefined,
        config
      };

      return run;
    } catch {
      return null;
    }
  }

  private generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(prefix?: string): string {
    if (prefix) {
      return `${prefix}_${Date.now()}`;
    }
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
