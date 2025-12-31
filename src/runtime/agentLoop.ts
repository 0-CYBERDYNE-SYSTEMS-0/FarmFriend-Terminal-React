import { ToolRegistry } from "./tools/registry.js";
import { executeToolCalls } from "./tools/executeTools.js";
import { StreamChunk } from "./streamProtocol.js";
import { buildSystemPrompt, buildCacheableSystemPrompt } from "./prompts/systemPrompt.js";
import { createSession, loadSession, saveSession } from "./session/sessionStore.js";
import { findRepoRoot } from "./config/repoRoot.js";
import { resolveConfig } from "./config/loadConfig.js";
import { loadToolSchemas, validateToolArgs } from "./tools/toolSchemas.js";
import { createProvider } from "./providers/factory.js";
import { OpenAIMessage } from "./providers/types.js";
import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "./tools/context.js";
import { listSkillStubs } from "./tools/implementations/skills.js";
import { HookRegistry } from "./hooks/registry.js";
import { createSkillAllowedToolsHooks } from "./hooks/builtin/skillAllowedToolsHook.js";
import { StructuredLogger, parseLogLevel, redactValue, truncateForLog } from "./logging/structuredLogger.js";
import { newId } from "../shared/ids.js";
import { resolveWorkspaceDir } from "./config/paths.js";
import { extractPlansFromContent, updatePlanStepStatus as updatePlanStepStatusInPlan, formatPlanForPrompt, isPlanComplete, trackStepAttempt } from "./planning/planExtractor.js";
import { loadPlanStore, savePlanStore, getActivePlan, addPlan } from "./planning/planStore.js";
import { createPlanValidationStopHook } from "./hooks/builtin/planValidationStopHook.js";
import { createTodoStopHook } from "./hooks/builtin/todoStopHook.js";
import type { ExecutionPlan, PlanStore } from "./planning/types.js";

function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.7) {
    return truncated.slice(0, lastSpace) + "...";
  }
  return truncated + "...";
}

function getToolContextMessage(toolName: string, args: unknown): string {
  const toolMessages: Record<string, (args: any) => string> = {
    // File operations
    read_file: (a) => `📖 Reading ${a?.file_path ? path.basename(String(a.file_path)) : "file"}...`,
    write_file: (a) => `✏️  Writing ${a?.file_path ? path.basename(String(a.file_path)) : "file"}...`,
    edit_file: (a) => `✏️  Editing ${a?.file_path ? path.basename(String(a.file_path)) : "file"}...`,
    multi_edit_file: (a) => `✏️  Editing ${a?.file_path ? path.basename(String(a.file_path)) : "file"}...`,
    glob: (a) => `🔍 Finding ${smartTruncate(String(a?.pattern || "files"), 60)}...`,
    grep: (a) => `🔍 Searching for "${smartTruncate(String(a?.pattern || ""), 60)}"...`,

    // Execution
    run_command: (a) => `🔧 Running ${smartTruncate(String(a?.command || "command"), 70)}...`,

    // Web & search
    tavily_search: (a) => `🔍 Searching the web for ${smartTruncate(String(a?.query || ""), 80)}...`,
    tavily_extract: (a) => `🌐 Extracting from ${a?.url ? new URL(String(a.url)).hostname : "URL"}...`,
    perplexity_search: (a) => `🔍 Searching for ${smartTruncate(String(a?.query || ""), 80)}...`,
    browse_web: (a) => `🌐 Browsing ${a?.url ? new URL(String(a.url)).hostname : "URL"}...`,

    // Code & analysis
    search_code: (a) => `🔎 Searching code for "${smartTruncate(String(a?.query || ""), 60)}"...`,
    semantic_search: (a) => `🔎 Semantic search for "${smartTruncate(String(a?.query || ""), 60)}"...`,
    ast_grep: (a) => `🔎 AST search for pattern...`,
    analyze_data: (a) => `📊 Analyzing data...`,

    // Images & media
    generate_image_gemini: (a) => `🎨 Generating image: ${smartTruncate(String(a?.prompt || ""), 70)}...`,
    generate_image_openai: (a) => `🎨 Generating image: ${smartTruncate(String(a?.prompt || ""), 70)}...`,
    analyze_image_gemini: (a) => `🖼️  Analyzing image...`,
    analyze_image_openai: (a) => `🖼️  Analyzing image...`,

    // Task management
    manage_task: (a) => `📝 Managing tasks...`,
    schedule_task: (a) => `⏰ Scheduling task...`,

    // Skills
    skill_apply: (a) => `🎯 Applying ${a?.skill_name || "skill"}...`,
    skill_sequencer: (a) => `🔄 Sequencing skills...`,

    // Notebook
    notebook_edit: (a) => `📓 Editing notebook cell...`,

    // Thinking & updates
    think: (a) => `💭 Thinking...`,
    quick_update: (a) => `💬 ${smartTruncate(String(a?.message || "Updating"), 70)}...`,
    session_summary: (a) => `📋 Generating summary...`
  };

  const formatter = toolMessages[toolName];
  if (formatter) {
    try {
      return formatter(args);
    } catch (err) {
      if (process.env.FF_DEBUG === "1") {
        console.debug(`[agentLoop] Tool context formatter failed for ${toolName}:`, err);
      }
      return `⚙️  ${toolName}...`;
    }
  }
  return `⚙️  ${toolName}...`;
}

function getToolPreview(toolName: string, output: string, ok: boolean): string {
  if (!ok || !output) return "";

  try {
    switch (toolName) {
      case "tavily_search":
      case "perplexity_search": {
        const data = JSON.parse(output);
        const results = data?.results || [];
        if (results.length > 0) {
          const sources = results
            .slice(0, 3)
            .map((r: any) => {
              try {
                const hostname = new URL(r.url).hostname.replace("www.", "");
                return hostname;
              } catch {
                return "source";
              }
            })
            .join(", ");
          return `Found ${results.length} article${results.length === 1 ? "" : "s"}${sources ? " from " + sources : ""}`;
        }
        return `Found ${results.length} results`;
      }

      case "read_file": {
        const lines = output.split("\n").length;
        const chars = output.length;
        if (lines > 100) return `Read file (${lines} lines)`;
        if (chars > 1000) return `Read file (${(chars / 1000).toFixed(1)}k chars)`;
        return `Read file (${lines} lines)`;
      }

      case "edit_file":
      case "multi_edit_file": {
        const match = output.match(/(\d+)\s+line/i);
        if (match) return `Modified ${match[1]} line${match[1] === "1" ? "" : "s"}`;
        return "File edited";
      }

      case "write_file": {
        const lines = output.split("\n").length;
        return `Wrote file (${lines} lines)`;
      }

      case "run_command": {
        const firstLine = output.split("\n")[0]?.trim();
        if (firstLine && firstLine.length < 60) return firstLine;
        if (output.includes("exit code 0") || output.toLowerCase().includes("success")) {
          return "Command completed successfully";
        }
        return "Command executed";
      }

      case "glob": {
        const match = output.match(/Found (\d+)/);
        if (match) return `Found ${match[1]} file${match[1] === "1" ? "" : "s"}`;
        return "Files found";
      }

      case "grep":
      case "search_code": {
        const match = output.match(/(\d+)\s+match/i);
        if (match) return `Found ${match[1]} match${match[1] === "1" ? "" : "es"}`;
        const lines = output.split("\n").filter(l => l.trim()).length;
        if (lines > 0) return `Found ${lines} match${lines === 1 ? "" : "es"}`;
        return "Search complete";
      }

      case "browse_web":
      case "tavily_extract": {
        const wordCount = output.split(/\s+/).length;
        if (wordCount > 500) return `Extracted ${(wordCount / 1000).toFixed(1)}k words`;
        return `Extracted ${wordCount} words`;
      }

      default: {
        if (output.startsWith("{") || output.startsWith("[")) {
          return "";
        }
        const firstLine = output.split("\n")[0]?.trim();
        if (firstLine && firstLine.length <= 60) return firstLine;
        if (firstLine) return firstLine.slice(0, 60) + "...";
        return "";
      }
    }
  } catch (err) {
    if (process.env.FF_DEBUG === "1") {
      console.debug(`[agentLoop] Tool preview extraction failed for ${toolName}:`, err);
    }
    return "";
  }
}

export async function* runAgentTurn(params: {
  userInput: string | any[];
  registry: ToolRegistry;
  sessionId: string;
  repoRoot?: string;
  modelOverride?: string;
  signal: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const { userInput, registry, signal, sessionId } = params;
  const repoRoot = params.repoRoot ?? findRepoRoot();
  const workingDir = process.cwd();
  const runStartedAt = Date.now();
  const turnId = newId("turn");

  yield { kind: "status", message: `Starting turn...` };

  const toolCtx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(toolCtx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const sessionDir = path.join(workspaceDir, "sessions");

  const session = loadSession(sessionId, sessionDir) ?? createSession(sessionId);

  // Convert content blocks to string for session storage
  const contentForHistory = typeof userInput === 'string'
    ? userInput
    : userInput.map(block =>
        block.type === 'text' ? block.text : `[Image]`
      ).join('\n');

  session.conversation.push({ role: "user", content: contentForHistory, created_at: new Date().toISOString() });
  saveSession(session, sessionDir);

  const cfg = resolveConfig({ repoRoot });
  const logLevel = parseLogLevel((cfg as any).log_level);
  const logMaxBytes = Number((cfg as any).log_max_bytes ?? 5 * 1024 * 1024);
  const logRetention = Number((cfg as any).log_retention ?? 3);
  const logBaseDir = workspaceDir;
  const sessionLogPath = path.join(logBaseDir, "logs", "sessions", `${sessionId}.jsonl`);
  const logger = new StructuredLogger({ filePath: sessionLogPath, level: logLevel, maxBytes: logMaxBytes, retention: logRetention });
  const workspaceDirForSummary = workspaceDir;
  const sessionSummary = (() => {
    if (!workspaceDirForSummary) return undefined;
    const p = path.join(workspaceDirForSummary, "memory_core", "session_summary.md");
    try {
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return undefined;
      const raw = fs.readFileSync(p, "utf8");
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      const MAX = 8000;
      return trimmed.length > MAX ? trimmed.slice(0, MAX) + "\n\n...(truncated)" : trimmed;
    } catch (err) {
      // Session summary loading failed - log but continue without summary
      logger.log("warn", "session_summary_load_failed", {
        path: p,
        error: err instanceof Error ? err.message : String(err)
      });
      return undefined;
    }
  })();

  const skillSections = (() => {
    // Keep this compact to avoid prompt bloat: only include top matches for the current user input.
    const stubs = listSkillStubs({ workspaceDir, repoRoot });
    if (!stubs.length) return "";

    // Extract text from userInput (handle both string and content blocks)
    const inputText = typeof userInput === 'string'
      ? userInput
      : userInput.map((block: any) => block.type === 'text' ? block.text : '').join(' ');

    const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "you", "your", "are", "can", "will", "how", "what"]);
    const tokens = inputText
      .toLowerCase()
      .split(/[^a-z0-9_-]+/g)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length >= 3 && !STOP.has(t));
    const tokenSet = new Set(tokens);
    if (!tokenSet.size) return "";

    const score = (s: {
      slug: string;
      name?: string;
      summary?: string;
      description?: string;
      tags?: string[];
      triggers?: string[];
      priority?: string;
    }) => {
      const slugName = `${s.slug} ${s.name || ""}`.toLowerCase();
      const summaryDesc = `${s.summary || ""} ${s.description || ""}`.toLowerCase();
      const tags = (s.tags || []).join(" ").toLowerCase();
      const triggers = (s.triggers || []).join(" ").toLowerCase();
      let n = 0;
      for (const t of tokenSet) {
        if (triggers.includes(t)) n += 3;
        if (tags.includes(t)) n += 2;
        if (slugName.includes(t)) n += 2;
        if (summaryDesc.includes(t)) n += 1;
      }
      const pr = (s.priority || "").toLowerCase();
      if (pr === "high") n += 2;
      if (pr === "medium") n += 1;
      const prNum = Number(pr);
      if (!Number.isNaN(prNum)) n += Math.max(0, Math.min(5, prNum));
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

  const planValidationEnabled = (cfg as any).plan_validation_enabled ?? false;
  let activePlan: ExecutionPlan | null = null;
  if (planValidationEnabled) {
    const planStore = loadPlanStore({ workspaceDir, sessionId });
    activePlan = getActivePlan(planStore);
  }

  const planContext = activePlan ? formatPlanForPrompt(activePlan) : "";

  const enablePromptCaching = (cfg as any).enable_prompt_caching !== false;
  const systemPromptBlocks = enablePromptCaching
    ? buildCacheableSystemPrompt({
        variant: (cfg.system_message_variant as any) ?? "a",
        repoRoot,
        workingDir,
        parallelMode: (cfg.parallel_mode as any) ?? true,
        skillSections,
        sessionSummary,
        planContext,
        availableToolNames: registry.listNames(),
        enableCaching: true
      })
    : [{ type: "text" as const, text: buildSystemPrompt({
        variant: (cfg.system_message_variant as any) ?? "a",
        repoRoot,
        workingDir,
        parallelMode: (cfg.parallel_mode as any) ?? true,
        skillSections,
        sessionSummary,
        planContext,
        availableToolNames: registry.listNames()
      }) }];

  const { provider, model } = createProvider({ repoRoot, modelOverride: params.modelOverride });
  // Load schemas with strict mode for structured outputs (guarantees valid tool calls)
  const allSchemas = loadToolSchemas(repoRoot, { strict: true });
  // Only advertise tools we can actually execute (prevents the model from calling unimplemented tools).
  const tools = allSchemas.filter((t) => registry.has(t.function.name));
  const messages: OpenAIMessage[] = [{ role: "system", content: systemPromptBlocks }];
  for (const m of session.conversation.slice(-40)) {
    if (m.role === "user") {
      // For the current turn's user message, use content blocks if available
      if (m === session.conversation[session.conversation.length - 1] && Array.isArray(userInput)) {
        messages.push({ role: "user", content: userInput });
      } else {
        messages.push({ role: "user", content: m.content });
      }
    } else {
      messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
    }
  }

  // Allow very long runs; default 500, overridable via config/env.
  const maxIterations = Number((process.env.FF_MAX_ITERATIONS || (cfg as any).max_iterations || 500));
  let finalAssistantContent = "";
  const toolLimitTotal = Number((cfg as any).tool_limit_total ?? 5000);
  let toolCallsExecuted = 0;

  const hooksEnabled = (cfg as any).hooks_enabled !== false;
  const hooksToolLogging = (cfg as any).hooks_tool_logging !== false;
  const hooksLogDirectory = String((cfg as any).hooks_log_directory || "logs/hooks");
  logger.log("info", "turn_start", {
    session_id: sessionId,
    turn_id: turnId,
    user_input_preview: smartTruncate(contentForHistory, 400),
    provider: provider.name,
    model,
    workspace_dir: workspaceDir,
    repo_root: repoRoot,
    max_iterations: maxIterations,
    tool_limit_total: toolLimitTotal,
    hooks_enabled: hooksEnabled,
    hooks_tool_logging: hooksToolLogging
  });
  const toolsLogPath =
    hooksEnabled && hooksToolLogging
      ? path.join(workspaceDir, hooksLogDirectory, `tools_${sessionId}.jsonl`)
      : null;

  const logToolEvent = (ev: Record<string, unknown>) => {
    const payload = { ...ev, session_id: sessionId, turn_id: turnId };
    // Structured logger (central, rotated)
    try {
      logger.log("info", String(ev.event || "tool_event"), {
        ...payload,
        arguments: ev.arguments ? redactValue(ev.arguments) : undefined,
        output_preview: ev.output_preview ? truncateForLog(String(ev.output_preview)) : undefined
      });
    } catch (err) {
      // Intentionally ignore structured logger errors to avoid blocking agent loops
      if (process.env.FF_DEBUG === "1") {
        console.debug(`[agentLoop] Structured logger failed:`, err);
      }
    }

    // Legacy per-session tool log file
    if (!toolsLogPath) return;
    try {
      fs.mkdirSync(path.dirname(toolsLogPath), { recursive: true });
      fs.appendFileSync(toolsLogPath, JSON.stringify(payload) + "\n", "utf8");
    } catch {
      // ignore logging failures
    }
  };

  const hookRegistry = new HookRegistry();
  let iterationCount = 0;
  let consecutiveNoAction = 0;
  const forceToolCalls = (cfg as any).force_tool_calls ?? true;

  // Circuit breaker: Track consecutive failures per tool to prevent infinite loops
  const consecutiveToolFailures = new Map<string, number>();
  const CIRCUIT_BREAKER_THRESHOLD = 3; // Stop after 3 consecutive failures of same tool

  let planStore: PlanStore | null = null;
  if (planValidationEnabled) {
    planStore = loadPlanStore({ workspaceDir, sessionId });
  }

  const stepAttempts = new Map<string, { attempts: number; lastError?: string }>();

  // TodoWrite reminder tracking
  let iterationsSinceLastTodoUpdate = 0;
  let hasTodoList = false;

  // Thought loop detection tracking
  const recentThinkingPatterns: string[] = [];

  if (planValidationEnabled) {
    hookRegistry.register(
      createPlanValidationStopHook({
        enabled: true,
        maxBlockAttempts: 3,
        workspaceDir
      })
    );
  } else {
    // Register todo-based stop hook when plan validation is disabled
    // Prevents stopping when agent has incomplete tasks
    // This is the KEY to long-horizon autonomy (matches OpenHands Planner Agent pattern)
    hookRegistry.register(
      createTodoStopHook({
        enabled: false,
        workspaceDir
      })
    );
  }

  if (String(process.env.FF_SKILLS_ENFORCE_ALLOWED_TOOLS || "") === "1") {
    for (const hook of createSkillAllowedToolsHooks()) hookRegistry.register(hook);
  }

  yield { kind: "status", message: `Provider: ${provider.name} | Model: ${model}` };

  try {
    for (let i = 0; i < maxIterations; i += 1) {
      iterationCount = i + 1;
      logger.log("debug", "iteration_start", { session_id: sessionId, turn_id: turnId, iteration: i + 1 });

      let toolCalls: { id: string; name: string; arguments: unknown }[] = [];
      let assistantContent = "";
      let emittedAnyContent = false;
      let emittedAnyThinking = false;

      const shouldForceTools = forceToolCalls && consecutiveNoAction >= 2;

      const forceToolChoice = shouldForceTools && tools?.length ? "any" : undefined;

      for await (const ev of provider.streamChat({
        model,
        messages,
        tools,
        tool_choice: forceToolChoice,
        temperature: Number((cfg as any).temperature ?? 0.7),
        maxTokens: Number((cfg as any).max_tokens ?? 12000),
        signal,
        sessionId
      })) {
        if (ev.type === "content") {
          // Hide stop token from UI if it appears.
          const cleaned = ev.delta.replace("[AWAITING_INPUT]", "");
          if (cleaned) {
            emittedAnyContent = true;
            yield { kind: "content", delta: cleaned };
            logger.log("debug", "assistant_delta", {
              session_id: sessionId,
              turn_id: turnId,
              iteration: i + 1,
              delta_preview: truncateForLog(cleaned, 400)
            });
          }
        } else if (ev.type === "thinking") {
          emittedAnyThinking = true;
          yield { kind: "thinking", delta: ev.delta };
        } else if (ev.type === "status") {
          yield { kind: "status", message: ev.message };
          logger.log("info", "provider_status", {
            session_id: sessionId,
            turn_id: turnId,
            iteration: i + 1,
            message: ev.message
          });
        } else if (ev.type === "error") {
          yield { kind: "error", message: ev.message };
          logger.log("error", "provider_error", {
            session_id: sessionId,
            turn_id: turnId,
            iteration: i + 1,
            message: ev.message
          });
          // Provider error is terminal - stop processing this iteration
          break;
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
    logger.log("info", "assistant_message", {
      session_id: sessionId,
      turn_id: turnId,
      iteration: i + 1,
      content_preview: smartTruncate(assistantContent, 800),
      tool_calls_count: toolCalls.length
    });

    // Thought loop detection: Check if agent is repeating same thinking pattern
    if (assistantContent && assistantContent.length > 10) {
      const normalized = assistantContent.toLowerCase().slice(0, 100);
      recentThinkingPatterns.push(normalized);
      if (recentThinkingPatterns.length > 10) recentThinkingPatterns.shift();

      // Check for loops (same pattern 5+ times in last 10 iterations)
      const patternCounts = recentThinkingPatterns.reduce((acc, p) => {
        const key = p.slice(0, 50); // First 50 chars
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxRepeat = Math.max(...Object.values(patternCounts));
      if (maxRepeat >= 5) {
        yield { kind: "status", message: "Loop detected - injecting intervention" };
        logger.log("warn", "thought_loop_detected", {
          session_id: sessionId,
          turn_id: turnId,
          iteration: i + 1,
          max_repeat: maxRepeat,
          pattern_preview: Object.keys(patternCounts)[0]?.slice(0, 50)
        });
        messages.push({
          role: "system",
          content: "LOOP DETECTED: You've been repeating the same thought pattern 5+ times. STOP and try a completely different approach, or if the task is impossible with available tools, explain the limitation to the user and stop."
        });
        recentThinkingPatterns.length = 0; // Clear to avoid repeated warnings
      }
    }

    // Extract plans from assistant response
    if (planValidationEnabled && planStore !== null) {
      const extractedPlans = extractPlansFromContent(assistantContent);

      for (const newPlan of extractedPlans) {
        addPlan(planStore, newPlan);
        activePlan = newPlan;

        logger.log("info", "plan_created", {
          session_id: sessionId,
          turn_id: turnId,
          plan_id: newPlan.id,
          objective: newPlan.objective,
          steps_count: newPlan.steps.length
        });
      }

      if (extractedPlans.length > 0) {
        savePlanStore(workspaceDir, sessionId, planStore);
      }
    }

    // Record assistant content (even if empty; tool-calling turns often have little text).
    session.conversation.push({
      role: "assistant",
      content: assistantContent,
      created_at: new Date().toISOString()
    });
    saveSession(session, sessionDir);

    messages.push({ role: "assistant", content: assistantContent });

    if (!toolCalls.length) {
      const stop = await hookRegistry.runAgentStop({
        sessionId,
        repoRoot,
        workspaceDir,
        userInput: contentForHistory,
        assistantContent,
        iteration: i,
        maxIterations,
        toolExecutionsCount: toolCallsExecuted
      });
      const stopReason = stop.action === "allow" ? undefined : (stop as any).reason ?? (stop as any).statusMessage;
      logger.log("info", "agent_stop_decision", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1,
        action: stop.action,
        reason: stopReason
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
    // Guard: if we are at the final iteration and toolCalls exist, we'll still process them,
    // but after that, if maxIterations reached, we will run stop hook once more before exit.
    if (toolCallsExecuted + toolCalls.length > toolLimitTotal) {
      const wouldExecute = toolCallsExecuted + toolCalls.length;
      yield {
        kind: "error",
        message: `Would exceed tool call limit (${wouldExecute}/${toolLimitTotal}). Refusing to execute ${toolCalls.length} more tools.`
      };
      logger.log("warn", "would_exceed_tool_limit", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1,
        currently_executed: toolCallsExecuted,
        requested: toolCalls.length,
        total_would_be: wouldExecute,
        limit: toolLimitTotal
      });
      break;
    }

    // Execute tool calls in parallel (Python parity).
    // Pre-tool hooks can block or modify calls; run them before executing anything.
    const blockedResults: Array<{ id: string; name: string; ok: false; output: string }> = [];
    const callsToRun: typeof toolCalls = [];
    const callById = new Map<string, typeof toolCalls[number]>();

    for (const tc of toolCalls) {
      // Pre-validate arguments against schema (structured output enforcement)
      const validation = validateToolArgs(tc.name, tc.arguments, allSchemas);
      if (!validation.valid) {
        callById.set(tc.id, tc);
        const failCount = (consecutiveToolFailures.get(tc.name) ?? 0) + 1;
        consecutiveToolFailures.set(tc.name, failCount);

        blockedResults.push({
          id: tc.id,
          name: tc.name,
          ok: false,
          output: validation.error
        });
        logToolEvent({
          event: "tool_validation_failed",
          ts: new Date().toISOString(),
          session_id: sessionId,
          tool_call_id: tc.id,
          tool_name: tc.name,
          reason: validation.error,
          consecutive_failures: failCount
        });
        continue;
      }

      const pre = await hookRegistry.runPreTool({
        sessionId,
        repoRoot,
        workspaceDir,
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
        logToolEvent({
          event: "tool_blocked",
          ts: new Date().toISOString(),
          session_id: sessionId,
          tool_call_id: tc.id,
          tool_name: tc.name,
          reason: pre.reason
        });
        continue;
      }
      if (pre.action === "modify") {
        const modified = { ...tc, arguments: pre.modifiedArguments };
        callById.set(modified.id, modified);
        callsToRun.push(modified);
        // Reset failure counter on successful validation
        consecutiveToolFailures.set(tc.name, 0);
        continue;
      }
      callById.set(tc.id, tc);
      callsToRun.push(tc);
      // Reset failure counter on successful validation
      consecutiveToolFailures.set(tc.name, 0);
    }

    // Generate contextual messages for clean UI mode
    for (const tc of callsToRun) {
      const contextMsg = getToolContextMessage(tc.name, tc.arguments);
      yield { kind: "status", message: `tool_start:${tc.name}|${contextMsg}` };
    }

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
            arguments: call.arguments
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
            output_preview: result.output
          });
        }
      }
    });
    const results = [...blockedResults, ...resultsRan] as Array<{ id: string; name: string; ok: boolean; output: string }>;
    toolCallsExecuted += callsToRun.length;

    // Track execution failures for circuit breaker
    for (const r of resultsRan) {
      if (!r.ok) {
        const failCount = (consecutiveToolFailures.get(r.name) ?? 0) + 1;
        consecutiveToolFailures.set(r.name, failCount);
      } else {
        consecutiveToolFailures.set(r.name, 0);
      }
    }

    // Circuit breaker: Check if any tool has failed too many times
    const trippedTools: string[] = [];
    for (const [toolName, failCount] of consecutiveToolFailures) {
      if (failCount >= CIRCUIT_BREAKER_THRESHOLD) {
        trippedTools.push(toolName);
      }
    }

    if (trippedTools.length > 0) {
      const allFailed = results.every(r => !r.ok);
      logger.log("warn", "circuit_breaker_tripped", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1,
        tripped_tools: trippedTools,
        all_failed: allFailed
      });

      // Inject message to model about the failing tools
      messages.push({
        role: "system",
        content: `CIRCUIT BREAKER: The following tool(s) have failed ${CIRCUIT_BREAKER_THRESHOLD}+ times consecutively: ${trippedTools.join(", ")}.\n\n` +
          `STOP using these tools. Either:\n` +
          `1. Complete the task without them\n` +
          `2. Use different tools\n` +
          `3. If the task is already complete, stop and respond to the user\n\n` +
          `Do NOT keep retrying the same failing tools.`
      });

      // If ALL results failed, force stop evaluation
      if (allFailed) {
        yield { kind: "status", message: `Circuit breaker: ${trippedTools.join(", ")} failed ${CIRCUIT_BREAKER_THRESHOLD}x` };
        const stop = await hookRegistry.runAgentStop({
          sessionId,
          repoRoot,
          workspaceDir,
          userInput: contentForHistory,
          assistantContent: finalAssistantContent,
          iteration: i,
          maxIterations,
          toolExecutionsCount: toolCallsExecuted
        });
        logger.log("info", "circuit_breaker_stop_check", {
          session_id: sessionId,
          turn_id: turnId,
          iteration: i + 1,
          action: stop.action
        });
        if (stop.action === "allow") {
          break; // Force stop - all tools failed and stop hook allows
        }
      }
    }

    // TodoWrite reminder: Track if TodoWrite was called and remind agent to update it
    if (resultsRan.some(r => r.name === "TodoWrite")) {
      hasTodoList = true;
      iterationsSinceLastTodoUpdate = 0;
      logger.log("debug", "todowrite_called", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1
      });
    } else if (hasTodoList) {
      iterationsSinceLastTodoUpdate++;
    }

    // Add reminder if todos exist but haven't been updated in 3 iterations
    if (iterationsSinceLastTodoUpdate >= 3 && hasTodoList) {
      yield { kind: "status", message: "TodoWrite reminder - updating todo status" };
      logger.log("info", "todowrite_reminder_injected", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1,
        iterations_since_last_update: iterationsSinceLastTodoUpdate
      });
      messages.push({
        role: "system",
        content: "CRITICAL REMINDER: You created a todo list but haven't updated it in 3 iterations. You MUST call TodoWrite to mark completed tasks as 'completed' and move 'in_progress' tasks forward. TodoWrite is not just for creation - it's for CONTINUOUS status tracking throughout execution."
      });
      iterationsSinceLastTodoUpdate = 0; // Reset to avoid spamming
    }

    if (planValidationEnabled && activePlan && planStore) {
      const currentStep = activePlan.steps.find((s) => s.status === "in_progress");

      if (currentStep) {
        for (const result of results) {
          if (!result.ok) {
            const attempt = stepAttempts.get(currentStep.id) || { attempts: 0 };
            attempt.attempts++;
            attempt.lastError = result.output;
            stepAttempts.set(currentStep.id, attempt);

            logger.log("warn", "step_attempt_failed", {
              session_id: sessionId,
              step_id: currentStep.id,
              attempt_number: attempt.attempts,
              tool: result.name,
              error: result.output.slice(0, 200)
            });

            if (attempt.attempts >= 3 && activePlan) {
              activePlan = updatePlanStepStatusInPlan(
                activePlan!,
                currentStep.id,
                "blocked",
                `Failed after 3 attempts: ${attempt.lastError?.slice(0, 100)}`
              );

              if (activePlan) {
                logger.log("error", "step_blocked", {
                  session_id: sessionId,
                  plan_id: activePlan.id,
                  step_id: currentStep.id,
                  reason: "max_attempts_exceeded"
                });
              }

              if (planStore && activePlan) {
                const updatedStore = { ...planStore };
                const planIndex = updatedStore.plans.findIndex((p) => p.id === activePlan!.id);
                if (planIndex !== -1) {
                  updatedStore.plans[planIndex] = activePlan;
                  savePlanStore(workspaceDir, sessionId, updatedStore);
                }
              }

              messages.push({
                role: "system",
                content:
                  `Step ${currentStep.id} failed 3 times.\n` +
                  `Last error: ${attempt.lastError?.slice(0, 200)}\n\n` +
                  `Options:\n` +
                  `1. Try a different approach (different tools or strategy)\n` +
                  `2. Skip this step and continue to next\n` +
                  `3. Output <escalate>reason</escalate> for user help`
              });
            }
          }
        }
      }
    }

    for (const r of results) {
      const durationMs = durationById.get(r.id) ?? 0;
      const durationSec = (durationMs / 1000).toFixed(1);
      const status = r.ok ? "ok" : "error";
      const preview = getToolPreview(r.name, r.output, r.ok);
      yield { kind: "status", message: `tool_end:${r.name}|${durationSec}s|${status}|${preview}` };

      const originalCall = callById.get(r.id);
      if (r.name === "think" && originalCall?.arguments) {
        const thought =
          typeof (originalCall.arguments as any)?.thought === "string"
            ? String((originalCall.arguments as any).thought).trim()
            : "";
        if (thought) yield { kind: "thinking", delta: thought };
      }
      if (originalCall) {
        await hookRegistry.runPostTool({
          sessionId,
          repoRoot,
          workspaceDir,
          call: originalCall as any,
          ok: r.ok,
          output: r.output,
          durationMs
        });
        if (!r.ok) {
          await hookRegistry.runToolError({
            sessionId,
            repoRoot,
            workspaceDir,
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
      // Note: Tool outputs are not added to session.conversation to keep UI clean
      // They're only in messages[] for LLM context
    }

    // Track plan fulfillment based on tool executions
    if (planValidationEnabled && activePlan && planStore) {
      for (const execution of results) {
        if (!execution.ok) continue;

        for (const step of activePlan.steps) {
          if (step.status === "completed") continue;

          const stepLower = step.description.toLowerCase();
          const toolLower = execution.name.toLowerCase();

          if (stepLower.includes(toolLower) ||
              stepLower.includes(execution.name.replace(/_/g, " "))) {

            activePlan = updatePlanStepStatusInPlan(activePlan, step.id, "completed");

            logger.log("info", "plan_step_completed", {
              session_id: sessionId,
              plan_id: activePlan.id,
              step_id: step.id,
              tool_used: execution.name
            });
          }
        }
      }

      if (activePlan && planStore) {
        const updatedStore = { ...planStore };
        const planIndex = updatedStore.plans.findIndex((p) => p.id === activePlan!.id);
        if (planIndex !== -1) {
          updatedStore.plans[planIndex] = activePlan;
          savePlanStore(workspaceDir, sessionId, updatedStore);
        }
      }
    }

    // Update no-action counter
    if (!toolCalls.length) {
      consecutiveNoAction++;
      logger.log("debug", "no_action_iteration", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1,
        consecutive_count: consecutiveNoAction
      });
    } else {
      consecutiveNoAction = 0;
    }

    // If we've reached the last iteration, run a final stop-check to avoid silent exit with open promises.
    if (iterationCount === maxIterations - 1) {
      const finalStop = await hookRegistry.runAgentStop({
        sessionId,
        repoRoot,
        workspaceDir,
        userInput: contentForHistory,
        assistantContent: finalAssistantContent,
        iteration: i,
        maxIterations,
        toolExecutionsCount: toolCallsExecuted
      });
      const stopReason = finalStop.action === "allow" ? undefined : (finalStop as any).reason ?? (finalStop as any).statusMessage;
      logger.log("info", "agent_stop_decision", {
        session_id: sessionId,
        turn_id: turnId,
        iteration: i + 1,
        action: finalStop.action,
        reason: stopReason,
        phase: "final_iteration_stop_check"
      });
      if (finalStop.action === "block") {
        if (finalStop.statusMessage) yield { kind: "status", message: finalStop.statusMessage };
        messages.push({ role: "system", content: finalStop.systemPrompt });
        // Note: This executes on the final iteration (i === maxIterations - 1).
        // The injected system prompt will be processed, then the loop completes naturally.
        // Hooks have one chance to inject guidance before the turn ends.
      }
    }
    }
  } finally {
    // CRITICAL: Always log turn_complete, even if interrupted by AbortSignal
    // This ensures session logs are complete and we can track interrupted turns
    logger.log("info", "turn_complete", {
      session_id: sessionId,
      turn_id: turnId,
      duration_ms: Date.now() - runStartedAt,
      iterations: iterationCount,
      tool_calls_executed: toolCallsExecuted,
      aborted: signal.aborted,
      final_content_preview: smartTruncate(finalAssistantContent, 800)
    });

    yield { kind: "task_completed" };
  }
}
