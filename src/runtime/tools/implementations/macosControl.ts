import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getScript, substituteParams, validateParams, listScripts } from "./macos_control/scriptLoader.js";

type Args = {
  action?: string;
  target?: string;
  wait_time?: number;
  language?: "applescript" | "jxa";
  kb_script_id?: string;
  params?: Record<string, string>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isMac(): boolean {
  return process.platform === "darwin";
}

async function runAppleScript(
  script: string,
  signal: AbortSignal,
  language: "applescript" | "jxa" = "applescript"
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return await new Promise((resolve, reject) => {
    // Build osascript args
    const args: string[] = [];
    if (language === "jxa") {
      args.push("-l", "JavaScript");
    }
    args.push("-e", script);

    const child = spawn("osascript", args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];

    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (b) => out.push(b));
    child.stderr?.on("data", (b) => err.push(b));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      resolve({ stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8"), code });
    });
  });
}

/**
 * Get knowledge base directory path
 */
function getKBDir(): string {
  // Get directory of current file
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  return join(currentDir, "macos_control", "kb");
}

async function tryCliClick(target: string, signal: AbortSignal): Promise<{ ok: boolean; msg: string }> {
  // Optional: use `cliclick` if installed for coordinate clicks.
  return await new Promise((resolve) => {
    const child = spawn("cliclick", [target], { stdio: ["ignore", "pipe", "pipe"] });
    const err: Buffer[] = [];
    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    child.stderr?.on("data", (b) => err.push(b));
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      if (code === 0) resolve({ ok: true, msg: "clicked via cliclick" });
      else resolve({ ok: false, msg: Buffer.concat(err).toString("utf8") || "cliclick failed or not installed" });
    });
    child.on("error", () => resolve({ ok: false, msg: "cliclick not installed" }));
  });
}

export async function macosControlTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim();
  const target = String(args?.target || "").trim();
  const waitTime = typeof args?.wait_time === "number" ? Math.max(0, args.wait_time) : 1.0;
  const language = args?.language || "applescript";
  const kbScriptId = args?.kb_script_id?.trim();
  const params = args?.params || {};

  if (!action) throw new Error("macos_control: missing args.action");

  if (!isMac()) throw new Error("macos_control: only supported on macOS");

  const lower = action.toLowerCase();
  let result: any = { ok: true, action };

  // Handle knowledge base script execution
  if (lower === "kb_script" || kbScriptId) {
    if (!kbScriptId) throw new Error("macos_control(kb_script): missing kb_script_id");

    const kbDir = getKBDir();
    const script = getScript(kbDir, kbScriptId);

    if (!script) {
      throw new Error(`macos_control(kb_script): script not found: ${kbScriptId}`);
    }

    // Validate required parameters
    const missing = validateParams(script, params);
    if (missing.length > 0) {
      throw new Error(`macos_control(kb_script): missing required parameters: ${missing.join(", ")}`);
    }

    // Substitute parameters
    const scriptContent = substituteParams(script.content, params);

    // Execute script
    const r = await runAppleScript(scriptContent, signal, script.metadata.language);
    if (r.code !== 0) {
      throw new Error(`macos_control(kb_script) failed: ${r.stderr || r.stdout}`);
    }

    result = {
      ok: true,
      action: "kb_script",
      kb_script_id: kbScriptId,
      script_title: script.metadata.title,
      language: script.metadata.language,
      params,
      stdout: r.stdout.trim(),
      stderr: r.stderr.trim() || undefined,
    };

    if (waitTime > 0) await sleep(waitTime * 1000);
    return JSON.stringify(result, null, 2);
  }

  // Handle list_scripts action
  if (lower === "list_scripts") {
    const kbDir = getKBDir();
    const scripts = listScripts(kbDir);
    result = {
      ok: true,
      action: "list_scripts",
      count: scripts.length,
      scripts: scripts.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        language: s.language,
        category: s.category,
        params: s.params,
      })),
    };
    return JSON.stringify(result, null, 2);
  }

  // All other actions require target
  if (!target) throw new Error("macos_control: missing args.target");
  result.target = target;

  if (lower === "open_app") {
    const script = `tell application \"${target.replace(/\"/g, "\\\"")}\" to activate`;
    const r = await runAppleScript(script, signal);
    if (r.code !== 0) throw new Error(`macos_control(open_app) failed: ${r.stderr || r.stdout}`);
    result.applescript = script;
  } else if (lower === "send_keys") {
    // Target is literal text to type into the current focused input.
    const esc = target.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
    const script = `tell application \"System Events\" to keystroke \"${esc}\"`;
    const r = await runAppleScript(script, signal);
    if (r.code !== 0) throw new Error(`macos_control(send_keys) failed: ${r.stderr || r.stdout}`);
    result.applescript = script;
  } else if (lower === "spotlight_search") {
    const esc = target.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
    const script = [
      `tell application \"System Events\"`,
      `key down command`,
      `keystroke space`,
      `key up command`,
      `delay 0.2`,
      `keystroke \"${esc}\"`,
      `key code 36`,
      `end tell`
    ].join("\n");
    const r = await runAppleScript(script, signal);
    if (r.code !== 0) throw new Error(`macos_control(spotlight_search) failed: ${r.stderr || r.stdout}`);
    result.applescript = script;
  } else if (lower === "applescript" || lower === "jxa" || lower === "script") {
    // Support both 'applescript' and 'jxa' actions, or generic 'script' with language param
    const scriptLanguage = lower === "jxa" ? "jxa" : language;
    const r = await runAppleScript(target, signal, scriptLanguage);
    if (r.code !== 0) throw new Error(`macos_control(${lower}) failed: ${r.stderr || r.stdout}`);
    result.language = scriptLanguage;
    result.stdout = r.stdout.trim();
    result.stderr = r.stderr.trim() || undefined;
  } else if (lower === "click") {
    // Target expected like "c:x,y" or "x,y". Best-effort: use cliclick if present.
    const coords = target.includes(":") ? target.split(":").slice(1).join(":") : target;
    const normalized = coords.replace(/\s+/g, "");
    if (!/^\d+,\d+$/.test(normalized)) throw new Error("macos_control(click): target must be \"x,y\" (requires cliclick installed)");
    const r = await tryCliClick(`c:${normalized}`, signal);
    if (!r.ok) throw new Error(`macos_control(click) failed: ${r.msg} (install 'cliclick' for coordinate clicks)`);
    result.method = "cliclick";
  } else if (lower === "template" || lower === "workflow" || lower === "simple_task") {
    // Best-effort placeholder: these are larger sprints (kept intentionally minimal for now).
    throw new Error(`macos_control(${action}): not implemented in TS build yet (planned focused sprint)`);
  } else {
    throw new Error(`macos_control: unknown action: ${action}`);
  }

  if (waitTime > 0) await sleep(waitTime * 1000);
  return JSON.stringify(result, null, 2);
}
