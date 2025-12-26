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
  const todos = Array.isArray(args?.todos) ? (args.todos as Todo[]) : null;
  if (!todos) throw new Error("TodoWrite: missing todos");

  for (const t of todos) {
    if (!t || typeof t !== "object") throw new Error("TodoWrite: invalid todo");
    if (typeof t.id !== "string" || !t.id.trim()) throw new Error("TodoWrite: todo.id required");
    if (typeof t.content !== "string") throw new Error("TodoWrite: todo.content required");
    if (typeof t.activeForm !== "string") throw new Error("TodoWrite: todo.activeForm required");
    if (!["pending", "in_progress", "completed"].includes(t.status)) throw new Error("TodoWrite: invalid status");
    if (!["high", "medium", "low"].includes(t.priority)) throw new Error("TodoWrite: invalid priority");
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

  // Merge todos, setting completedAt when status changes to completed
  const now = Date.now();
  const mergedTodos = todos.map(newTodo => {
    const existing = existingTodos.find(t => t.id === newTodo.id);
    if (existing && existing.status !== "completed" && newTodo.status === "completed") {
      // Newly completed - set timestamp
      return { ...newTodo, completedAt: now };
    } else if (existing?.completedAt) {
      // Preserve existing timestamp
      return { ...newTodo, completedAt: existing.completedAt };
    }
    return newTodo;
  });

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

