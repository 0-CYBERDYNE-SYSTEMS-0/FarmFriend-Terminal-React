import fs from 'node:fs';
import path from 'node:path';
import { getToolContext } from '../context.js';

type Task = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority?: "high" | "medium" | "low";
  completedAt?: number;
};

/**
 * manage_task - The missing tool that enables Variant C/D long-horizon autonomy
 *
 * Provides action-based interface for task management:
 * - list: Show all tasks with status counts
 * - create: Add new task
 * - update: Modify existing task
 * - complete: Mark task as done
 *
 * Storage: Uses same format as TodoWrite (todos/sessions/<sessionId>.json)
 * Stop Hook: todoStopHook reads this same storage to prevent early stopping
 */
export async function manageTask(params: {
  action: "list" | "create" | "update" | "complete";
  task_id?: string;
  content?: string;
  status?: "pending" | "in_progress" | "completed";
  priority?: "high" | "medium" | "low";
}): Promise<string> {
  const ctx = getToolContext();
  if (!ctx?.sessionId || !ctx?.workspaceDir) {
    return JSON.stringify({ error: "No session context" });
  }

  const taskPath = path.join(
    ctx.workspaceDir,
    'todos',
    'sessions',
    `${ctx.sessionId}.json`
  );

  // Ensure directory exists
  fs.mkdirSync(path.dirname(taskPath), { recursive: true });

  // Load existing tasks
  let data: { version: number; session_id: string; todos: Task[] } = {
    version: 1,
    session_id: ctx.sessionId,
    todos: []
  };

  if (fs.existsSync(taskPath)) {
    try {
      data = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    } catch {}
  }

  switch (params.action) {
    case "list":
      return JSON.stringify({
        total: data.todos.length,
        pending: data.todos.filter(t => t.status === "pending").length,
        in_progress: data.todos.filter(t => t.status === "in_progress").length,
        completed: data.todos.filter(t => t.status === "completed").length,
        todos: data.todos
      }, null, 2);

    case "create":
      if (!params.content) {
        return JSON.stringify({ error: "content required" });
      }
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        content: params.content,
        status: "pending",
        priority: params.priority || "medium"
      };
      data.todos.push(newTask);
      fs.writeFileSync(taskPath, JSON.stringify(data, null, 2));
      return JSON.stringify({ created: newTask });

    case "update":
      if (!params.task_id) {
        return JSON.stringify({ error: "task_id required" });
      }
      const updateIdx = data.todos.findIndex(t => t.id === params.task_id);
      if (updateIdx === -1) {
        return JSON.stringify({ error: "task not found" });
      }
      if (params.status) {
        // Set completedAt when marking as completed
        if (params.status === "completed" && data.todos[updateIdx].status !== "completed") {
          data.todos[updateIdx].completedAt = Date.now();
        }
        data.todos[updateIdx].status = params.status;
      }
      if (params.content) data.todos[updateIdx].content = params.content;
      if (params.priority) data.todos[updateIdx].priority = params.priority;
      fs.writeFileSync(taskPath, JSON.stringify(data, null, 2));
      return JSON.stringify({ updated: data.todos[updateIdx] });

    case "complete":
      if (!params.task_id) {
        return JSON.stringify({ error: "task_id required" });
      }
      const completeIdx = data.todos.findIndex(t => t.id === params.task_id);
      if (completeIdx === -1) {
        return JSON.stringify({ error: "task not found" });
      }
      data.todos[completeIdx].status = "completed";
      data.todos[completeIdx].completedAt = Date.now();
      fs.writeFileSync(taskPath, JSON.stringify(data, null, 2));
      return JSON.stringify({ completed: data.todos[completeIdx] });

    default:
      return JSON.stringify({ error: "Unknown action" });
  }
}
