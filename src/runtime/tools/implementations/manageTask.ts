import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { newId } from "../../../shared/ids.js";
import { resolveWorkspaceDir } from "../../config/paths.js";
import {
  loadSessionTaskStore,
  saveSessionTaskStore,
  Task,
  TaskStore
} from "../../session/sessionTaskStore.js";

type Args = {
  action?: "create" | "update" | "complete" | "list" | string;
  task_description?: string;
  task_id?: string;
};

type Todo = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
};

function syncTodosForSession(params: {
  tasks: Task[];
  workspaceDir: string;
  sessionId: string | null;
}): void {
  if (!params.sessionId) return;
  const todos: Todo[] = params.tasks.map((task) => ({
    id: task.id,
    content: task.description,
    status: task.status === "completed" ? "completed" : "pending",
    priority: "medium"
  }));

  const dir = path.join(params.workspaceDir, "todos", "sessions");
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${params.sessionId}.json`);
  fs.writeFileSync(p, JSON.stringify({ version: 1, session_id: params.sessionId, todos }, null, 2) + "\n", "utf8");
}

export async function manageTaskTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase();
  if (!action) throw new Error("manage_task: missing args.action");

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(
    ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot: ctx?.repoRoot, cwd: process.cwd() }
  );
  const sessionId = ctx?.sessionId ?? "session_unknown";
  const { store, storePath } = loadSessionTaskStore({ workspaceDir, sessionId });
  const now = new Date().toISOString();

  if (action === "list") {
    return JSON.stringify({ path: storePath, tasks: store.tasks }, null, 2);
  }

  if (action === "create") {
    const desc = typeof args.task_description === "string" ? args.task_description.trim() : "";
    if (!desc) throw new Error("manage_task:create missing task_description");
    const task: Task = { id: newId("task"), description: desc, status: "open", created_at: now, updated_at: now };
    store.tasks.push(task);
    saveSessionTaskStore({ workspaceDir, sessionId }, store as TaskStore);
    syncTodosForSession({ tasks: store.tasks, workspaceDir, sessionId });
    return JSON.stringify({ ok: true, action, task, path: storePath }, null, 2);
  }

  if (action === "update") {
    const id = typeof args.task_id === "string" ? args.task_id.trim() : "";
    const desc = typeof args.task_description === "string" ? args.task_description.trim() : "";
    if (!id) throw new Error("manage_task:update missing task_id");
    if (!desc) throw new Error("manage_task:update missing task_description");
    const task = store.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`manage_task:update task not found: ${id}`);
    task.description = desc;
    task.updated_at = now;
    saveSessionTaskStore({ workspaceDir, sessionId }, store as TaskStore);
    syncTodosForSession({ tasks: store.tasks, workspaceDir, sessionId });
    return JSON.stringify({ ok: true, action, task, path: storePath }, null, 2);
  }

  if (action === "complete") {
    const id = typeof args.task_id === "string" ? args.task_id.trim() : "";
    if (!id) throw new Error("manage_task:complete missing task_id");
    const task = store.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`manage_task:complete task not found: ${id}`);
    task.status = "completed";
    task.updated_at = now;
    saveSessionTaskStore({ workspaceDir, sessionId }, store as TaskStore);
    syncTodosForSession({ tasks: store.tasks, workspaceDir, sessionId });
    return JSON.stringify({ ok: true, action, task, path: storePath }, null, 2);
  }

  throw new Error(`manage_task: unknown action "${action}"`);
}
