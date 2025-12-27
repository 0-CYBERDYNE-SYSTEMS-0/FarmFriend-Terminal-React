#!/usr/bin/env node

import { Command } from "commander";
import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { E2ERunner } from "../testing/e2eRunner.js";

// Default workspace directory (parent of agent-testing-suite)
const DEFAULT_WORKSPACE = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "..",
  ".."
);

const program = new Command();

program
  .name("ff-test")
  .description("AI Agent Testing Suite for ff-terminal")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize testing workspace")
  .action(async () => {
    const runner = new E2ERunner(DEFAULT_WORKSPACE);
    await runner.init();
    console.log("✓ Testing workspace initialized at:");
    console.log(`  ${DEFAULT_WORKSPACE}/tests/`);
  });

program
  .command("run <suite>")
  .description("Run a test suite")
  .option("-p, --profile <name>", "Profile to use", "env")
  .option("--session-prefix <prefix>", "Prefix for session IDs")
  .option("--dry-run", "Dry run (don't execute)")
  .option("--parallel <number>", "Run tests in parallel")
  .action(async (suiteName, options) => {
    const runner = new E2ERunner(DEFAULT_WORKSPACE);

    // Load test suite
    const suitePath = path.join(
      DEFAULT_WORKSPACE,
      "tests",
      "suites",
      "library",
      `${suiteName}.yaml`
    );

    const suiteContent = await fs.readFile(suitePath, "utf-8");
    const suite = yaml.parse(suiteContent) as any;

    console.log(`\n🧪 Running suite: ${suite.name}`);
    console.log(`   Description: ${suite.description}`);
    console.log(`   Scenarios: ${suite.scenarios.length}\n`);

    const runOptions = {
      profile: options.profile,
      session_prefix: options.sessionPrefix,
      dry_run: options.dryRun,
      concurrency: options.parallel ? parseInt(options.parallel) : undefined
    };

    try {
      const run = await runner.runSuite(suite, runOptions);

      console.log(`\n✓ Test run completed: ${run.id}`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Scenarios: ${run.results.length}`);
      console.log(`   Passed: ${run.results.filter((r: any) => r.status === "passed").length}`);
      console.log(`   Failed: ${run.results.filter((r: any) => r.status === "failed").length}`);

      if (run.metrics) {
        console.log(`\n📊 Metrics:`);
        console.log(`   Success rate: ${(run.metrics.success_rate * 100).toFixed(1)}%`);
        console.log(`   Completion rate: ${(run.metrics.completion_rate * 100).toFixed(1)}%`);
        console.log(`   Avg duration: ${(run.metrics.avg_duration_ms / 1000).toFixed(2)}s`);
        console.log(`   Total tool calls: ${run.metrics.total_tool_calls}`);
        console.log(`   Total errors: ${run.metrics.total_errors}`);
      }
    } catch (err: any) {
      console.error(`\n✗ Test run failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command("run-all")
  .description("Run all test suites")
  .option("-p, --profile <name>", "Profile to use", "env")
  .option("--parallel <number>", "Run suites in parallel", "3")
  .action(async (options) => {
    console.log("Running all test suites...");
    console.log("(Feature not yet implemented)");
  });

program
  .command("list")
  .description("List test runs")
  .action(async () => {
    const runner = new E2ERunner(DEFAULT_WORKSPACE);
    const runs = await runner.listRuns();

    console.log(`\n📋 Test Runs (${runs.length}):\n`);

    if (runs.length === 0) {
      console.log("  No test runs found.");
      console.log("  Run 'ff-test run <suite>' to create a test run.");
      return;
    }

    for (const run of runs) {
      const date = new Date(run.started_at).toLocaleString();
      console.log(`  ${run.id}`);
      console.log(`    Suite: ${run.suite_name}`);
      console.log(`    Status: ${run.status}`);
      console.log(`    Started: ${date}`);
      console.log();
    }
  });

program
  .command("report <run-id>")
  .description("Generate report for a test run")
  .action(async (runId) => {
    console.log(`Generating report for ${runId}...`);
    console.log("(Feature not yet implemented)");
  });

program
  .command("open <run-id>")
  .description("Open test run details (web UI)")
  .action(async (runId) => {
    console.log(`Opening ${runId} in web UI...`);
    console.log("(Feature not yet implemented)");
  });

program
  .command("compare <run1> <run2>")
  .description("Compare two test runs (A/B test)")
  .action(async (run1, run2) => {
    console.log(`Comparing ${run1} vs ${run2}...`);
    console.log("(Feature not yet implemented)");
  });

program
  .command("create-suite")
  .description("Create new test suite (interactive)")
  .action(async () => {
    console.log("Interactive suite creator coming soon...");
  });

program
  .command("serve")
  .description("Start web UI for testing suite")
  .option("-p, --port <number>", "Port to serve on", "3000")
  .action(async (options) => {
    console.log(`Starting web UI on port ${options.port}...`);
    console.log("(Feature not yet implemented - web UI in development)");
  });

// Parse and execute
program.parse(process.argv);
