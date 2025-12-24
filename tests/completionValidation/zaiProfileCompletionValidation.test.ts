import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from "undici";
import { ToolRegistry } from "../../src/runtime/tools/registry.js";
import { runAgentTurn } from "../../src/runtime/agentLoop.js";
import { withToolContext } from "../../src/runtime/tools/context.js";

// This test suite exercises the completion validation flow using the Z.ai
// Anthropic-compatible profile. We mock the HTTPS endpoint so we can verify
// whether the agent re-enters the loop when it makes unfulfilled commitments.

describe("completion validation – Z.ai anthropic profile", () => {
  const envBackup: NodeJS.ProcessEnv = { ...process.env };
  let originalDispatcher: Dispatcher;
  let mockAgent: MockAgent | null = null;
  let tmpHome: string;
  let workspaceDir: string;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "ffterm-zai-"));
    workspaceDir = path.join(tmpHome, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });

    process.env.HOME = tmpHome;
    process.env.USERPROFILE = tmpHome;
    process.env.FF_PROVIDER = "zai";
    process.env.ANTHROPIC_AUTH_TOKEN = "test-token";
    process.env.ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic";
    process.env.FF_MODEL = "claude-3-5-sonnet";

    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    if (mockAgent) {
      await mockAgent.close();
      mockAgent = null;
    }
    setGlobalDispatcher(originalDispatcher);
    Object.assign(process.env, envBackup);
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it.skip("blocks stop when the model promises work but executes no tools", async () => {
    // TODO: Re-enable when promise extraction is wired up in agentLoop
    // The extractPromises/unfulfilledHighConfidence logic exists but isn't called
    if (!mockAgent) throw new Error("mockAgent not initialized");

    const zai = mockAgent.get("https://api.z.ai");

    // zaiProvider uses OpenAI-compatible endpoint at /api/coding/paas/v4/chat/completions
    const sse = [
      'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{"content":"I will read the config file next and then summarize."},"finish_reason":null}]}',
      '',
      'data: {"id":"chatcmpl-test","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
      '',
      'data: [DONE]',
      ''
    ].join("\n");

    zai
      .intercept({ path: "/api/coding/paas/v4/chat/completions", method: "POST" })
      .reply(200, sse, { headers: { "content-type": "text/event-stream" } })
      .persist();

    const registry = new ToolRegistry();
    const sessionId = "zai-completion-validation";
    const abort = new AbortController();

    const chunks: any[] = [];

    await withToolContext({ sessionId, workspaceDir, repoRoot: process.cwd() }, async () => {
      for await (const chunk of runAgentTurn({
        userInput: "please review the config and summarize",
        registry,
        sessionId,
        signal: abort.signal
      })) {
        chunks.push(chunk);
      }
    });

    // Long-horizon autonomy should inject a completion-validation nudge and re-enter the loop,
    // which would consume both /v1/messages intercepts. Today it stops after one pass.
    expect(() => mockAgent!.assertNoPendingInterceptors()).not.toThrow();

    const completionStatuses = chunks.filter(
      (c) => c?.kind === "status" && typeof c.message === "string" && c.message.includes("completion_validation")
    );
    expect(completionStatuses.length).toBeGreaterThan(0);
  });
});
