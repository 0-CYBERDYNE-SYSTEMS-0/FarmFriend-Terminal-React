import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import type { OracleMode, SessionStrategy } from "./loop.js";
import { readConfig, writeConfig, getProfileByName, getCredential } from "../profiles/storage.js";
import { runProfileSetupWizard } from "../profiles/wizard.js";
import { runAgentTurn } from "../agentLoop.js";
import { ToolRegistry } from "../tools/registry.js";
import { registerAllTools } from "../registerDefaultTools.js";
import { withToolContext } from "../tools/context.js";
import { newId } from "../../shared/ids.js";
import { GLOBAL_TOOL_CRED_PROFILE, OPTIONAL_TOOL_ENV_KEYS } from "../profiles/toolKeys.js";

type InquirerLike = {
  prompt: <T = any>(questions: any) => Promise<T>;
};

export type AutonomyWizardResult = {
  startNow: boolean;
  profileName: string | null;
  promptFile: string;
  tasksFile: string;
  completionPromise: string;
  maxLoops: number;
  stallLimit: number;
  sleepMs: number;
  oracleMode: OracleMode;
  highRiskKeywords: string[];
  sessionStrategy: SessionStrategy;
  sessionId?: string;
};

const PROMPT_TEMPLATE = [
  "# Autonomy Prompt",
  "",
  "Goal:",
  "- Describe the objective here.",
  "",
  "Guidelines:",
  "- Update TASKS.md as you work.",
  "- Stop when you can output the completion promise exactly as <promise>...</promise> on its own line.",
  ""
].join("\n");

const TASKS_TEMPLATE = [
  "# Tasks",
  "",
  "- [ ] Define initial steps",
  ""
].join("\n");

async function tryInquirer(): Promise<InquirerLike | null> {
  try {
    const mod = await import("inquirer");
    const i = ((mod as any).default || mod) as InquirerLike;
    return typeof i?.prompt === "function" ? i : null;
  } catch {
    return null;
  }
}

async function applyProviderCredentialsForWizard(profileName: string | null): Promise<void> {
  if (!profileName) return;
  const config = readConfig();
  const profile = getProfileByName(config, profileName);
  if (!profile) throw new Error(`Profile not found: ${profileName}`);

  process.env.FF_PROVIDER = profile.provider;
  process.env.FF_PROFILE = profile.name;
  if (profile.model?.trim()) process.env.FF_MODEL = profile.model.trim();

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

  for (const k of OPTIONAL_TOOL_ENV_KEYS) {
    const profileValue = await getCredential(profile.name, k);
    if (profileValue) {
      process.env[k] = profileValue;
      continue;
    }
    if (String(process.env[k] || "").trim()) continue;
    const globalValue = await getCredential(GLOBAL_TOOL_CRED_PROFILE, k);
    if (globalValue) process.env[k] = globalValue;
  }
}

function extractJsonObject(raw: string): any | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function resolveInputPath(repoRoot: string, raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.resolve(repoRoot, trimmed);
}

async function readMultilineGoal(
  rl: readline.Interface,
  label: string,
  closeOnDone: boolean
): Promise<string> {
  // eslint-disable-next-line no-console
  console.log(`${label} (multi-line; finish with a single "." or blank line)`);
  const lines: string[] = [];
  let finished = false;

  return new Promise((resolve) => {
    const finish = () => {
      if (finished) return;
      finished = true;
      rl.removeListener("line", onLine);
      rl.removeListener("close", onClose);
      if (closeOnDone) rl.close();
      resolve(lines.join("\n").trim());
    };

    const onLine = (line: string) => {
      if (line.trim() === "." || line.trim() === "") {
        finish();
        return;
      }
      lines.push(line);
      rl.prompt();
    };

    const onClose = () => finish();

    rl.on("line", onLine);
    rl.on("close", onClose);
    rl.setPrompt("> ");
    rl.prompt();
  });
}

function toNumber(value: string | number, fallback: number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const num = Number(String(value || "").trim());
  return Number.isFinite(num) ? num : fallback;
}

async function ensureFile(pathToFile: string, template: string, create: boolean): Promise<void> {
  if (fs.existsSync(pathToFile)) return;
  if (!create) return;
  fs.mkdirSync(path.dirname(pathToFile), { recursive: true });
  fs.writeFileSync(pathToFile, template, "utf8");
}

async function generateAutonomyDrafts(params: {
  repoRoot: string;
  workspaceDir: string;
  completionPromise: string;
  wantPrompt: boolean;
  wantTasks: boolean;
  goal?: string;
}): Promise<{ prompt?: string; tasks?: string; raw: string } | null> {
  const prompt = [
    "You are preparing files for an autonomy loop.",
    "Return ONLY a JSON object with keys:",
    "  - prompt: string (content for PROMPT.md)",
    "  - tasks: string (content for TASKS.md)",
    "",
    params.goal ? `User goal: ${params.goal}` : "User goal: (not provided)",
    `Completion promise: ${params.completionPromise || "✅ COMPLETED"}`,
    "Requirements:",
    "- Include the completion promise in PROMPT.md explicitly, as <promise>...</promise> on its own line.",
    "- Include the completion promise in TASKS.md explicitly as well.",
    "- Keep PROMPT.md concise, with goal, constraints, and process.",
    "- TASKS.md should start with a checklist stub.",
    "- Do not include markdown fences or explanations.",
    "",
    `Need prompt: ${params.wantPrompt ? "yes" : "no"}`,
    `Need tasks: ${params.wantTasks ? "yes" : "no"}`
  ].join("\n");

  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir: params.workspaceDir });
  const sessionId = newId("session");
  const controller = new AbortController();
  let assistantText = "";
  await withToolContext({ sessionId, workspaceDir: params.workspaceDir, repoRoot: params.repoRoot }, async () => {
    for await (const chunk of runAgentTurn({
      userInput: prompt,
      registry,
      sessionId,
      repoRoot: params.repoRoot,
      signal: controller.signal
    })) {
      if (chunk.kind === "content") assistantText += chunk.delta;
    }
  });

  const parsed = extractJsonObject(assistantText);
  if (!parsed || typeof parsed !== "object") return null;
  return {
    prompt: typeof parsed.prompt === "string" ? parsed.prompt : undefined,
    tasks: typeof parsed.tasks === "string" ? parsed.tasks : undefined,
    raw: assistantText
  };
}

async function chooseProfile(inquirer: InquirerLike | null, preferred?: string | null): Promise<string | null> {
  let config = readConfig();

  if (preferred) {
    const found = config.profiles.find((p) => p.name === preferred);
    if (found) return preferred;
  }

  if (config.profiles.length === 0) {
    if (inquirer) {
      const { setup } = await inquirer.prompt<{ setup: boolean }>([
        { type: "confirm", name: "setup", message: "No profiles configured. Run profile setup now?", default: true }
      ]);
      if (setup) {
        const result = await runProfileSetupWizard({ config, mode: "create" });
        writeConfig(result.config);
        config = result.config;
        return result.created.name;
      }
      return null;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      // eslint-disable-next-line no-console
      console.log("No profiles configured.");
      const answer = await rl.question("Run profile setup now? (y/N): ");
      const normalized = answer.trim().toLowerCase();
      if (normalized === "y" || normalized === "yes") {
        const result = await runProfileSetupWizard({ config, mode: "create" });
        writeConfig(result.config);
        return result.created.name;
      }
      return null;
    } finally {
      rl.close();
    }
  }

  if (inquirer) {
    const choices = [
      { name: "env (use environment variables)", value: "env" },
      ...config.profiles.map((p) => ({
        name: p.name === config.defaultProfile ? `${p.name} (default)` : p.name,
        value: p.name
      }))
    ];
    const { selected } = await inquirer.prompt<{ selected: string }>([
      { type: "list", name: "selected", message: "Select a profile to use:", choices, default: config.defaultProfile || "env" }
    ]);
    return selected === "env" ? null : selected;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    // eslint-disable-next-line no-console
    console.log("\nAvailable profiles:");
    // eslint-disable-next-line no-console
    console.log("  0) env (use environment variables)");
    config.profiles.forEach((p, idx) => {
      const isDefault = config.defaultProfile && p.name === config.defaultProfile;
      // eslint-disable-next-line no-console
      console.log(`  ${idx + 1}) ${p.name}${isDefault ? " (default)" : ""} — ${p.provider}`);
    });
    const answer = await rl.question(`\nSelect profile [0-${config.profiles.length}] (default: ${config.defaultProfile ?? "0"}): `);
    const trimmed = answer.trim();
    if (!trimmed && config.defaultProfile) return config.defaultProfile;
    const n = Number(trimmed || "0");
    if (!Number.isFinite(n) || n < 0 || n > config.profiles.length) throw new Error("Invalid selection");
    if (n === 0) return null;
    return config.profiles[n - 1]?.name ?? null;
  } finally {
    rl.close();
  }
}

export async function runAutonomyWizard(params: {
  repoRoot: string;
  workspaceDir: string;
  defaultCompletionPromise: string;
  preferredProfile?: string | null;
}): Promise<AutonomyWizardResult | null> {
  const inquirer = await tryInquirer();
  const completionDefault = params.defaultCompletionPromise;

  const profileName = await chooseProfile(inquirer, params.preferredProfile);
  const repoRoot = params.repoRoot;
  try {
    await applyProviderCredentialsForWizard(profileName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.log(`Error: Credential not found (${msg}). Run: ff-terminal profile setup`);
    return null;
  }

  if (inquirer) {
    const { promptFileRaw } = await inquirer.prompt<{ promptFileRaw: string }>([
      { type: "input", name: "promptFileRaw", message: "Prompt file", default: "PROMPT.md" }
    ]);
    const promptFile = resolveInputPath(repoRoot, promptFileRaw || "PROMPT.md");
    const promptExists = fs.existsSync(promptFile);
    let createPrompt = false;
    let generatePrompt = false;
    if (!promptExists) {
      const { promptAction } = await inquirer.prompt<{ promptAction: "template" | "generate" | "cancel" }>([
        {
          type: "list",
          name: "promptAction",
          message: `Prompt file not found (${path.basename(promptFile)}). Choose:`,
          choices: [
            { name: "Create starter template", value: "template" },
            { name: "Generate with AI", value: "generate" },
            { name: "Cancel", value: "cancel" }
          ],
          default: "template"
        }
      ]);
      if (promptAction === "template") createPrompt = true;
      if (promptAction === "generate") generatePrompt = true;
      if (promptAction === "cancel") return null;
    }

    const { tasksFileRaw } = await inquirer.prompt<{ tasksFileRaw: string }>([
      { type: "input", name: "tasksFileRaw", message: "Tasks/state file", default: "TASKS.md" }
    ]);
    const tasksFile = resolveInputPath(repoRoot, tasksFileRaw || "TASKS.md");
    const tasksExists = fs.existsSync(tasksFile);
    let createTasks = false;
    let generateTasks = false;
    if (!tasksExists) {
      const { tasksAction } = await inquirer.prompt<{ tasksAction: "template" | "generate" | "skip" }>([
        {
          type: "list",
          name: "tasksAction",
          message: `Tasks file not found (${path.basename(tasksFile)}). Choose:`,
          choices: [
            { name: "Create starter template", value: "template" },
            { name: "Generate with AI", value: "generate" },
            { name: "Skip for now", value: "skip" }
          ],
          default: "template"
        }
      ]);
      if (tasksAction === "template") createTasks = true;
      if (tasksAction === "generate") generateTasks = true;
    }

    const goalRl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const goal = await readMultilineGoal(goalRl, "Goal / task description (used for AI draft)", true);

    if (promptExists && !generatePrompt) {
      const { regeneratePrompt } = await inquirer.prompt<{ regeneratePrompt: boolean }>([
        { type: "confirm", name: "regeneratePrompt", message: "PROMPT.md exists. Generate a new AI draft anyway?", default: false }
      ]);
      if (regeneratePrompt) generatePrompt = true;
    }

    if (tasksExists && !generateTasks) {
      const { regenerateTasks } = await inquirer.prompt<{ regenerateTasks: boolean }>([
        { type: "confirm", name: "regenerateTasks", message: "TASKS.md exists. Generate a new AI draft anyway?", default: false }
      ]);
      if (regenerateTasks) generateTasks = true;
    }

    const { completionPromise } = await inquirer.prompt<{ completionPromise: string }>([
      {
        type: "input",
        name: "completionPromise",
        message: "Completion promise (used inside <promise>...</promise>)",
        default: completionDefault
      }
    ]);

    const { maxLoops, stallLimit, sleepMs } = await inquirer.prompt<{ maxLoops: number; stallLimit: number; sleepMs: number }>([
      { type: "number", name: "maxLoops", message: "Max loops", default: 200 },
      { type: "number", name: "stallLimit", message: "Stall limit", default: 5 },
      { type: "number", name: "sleepMs", message: "Sleep (ms)", default: 30000 }
    ]);

    const oracleMode: OracleMode = "off";
    const sessionStrategy: SessionStrategy = "new";
    const sessionId: string | undefined = undefined;

    if (generatePrompt || generateTasks) {
      const draft = await generateAutonomyDrafts({
        repoRoot,
        workspaceDir: params.workspaceDir,
        completionPromise,
        wantPrompt: generatePrompt,
        wantTasks: generateTasks,
        goal: goal?.trim() || undefined
      });

      if (!draft) {
        // eslint-disable-next-line no-console
        console.log("AI generation failed. Falling back to template if selected.");
      } else {
        if (generatePrompt && draft.prompt) {
          // eslint-disable-next-line no-console
          console.log("\n--- PROMPT.md (AI draft) ---\n" + draft.prompt + "\n---\n");
        }
        if (generateTasks && draft.tasks) {
          // eslint-disable-next-line no-console
          console.log("\n--- TASKS.md (AI draft) ---\n" + draft.tasks + "\n---\n");
        }
        const { approveWrite } = await inquirer.prompt<{ approveWrite: boolean }>([
          { type: "confirm", name: "approveWrite", message: "Write generated files to disk?", default: false }
        ]);
        if (approveWrite) {
          if (generatePrompt && draft.prompt) {
            fs.mkdirSync(path.dirname(promptFile), { recursive: true });
            fs.writeFileSync(promptFile, draft.prompt, "utf8");
          }
          if (generateTasks && draft.tasks) {
            fs.mkdirSync(path.dirname(tasksFile), { recursive: true });
            fs.writeFileSync(tasksFile, draft.tasks, "utf8");
          }
        }
      }
    }

    await ensureFile(promptFile, PROMPT_TEMPLATE, createPrompt);
    await ensureFile(tasksFile, TASKS_TEMPLATE, createTasks);

    if (!fs.existsSync(promptFile)) {
      // eslint-disable-next-line no-console
      console.log("Prompt file is required to run autonomy. Exiting wizard.");
      return null;
    }

    // eslint-disable-next-line no-console
    console.log("\nAutonomy Mode Summary");
    // eslint-disable-next-line no-console
    console.log(`- Profile: ${profileName ?? "env"}`);
    // eslint-disable-next-line no-console
    console.log(`- Prompt: ${promptFile}`);
    // eslint-disable-next-line no-console
    console.log(`- Tasks: ${tasksFile}`);
    // eslint-disable-next-line no-console
    console.log(`- Completion promise: <promise>${completionPromise}</promise>`);
    // eslint-disable-next-line no-console
    console.log(`- Max loops: ${maxLoops}`);
    // eslint-disable-next-line no-console
    console.log(`- Stall limit: ${stallLimit}`);
    // eslint-disable-next-line no-console
    console.log(`- Sleep: ${sleepMs} ms`);
    // eslint-disable-next-line no-console
    console.log(`- Oracle: off`);
    // eslint-disable-next-line no-console
    console.log(`- Session: ${sessionStrategy}${sessionId ? ` (${sessionId})` : ""}`);

    const { startNow } = await inquirer.prompt<{ startNow: boolean }>([
      { type: "confirm", name: "startNow", message: "Start now?", default: false }
    ]);

    return {
      startNow,
      profileName,
      promptFile,
      tasksFile,
      completionPromise,
      maxLoops: toNumber(maxLoops, 200),
      stallLimit: toNumber(stallLimit, 5),
      sleepMs: toNumber(sleepMs, 30000),
      oracleMode,
      highRiskKeywords: [],
      sessionStrategy: "new",
      sessionId
    };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    // eslint-disable-next-line no-console
    console.log("\nAutonomy Mode Wizard\n");
    const promptFileRaw = await rl.question("Prompt file (default PROMPT.md): ");
    const promptFile = resolveInputPath(repoRoot, promptFileRaw || "PROMPT.md");
    const promptExists = fs.existsSync(promptFile);
    let createPrompt = false;
    let generatePrompt = false;
    if (!promptExists) {
      const answer = await rl.question(`Prompt file not found. Create template (t), generate with AI (g), or cancel (c)? [t/g/c]: `);
      const normalized = answer.trim().toLowerCase();
      if (normalized === "g") generatePrompt = true;
      else if (normalized === "t" || normalized === "y" || normalized === "yes") createPrompt = true;
      else return null;
    }

    const tasksFileRaw = await rl.question("Tasks file (default TASKS.md): ");
    const tasksFile = resolveInputPath(repoRoot, tasksFileRaw || "TASKS.md");
    const tasksExists = fs.existsSync(tasksFile);
    let createTasks = false;
    let generateTasks = false;
    if (!tasksExists) {
      const answer = await rl.question(`Tasks file not found. Create template (t), generate with AI (g), or skip (s)? [t/g/s]: `);
      const normalized = answer.trim().toLowerCase();
      if (normalized === "g") generateTasks = true;
      else if (normalized === "t" || normalized === "y" || normalized === "yes") createTasks = true;
    }

    const goal = await readMultilineGoal(rl, "Goal / task description (used for AI draft, optional)", false);
    if (promptExists && !generatePrompt) {
      const answer = await rl.question("PROMPT.md exists. Generate a new AI draft anyway? (y/N): ");
      if (["y", "yes"].includes(answer.trim().toLowerCase())) generatePrompt = true;
    }
    if (tasksExists && !generateTasks) {
      const answer = await rl.question("TASKS.md exists. Generate a new AI draft anyway? (y/N): ");
      if (["y", "yes"].includes(answer.trim().toLowerCase())) generateTasks = true;
    }
    const completionPromise = (await rl.question(
      `Completion promise (used inside <promise>...</promise>, default ${completionDefault}): `
    )).trim() || completionDefault;
    const maxLoops = toNumber(await rl.question("Max loops (default 200): "), 200);
    const stallLimit = toNumber(await rl.question("Stall limit (default 5): "), 5);
    const sleepMs = toNumber(await rl.question("Sleep ms (default 30000): "), 30000);
    const oracleMode: OracleMode = "off";
    const sessionStrategy: SessionStrategy = "new";
    const sessionId: string | undefined = undefined;

    if (generatePrompt || generateTasks) {
      const draft = await generateAutonomyDrafts({
        repoRoot,
        workspaceDir: params.workspaceDir,
        completionPromise,
        wantPrompt: generatePrompt,
        wantTasks: generateTasks,
        goal: goal || undefined
      });

      if (!draft) {
        // eslint-disable-next-line no-console
        console.log("AI generation failed. Falling back to template if selected.");
      } else {
        if (generatePrompt && draft.prompt) {
          // eslint-disable-next-line no-console
          console.log("\n--- PROMPT.md (AI draft) ---\n" + draft.prompt + "\n---\n");
        }
        if (generateTasks && draft.tasks) {
          // eslint-disable-next-line no-console
          console.log("\n--- TASKS.md (AI draft) ---\n" + draft.tasks + "\n---\n");
        }
        const approve = await rl.question("Write generated files to disk? (y/N): ");
        const approveWrite = ["y", "yes"].includes(approve.trim().toLowerCase());
        if (approveWrite) {
          if (generatePrompt && draft.prompt) {
            fs.mkdirSync(path.dirname(promptFile), { recursive: true });
            fs.writeFileSync(promptFile, draft.prompt, "utf8");
          }
          if (generateTasks && draft.tasks) {
            fs.mkdirSync(path.dirname(tasksFile), { recursive: true });
            fs.writeFileSync(tasksFile, draft.tasks, "utf8");
          }
        }
      }
    }

    await ensureFile(promptFile, PROMPT_TEMPLATE, createPrompt);
    await ensureFile(tasksFile, TASKS_TEMPLATE, createTasks);

    if (!fs.existsSync(promptFile)) {
      // eslint-disable-next-line no-console
      console.log("Prompt file is required to run autonomy. Exiting wizard.");
      return null;
    }

    // eslint-disable-next-line no-console
    console.log("\nAutonomy Mode Summary");
    // eslint-disable-next-line no-console
    console.log(`- Profile: ${profileName ?? "env"}`);
    // eslint-disable-next-line no-console
    console.log(`- Prompt: ${promptFile}`);
    // eslint-disable-next-line no-console
    console.log(`- Tasks: ${tasksFile}`);
    // eslint-disable-next-line no-console
    console.log(`- Completion promise: <promise>${completionPromise}</promise>`);
    // eslint-disable-next-line no-console
    console.log(`- Max loops: ${maxLoops}`);
    // eslint-disable-next-line no-console
    console.log(`- Stall limit: ${stallLimit}`);
    // eslint-disable-next-line no-console
    console.log(`- Sleep: ${sleepMs} ms`);
    // eslint-disable-next-line no-console
    console.log(`- Oracle: off`);
    // eslint-disable-next-line no-console
    console.log(`- Session: ${sessionStrategy}${sessionId ? ` (${sessionId})` : ""}`);

    const startAnswer = await rl.question("Start now? (y/N): ");
    const startNow = ["y", "yes"].includes(startAnswer.trim().toLowerCase());

    return {
      startNow,
      profileName,
      promptFile,
      tasksFile,
      completionPromise,
      maxLoops,
      stallLimit,
      sleepMs,
      oracleMode,
      highRiskKeywords: [],
      sessionStrategy: "new",
      sessionId
    };
  } finally {
    rl.close();
  }
}
