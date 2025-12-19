import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAgentTurn } from "../../src/runtime/agentLoop.js";
import { ToolRegistry } from "../../src/runtime/tools/registry.js";
import { withToolContext } from "../../src/runtime/tools/context.js";

// Real-endpoint integration test. Only runs when REAL_ZAI_TEST=1 and ANTHROPIC_AUTH_TOKEN is set.
// Uses the zai profile against https://api.z.ai/api/anthropic and expects completion validation
// to block the first stop when the model promises work but hasn't run tools.

const shouldRun =
  process.env.REAL_ZAI_TEST === "1" && typeof process.env.ANTHROPIC_AUTH_TOKEN === "string" && process.env.ANTHROPIC_AUTH_TOKEN.trim().length > 0;

describe.skipIf(!shouldRun)("completion validation – Z.ai live endpoint", () => {
  let tmpHome: string;
  let workspaceDir: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "ffterm-zai-live-"));
    workspaceDir = path.join(tmpHome, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });

    process.env.HOME = tmpHome;
    process.env.USERPROFILE = tmpHome;
    process.env.FF_PROVIDER = "zai";
    process.env.ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.z.ai/api/anthropic";
    process.env.FF_MODEL = process.env.FF_MODEL || "claude-3-5-sonnet";
  });

  it("blocks stop with outstanding promises (live)", async () => {
    const registry = new ToolRegistry();
    const sessionId = `zai-live-${Date.now()}`;
    const abort = new AbortController();

    const chunks: any[] = [];

    await withToolContext({ sessionId, workspaceDir, repoRoot: process.cwd() }, async () => {
      // Safety timeout so we don't hang forever if the endpoint stalls
      const timer = setTimeout(() => abort.abort(), 45000);
      try {
        for await (const chunk of runAgentTurn({
          userInput: "Please read the README and then summarize it.",
          registry,
          sessionId,
          signal: abort.signal
        })) {
          chunks.push(chunk);
        }
      } finally {
        clearTimeout(timer);
      }
    });

    const completionStatuses = chunks.filter(
      (c) => c?.kind === "status" && typeof c.message === "string" && c.message.includes("completion_validation")
    );
    expect(completionStatuses.length).toBeGreaterThan(0);
  }, 60000);
});
