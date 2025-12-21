import fs from "node:fs";
import path from "node:path";
import { defaultSessionDir } from "./sessionStore.js";

export type Task = {
  id: string;
  description: string;
  status: "open" | "completed";
  created_at: string;
  updated_at: string;
};

export type TaskStore = { tasks: Task[] };

function safeSessionId(sessionId: string): string {
  return sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function sessionTaskStorePath(params: { workspaceDir: string; sessionId: string }): string {
  const sessionsDir = defaultSessionDir(params.workspaceDir);
  const safeId = safeSessionId(params.sessionId);
  return path.join(sessionsDir, "tasks", `${safeId}.json`);
}

function readStore(p: string): TaskStore {
  if (!fs.existsSync(p)) return { tasks: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as TaskStore;
  } catch {
    return { tasks: [] };
  }
}

function writeStore(p: string, store: TaskStore): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export function loadSessionTaskStore(params: {
  workspaceDir: string;
  sessionId: string;
}): { store: TaskStore; storePath: string; migratedFromLegacy: boolean } {
  const storePath = sessionTaskStorePath(params);
  const store = readStore(storePath);
  if (store.tasks.length > 0) {
    return { store, storePath, migratedFromLegacy: false };
  }

  // Legacy task migration is opt-in to avoid cross-session leakage.
  // Set FF_TASKS_MIGRATE_LEGACY=1 to import workspace-level tasks.json.
  if (process.env.FF_TASKS_MIGRATE_LEGACY !== "1") {
    return { store, storePath, migratedFromLegacy: false };
  }

  const legacyPath = path.join(params.workspaceDir, "tasks.json");
  const legacy = readStore(legacyPath);
  if (legacy.tasks.length > 0) {
    writeStore(storePath, legacy);
    return { store: legacy, storePath, migratedFromLegacy: true };
  }

  return { store, storePath, migratedFromLegacy: false };
}

export function saveSessionTaskStore(params: { workspaceDir: string; sessionId: string }, store: TaskStore): void {
  const storePath = sessionTaskStorePath(params);
  writeStore(storePath, store);
}
