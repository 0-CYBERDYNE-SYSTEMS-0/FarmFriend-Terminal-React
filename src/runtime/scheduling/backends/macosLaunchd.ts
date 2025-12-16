import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { findRepoRoot } from "../../config/repoRoot.js";
import { ScheduleSpec, SchedulerBackend } from "./types.js";

const LAUNCHD_LABEL_PREFIX = "ai.factory.fft";

function safeName(taskName: string): string {
  return taskName.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function labelFor(taskName: string): string {
  return `${LAUNCHD_LABEL_PREFIX}.${safeName(taskName)}`;
}

function launchAgentsDir(): string {
  return path.join(os.homedir(), "Library", "LaunchAgents");
}

function plistPath(taskName: string): string {
  return path.join(launchAgentsDir(), `${labelFor(taskName)}.plist`);
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plistStringifyValue(v: unknown): string {
  if (typeof v === "string") return `<string>${xmlEscape(v)}</string>`;
  if (typeof v === "number" && Number.isFinite(v)) return `<integer>${Math.floor(v)}</integer>`;
  if (v === true) return "<true/>";
  if (v === false) return "<false/>";
  if (Array.isArray(v)) return `<array>\n${v.map((x) => plistStringifyValue(x)).join("\n")}\n</array>`;
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<key>${xmlEscape(k)}</key>\n${plistStringifyValue(val)}`)
      .join("\n");
    return `<dict>\n${entries}\n</dict>`;
  }
  return "<string></string>";
}

function generatePlist(params: { taskName: string; taskId: string; schedule: ScheduleSpec }): string {
  const repoRoot = findRepoRoot();
  const node = process.execPath;
  const cli = path.join(repoRoot, "ff-terminal-ts", "dist", "bin", "ff-terminal.js");

  if (!fs.existsSync(cli)) {
    // Caller will surface this message; still generate a plist-like string for debugging.
  }

  const programArguments = [node, cli, "run", "--scheduled-task", params.taskId, "--headless"];

  const logsDir = path.join(repoRoot, "logs");
  fs.mkdirSync(logsDir, { recursive: true });

  const plist: Record<string, unknown> = {
    Label: labelFor(params.taskName),
    ProgramArguments: programArguments,
    WorkingDirectory: repoRoot,
    StandardOutPath: path.join(logsDir, `scheduled_${safeName(params.taskName)}.log`),
    StandardErrorPath: path.join(logsDir, `scheduled_${safeName(params.taskName)}.err`),
    EnvironmentVariables: {
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      HOME: os.homedir()
    },
    RunAtLoad: false
  };

  const s = params.schedule;
  if (s.schedule_type === "interval") {
    plist.StartInterval = s.interval_seconds ?? 60;
  } else if (s.schedule_type === "daily") {
    plist.StartCalendarInterval = { Hour: s.hour ?? 0, Minute: s.minute ?? 0 };
  } else if (s.schedule_type === "weekly") {
    plist.StartCalendarInterval = (s.weekdays ?? []).map((day) => ({
      Weekday: day,
      Hour: s.hour ?? 0,
      Minute: s.minute ?? 0
    }));
  } else if (s.schedule_type === "one_time") {
    if (!s.execution_timestamp) throw new Error("one_time schedule requires execution_timestamp");
    const dt = new Date(s.execution_timestamp * 1000);
    plist.StartCalendarInterval = {
      Month: dt.getMonth() + 1,
      Day: dt.getDate(),
      Hour: dt.getHours(),
      Minute: dt.getMinutes()
    };
  }

  const body = plistStringifyValue(plist);
  return `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n${body}\n</plist>\n`;
}

async function runLaunchctl(args: string[]): Promise<{ ok: boolean; message: string }> {
  return await new Promise((resolve) => {
    const child = spawn("launchctl", args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (b) => out.push(b as Buffer));
    child.stderr.on("data", (b) => err.push(b as Buffer));
    child.on("close", (code) => {
      const stdout = Buffer.concat(out).toString("utf8").trim();
      const stderr = Buffer.concat(err).toString("utf8").trim();
      if (code === 0) return resolve({ ok: true, message: stdout || "ok" });
      return resolve({ ok: false, message: stderr || stdout || `launchctl exited ${code}` });
    });
  });
}

export function macosLaunchdBackend(): SchedulerBackend {
  return {
    async install({ taskName, taskId, schedule }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };

      const repoRoot = findRepoRoot();
      const cli = path.join(repoRoot, "ff-terminal-ts", "dist", "bin", "ff-terminal.js");
      if (!fs.existsSync(cli)) {
        return { ok: false, message: `Build required: missing ${cli}. Run \"npm run build\" in ff-terminal-ts.` };
      }

      fs.mkdirSync(launchAgentsDir(), { recursive: true });
      const p = plistPath(taskName);

      // Unload existing (best-effort), then rewrite plist.
      await runLaunchctl(["unload", p]).catch(() => {});
      fs.writeFileSync(p, generatePlist({ taskName, taskId, schedule }), "utf8");

      const res = await runLaunchctl(["load", p]);
      if (!res.ok) return res;
      return { ok: true, message: `Installed launchd task ${labelFor(taskName)}` };
    },

    async enable({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = plistPath(taskName);
      if (!fs.existsSync(p)) return { ok: false, message: `No plist found at ${p}` };
      return await runLaunchctl(["load", p]);
    },

    async disable({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = plistPath(taskName);
      if (!fs.existsSync(p)) return { ok: false, message: `No plist found at ${p}` };
      return await runLaunchctl(["unload", p]);
    },

    async remove({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = plistPath(taskName);
      await runLaunchctl(["unload", p]).catch(() => {});
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return { ok: true, message: `Removed ${p}` };
    },

    async status({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const label = labelFor(taskName);
      const p = plistPath(taskName);
      const exists = fs.existsSync(p);
      const res = await runLaunchctl(["list", label]);
      return {
        ok: true,
        message: "ok",
        data: { taskName, label, plistPath: p, plistExists: exists, launchctl: res }
      };
    }
  };
}

