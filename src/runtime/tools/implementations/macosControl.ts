import { spawn } from "node:child_process";

type Args = { action?: string; target?: string; wait_time?: number };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isMac(): boolean {
  return process.platform === "darwin";
}

async function runAppleScript(script: string, signal: AbortSignal): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return await new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-e", script], { stdio: ["ignore", "pipe", "pipe"] });
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

  if (!action) throw new Error("macos_control: missing args.action");
  if (!target) throw new Error("macos_control: missing args.target");

  if (!isMac()) throw new Error("macos_control: only supported on macOS");
  if (String(process.env.FF_ALLOW_MACOS_CONTROL || "") !== "1") {
    throw new Error("macos_control: blocked (set FF_ALLOW_MACOS_CONTROL=1 to enable)");
  }

  const lower = action.toLowerCase();
  let result: any = { ok: true, action, target };

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
  } else if (lower === "applescript") {
    const r = await runAppleScript(target, signal);
    if (r.code !== 0) throw new Error(`macos_control(applescript) failed: ${r.stderr || r.stdout}`);
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

