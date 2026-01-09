import fs from "node:fs";
import path from "node:path";
import { newId } from "../../shared/ids.js";

export type RunHistoryEntry = {
  id: string;
  taskId: string;
  taskName: string;
  startedAt: string;
  finishedAt?: string;
  status: "ok" | "error" | "skipped" | "timeout";
  durationMs?: number;
  error?: string;
  sessionId?: string;
  outputSummary?: string;
};

function runHistoryPath(workspaceDir: string): string {
  return path.join(workspaceDir, "memory_core", "scheduled_tasks", "runs.jsonl");
}

export function appendRunHistory(workspaceDir: string, entry: RunHistoryEntry): void {
  const p = runHistoryPath(workspaceDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(entry) + "\n", "utf8");
}

export function loadRunHistory(workspaceDir: string, taskId?: string, limit = 50): RunHistoryEntry[] {
  const p = runHistoryPath(workspaceDir);
  if (!fs.existsSync(p)) return [];

  const lines = fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
  const entries = lines
    .map(line => {
      try { return JSON.parse(line) as RunHistoryEntry; }
      catch { return null; }
    })
    .filter((e): e is RunHistoryEntry => e !== null);

  const filtered = taskId ? entries.filter(e => e.taskId === taskId) : entries;
  return filtered.slice(-limit);
}
