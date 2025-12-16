import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { newId } from "../../../shared/ids.js";

type Args = {
  action?: "create" | "update" | "complete" | "list" | string;
  task_description?: string;
  task_id?: string;
};

type Task = {
  id: string;
  description: string;
  status: "open" | "completed";
  created_at: string;
  updated_at: string;
};

type Store = { tasks: Task[] };

function readStore(p: string): Store {
  if (!fs.existsSync(p)) return { tasks: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Store;
  } catch {
    return { tasks: [] };
  }
}

function writeStore(p: string, store: Store): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export async function manageTaskTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase();
  if (!action) throw new Error("manage_task: missing args.action");

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  const storePath = path.join(workspaceDir, "tasks.json");
  const store = readStore(storePath);
  const now = new Date().toISOString();

  if (action === "list") {
    return JSON.stringify({ path: storePath, tasks: store.tasks }, null, 2);
  }

  if (action === "create") {
    const desc = typeof args.task_description === "string" ? args.task_description.trim() : "";
    if (!desc) throw new Error("manage_task:create missing task_description");
    const task: Task = { id: newId("task"), description: desc, status: "open", created_at: now, updated_at: now };
    store.tasks.push(task);
    writeStore(storePath, store);
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
    writeStore(storePath, store);
    return JSON.stringify({ ok: true, action, task, path: storePath }, null, 2);
  }

  if (action === "complete") {
    const id = typeof args.task_id === "string" ? args.task_id.trim() : "";
    if (!id) throw new Error("manage_task:complete missing task_id");
    const task = store.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`manage_task:complete task not found: ${id}`);
    task.status = "completed";
    task.updated_at = now;
    writeStore(storePath, store);
    return JSON.stringify({ ok: true, action, task, path: storePath }, null, 2);
  }

  throw new Error(`manage_task: unknown action "${action}"`);
}

