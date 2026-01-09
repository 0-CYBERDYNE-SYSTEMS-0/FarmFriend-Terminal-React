import fs from "node:fs";
import path from "node:path";
import { loadPlanStore, getActivePlan } from "../planning/planStore.js";

const CONTRACT_TEMPLATES: Record<string, string> = {
  "AGENTS.md": `# FarmFriend Terminal - Agents

Purpose: Operating instructions for the FarmFriend Terminal runtime.

- Use clear, plain language.
- Prefer safe defaults; confirm before risky actions.
- Keep long-term facts in MEMORY.md.
- Keep tasks and plans readable in TASKS.md and PLAN.md.
- Log notable actions in LOG.md.
`,
  "BOOTSTRAP.md": `# FarmFriend Terminal - Bootstrap

This file is a first-run ritual. If it exists, follow it once and then clear the file.

Instructions:
- Start with a warm, brief hello.
- Ask **one question at a time** (no multi-question lists).
- Capture answers in USER.md, IDENTITY.md, and SOUL.md.
- Offer a few small suggestions when helpful (name, tone, emoji).
- Keep it short and friendly.
- After completing the onboarding, **clear this file** (write an empty string) so it won't run again.
`,
  "SOUL.md": `# FarmFriend Terminal - Voice & Guardrails

Tone:
- Practical, friendly, and direct.
- Avoid jargon when possible.

Boundaries:
- Ask before destructive actions.
- Protect credentials and private data.
`,
  "TOOLS.md": `# FarmFriend Terminal - Tool Policy

This file documents tool access policy. It is used as a pre-session tool manifest.

Allowed tools (example):
allowed-tools: read_file write_file run_command

Notes:
- If no allowed-tools list is present, all tools remain available.
- ALWAYS_ALLOWED tools (skill_loader, skill_documentation, skill_sequencer, skill_draft, skill_apply) are always permitted.
`,
  "USER.md": `# FarmFriend Terminal - User Profile

- Name:
- Operation / Farm:
- Preferences:
- Safety notes:
`,
  "IDENTITY.md": `# FarmFriend Terminal - Agent Identity

Name: FarmFriend Terminal
Role: Local-first assistant for agriculture and operations
`,
  "MEMORY.md": `# FarmFriend Terminal - Memory

Long-term facts, preferences, and decisions live here.
`,
  "PLAN.md": `# FarmFriend Terminal - Plan

(Auto-updated from runtime plan store when available.)
`,
  "TASKS.md": `# FarmFriend Terminal - Tasks

- [ ] Example task
`,
  "LOG.md": `# FarmFriend Terminal - Log

Chronological record of notable actions.
`
};

const CONTRACT_FILES = Object.keys(CONTRACT_TEMPLATES);

function ensureFile(pathname: string, content: string): void {
  if (fs.existsSync(pathname)) return;
  fs.mkdirSync(path.dirname(pathname), { recursive: true });
  fs.writeFileSync(pathname, content, "utf8");
}

function readFileSafe(p: string): string | null {
  try {
    if (!fs.existsSync(p)) return null;
    const stat = fs.statSync(p);
    if (!stat.isFile()) return null;
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function truncateText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars) + "\n\n...(truncated)";
}

function tailText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return "...\n\n" + input.slice(input.length - maxChars);
}

export function ensureWorkspaceContractFiles(workspaceDir: string): void {
  for (const file of CONTRACT_FILES) {
    const filePath = path.join(workspaceDir, file);
    ensureFile(filePath, CONTRACT_TEMPLATES[file] || "");
  }
  ensureDailyMemoryLog(workspaceDir);
}

export function ensureDailyMemoryLog(workspaceDir: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const dir = path.join(workspaceDir, "memory");
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${day}.md`);
  if (!fs.existsSync(p)) {
  const header = `# Memory Log - ${day}\n\n`;
    fs.writeFileSync(p, header, "utf8");
  }
  return p;
}

export function loadMemorySnapshot(workspaceDir: string, maxChars = 8000): string | undefined {
  const memoryPath = path.join(workspaceDir, "MEMORY.md");
  const memory = readFileSafe(memoryPath);
  if (!memory || !memory.trim()) return undefined;
  const trimmed = truncateText(memory.trim(), Math.max(1000, maxChars));

  const day = new Date().toISOString().slice(0, 10);
  const dailyPath = path.join(workspaceDir, "memory", `${day}.md`);
  const daily = readFileSafe(dailyPath);
  const dailyTrimmed = daily && daily.trim() ? tailText(daily.trim(), Math.floor(maxChars / 2)) : "";

  if (!dailyTrimmed) return trimmed;
  return `${trimmed}\n\n## Today's Memory Log\n\n${dailyTrimmed}`;
}

export type WorkspaceContractSnapshot = {
  agents?: string;
  bootstrap?: string;
  soul?: string;
  tools?: string;
  user?: string;
  identity?: string;
  plan?: string;
  tasks?: string;
  log?: string;
};

export function loadWorkspaceContractSnapshot(workspaceDir: string, maxChars = 6000): WorkspaceContractSnapshot {
  const read = (file: string, limit: number, tail = false) => {
    const p = path.join(workspaceDir, file);
    const raw = readFileSafe(p);
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    return tail ? tailText(trimmed, limit) : truncateText(trimmed, limit);
  };

  return {
    agents: read("AGENTS.md", Math.floor(maxChars / 6)),
    bootstrap: read("BOOTSTRAP.md", Math.floor(maxChars / 6)),
    soul: read("SOUL.md", Math.floor(maxChars / 6)),
    tools: read("TOOLS.md", Math.floor(maxChars / 6)),
    user: read("USER.md", Math.floor(maxChars / 6)),
    identity: read("IDENTITY.md", Math.floor(maxChars / 6)),
    plan: read("PLAN.md", Math.floor(maxChars / 6)),
    tasks: read("TASKS.md", Math.floor(maxChars / 6)),
    log: read("LOG.md", Math.floor(maxChars / 10), true)
  };
}

export function formatWorkspaceContractForPrompt(snapshot: WorkspaceContractSnapshot): string {
  const sections: Array<[string, string | undefined]> = [
    ["AGENTS.md", snapshot.agents],
    ["BOOTSTRAP.md", snapshot.bootstrap],
    ["SOUL.md", snapshot.soul],
    ["TOOLS.md", snapshot.tools],
    ["USER.md", snapshot.user],
    ["IDENTITY.md", snapshot.identity],
    ["PLAN.md", snapshot.plan],
    ["TASKS.md", snapshot.tasks],
    ["LOG.md (latest)", snapshot.log]
  ];

  const lines: string[] = [];
  for (const [label, content] of sections) {
    if (!content) continue;
    lines.push(`### ${label}`);
    lines.push(content.trim());
    lines.push("");
  }
  return lines.length ? lines.join("\n").trim() : "";
}

export type ToolManifest = {
  tools: string[];
  source: string;
};

function normalizeToolList(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = String(raw || "").trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function parseListFromInline(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // fall through to split
    }
  }
  return trimmed.split(/[,\s]+/g).map((v) => v.trim()).filter(Boolean);
}

function parseToolsFromMarkdown(md: string): string[] {
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*allowed[-_ ]tools?\s*:\s*(.+)$/i);
    if (match) return parseListFromInline(match[1]);
  }

  const headerIndex = lines.findIndex((l) => /^\s*#{1,3}\s+Allowed Tools\b/i.test(l));
  if (headerIndex >= 0) {
    const list: string[] = [];
    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\s*#/.test(line)) break;
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        const token = bullet[1].trim().split(/\s+/)[0];
        if (token) list.push(token);
      }
    }
    if (list.length) return list;
  }

  return [];
}

export function loadToolManifest(workspaceDir: string): ToolManifest | null {
  const jsonPath = path.join(workspaceDir, "tools.json");
  const jsonRaw = readFileSafe(jsonPath);
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as any;
      const tools =
        parsed?.allowed_tools ||
        parsed?.allowedTools ||
        parsed?.["allowed-tools"] ||
        parsed?.tools ||
        [];
      if (Array.isArray(tools)) {
        const normalized = normalizeToolList(tools);
        if (normalized.length) return { tools: normalized, source: "tools.json" };
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  const toolsMdPath = path.join(workspaceDir, "TOOLS.md");
  const toolsMd = readFileSafe(toolsMdPath);
  if (toolsMd) {
    const parsed = parseToolsFromMarkdown(toolsMd);
    const normalized = normalizeToolList(parsed);
    if (normalized.length) return { tools: normalized, source: "TOOLS.md" };
  }

  return null;
}

export function writePlanSnapshot(workspaceDir: string, sessionId: string): void {
  const planPath = path.join(workspaceDir, "PLAN.md");
  const store = loadPlanStore({ workspaceDir, sessionId });
  const plan = getActivePlan(store);
  const lines: string[] = [];
  lines.push("# FarmFriend Terminal - Plan");
  lines.push("");
  lines.push("_Auto-updated from runtime plan store._");
  lines.push("");

  if (!plan) {
    lines.push("No active plan.");
    lines.push("");
    fs.writeFileSync(planPath, lines.join("\n"), "utf8");
    return;
  }

  lines.push(`Objective: ${plan.objective}`);
  lines.push(`Status: ${plan.status}`);
  lines.push("");
  lines.push("Steps:");
  for (const step of plan.steps) {
    const status = step.status === "completed" ? "x" : step.status === "in_progress" ? "~" : " ";
    lines.push(`- [${status}] ${step.description}`);
  }
  lines.push("");
  fs.writeFileSync(planPath, lines.join("\n"), "utf8");
}

export function writeTasksSnapshot(workspaceDir: string, sessionId: string): void {
  const tasksPath = path.join(workspaceDir, "TASKS.md");
  const todosPath = path.join(workspaceDir, "todos", "sessions", `${sessionId}.json`);
  const lines: string[] = [];
  lines.push("# FarmFriend Terminal - Tasks");
  lines.push("");
  lines.push("_Auto-updated from runtime todo store._");
  lines.push("");

  const raw = readFileSafe(todosPath);
  if (!raw) {
    lines.push("No tasks yet.");
    lines.push("");
    fs.writeFileSync(tasksPath, lines.join("\n"), "utf8");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const todos = Array.isArray(parsed?.todos) ? parsed.todos : [];
    if (!todos.length) {
      lines.push("No tasks yet.");
      lines.push("");
      fs.writeFileSync(tasksPath, lines.join("\n"), "utf8");
      return;
    }

    for (const t of todos) {
      const status = t.status === "completed" ? "x" : t.status === "in_progress" ? "~" : " ";
      const label = String(t.content || t.activeForm || t.id || "Task").trim();
      lines.push(`- [${status}] ${label}`);
    }
    lines.push("");
    fs.writeFileSync(tasksPath, lines.join("\n"), "utf8");
  } catch {
    lines.push("Unable to read todo store.");
    lines.push("");
    fs.writeFileSync(tasksPath, lines.join("\n"), "utf8");
  }
}

export function appendWorkspaceLog(params: {
  workspaceDir: string;
  sessionId: string;
  turnId?: string;
  userInput?: string;
  assistantContent?: string;
  toolCallsExecuted?: number;
  note?: string;
}): void {
  const logPath = path.join(params.workspaceDir, "LOG.md");
  const ts = new Date().toISOString();
  const user = String(params.userInput || "").trim().replace(/\s+/g, " ");
  const assistant = String(params.assistantContent || "").trim().replace(/\s+/g, " ");
  const userPreview = user ? truncateText(user, 240) : "";
  const assistantPreview = assistant ? truncateText(assistant, 240) : "";
  const note = String(params.note || "").trim().replace(/\s+/g, " ");
  const toolNote = Number.isFinite(params.toolCallsExecuted) ? ` tools=${params.toolCallsExecuted}` : "";
  const turnNote = params.turnId ? ` turn=${params.turnId}` : "";
  const lines = [
    `- ${ts} session=${params.sessionId}${turnNote}${toolNote}`,
    `  - user: ${userPreview || "(none)"}`,
    `  - assistant: ${assistantPreview || "(none)"}`
  ];
  if (note) lines.push(`  - note: ${truncateText(note, 240)}`);
  const line = lines.join("\n");

  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  if (!fs.existsSync(logPath)) {
    ensureFile(logPath, CONTRACT_TEMPLATES["LOG.md"] || "");
  }
  fs.appendFileSync(logPath, `\n${line}\n`, "utf8");
}
