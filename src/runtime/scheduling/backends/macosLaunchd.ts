import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { findRepoRoot } from "../../config/repoRoot.js";
import { SchedulerBackend } from "./types.js";

const LAUNCHD_LABEL_PREFIX = "ai.factory.fft";
const SCHEDULER_LABEL = `${LAUNCHD_LABEL_PREFIX}.scheduler`;

function launchAgentsDir(): string {
  return path.join(os.homedir(), "Library", "LaunchAgents");
}

function schedulerPlistPath(): string {
  return path.join(launchAgentsDir(), `${SCHEDULER_LABEL}.plist`);
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

function generateSchedulerPlist(repoRoot: string): string {
  const node = process.execPath;
  const cli = path.join(repoRoot, "dist", "bin", "ff-terminal.js");

  if (!fs.existsSync(cli)) {
    // Caller will surface this message; still generate a plist-like string for debugging.
  }

  const programArguments = [node, cli, "scheduler", "--headless"];

  const logsDir = path.join(repoRoot, "logs");
  fs.mkdirSync(logsDir, { recursive: true });

  const plist: Record<string, unknown> = {
    Label: SCHEDULER_LABEL,
    ProgramArguments: programArguments,
    WorkingDirectory: repoRoot,
    StandardOutPath: path.join(logsDir, "scheduler_daemon.log"),
    StandardErrorPath: path.join(logsDir, "scheduler_daemon.err"),
    EnvironmentVariables: {
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      HOME: os.homedir()
    },
    RunAtLoad: true,
    KeepAlive: true
  };

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

async function cleanupLegacyTaskPlists(): Promise<void> {
  const dir = launchAgentsDir();
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.startsWith(`${LAUNCHD_LABEL_PREFIX}.`)) continue;
    if (entry === `${SCHEDULER_LABEL}.plist`) continue;
    const p = path.join(dir, entry);
    await runLaunchctl(["unload", p]).catch(() => {});
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

export function macosLaunchdBackend(): SchedulerBackend {
  return {
    async install({ taskName, taskId, schedule }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };

      const repoRoot = findRepoRoot();
      const cli = path.join(repoRoot, "dist", "bin", "ff-terminal.js");
      if (!fs.existsSync(cli)) {
        return { ok: false, message: `Build required: missing ${cli}. Run \"npm run build\" in this repo.` };
      }

      fs.mkdirSync(launchAgentsDir(), { recursive: true });
      await cleanupLegacyTaskPlists();
      const p = schedulerPlistPath();

      // Unload existing (best-effort), then rewrite plist.
      await runLaunchctl(["unload", p]).catch(() => {});
      fs.writeFileSync(p, generateSchedulerPlist(repoRoot), "utf8");

      const res = await runLaunchctl(["load", p]);
      if (!res.ok) return res;
      return { ok: true, message: `Installed scheduler daemon ${SCHEDULER_LABEL}` };
    },

    async enable({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = schedulerPlistPath();
      if (!fs.existsSync(p)) return { ok: false, message: `No plist found at ${p}` };
      const res = await runLaunchctl(["load", p]);
      if (!res.ok) return res;
      return { ok: true, message: `Enabled scheduler daemon ${SCHEDULER_LABEL}` };
    },

    async disable({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = schedulerPlistPath();
      if (!fs.existsSync(p)) return { ok: false, message: `No plist found at ${p}` };
      const res = await runLaunchctl(["unload", p]);
      if (!res.ok) return res;
      return { ok: true, message: `Disabled scheduler daemon ${SCHEDULER_LABEL}` };
    },

    async remove({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = schedulerPlistPath();
      await runLaunchctl(["unload", p]).catch(() => {});
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return { ok: true, message: `Removed scheduler daemon ${SCHEDULER_LABEL}` };
    },

    async status({ taskName }) {
      if (process.platform !== "darwin") return { ok: false, message: "launchd backend only supports macOS" };
      const p = schedulerPlistPath();
      const exists = fs.existsSync(p);
      const res = await runLaunchctl(["list", SCHEDULER_LABEL]);
      return {
        ok: true,
        message: "ok",
        data: { label: SCHEDULER_LABEL, plistPath: p, plistExists: exists, launchctl: res }
      };
    }
  };
}
