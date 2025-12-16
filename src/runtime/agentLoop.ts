import { ToolRegistry } from "./tools/registry.js";
import { executeToolCalls } from "./tools/executeTools.js";
import { StreamChunk } from "./streamProtocol.js";
import { buildSystemPrompt } from "./prompts/systemPrompt.js";
import { createSession, loadSession, saveSession } from "./session/sessionStore.js";
import { findRepoRoot } from "./config/repoRoot.js";
import { resolveConfig } from "./config/loadConfig.js";
import { loadToolSchemas } from "./tools/toolSchemas.js";
import { createProvider } from "./providers/factory.js";
import { OpenAIMessage } from "./providers/types.js";
import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "./tools/context.js";
import {
  ExecutionRecord,
  extractPromises,
  markFulfilled,
  Promise as CompletionPromise
} from "./hooks/completionValidator.js";
import { listSkillStubs } from "./tools/implementations/skills.js";
import { HookRegistry } from "./hooks/registry.js";
import { createCompletionValidationStopHook } from "./hooks/builtin/completionValidationStopHook.js";

function redactSecrets(value: unknown): unknown {
  const KEY_RE = /(api_?key|token|password|secret|authorization)/i;
  if (value == null) return value;
  if (typeof value === "string") {
    // Don't try to be clever; if it looks like a token, redact.
    if (value.length >= 16) return "[REDACTED]";
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as any)) {
      out[k] = KEY_RE.test(k) ? "[REDACTED]" : redactSecrets(v);
    }
    return out;
  }
  return String(value);
}

export async function* runAgentTurn(params: {
  userInput: string;
  registry: ToolRegistry;
  sessionId: string;
  repoRoot?: string;
  modelOverride?: string;
  signal: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const { userInput, registry, signal, sessionId } = params;
  const repoRoot = params.repoRoot ?? findRepoRoot();
  const workingDir = process.cwd();

  yield { kind: "status", message: `Starting turn...` };

  const session = loadSession(sessionId) ?? createSession(sessionId);
  session.conversation.push({ role: "user", content: userInput, created_at: new Date().toISOString() });
  saveSession(session);

  const cfg = resolveConfig({ repoRoot });

  const toolCtx = getToolContext();
  const workspaceDirForSummary = toolCtx?.workspaceDir;
  const sessionSummary = (() => {
    if (!workspaceDirForSummary) return undefined;
    const p = path.join(workspaceDirForSummary, "session_summary.md");
    try {
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return undefined;
      const raw = fs.readFileSync(p, "utf8");
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      const MAX = 8000;
      return trimmed.length > MAX ? trimmed.slice(0, MAX) + "\n\n...(truncated)" : trimmed;
    } catch {
      return undefined;
    }
  })();

  const skillSections = (() => {
    // Keep this compact to avoid prompt bloat: only include top matches for the current user input.
    const stubs = listSkillStubs({ workspaceDir: toolCtx?.workspaceDir, repoRoot });
    if (!stubs.length) return "";

    const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "you", "your", "are", "can", "will", "how", "what"]);
    const tokens = userInput
      .toLowerCase()
      .split(/[^a-z0-9_-]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !STOP.has(t));
    const tokenSet = new Set(tokens);
    if (!tokenSet.size) return "";

    const score = (s: { slug: string; name?: string; summary?: string; description?: string }) => {
      const hay = `${s.slug} ${s.name || ""} ${s.summary || ""} ${s.description || ""}`.toLowerCase();
      let n = 0;
      for (const t of tokenSet) if (hay.includes(t)) n += 1;
      return n;
    };

    const ranked = stubs
      .map((s) => ({ s, n: score(s) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
      .map(({ s }) => {
        const desc = (s.summary || s.description || "").trim().replace(/\s+/g, " ");
        const tail = desc ? ` — ${desc}` : "";
        return `- \`${s.slug}\`${tail} _(source: ${s.source}, kind: ${s.kind})_`;
      });

    if (!ranked.length) return "";
    return `\n## Relevant Skills\nIf helpful, call \`skill_loader\` with \`skill_slug\` to load one of these skills:\n${ranked.join("\n")}\n`;
  })();

  const systemPrompt = buildSystemPrompt({
    variant: (cfg.system_message_variant as any) ?? "a",
    repoRoot,
    workingDir,
    parallelMode: (cfg.parallel_mode as any) ?? true,
    skillSections,
    sessionSummary,
    availableToolNames: registry.listNames()
  });

  const { provider, model } = createProvider({ repoRoot, modelOverride: params.modelOverride });
  // Only advertise tools we can actually execute (prevents the model from calling unimplemented tools).
  const tools = loadToolSchemas(repoRoot).filter((t) => registry.has(t.function.name));

  const messages: OpenAIMessage[] = [{ role: "system", content: systemPrompt }];
  for (const m of session.conversation.slice(-40)) {
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
  }

  const maxIterations = Number((cfg as any).max_iterations || 8);
  let finalAssistantContent = "";
  const toolLimitTotal = Number((cfg as any).tool_limit_total ?? 5000);
  let toolCallsExecuted = 0;

  const hooksEnabled = (cfg as any).hooks_enabled !== false;
  const hooksToolLogging = (cfg as any).hooks_tool_logging !== false;
  const hooksLogDirectory = String((cfg as any).hooks_log_directory || "logs/hooks");
  const completionValidationEnabled =
    hooksEnabled && (cfg as any).hooks_completion_validation !== false && String(process.env.FF_DISABLE_COMPLETION_VALIDATION || "") !== "1";
  const completionValidationMaxAttempts = Number((cfg as any).hooks_completion_validation_max_attempts ?? 2);
  const toolsLogPath =
    toolCtx?.workspaceDir && hooksEnabled && hooksToolLogging
      ? path.join(toolCtx.workspaceDir, hooksLogDirectory, `tools_${sessionId}.jsonl`)
      : null;

  const logToolEvent = (ev: Record<string, unknown>) => {
    if (!toolsLogPath) return;
    try {
      fs.mkdirSync(path.dirname(toolsLogPath), { recursive: true });
      fs.appendFileSync(toolsLogPath, JSON.stringify(ev) + "\n", "utf8");
    } catch {
      // ignore logging failures
    }
  };

  const promisesThisTurn: CompletionPromise[] = [];
  const executionsThisTurn: ExecutionRecord[] = [];
  const hookRegistry = new HookRegistry();

  if (completionValidationEnabled) {
    hookRegistry.register(
      createCompletionValidationStopHook({
        enabled: true,
        maxAttempts: completionValidationMaxAttempts,
        getPromises: () => promisesThisTurn,
        getExecutions: () => executionsThisTurn
      })
    );
  }

  const mergePromises = (incoming: CompletionPromise[]) => {
    for (const p of incoming) {
      const key = `${p.promiseType}::${p.extractedAction.toLowerCase()}::${p.extractedTarget.toLowerCase()}`;
      const idx = promisesThisTurn.findIndex(
        (q) =>
          `${q.promiseType}::${q.extractedAction.toLowerCase()}::${q.extractedTarget.toLowerCase()}` === key
      );
      if (idx === -1) promisesThisTurn.push(p);
      else if (p.confidence > promisesThisTurn[idx]!.confidence) promisesThisTurn[idx] = p;
    }
  };

  for (let i = 0; i < maxIterations; i += 1) {
    yield { kind: "status", message: `Provider: ${provider.name} | Model: ${model}` };

    let toolCalls: { id: string; name: string; arguments: unknown }[] = [];
    let assistantContent = "";
    let emittedAnyContent = false;
    let emittedAnyThinking = false;

    for await (const ev of provider.streamChat({
      model,
      messages,
      tools,
      temperature: Number((cfg as any).temperature ?? 0.7),
      maxTokens: Number((cfg as any).max_tokens ?? 12000),
      signal
    })) {
      if (ev.type === "content") {
        // Hide stop token from UI if it appears.
        const cleaned = ev.delta.replace("[AWAITING_INPUT]", "");
        if (cleaned) {
          emittedAnyContent = true;
          yield { kind: "content", delta: cleaned };
        }
      } else if (ev.type === "thinking") {
        emittedAnyThinking = true;
        yield { kind: "thinking", delta: ev.delta };
      } else if (ev.type === "error") {
        yield { kind: "error", message: ev.message };
      } else if (ev.type === "final") {
        assistantContent = ev.content.replace("[AWAITING_INPUT]", "");
        toolCalls = ev.toolCalls;
      }
    }

    // Some gateways do not stream deltas; ensure final content is displayed at least once.
    if (!emittedAnyContent && assistantContent) {
      yield { kind: "content", delta: assistantContent };
    }

    finalAssistantContent = assistantContent;

    if (completionValidationEnabled) {
      const extracted = extractPromises(assistantContent);
      if (extracted.length) {
        mergePromises(extracted);
        markFulfilled(promisesThisTurn, executionsThisTurn);
      }
    }

    // Record assistant content (even if empty; tool-calling turns often have little text).
    session.conversation.push({
      role: "assistant",
      content: assistantContent,
      created_at: new Date().toISOString()
    });
    saveSession(session);

    messages.push({ role: "assistant", content: assistantContent });

    if (!toolCalls.length) {
      const stop = await hookRegistry.runAgentStop({
        sessionId,
        repoRoot,
        workspaceDir: toolCtx?.workspaceDir,
        userInput,
        assistantContent,
        iteration: i,
        maxIterations,
        toolExecutionsCount: executionsThisTurn.length
      });
      if (stop.action === "block" && i < maxIterations - 1) {
        if (stop.statusMessage) yield { kind: "status", message: stop.statusMessage };
        messages.push({ role: "system", content: stop.systemPrompt });
        continue;
      }
      if (stop.action === "need_user" && stop.statusMessage) {
        yield { kind: "status", message: stop.statusMessage };
      }
      break;
    }
    if (toolCallsExecuted + toolCalls.length > toolLimitTotal) {
      yield { kind: "error", message: `Tool call limit exceeded (${toolLimitTotal}). Refusing to execute more tools.` };
      break;
    }

    // Execute tool calls in parallel (Python parity).
    // Pre-tool hooks can block or modify calls; run them before executing anything.
    const blockedResults: Array<{ id: string; name: string; ok: false; output: string }> = [];
    const callsToRun: typeof toolCalls = [];
    const callById = new Map<string, typeof toolCalls[number]>();

    for (const tc of toolCalls) {
      const pre = await hookRegistry.runPreTool({
        sessionId,
        repoRoot,
        workspaceDir: toolCtx?.workspaceDir,
        call: tc as any
      });
      if (pre.action === "block") {
        callById.set(tc.id, tc);
        blockedResults.push({
          id: tc.id,
          name: tc.name,
          ok: false,
          output: `Blocked by pre_tool hook: ${pre.reason}`
        });
        continue;
      }
      if (pre.action === "modify") {
        const modified = { ...tc, arguments: pre.modifiedArguments };
        callById.set(modified.id, modified);
        callsToRun.push(modified);
        continue;
      }
      callById.set(tc.id, tc);
      callsToRun.push(tc);
    }

    for (const tc of callsToRun) yield { kind: "status", message: `tool_start:${tc.name}` };

    const durationById = new Map<string, number>();
    const resultsRan = await executeToolCalls(registry, callsToRun as any, {
      signal,
      hooks: {
        onStart: (call) => {
          logToolEvent({
            event: "tool_start",
            ts: new Date().toISOString(),
            session_id: sessionId,
            tool_call_id: call.id,
            tool_name: call.name,
            arguments: redactSecrets(call.arguments)
          });
        },
        onFinish: (call, result, durationMs) => {
          durationById.set(call.id, durationMs);
          logToolEvent({
            event: "tool_end",
            ts: new Date().toISOString(),
            session_id: sessionId,
            tool_call_id: call.id,
            tool_name: call.name,
            ok: result.ok,
            duration_ms: durationMs,
            output_preview: String(result.output || "").slice(0, 800)
          });
        }
      }
    });
    const results = [...blockedResults, ...resultsRan] as Array<{ id: string; name: string; ok: boolean; output: string }>;
    toolCallsExecuted += callsToRun.length;

    if (completionValidationEnabled) {
      for (const r of results) {
        executionsThisTurn.push({
          id: r.id,
          toolName: r.name,
          parameters: (toolCalls.find((tc) => tc.id === r.id) as any)?.arguments,
          success: r.ok,
          resultSummary: String(r.output || "").slice(0, 200)
        });
      }
      markFulfilled(promisesThisTurn, executionsThisTurn);
    }

    for (const r of results) {
      yield { kind: "status", message: `tool_end:${r.name}` };

      const originalCall = callById.get(r.id);
      const durationMs = durationById.get(r.id) ?? 0;
      if (originalCall) {
        await hookRegistry.runPostTool({
          sessionId,
          repoRoot,
          workspaceDir: toolCtx?.workspaceDir,
          call: originalCall as any,
          ok: r.ok,
          output: r.output,
          durationMs
        });
        if (!r.ok) {
          await hookRegistry.runToolError({
            sessionId,
            repoRoot,
            workspaceDir: toolCtx?.workspaceDir,
            call: originalCall as any,
            error: r.output
          });
        }
      }

      if (r.name === "quick_update") {
        try {
          const obj = JSON.parse(r.output) as any;
          const msg = typeof obj?.message === "string" ? obj.message : r.output;
          if (msg) yield { kind: "status", message: `update:${String(msg).trim()}` };
        } catch {
          if (r.output.trim()) yield { kind: "status", message: `update:${r.output.trim()}` };
        }
      }
      // Feed tool output back into the model context.
      messages.push({
        role: "tool",
        tool_call_id: r.id,
        name: r.name,
        content: r.output
      });
      session.conversation.push({
        role: "assistant",
        content: `[tool:${r.name}] ${r.ok ? "ok" : "error"}\n${r.output}`,
        created_at: new Date().toISOString()
      });
      saveSession(session);
    }
  }

  // If the model already ended with stop token, we still end the turn explicitly here.
  if (finalAssistantContent.includes("[AWAITING_INPUT]")) {
    // No-op; token already stripped from output.
  }

  yield { kind: "task_completed" };
}
