import { parentPort, workerData } from "worker_threads";
import { E2ERunner } from "../e2eRunner.js";
import { TestScenario, ScenarioResult } from "../types.js";

/**
 * Worker thread for parallel test execution
 * Each worker runs scenarios independently to avoid state interference
 */

interface WorkerConfig {
  workspace_dir: string;
  suite_name: string;
}

interface WorkerMessage {
  type: "execute" | "result" | "stop";
  scenario: TestScenario;
  config: WorkerConfig;
}

/**
 * Main worker execution loop
 */
async function workerMain() {
  const runner = new E2ERunner(workerData.workspaceDir || process.cwd());

  parentPort!.on("message", async (msg: WorkerMessage) => {
    if (msg.type === "execute") {
      try {
        console.log(`[Worker ${workerData.workerId}] Executing ${msg.scenario.name}`);

        const result = await runner.runScenario(
          msg.scenario,
          msg.config
        );

        parentPort!.postMessage({
          type: "result",
          result: {
            scenarioName: msg.scenario.name,
            result
          }
        });
      } catch (error: any) {
        console.error(`[Worker ${workerData.workerId}] Error:`, error.message);

        parentPort!.postMessage({
          type: "result",
          result: {
            scenarioName: msg.scenario.name,
            result: null,
            error: error.message
          }
        });
      }
    }
  });

  console.log(`[Worker ${workerData.workerId}] Ready`);
}

// Start worker
workerMain().catch(err => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
