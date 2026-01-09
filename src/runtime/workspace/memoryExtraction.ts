import fs from "node:fs";
import path from "node:path";
import { createProvider } from "../providers/factory.js";
import type { OpenAIMessage } from "../providers/types.js";
import type { RuntimeConfig } from "../config/loadConfig.js";
import { ensureDailyMemoryLog } from "./contract.js";
import type { SessionFile } from "../session/sessionStore.js";

function formatTranscript(messages: SessionFile["conversation"]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : "System";
      return `${role}: ${m.content}`;
    })
    .join("\n");
}

export async function extractMemoryFromConversation(params: {
  conversation: SessionFile["conversation"];
  cfg: RuntimeConfig;
  repoRoot: string;
  maxMessages?: number;
}): Promise<string> {
  const maxMessages = Math.max(10, Number(params.maxMessages ?? 60));
  const slice = params.conversation.slice(-maxMessages);
  const prompt = [
    "Extract durable memory from the conversation.",
    "Return Markdown with EXACT headings:",
    "# User Profile",
    "# Project Context",
    "# Key Decisions",
    "# Important Facts",
    "Under each heading, include bullet points. If none, write '- (none)'.",
    "",
    formatTranscript(slice)
  ].join("\n");

  const { provider, model } = createProvider({ repoRoot: params.repoRoot });
  const maxTokens = Math.min(Number((params.cfg as any).max_tokens ?? 12000), 1200);
  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: "You extract only facts stated or clearly implied. Do not invent."
    },
    { role: "user", content: prompt }
  ];

  const controller = new AbortController();
  let content = "";

  for await (const ev of provider.streamChat({
    model,
    messages,
    tools: [],
    temperature: 0.2,
    maxTokens,
    signal: controller.signal,
    tool_choice: "none",
    glmThinkingMode: (params.cfg as any).glm_thinking_mode
  })) {
    if (ev.type === "content") content += ev.delta;
    if (ev.type === "final") {
      content = ev.content || content;
      break;
    }
    if (ev.type === "error") throw new Error(ev.message || "Memory extraction failed");
  }

  return content.trim();
}

export function appendMemoryBlock(params: { workspaceDir: string; content: string }): { memoryPath: string; dailyPath: string } {
  const memoryPath = path.join(params.workspaceDir, "MEMORY.md");
  const dailyPath = ensureDailyMemoryLog(params.workspaceDir);
  const now = new Date().toISOString();
  const block = `\n\n---\n${now}\n\n${params.content.trim()}\n`;
  fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, "# FarmFriend Terminal - Memory\n\n", "utf8");
  }
  fs.appendFileSync(memoryPath, block, "utf8");
  fs.appendFileSync(dailyPath, block, "utf8");
  return { memoryPath, dailyPath };
}

export function searchMemory(params: { workspaceDir: string; query: string }): string[] {
  const memoryPath = path.join(params.workspaceDir, "MEMORY.md");
  if (!fs.existsSync(memoryPath)) return [];
  const raw = fs.readFileSync(memoryPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const q = params.query.toLowerCase();
  return lines.filter((line) => line.toLowerCase().includes(q)).slice(0, 50);
}

export function updateMemorySection(params: { workspaceDir: string; section: string; content: string }): void {
  const memoryPath = path.join(params.workspaceDir, "MEMORY.md");
  const raw = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, "utf8") : "# FarmFriend Terminal - Memory\n\n";
  const sectionHeader = `# ${params.section}`.trim();
  const lines = raw.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.trim() === sectionHeader);
  if (startIdx === -1) {
    const updated = `${raw.trim()}\n\n${sectionHeader}\n${params.content.trim()}\n`;
    fs.writeFileSync(memoryPath, updated, "utf8");
    return;
  }
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("# ") && i > startIdx) {
      endIdx = i;
      break;
    }
  }
  const nextLines = [
    ...lines.slice(0, startIdx + 1),
    params.content.trim(),
    ...lines.slice(endIdx)
  ];
  fs.writeFileSync(memoryPath, nextLines.join("\n"), "utf8");
}
