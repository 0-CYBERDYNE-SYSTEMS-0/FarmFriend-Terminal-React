import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";

type Todo = {
  id: string;
  content: string;
  activeForm: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  completedAt?: number;
};

type Args = { todos?: Todo[] };

function counts(todos: Todo[]): Record<string, number> {
  const out: Record<string, number> = { pending: 0, in_progress: 0, completed: 0 };
  for (const t of todos) out[t.status] = (out[t.status] || 0) + 1;
  return out;
}

export async function todoWriteTool(argsRaw: unknown): Promise<string> {
  const ctx = getToolContext();
  if (!ctx) throw new Error("TodoWrite: missing tool context");
  const args = argsRaw as Args;
  const rawTodos = Array.isArray(args?.todos) ? args.todos : null;

  // Be forgiving: if no todos provided, return success as no-op
  if (!rawTodos || rawTodos.length === 0) {
    return JSON.stringify({ ok: true, note: "No todos provided - no action taken" });
  }

  // Normalize and fill in defaults for each todo
  const todos: Todo[] = [];
  for (let i = 0; i < rawTodos.length; i++) {
    const t = rawTodos[i] as Partial<Todo> | null | undefined;
    if (!t || typeof t !== "object") continue; // Skip invalid entries

    // Generate ID if missing
    const id = (typeof t.id === "string" && t.id.trim()) ? t.id : `todo_${i + 1}`;

    // Use content or activeForm as fallback for each other
    const content = typeof t.content === "string" ? t.content : (typeof t.activeForm === "string" ? t.activeForm : `Task ${i + 1}`);
    const activeForm = typeof t.activeForm === "string" ? t.activeForm : content;

    // Normalize status
    const rawStatus = String(t.status || "pending").toLowerCase();
    const status = ["pending", "in_progress", "completed"].includes(rawStatus)
      ? (rawStatus as Todo["status"])
      : "pending";

    // Normalize priority
    const rawPriority = String(t.priority || "medium").toLowerCase();
    const priority = ["high", "medium", "low"].includes(rawPriority)
      ? (rawPriority as Todo["priority"])
      : "medium";

    todos.push({ id, content, activeForm, status, priority });
  }

  // If all entries were invalid, return success
  if (todos.length === 0) {
    return JSON.stringify({ ok: true, note: "No valid todos found - no action taken" });
  }

  const dir = path.join(ctx.workspaceDir, "todos", "sessions");
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${ctx.sessionId}.json`);

  // Load existing todos to preserve completedAt timestamps
  let existingTodos: Todo[] = [];
  const existingPath = path.join(dir, `${ctx.sessionId}.json`);
  if (fs.existsSync(existingPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(existingPath, "utf8"));
      existingTodos = Array.isArray(existingData.todos) ? existingData.todos : [];
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  // Merge todos by id to avoid wiping tasks when partial updates are sent.
  // Also set completedAt when a task is newly completed (or first seen as completed).
  const now = Date.now();
  const existingById = new Map<string, Todo>();
  for (const t of existingTodos) existingById.set(t.id, t);

  const mergedTodos: Todo[] = [];
  const seenIds = new Set<string>();
  for (const newTodo of todos) {
    const existing = existingById.get(newTodo.id);
    let completedAt = existing?.completedAt;
    if (newTodo.status === "completed" && (!existing || existing.status !== "completed" || !completedAt)) {
      completedAt = now;
    }
    mergedTodos.push({ ...(existing || {}), ...newTodo, completedAt });
    seenIds.add(newTodo.id);
  }

  // Preserve any existing todos not included in the update payload.
  for (const existing of existingTodos) {
    if (!seenIds.has(existing.id)) mergedTodos.push(existing);
  }

  fs.writeFileSync(p, JSON.stringify({ version: 1, session_id: ctx.sessionId, todos: mergedTodos }, null, 2) + "\n", "utf8");

  const c = counts(mergedTodos);
  return JSON.stringify(
    {
      ok: true,
      session_id: ctx.sessionId,
      saved_to: p,
      counts: c
    },
    null,
    2
  );
}
