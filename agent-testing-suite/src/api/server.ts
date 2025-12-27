import express from "express";
import cors from "cors";
import { E2ERunner } from "../testing/e2eRunner.js";
import path from "node:path";

const DEFAULT_WORKSPACE = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  ".."
);

const app = express();
const PORT = process.env.PORT || 8787;
const runner = new E2ERunner(DEFAULT_WORKSPACE);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../testing-ui/dist")));

// API Routes

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /api/runs
 * List all test runs
 */
app.get("/api/runs", async (_req, res) => {
  try {
    const runs = await runner.listRuns();
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/runs/:runId
 * Get details of a specific test run
 */
app.get("/api/runs/:runId", async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await runner.loadRun(runId);

    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    res.json({ run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/runs
 * Create and execute a new test run
 */
app.post("/api/runs", async (req, res) => {
  try {
    const { suite, options } = req.body;

    if (!suite) {
      return res.status(400).json({ error: "Suite is required" });
    }

    // Execute test run (in background)
    // In production, would use job queue
    runner.runSuite(suite, options)
      .then((run) => {
        console.log(`Test run ${run.id} completed`);
      })
      .catch((err) => {
        console.error(`Test run failed: ${err.message}`);
      });

    // Return immediately with run ID
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.json({ runId, status: "started" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/suites
 * List all available test suites
 */
app.get("/api/suites", async (_req, res) => {
  try {
    const suitesDir = path.join(DEFAULT_WORKSPACE, "tests", "suites", "library");
    const { promises } = await import("node:fs/promises");

    const files = await promises.readdir(suitesDir);
    const suites = files.filter(f => f.endsWith(".yaml")).map(f => ({
      id: f.replace(".yaml", ""),
      name: f.replace(".yaml", "")
    }));

    res.json({ suites });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/suites/:suiteId
 * Get test suite details
 */
app.get("/api/suites/:suiteId", async (req, res) => {
  try {
    const { suiteId } = req.params;
    const suitePath = path.join(
      DEFAULT_WORKSPACE,
      "tests",
      "suites",
      "library",
      `${suiteId}.yaml`
    );

    const { promises } = await import("node:fs/promises");
    const yaml = await import("yaml");
    const content = await promises.readFile(suitePath, "utf-8");
    const suite = yaml.parse(content);

    res.json({ suite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reports/:runId
 * Generate HTML report for a test run
 */
app.post("/api/reports/:runId", async (req, res) => {
  try {
    const { runId } = req.params;
    const { HTMLReportGenerator } = await import("../testing/reports/htmlReportGenerator.js");

    const run = await runner.loadRun(runId);
    if (!run) {
      return res.status(404).json({ error: "Run not found" });
    }

    const generator = new HTMLReportGenerator(DEFAULT_WORKSPACE);
    const html = await generator.generateReport(run);
    const reportPath = await generator.saveReport(runId, html);

    res.json({ success: true, reportPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/metrics/summary
 * Get dashboard metrics summary
 */
app.get("/api/metrics/summary", async (_req, res) => {
  try {
    const runs = await runner.listRuns();

    const totalRuns = runs.length;
    const completed = runs.filter((r: any) => r.status === "completed").length;
    const failed = runs.filter((r: any) => r.status === "failed").length;

    // Mock metrics - would calculate from actual runs
    const metrics = {
      total_runs: totalRuns,
      passed: completed,
      failed: failed,
      avg_success_rate: totalRuns > 0 ? (completed / totalRuns) : 0,
      recent_runs: runs.slice(0, 5).map((r: any) => ({
        id: r.id,
        suite_name: r.suite_name,
        status: r.status,
        started_at: r.started_at
      }))
    };

    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compare
 * Compare two test runs (A/B test)
 */
app.post("/api/compare", async (req, res) => {
  try {
    const { runId1, runId2 } = req.body;

    if (!runId1 || !runId2) {
      return res.status(400).json({ error: "runId1 and runId2 are required" });
    }

    const [run1, run2] = await Promise.all([
      runner.loadRun(runId1),
      runner.loadRun(runId2)
    ]);

    if (!run1 || !run2) {
      return res.status(404).json({ error: "One or both runs not found" });
    }

    const { Comparator } = await import("../testing/metrics/comparator.js");
    const comparator = new Comparator();

    const comparison = comparator.compare(run1.metrics!, run2.metrics!);
    const markdown = comparator.generateMarkdownComparison(comparison);

    res.json({
      comparison,
      markdown
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve React app for all other routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../testing-ui/dist/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agent Testing Suite API server running on http://localhost:${PORT}`);
  console.log(`📊 Web UI available at http://localhost:${PORT}`);
  console.log(`📚 Workspace: ${DEFAULT_WORKSPACE}`);
});

export default app;
