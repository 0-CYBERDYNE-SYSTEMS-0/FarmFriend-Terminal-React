import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { TestScenario, RunOptions, ScenarioResult } from "../types.js";
import { E2ERunner } from "../e2eRunner.js";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";

/**
 * Parallel test execution with worker pool management
 * Inspired by LangChain's parallel evals and Galileo's efficiency testing
 */

interface WorkerMessage {
  type: "execute" | "result" | "stop";
  scenario: TestScenario;
  config: WorkerConfig;
}

interface WorkerResult {
  scenarioName: string;
  result: ScenarioResult | null;
  error?: string;
}

interface WorkerConfig extends RunOptions {
  workspace_dir: string;
  suite_name: string;
}

interface PoolStatus {
  active: number;
  queued: number;
  completed: number;
  failed: number;
}

/**
 * Worker pool for parallel test execution
 */
export class ParallelRunner {
  private runner: E2ERunner;
  private concurrency: number;
  private workers: Map<string, Worker>;
  private queue: TestScenario[];
  private running: Map<string, Worker>;
  private results: Map<string, ScenarioResult>;
  private status: PoolStatus;
  private timeoutMs: number;

  constructor(
    workspaceDir: string,
    concurrency: number = 4,
    timeoutMinutes: number = 30
  ) {
    this.runner = new E2ERunner(workspaceDir);
    this.concurrency = concurrency;
    this.workers = new Map();
    this.queue = [];
    this.running = new Map();
    this.results = new Map();
    this.timeoutMs = timeoutMinutes * 60 * 1000;
    this.status = {
      active: 0,
      queued: 0,
      completed: 0,
      failed: 0
    };
  }

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
    for (let i = 0; i < this.concurrency; i++) {
      const worker = this.createWorker(i);
      this.workers.set(`worker-${i}`, worker);
    }

    console.log(`✅ Worker pool initialized with ${this.concurrency} workers`);
  }

  /**
   * Create a new worker thread
   */
  private createWorker(id: number): Worker {
    const worker = new Worker(
      new URL("./parallelWorker.js", import.meta.url),
      {
        workerData: { workerId: id }
      }
    );

    worker.on("message", (msg) => this.handleWorkerMessage(msg, worker));
    worker.on("error", (err) => this.handleWorkerError(err, worker));
    worker.on("exit", (code) => {
      console.warn(`⚠️  Worker ${id} exited with code ${code}`);
      this.workers.delete(`worker-${id}`);
    });

    return worker;
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(
    msg: any,
    worker: Worker
  ): void {
    if (msg.type === "result") {
      const result = msg.result as WorkerResult;

      if (result.error) {
        console.error(`❌ Scenario ${result.scenarioName} failed:`, result.error);
        this.status.failed++;
      } else if (result.result) {
        this.results.set(result.scenarioName, result.result);
        this.status.completed++;
        console.log(`✅ Scenario ${result.scenarioName} completed`);
      }

      // Remove from running and start next
      for (const [scenarioName, w] of this.running.entries()) {
        if (w === worker) {
          this.running.delete(scenarioName);
          break;
        }
      }

      this.status.active = this.running.size;
      this.dispatchNext();
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(err: Error, worker: Worker): void {
    console.error("Worker error:", err);

    // Remove from running
    for (const [scenarioName, w] of this.running.entries()) {
      if (w === worker) {
        this.running.delete(scenarioName);
        this.status.failed++;
        break;
      }
    }

    this.status.active = this.running.size;
    this.dispatchNext();
  }

  /**
   * Dispatch next scenario to available worker
   */
  private dispatchNext(): void {
    if (this.queue.length === 0 || this.running.size >= this.concurrency) {
      return;
    }

    const scenario = this.queue.shift()!;
    const worker = this.getAvailableWorker();

    if (!worker) {
      // No workers available, re-queue
      this.queue.unshift(scenario);
      return;
    }

    console.log(`🚀 Dispatching ${scenario.name} to worker`);
    this.running.set(scenario.name, worker);
    this.status.active = this.running.size;
    this.status.queued = this.queue.length;

    // Send to worker with timeout
    const timeout = setTimeout(() => {
      console.warn(`⏱️  Scenario ${scenario.name} timed out`);
      this.running.delete(scenario.name);
      this.results.set(scenario.name, {
        scenario_name: scenario.name,
        session_id: uuidv4(),
        status: "timeout",
        duration_ms: this.timeoutMs,
        turn_count: 0,
        tool_calls: 0,
        errors: ["Execution timeout"],
        evaluation: {
          passed: false,
          score: 0,
          criteria_results: [],
          human_review_required: true
        }
      });
      this.status.failed++;
      this.status.active = this.running.size;
      this.dispatchNext();
    }, this.timeoutMs);

    worker.postMessage({
      type: "execute",
      scenario,
      config: {
        workspace_dir: this.runner.getWorkspaceDir(),
        suite_name: "parallel-run"
      }
    } as WorkerMessage);

    // Store timeout reference for cleanup
    (worker as any).currentTimeout = timeout;
  }

  /**
   * Get available worker
   */
  private getAvailableWorker(): Worker | null {
    for (const [id, worker] of this.workers.entries()) {
      if (!this.running.has(id)) {
        return worker;
      }
    }
    return null;
  }

  /**
   * Run scenarios in parallel
   */
  async runScenarios(
    scenarios: TestScenario[],
    options: RunOptions = {}
  ): Promise<Map<string, ScenarioResult>> {
    console.log(`📋 Queuing ${scenarios.length} scenarios for parallel execution...`);

    // Add to queue
    this.queue = [...scenarios];
    this.status.queued = scenarios.length;

    // Start dispatching
    await this.initialize();
    this.dispatchBatch();

    // Wait for completion
    await this.waitForCompletion();

    console.log(`\n📊 Execution Summary:`);
    console.log(`   Completed: ${this.status.completed}`);
    console.log(`   Failed: ${this.status.failed}`);
    console.log(`   Total: ${scenarios.length}`);

    return this.results;
  }

  /**
   * Dispatch initial batch of scenarios
   */
  private dispatchBatch(): void {
    const initialBatch = Math.min(this.concurrency, this.queue.length);

    for (let i = 0; i < initialBatch; i++) {
      this.dispatchNext();
    }
  }

  /**
   * Wait for all scenarios to complete
   */
  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.queue.length === 0 && this.running.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Get current status
   */
  getStatus(): PoolStatus {
    return { ...this.status };
  }

  /**
   * Stop all workers
   */
  async stop(): Promise<void> {
    console.log("🛑 Stopping all workers...");

    for (const worker of this.workers.values()) {
      // Clear timeout
      if ((worker as any).currentTimeout) {
        clearTimeout((worker as any).currentTimeout);
      }

      // Terminate worker
      worker.terminate();
    }

    this.workers.clear();
    this.running.clear();
    console.log("✅ All workers stopped");
  }

  /**
   * Aggregate results from multiple runs (for reliability testing)
   */
  static aggregateReplicates(
    replicates: ScenarioResult[],
    aggregation: "mean" | "median" | "min" | "max" | "ci95" = "mean"
  ): any {
    if (replicates.length === 0) {
      return null;
    }

    const values = replicates.map(r => r.duration_ms);

    switch (aggregation) {
      case "mean":
        return values.reduce((a, b) => a + b, 0) / values.length;
      case "median":
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      case "min":
        return Math.min(...values);
      case "max":
        return Math.max(...values);
      case "ci95":
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        );
        return {
          mean,
          lower: mean - 1.96 * std,
          upper: mean + 1.96 * std
        };
      default:
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  /**
   * Calculate execution efficiency
   */
  calculateEfficiency(
    sequentialTime: number,
    parallelTime: number
  ): number {
    return sequentialTime / parallelTime;
  }
}

/**
 * Main entry point (when not in worker thread)
 */
export async function runParallel(
  workspaceDir: string,
  scenarios: TestScenario[],
  concurrency: number = 4,
  timeoutMinutes: number = 30
): Promise<Map<string, ScenarioResult>> {
  const runner = new ParallelRunner(workspaceDir, concurrency, timeoutMinutes);

  try {
    return await runner.runScenarios(scenarios);
  } finally {
    await runner.stop();
  }
}

// Only run if this is the main thread
if (isMainThread && process.env.FF_TEST_WORKER_MAIN === "true") {
  // Entry point for parallel execution
  const scenarios = [];
  await runParallel(
    process.cwd(),
    scenarios,
    parseInt(process.env.FF_TEST_CONCURRENCY || "4")
  );
}
