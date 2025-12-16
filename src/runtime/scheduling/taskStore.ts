import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../config/loadConfig.js";

export type ScheduledTask = {
  id: string;
  name: string;
  prompt?: string;
  workflow?: string;
  schedule: {
    schedule_type: "one_time" | "daily" | "weekly" | "interval";
    hour?: number;
    minute?: number;
    weekdays?: number[];
    interval_seconds?: number;
    execution_timestamp?: number;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_run?: {
    started_at: string;
    finished_at?: string;
    ok?: boolean;
    error?: string;
    session_id?: string;
    stdout_log?: string;
    stderr_log?: string;
  };
};

export type TaskStoreFile = {
  version: 1;
  tasks: ScheduledTask[];
};

export function taskStorePath(workspaceDir: string): string {
  return path.join(workspaceDir, "memory_core", "scheduled_tasks", "tasks.json");
}

export function loadTaskStore(workspaceDir: string): TaskStoreFile {
  const p = taskStorePath(workspaceDir);
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as TaskStoreFile;
  } catch {
    return { version: 1, tasks: [] };
  }
}

export function saveTaskStore(workspaceDir: string, store: TaskStoreFile): void {
  const p = taskStorePath(workspaceDir);
  ensureDir(path.dirname(p));
  writeJson(p, store);
}
