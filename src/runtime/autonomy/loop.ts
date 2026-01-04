import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { runAgentTurn } from "../agentLoop.js";
import { ToolRegistry } from "../tools/registry.js";
import { registerAllTools } from "../registerDefaultTools.js";
import { withToolContext } from "../tools/context.js";
import { StructuredLogger, parseLogLevel, truncateForLog } from "../logging/structuredLogger.js";
import { askOracleTool } from "../tools/implementations/askOracle.js";
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

type OracleVerdict = "approved" | "rejected" | "unknown";

type OracleResult = {
  ok: boolean;
  verdict: OracleVerdict;
  answer: string;
  raw?: any;
  error?: string;
};

type RunResult = {
  assistantText: string;
};

const DEFAULT_HIGH_RISK = [
  "deploy", "production", "prod", "rollback", "migration", "migrate",
  "delete", "drop", "truncate", "rm -rf", "terminate", "destroy",
  "payment", "billing", "invoice", "money", "transfer", "bank",
  "credentials", "secrets", "rotate", "security", "breach"
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (promise && text.includes(promise)) return true;
  const rx = /\b(i'?m done|task complete|completed the task|all tasks (are )?complete|work is complete)\b/i;
  return rx.test(text);
}

function parseOracleVerdict(answer: string): OracleVerdict {
  const first = answer.trim().split("\n")[0]?.trim().toLowerCase();
  if (first.startsWith("approved")) return "approved";
  if (first.startsWith("rejected")) return "rejected";
  if (answer.toLowerCase().includes("approved")) return "approved";
  if (answer.toLowerCase().includes("rejected")) return "rejected";
  return "unknown";
}

function detectHighRisk(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function buildPrompt(promptText: string, tasksText: string, oracleNote: string | null, loopNum: number): string {
  const parts: string[] = [];
  parts.push(promptText.trim());
  if (tasksText.trim()) {
    parts.push("Current tasks/state:\n" + tasksText.trim());
  }
  if (oracleNote) {
    parts.push("Oracle feedback:\n" + oracleNote.trim());
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
}): Promise<RunResult> {
  const controller = new AbortController();
  let assistantText = "";
  await withToolContext({ sessionId: params.sessionId, workspaceDir: params.workspaceDir, repoRoot: params.repoRoot }, async () => {
    for await (const chunk of runAgentTurn({
      userInput: params.prompt,
      registry: params.registry,
      sessionId: params.sessionId,
      repoRoot: params.repoRoot,
      signal: controller.signal
    })) {
      if (chunk.kind === "content") assistantText += chunk.delta;
      if (params.headless) {
        const line = toWire(chunk);
        process.stdout.write(line + "\n");
      }
    }
  });
  return { assistantText };
}

async function runOracleCheck(question: string, context: string): Promise<OracleResult> {
  const controller = new AbortController();
  try {
    const raw = await askOracleTool({ question, context, include_reasoning: false }, controller.signal);
    const parsed = JSON.parse(raw);
    const answer = String(parsed?.oracle_answer || "").trim();
    const verdict = parseOracleVerdict(answer);
    return { ok: true, verdict, answer, raw: parsed };
  } catch (err) {
    return { ok: false, verdict: "unknown", answer: "", error: err instanceof Error ? err.message : String(err) };
  }
}

function oraclePolicy(mode: OracleMode, highRisk: boolean): { onComplete: boolean; onStall: boolean; onHighRisk: boolean } {
  if (mode === "always") return { onComplete: true, onStall: true, onHighRisk: true };
  if (mode === "critical") return { onComplete: true, onStall: true, onHighRisk: true };
  if (mode === "off") return { onComplete: false, onStall: false, onHighRisk: highRisk };
  return {
    onComplete: mode === "on_complete",
    onStall: mode === "on_stall",
    onHighRisk: mode === "on_high_risk"
  };
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
  const highRiskKeywords = opts.highRiskKeywords?.length ? opts.highRiskKeywords : DEFAULT_HIGH_RISK;
  const loopSessionId = opts.sessionId || newId("session");

  let loopsRun = 0;
  for (let loop = 1; loop <= opts.maxLoops; loop += 1) {
    loopsRun = loop;
    const promptText = readFileSafe(promptFile);
    const tasksText = readFileSafe(tasksFile);
    const highRisk = detectHighRisk(`${promptText}\n${tasksText}`, highRiskKeywords);
    const policy = oraclePolicy(opts.oracleMode, highRisk);

    const prompt = buildPrompt(promptText, tasksText, oracleNote, loop);
    const sessionId = opts.sessionStrategy === "reuse" ? loopSessionId : newId("session");

    logger.log("info", "autonomy_loop_start", {
      loop,
      session_id: sessionId,
      prompt_preview: truncateForLog(prompt, 400),
      high_risk: highRisk,
      oracle_mode: opts.oracleMode
    });

    const result = await runSingleTurn({
      registry,
      repoRoot: opts.repoRoot,
      workspaceDir: opts.workspaceDir,
      sessionId,
      prompt,
      headless: Boolean(opts.headless)
    });

    const completionClaimed = detectCompletionClaim(result.assistantText, completionPromise);
    const tasksTextAfter = readFileSafe(tasksFile);
    const tasksHash = hashText(tasksTextAfter);
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

    if (completionClaimed) {
      if (policy.onComplete || (policy.onHighRisk && highRisk)) {
        const question = "Validate whether the task is truly complete. Reply with APPROVED or REJECTED as the first line, then list gaps if any.";
        const context = [
          `Prompt:\n${promptText}`,
          `Tasks:\n${tasksTextAfter}`,
          `Assistant output:\n${result.assistantText}`
        ].join("\n\n");
        const oracle = await runOracleCheck(question, context);
        logger.log("info", "oracle_completion_check", {
          loop,
          session_id: sessionId,
          ok: oracle.ok,
          verdict: oracle.verdict,
          error: oracle.error
        });
        if (oracle.ok && oracle.verdict === "approved") {
          oracleNote = null;
          break;
        }
        oracleNote = oracle.ok ? oracle.answer : `Oracle unavailable: ${oracle.error || "unknown error"}`;
      } else {
        break;
      }
    }

    if (stallCount >= opts.stallLimit) {
      if (policy.onStall) {
        const question = "We appear stalled (no progress across multiple loops). Diagnose the stall and suggest a recovery plan.";
        const context = [
          `Prompt:\n${promptText}`,
          `Tasks:\n${tasksTextAfter}`,
          `Assistant output:\n${result.assistantText}`
        ].join("\n\n");
        const oracle = await runOracleCheck(question, context);
        logger.log("info", "oracle_stall_check", {
          loop,
          session_id: sessionId,
          ok: oracle.ok,
          verdict: oracle.verdict,
          error: oracle.error
        });
        oracleNote = oracle.ok ? oracle.answer : `Oracle unavailable: ${oracle.error || "unknown error"}`;
      } else {
        oracleNote = "Stall detected. Consider revising tasks or prompt.";
      }
      stallCount = 0;
    }

    if (loop < opts.maxLoops) {
      await sleep(opts.sleepMs);
    }
  }

  logger.log("info", "autonomy_loop_complete", {
    loops_run: loopsRun,
    prompt_file: promptFile,
    tasks_file: tasksFile
  });
}
