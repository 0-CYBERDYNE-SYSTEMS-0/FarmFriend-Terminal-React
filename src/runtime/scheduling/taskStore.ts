import fs from "node:fs";
import path from "node:path";
import { ensureDir, writeJson } from "../config/loadConfig.js";

export type ScheduledTask = {
  id: string;
  name: string;
  prompt?: string;
  workflow?: string;
  profile?: string;
  model?: string;
  timeout_seconds?: number;
  session_target?: "main" | "isolated" | "new";
  isolated_session_id?: string;
  post_to_main_prefix?: string;
  description?: string;
  thinking?: string;
  schedule: {
    schedule_type: "one_time" | "daily" | "weekly" | "interval" | "rrule";
    hour?: number;
    minute?: number;
    weekdays?: number[];
    interval_seconds?: number;
    execution_timestamp?: number;
    schedule_rule?: string;
    timezone?: string;
    start_datetime?: string;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
  next_run_at?: number;
  state?: {
    running_at_ms?: number;
    last_run_at_ms?: number;
    last_status?: "ok" | "error" | "skipped" | "timeout";
    last_error?: string;
    last_duration_ms?: number;
  };
  last_run?: {
    started_at: string;
    finished_at?: string;
    ok?: boolean;
    error?: string;
    session_id?: string;
    stdout_log?: string;
    stderr_log?: string;
    duration_ms?: number;
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
