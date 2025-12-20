#!/usr/bin/env node

import { startDaemon } from "../daemon/daemon.js";
import { startWebServer } from "../web/server.js";
import { startAcpServer } from "../acp/server.js";
import { startInkUi } from "../cli/app.js";
import { ToolRegistry } from "../runtime/tools/registry.js";
import { registerAllTools } from "../runtime/registerDefaultTools.js";
import { defaultWorkspaceDir, resolveWorkspaceDir } from "../runtime/config/paths.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { runAgentTurn } from "../runtime/agentLoop.js";
import { toWire } from "../runtime/streamProtocol.js";
import { newId } from "../shared/ids.js";
import { loadTaskStore, saveTaskStore, taskStorePath } from "../runtime/scheduling/taskStore.js";
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeConfig, getProfileByName, getCredential, deleteCredential, storeCredential } from "../runtime/profiles/storage.js";
import { promptSelectProfile, runProfileSetupWizard } from "../runtime/profiles/wizard.js";
import readline from "node:readline/promises";
import { withToolContext } from "../runtime/tools/context.js";
import { spawn } from "node:child_process";
import { loadDefaultDotenv } from "../runtime/config/dotenv.js";
import { GLOBAL_TOOL_CRED_PROFILE, OPTIONAL_TOOL_ENV_KEYS } from "../runtime/profiles/toolKeys.js";
import { StructuredLogger, parseLogLevel, truncateForLog } from "../runtime/logging/structuredLogger.js";

function usage(): void {
  // eslint-disable-next-line no-console
  console.log(`Usage:
  ff-terminal daemon
  ff-terminal ui
  ff-terminal start [profile] [--display-mode verbose|clean]
  ff-terminal web
  ff-terminal acp [--profile <name>]
  ff-terminal run --prompt "..." [--profile <name>] [--session <id>] [--headless]
  ff-terminal run --scheduled-task <id-or-name> [--profile <name>] [--session <id>] --headless
  ff-terminal schedule list
  ff-terminal schedule status <name>
  ff-terminal profile setup
  ff-terminal profile list
  ff-terminal profile default <name>
  ff-terminal profile delete <name>
  ff-terminal profile tool-keys
`);
}

const warnIfLocalWorkspace = (workspaceDir: string, repoRoot: string | null): void => {
  if (!repoRoot) return;
  const localWs = path.join(repoRoot, "ff-terminal-workspace");
  if (path.normalize(localWs) !== path.normalize(workspaceDir) && fs.existsSync(localWs)) {
    // eslint-disable-next-line no-console
    console.warn(
      `Warning: found repo-local workspace at ${localWs} but using canonical workspace ${workspaceDir}. Files in the repo-local copy will be ignored.`
    );
  }
};

function pickArg(args: string[], flag: string): string | null {
  const i = args.findIndex((a) => a === flag);
  if (i === -1) return null;
  return args[i + 1] ?? null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function sanitizeEnvInPlace(): void {
  const blockedPrefixes = ["OPENROUTER_", "ANTHROPIC_", "MINIMAX_", "LM_STUDIO_", "FF_CONFIG_PATH"];
  for (const k of Object.keys(process.env)) {
    if (blockedPrefixes.some((p) => k.startsWith(p))) delete (process.env as any)[k];
  }
}

function safeModel(model?: string): string | undefined {
  const m = (model || "").trim();
  return m.length ? m : undefined;
}

async function applyProviderCredentialsFromProfile(profile: ReturnType<typeof getProfileByName>): Promise<void> {
  if (!profile) return;

  try {
    if (profile.provider === "openrouter") {
      const cred = await getCredential(profile.name, "OPENROUTER_API_KEY");
      if (!cred) throw new Error("OPENROUTER_API_KEY");
      process.env.OPENROUTER_API_KEY = cred;
    } else if (profile.provider === "anthropic") {
      const cred = await getCredential(profile.name, "ANTHROPIC_API_KEY");
      if (!cred) throw new Error("ANTHROPIC_API_KEY");
      process.env.ANTHROPIC_API_KEY = cred;
      if (profile.baseUrl) process.env.ANTHROPIC_BASE_URL = profile.baseUrl;
    } else if (profile.provider === "zai") {
      const cred = await getCredential(profile.name, "ANTHROPIC_AUTH_TOKEN");
      if (!cred) throw new Error("ANTHROPIC_AUTH_TOKEN");
      process.env.ANTHROPIC_AUTH_TOKEN = cred;
      if (profile.baseUrl) process.env.ANTHROPIC_BASE_URL = profile.baseUrl;
    } else if (profile.provider === "minimax") {
      const cred = await getCredential(profile.name, "MINIMAX_API_KEY");
      if (!cred) throw new Error("MINIMAX_API_KEY");
      process.env.MINIMAX_API_KEY = cred;
      if (profile.baseUrl) process.env.MINIMAX_BASE_URL = profile.baseUrl;
    } else if (profile.provider === "lmstudio") {
      if (profile.baseUrl) process.env.LM_STUDIO_BASE_URL = profile.baseUrl;
    } else if (profile.provider === "openai-compatible") {
      const cred = await getCredential(profile.name, "API_KEY");
      if (!cred) throw new Error("API_KEY");
      process.env.API_KEY = cred;
      if (profile.baseUrl) process.env.OPENAI_BASE_URL = profile.baseUrl;
    } else if (profile.provider === "anthropic-compatible") {
      const cred = await getCredential(profile.name, "API_KEY");
      if (!cred) throw new Error("API_KEY");
      process.env.API_KEY = cred;
      if (profile.baseUrl) process.env.ANTHROPIC_BASE_URL = profile.baseUrl;
    }
  } catch (error) {
    const credentialType = error instanceof Error ? error.message : "credentials";
    // eslint-disable-next-line no-console
    console.error(`Error: Credential not found (${credentialType}). Run: ff-terminal profile setup`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  // Load .env/.env.local (cwd + repo root) for convenience (API keys like TAVILY_API_KEY, PERPLEXITY_API_KEY, etc.).
  loadDefaultDotenv({ repoRoot: findRepoRoot() });

  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === "-h" || cmd === "--help") {
    usage();
    process.exit(0);
  }

  if (cmd === "daemon") {
    await startDaemon();
    return;
  }

  if (cmd === "ui") {
    startInkUi();
    return;
  }

  if (cmd === "start") {
    const preferredProfile = rest[0] && !rest[0].startsWith("-") ? rest[0] : undefined;
    const displayModeRaw = pickArg(rest, "--display-mode") || "";
    const displayMode = displayModeRaw.trim().toLowerCase();
    if (displayMode && displayMode !== "verbose" && displayMode !== "clean") {
      throw new Error(`Invalid --display-mode: ${displayModeRaw} (expected verbose|clean)`);
    }
    let config = readConfig();

    if (config.profiles.length === 0) {
      const result = await runProfileSetupWizard({ config });
      config = result.config;
      writeConfig(config);
    }

    const profile = await promptSelectProfile({ config, preferredName: preferredProfile });

    // Apply profile-selected env + config path to this process (daemon + Ink UI run together here).
    sanitizeEnvInPlace();

    process.env.FF_PROFILE = profile.name;
    process.env.FF_PROVIDER = profile.provider;
    if (displayMode) process.env.FF_DISPLAY_MODE = displayMode;
    const model = safeModel(profile.model);
    if (model) process.env.FF_MODEL = model;

    // Provider env injection (mirrors ai-claude-start style: only inject needed secret).
    await applyProviderCredentialsFromProfile(profile);

    // Optional tool keys: profile override → existing env/.env → global defaults → any existing profile (migrates to global).
    for (const k of OPTIONAL_TOOL_ENV_KEYS) {
      const profileValue = await getCredential(profile.name, k);
      if (profileValue) {
        process.env[k] = profileValue;
        continue;
      }

      // Respect explicitly-set env/.env values if the profile doesn't override.
      if (String(process.env[k] || "").trim()) continue;

      const globalValue = await getCredential(GLOBAL_TOOL_CRED_PROFILE, k);
      if (globalValue) {
        process.env[k] = globalValue;
        continue;
      }

      // Back-compat migration: if user previously stored tool keys only on a single profile,
      // auto-discover and cache as a global default.
      for (const p of config.profiles) {
        if (p.name === profile.name) continue;
        const v = await getCredential(p.name, k);
        if (!v) continue;
        process.env[k] = v;
        await storeCredential(GLOBAL_TOOL_CRED_PROFILE, k, v);
        break;
      }
    }

    // Optional per-profile model overrides.
    if (profile.subagentModel?.trim()) process.env.FF_SUBAGENT_MODEL = profile.subagentModel.trim();
    if (profile.toolModel?.trim()) process.env.FF_TOOL_MODEL = profile.toolModel.trim();
    if (profile.webModel?.trim()) process.env.FF_WEB_MODEL = profile.webModel.trim();
    if (profile.imageModel?.trim()) process.env.FF_IMAGE_MODEL = profile.imageModel.trim();
    if (profile.videoModel?.trim()) process.env.FF_VIDEO_MODEL = profile.videoModel.trim();

    // Match the ai-claude-start approach: spawn runtime + UI as child processes with the selected env.
    const env = { ...process.env } as Record<string, string>;
    const port = Number(env.FF_TERMINAL_PORT || 28888);

    // eslint-disable-next-line no-console
    console.log(`Using profile: ${profile.name} (${profile.provider})`);
    if (model) {
      // eslint-disable-next-line no-console
      console.log(`Model: ${model}`);
    }
    // eslint-disable-next-line no-console
    console.log(`Starting daemon... (ws://127.0.0.1:${port})`);
    const argv1 = process.argv[1] || "";
    const isDevTs = argv1.endsWith(".ts") || argv1.endsWith(".tsx");
    const projectDir = (() => {
      const abs = path.resolve(argv1 || "");
      if (abs.includes(`${path.sep}src${path.sep}bin${path.sep}ff-terminal.ts`)) {
        return path.resolve(path.dirname(abs), "..", "..");
      }
      if (abs.includes(`${path.sep}dist${path.sep}bin${path.sep}ff-terminal.js`)) {
        return path.resolve(path.dirname(abs), "..", "..");
      }
      return process.cwd();
    })();

    const localTsx = path.join(projectDir, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
    const tsxCmd = fs.existsSync(localTsx) ? localTsx : "tsx";

    const daemonCmd = isDevTs ? "tsx" : process.execPath;
    const daemonArgs = isDevTs ? ["src/daemon/daemon.ts"] : ["dist/daemon/daemon.js"];

    const uiCmd = isDevTs ? "tsx" : process.execPath;
    const uiArgs = isDevTs ? ["src/cli/app.tsx"] : ["dist/cli/app.js"];

    const daemonSpawnCmd = isDevTs ? tsxCmd : daemonCmd;
    const uiSpawnCmd = isDevTs ? tsxCmd : uiCmd;

    // Important: do NOT inherit stdio for the daemon; any stdout/stderr output will fight with Ink and cause flicker.
    const daemon = spawn(daemonSpawnCmd, daemonArgs, { env, stdio: ["ignore", "pipe", "pipe"], shell: true, cwd: projectDir });
    if (env.FF_DAEMON_LOG === "1") {
      daemon.stdout?.on("data", (b) => process.stderr.write(String(b)));
      daemon.stderr?.on("data", (b) => process.stderr.write(String(b)));
    }

    // Start UI shortly after daemon starts; UI has reconnect logic anyway.
    await new Promise((r) => setTimeout(r, 300));
    const ui = spawn(uiSpawnCmd, uiArgs, { env, stdio: "inherit", shell: true, cwd: projectDir });

    const shutdown = () => {
      try {
        daemon.kill("SIGTERM");
      } catch {
        // ignore
      }
    };

    ui.on("exit", (code: number | null) => {
      shutdown();
      process.exit(code || 0);
    });
    ui.on("error", () => shutdown());
    daemon.on("exit", () => {});
    return;
  }

  if (cmd === "web") {
    await startWebServer();
    return;
  }

  if (cmd === "acp") {
    const profileName = pickArg(rest, "--profile");
    const repoRoot = findRepoRoot();
    const workspaceDir = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR ?? undefined);
    warnIfLocalWorkspace(workspaceDir, repoRoot);

    if (profileName) {
      const config = readConfig();
      const profile = getProfileByName(config, profileName);
      if (!profile) throw new Error(`No such profile: ${profileName}\n`);

      process.env.FF_PROVIDER = profile.provider;
      process.env.FF_PROFILE = profile.name;

      const model = profile.model?.trim();
      if (model) process.env.FF_MODEL = model;

      await applyProviderCredentialsFromProfile(profile);

      if (profile.subagentModel?.trim()) process.env.FF_SUBAGENT_MODEL = profile.subagentModel.trim();
      if (profile.toolModel?.trim()) process.env.FF_TOOL_MODEL = profile.toolModel.trim();
      if (profile.webModel?.trim()) process.env.FF_WEB_MODEL = profile.webModel.trim();
      if (profile.imageModel?.trim()) process.env.FF_IMAGE_MODEL = profile.imageModel.trim();
      if (profile.videoModel?.trim()) process.env.FF_VIDEO_MODEL = profile.videoModel.trim();

      for (const k of OPTIONAL_TOOL_ENV_KEYS) {
        const profileValue = await getCredential(profile.name, k);
        if (profileValue) {
          process.env[k] = profileValue;
          continue;
        }
        if (String(process.env[k] || "").trim()) continue;
        const globalValue = await getCredential(GLOBAL_TOOL_CRED_PROFILE, k);
        if (globalValue) {
          process.env[k] = globalValue;
          continue;
        }
      }

      // eslint-disable-next-line no-console
      console.log(`Using profile: ${profile.name} (${profile.provider})`);
      if (model) {
        // eslint-disable-next-line no-console
        console.log(`Model: ${model}`);
      }
    }

    await startAcpServer({ repoRoot, workspaceDir });
    return;
  }

  if (cmd === "run") {
    const userPrompt = pickArg(rest, "--prompt") || "";
    const scheduledTaskRef = pickArg(rest, "--scheduled-task");
    const headless = hasFlag(rest, "--headless");
    const profileName = pickArg(rest, "--profile");

    if (!userPrompt && !scheduledTaskRef) throw new Error("Missing --prompt or --scheduled-task\n");
    if (scheduledTaskRef && !headless) throw new Error("--scheduled-task requires --headless\n");

    const sessionId = pickArg(rest, "--session") || newId("session");

    const repoRoot = findRepoRoot();
    const workspaceDir = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR ?? undefined);
    warnIfLocalWorkspace(workspaceDir, repoRoot);


    // Load profile if specified
    if (profileName) {
      const config = readConfig();
      const profile = getProfileByName(config, profileName);
      if (!profile) throw new Error(`No such profile: ${profileName}\n`);

      // Set provider
      process.env.FF_PROVIDER = profile.provider;
      process.env.FF_PROFILE = profile.name;

      // Set model
      const model = profile.model?.trim();
      if (model) process.env.FF_MODEL = model;

      // Set up credentials based on provider
      await applyProviderCredentialsFromProfile(profile);

      // Optional per-profile model overrides
      if (profile.subagentModel?.trim()) process.env.FF_SUBAGENT_MODEL = profile.subagentModel.trim();
      if (profile.toolModel?.trim()) process.env.FF_TOOL_MODEL = profile.toolModel.trim();
      if (profile.webModel?.trim()) process.env.FF_WEB_MODEL = profile.webModel.trim();
      if (profile.imageModel?.trim()) process.env.FF_IMAGE_MODEL = profile.imageModel.trim();
      if (profile.videoModel?.trim()) process.env.FF_VIDEO_MODEL = profile.videoModel.trim();

      // Optional tool keys: profile override → existing env/.env → global defaults
      for (const k of OPTIONAL_TOOL_ENV_KEYS) {
        const profileValue = await getCredential(profile.name, k);
        if (profileValue) {
          process.env[k] = profileValue;
          continue;
        }

        // Respect explicitly-set env/.env values if the profile doesn't override
        if (String(process.env[k] || "").trim()) continue;

        const globalValue = await getCredential(GLOBAL_TOOL_CRED_PROFILE, k);
        if (globalValue) {
          process.env[k] = globalValue;
          continue;
        }
      }

      // eslint-disable-next-line no-console
      console.log(`Using profile: ${profile.name} (${profile.provider})`);
      if (model) {
        // eslint-disable-next-line no-console
        console.log(`Model: ${model}`);
      }
    }

    const runtimeCfg = resolveConfig({ repoRoot });
    const logLevel = parseLogLevel((runtimeCfg as any).log_level);
    const logMaxBytes = Number((runtimeCfg as any).log_max_bytes ?? 5 * 1024 * 1024);
    const logRetention = Number((runtimeCfg as any).log_retention ?? 3);
    const runStartedAt = Date.now();
    let runLogger: StructuredLogger | null = null;
    const registry = new ToolRegistry();
    registerAllTools(registry, { workspaceDir });

    let promptToRun = userPrompt;
    let scheduledTaskName: string | null = null;

    if (scheduledTaskRef) {
      const store = loadTaskStore(workspaceDir);
      const task =
        store.tasks.find((t) => t.id === scheduledTaskRef) ||
        store.tasks.find((t) => t.name === scheduledTaskRef);
      if (!task) throw new Error(`No such scheduled task: ${scheduledTaskRef}\n`);
      if (!task.prompt && !task.workflow) throw new Error(`Scheduled task ${task.name} has no prompt/workflow\n`);
      if (task.workflow) throw new Error("workflows are not implemented yet in TS runner\n");
      promptToRun = task.prompt || "";
      scheduledTaskName = task.name;

      task.last_run = { started_at: new Date().toISOString() };
      saveTaskStore(workspaceDir, store);
    }

    const runLogFile = path.join(
      workspaceDir,
      "logs",
      "runs",
      `${scheduledTaskName ? `scheduled_${scheduledTaskName}` : `session_${sessionId}`}.jsonl`
    );
    runLogger = new StructuredLogger({ filePath: runLogFile, level: logLevel, maxBytes: logMaxBytes, retention: logRetention });
    runLogger.log("info", "run_start", {
      session_id: sessionId,
      scheduled_task: scheduledTaskName ?? undefined,
      headless,
      prompt_preview: truncateForLog(promptToRun, 400)
    });

    const controller = new AbortController();
    const lines: string[] = [];
    let ok = true;
    let error: string | undefined;
    try {
      await withToolContext(
        { sessionId, workspaceDir, repoRoot },
        async () => {
          for await (const chunk of runAgentTurn({
            userInput: promptToRun,
            registry,
            sessionId,
            repoRoot,
            signal: controller.signal
          })) {
            const line = toWire(chunk);
            lines.push(line);
            process.stdout.write(line + "\n");
            if (chunk.kind === "task_completed") break;
          }
        }
      );
    } catch (err) {
      ok = false;
      error = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(error);
      runLogger?.log("error", "run_exception", {
        session_id: sessionId,
        scheduled_task: scheduledTaskName ?? undefined,
        message: error
      });
      process.exitCode = 1;
    }

    // If this was a scheduled task, persist a run record and also write a log file in the workspace.
    if (scheduledTaskName) {
      const logsDir = path.join(workspaceDir, "logs", "scheduled_runs");
      fs.mkdirSync(logsDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const logPath = path.join(logsDir, `${scheduledTaskName}_${stamp}.log`);
      fs.writeFileSync(logPath, lines.join("\n") + "\n", "utf8");
      runLogger?.log("info", "run_stdout_saved", {
        session_id: sessionId,
        scheduled_task: scheduledTaskName,
        path: logPath,
        lines: lines.length
      });

      const store = loadTaskStore(workspaceDir);
      const task = store.tasks.find((t) => t.name === scheduledTaskName);
      if (task) {
        task.last_run = {
          ...(task.last_run || {}),
          started_at: task.last_run?.started_at || new Date().toISOString(),
          finished_at: new Date().toISOString(),
          ok,
          error,
          session_id: sessionId,
          stdout_log: logPath,
          duration_ms: Date.now() - runStartedAt
        };
        saveTaskStore(workspaceDir, store);
      }
    }
    runLogger?.log("info", "run_complete", {
      session_id: sessionId,
      scheduled_task: scheduledTaskName ?? undefined,
      ok,
      error,
      duration_ms: Date.now() - runStartedAt
    });
    return;
  }

  if (cmd === "schedule") {
    const action = rest[0];
    const repoRoot = findRepoRoot();
    const workspaceDir = resolveWorkspaceDir(process.env.FF_WORKSPACE_DIR ?? undefined);
    warnIfLocalWorkspace(workspaceDir, repoRoot);


    if (action === "list") {
      const store = loadTaskStore(workspaceDir);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(store.tasks, null, 2));
      return;
    }

    if (action === "status") {
      const name = rest[1];
      if (!name) throw new Error("Missing task name\n");
      const store = loadTaskStore(workspaceDir);
      const task = store.tasks.find((t) => t.name === name);
      if (!task) throw new Error(`No such task: ${name}\n`);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    // Helpful for debugging: show where the task store lives.
    if (action === "path") {
      // eslint-disable-next-line no-console
      console.log(taskStorePath(workspaceDir));
      return;
    }

    usage();
    process.exit(1);
  }

  if (cmd === "profile") {
    const action = rest[0];
    let config = readConfig();

    if (action === "setup") {
      const result = await runProfileSetupWizard({ config });
      config = result.config;
      writeConfig(config);
      return;
    }

    if (action === "list") {
      // eslint-disable-next-line no-console
      console.log("Available profiles:\n");
      if (config.profiles.length === 0) {
        // eslint-disable-next-line no-console
        console.log("  (none)  Run: ff-terminal profile setup");
        return;
      }
      for (const p of config.profiles) {
        const isDefault = config.defaultProfile && p.name === config.defaultProfile;
        const providerKey =
          p.provider === "openrouter"
            ? "OPENROUTER_API_KEY"
            : p.provider === "zai"
              ? "ANTHROPIC_AUTH_TOKEN"
              : p.provider === "minimax"
                ? "MINIMAX_API_KEY"
                : null;
        const cred = providerKey ? await getCredential(p.name, providerKey) : null;
        const extraKeys = ["TAVILY_API_KEY", "PERPLEXITY_API_KEY", "GOOGLE_GEMINI_API_KEY", "OPENAI_API_KEY", "OPENWEATHER_API_KEY"] as const;
        let extras = 0;
        for (const k of extraKeys) {
          if (await getCredential(p.name, k)) extras += 1;
        }
        // eslint-disable-next-line no-console
        console.log(`- ${p.name}${isDefault ? " (default)" : ""} ${cred ? "✓" : "✗"}${extras ? ` (+${extras} tool key${extras === 1 ? "" : "s"})` : ""}`);
        // eslint-disable-next-line no-console
        console.log(`  provider: ${p.provider}`);
        if (p.baseUrl) console.log(`  baseUrl:  ${p.baseUrl}`);
        if (p.model) console.log(`  model:    ${p.model}`);
      }
      return;
    }

    if (action === "default") {
      const name = rest[1];
      if (!name) throw new Error("Missing profile name\n");
      const profile = getProfileByName(config, name);
      if (!profile) throw new Error(`No such profile: ${name}\n`);
      config.defaultProfile = name;
      writeConfig(config);
      // eslint-disable-next-line no-console
      console.log(`Default profile set to ${name}`);
      return;
    }

    if (action === "delete") {
      const name = rest[1];
      if (!name) throw new Error("Missing profile name\n");
      const idx = config.profiles.findIndex((p) => p.name === name);
      if (idx === -1) throw new Error(`No such profile: ${name}\n`);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = (await rl.question(`Delete profile "${name}"? (y/N): `)).trim().toLowerCase();
        if (answer !== "y") return;
      } finally {
        rl.close();
      }

      config.profiles.splice(idx, 1);
      if (config.defaultProfile === name) config.defaultProfile = config.profiles[0]?.name;
      writeConfig(config);
      await deleteCredential(name);
      // eslint-disable-next-line no-console
      console.log(`Deleted profile ${name}`);
      return;
    }

    if (action === "tool-keys") {
      const { runToolKeysManager } = await import("../runtime/profiles/toolKeysManager.js");
      await runToolKeysManager();
      return;
    }

    usage();
    process.exit(1);
  }

  usage();
  process.exit(1);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
