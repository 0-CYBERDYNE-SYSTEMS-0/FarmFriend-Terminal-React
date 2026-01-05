import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { runAgentTurn } from "../agentLoop.js";
import { ToolRegistry } from "../tools/registry.js";
import { registerAllTools } from "../registerDefaultTools.js";
import { withToolContext } from "../tools/context.js";
import { StructuredLogger, parseLogLevel, truncateForLog } from "../logging/structuredLogger.js";
import { toWire } from "../streamProtocol.js";
import { newId } from "../../shared/ids.js";

export type OracleMode = "off" | "critical" | "on_complete" | "on_stall" | "on_high_risk" | "always";
export type SessionStrategy = "reuse" | "new";

export type AutonomyLoopOptions = {
  repoRoot: string;
  workspaceDir: string;
  promptFile: string;
  tasksFile: string;
  completionPromise?: string | null;
  maxLoops: number;
  stallLimit: number;
  sleepMs: number;
  oracleMode: OracleMode;
  highRiskKeywords: string[];
  sessionStrategy: SessionStrategy;
  sessionId?: string;
  logLevel?: string;
  logMaxBytes?: number;
  logRetention?: number;
  headless?: boolean;
};

type RunResult = {
  assistantText: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startSpinner(label: string): () => void {
  const frames = ["|", "/", "-", "\\"];
  let idx = 0;
  const write = () => {
    const frame = frames[idx % frames.length];
    idx += 1;
    process.stderr.write(`\r[${frame}] ${label}`);
  };
  write();
  const timer = setInterval(write, 120);
  return () => {
    clearInterval(timer);
    const clear = " ".repeat(label.length + 4);
    process.stderr.write(`\r${clear}\r`);
  };
}

function readFileSafe(p: string): string {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function detectCompletionClaim(text: string, promise?: string | null): boolean {
  if (promise) {
    const match = text.match(/<promise>([\s\S]*?)<\/promise>/i);
    if (!match) return false;
    const inner = match[1].replace(/\s+/g, " ").trim();
    return inner === promise;
  }
  const rx = /\b(i'?m done|task complete|task completed|task completed successfully|completed the task|all tasks (are )?complete|work is complete|✅ completed)\b/i;
  return rx.test(text);
}

function buildPrompt(promptText: string, tasksText: string, oracleNote: string | null, loopNum: number, completionPromise?: string | null): string {
  const parts: string[] = [];
  parts.push(promptText.trim());
  if (tasksText.trim()) {
    parts.push("Current tasks/state:\n" + tasksText.trim());
  }
  if (oracleNote) {
    parts.push("Note:\n" + oracleNote.trim());
  }
  if (completionPromise) {
    parts.push(
      `Completion requirement: When truly finished, output exactly <promise>${completionPromise}</promise> on its own line.`
    );
  }
  parts.push(`Autonomy loop: ${loopNum}`);
  return parts.filter(Boolean).join("\n\n");
}

async function runSingleTurn(params: {
  registry: ToolRegistry;
  repoRoot: string;
  workspaceDir: string;
  sessionId: string;
  prompt: string;
  headless: boolean;
  onActivity?: (activity: string) => void;
}): Promise<RunResult> {
  const controller = new AbortController();
  let assistantText = "";
  let headlessPrinted = false;
  await withToolContext({ sessionId: params.sessionId, workspaceDir: params.workspaceDir, repoRoot: params.repoRoot }, async () => {
    for await (const chunk of runAgentTurn({
      userInput: params.prompt,
      registry: params.registry,
      sessionId: params.sessionId,
      repoRoot: params.repoRoot,
      signal: controller.signal
    })) {
      if (chunk.kind === "content") assistantText += chunk.delta;
      if (params.onActivity) {
        let activity: string = chunk.kind;
        if (chunk.kind === "status") activity = chunk.message;
        else if (chunk.kind === "error") activity = `error: ${chunk.message}`;
        else if (chunk.kind === "subagent_event") activity = `subagent:${chunk.event}`;
        params.onActivity(activity);
      }
      if (params.headless) {
        const line = toWire(chunk);
        process.stdout.write(line + "\n");
        if (chunk.kind === "content") headlessPrinted = true;
      }
    }
  });
  if (params.headless && headlessPrinted && !assistantText.endsWith("\n")) {
    process.stdout.write("\n");
  }
  return { assistantText };
}

export async function runAutonomyLoop(opts: AutonomyLoopOptions): Promise<void> {
  const promptFile = path.resolve(opts.promptFile);
  const tasksFile = path.resolve(opts.tasksFile);
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Autonomy prompt file not found: ${promptFile}`);
  }

  const logLevel = parseLogLevel(opts.logLevel || "info");
  const logMaxBytes = Number(opts.logMaxBytes ?? 5 * 1024 * 1024);
  const logRetention = Number(opts.logRetention ?? 3);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(opts.workspaceDir, "logs", "autonomy", `autonomy_${stamp}.jsonl`);
  const logger = new StructuredLogger({ filePath: logPath, level: logLevel, maxBytes: logMaxBytes, retention: logRetention });

  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir: opts.workspaceDir });

  let lastTasksHash = "";
  let stallCount = 0;
  let oracleNote: string | null = null;
  const completionPromise = opts.completionPromise || "";
  const loopSessionId = opts.sessionId || newId("session");

  let loopsRun = 0;
  for (let loop = 1; loop <= opts.maxLoops; loop += 1) {
    loopsRun = loop;
    const promptText = readFileSafe(promptFile);
    const tasksText = readFileSafe(tasksFile);
    const prompt = buildPrompt(promptText, tasksText, oracleNote, loop, completionPromise);
    const sessionId = opts.sessionStrategy === "reuse" ? loopSessionId : newId("session");

    logger.log("info", "autonomy_loop_start", {
      loop,
      session_id: sessionId,
      prompt_preview: truncateForLog(prompt, 400),
      oracle_mode: opts.oracleMode
    });

    const stopSpinner = startSpinner(`Autonomy loop ${loop}/${opts.maxLoops} running...`);
    let lastActivity = "starting";
    let lastActivityAt = Date.now();
    const recordActivity = (activity: string) => {
      lastActivity = activity;
      lastActivityAt = Date.now();
    };
    const heartbeatIntervalMs = 20000;
    const heartbeatTimer = setInterval(() => {
      const ageSec = Math.round((Date.now() - lastActivityAt) / 1000);
      const activity = truncateForLog(lastActivity, 120);
      process.stderr.write(`\n[heartbeat] loop ${loop}/${opts.maxLoops} - last: ${activity} (${ageSec}s ago)\n`);
    }, heartbeatIntervalMs);
    let result: RunResult;
    try {
      result = await runSingleTurn({
        registry,
        repoRoot: opts.repoRoot,
        workspaceDir: opts.workspaceDir,
        sessionId,
        prompt,
        headless: Boolean(opts.headless),
        onActivity: recordActivity
      });
    } finally {
      stopSpinner();
      clearInterval(heartbeatTimer);
    }

    const completionClaimed = detectCompletionClaim(result.assistantText, completionPromise);
    const tasksTextAfter = readFileSafe(tasksFile);
    const tasksHash = hashText(tasksTextAfter);
    const tasksUnchanged = Boolean(tasksHash && tasksHash === lastTasksHash);
    if (tasksHash && tasksHash === lastTasksHash) stallCount += 1;
    else stallCount = 0;
    lastTasksHash = tasksHash;

    logger.log("info", "autonomy_loop_result", {
      loop,
      session_id: sessionId,
      completion_claimed: completionClaimed,
      stall_count: stallCount,
      assistant_preview: truncateForLog(result.assistantText, 400)
    });
    process.stderr.write(
      `\n[loop ${loop}/${opts.maxLoops}] completion=${completionClaimed ? "yes" : "no"} | tasks=${tasksUnchanged ? "unchanged" : "updated"} | stall=${stallCount}\n`
    );

    if (completionClaimed) {
      break;
    }

    if (stallCount >= opts.stallLimit) {
      oracleNote = "Stall detected. Consider revising tasks or prompt.";
      stallCount = 0;
    }

    if (loop < opts.maxLoops) {
      const sleepSec = Math.round(opts.sleepMs / 1000);
      if (sleepSec > 0) {
        process.stderr.write(`[sleep] waiting ${sleepSec}s before next loop...\n`);
      }
      await sleep(opts.sleepMs);
    }
  }

  logger.log("info", "autonomy_loop_complete", {
    loops_run: loopsRun,
    prompt_file: promptFile,
    tasks_file: tasksFile
  });
  if (opts.headless) {
    process.stderr.write(`Autonomy loop complete after ${loopsRun} loop(s).\n`);
  }
}
