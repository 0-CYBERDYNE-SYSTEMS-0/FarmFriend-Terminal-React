import { DateTime } from "luxon";
import type { GatewayMethodHandler } from "../server-shared.js";
import { loadTaskStore, saveTaskStore, type ScheduledTask } from "../../runtime/scheduling/taskStore.js";
import { computeNextRunAt, triggerSchedulerWake } from "../../runtime/scheduling/scheduler.js";
import { newId } from "../../shared/ids.js";

export const cronListHandler: GatewayMethodHandler = async (_params, ctx) => {
  const store = loadTaskStore(ctx.workspaceDir);
  return { ok: true, payload: { tasks: store.tasks } };
};

export const cronAddHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const task = record.task && typeof record.task === "object" ? (record.task as ScheduledTask) : null;
  if (!task) {
    return { ok: false, error: { code: "invalid_params", message: "task required" } };
  }
  const nowIso = new Date().toISOString();
  const next: ScheduledTask = {
    ...task,
    id: task.id || newId("task"),
    created_at: task.created_at || nowIso,
    updated_at: nowIso,
    enabled: task.enabled ?? true
  };
  const nextRun = computeNextRunAt(next, DateTime.utc());
  next.next_run_at = nextRun ?? undefined;

  const store = loadTaskStore(ctx.workspaceDir);
  store.tasks.push(next);
  saveTaskStore(ctx.workspaceDir, store);
  triggerSchedulerWake(ctx.workspaceDir);
  return { ok: true, payload: { task: next } };
};

export const cronUpdateHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const taskId = typeof record.id === "string" ? record.id : "";
  const patch = record.patch && typeof record.patch === "object" ? (record.patch as Partial<ScheduledTask>) : null;
  if (!taskId || !patch) {
    return { ok: false, error: { code: "invalid_params", message: "id and patch required" } };
  }
  const store = loadTaskStore(ctx.workspaceDir);
  const idx = store.tasks.findIndex((t) => t.id === taskId || t.name === taskId);
  if (idx === -1) {
    return { ok: false, error: { code: "not_found", message: "task not found" } };
  }
  const nowIso = new Date().toISOString();
  const updated = { ...store.tasks[idx], ...patch, updated_at: nowIso } as ScheduledTask;
  const nextRun = computeNextRunAt(updated, DateTime.utc());
  updated.next_run_at = nextRun ?? undefined;
  store.tasks[idx] = updated;
  saveTaskStore(ctx.workspaceDir, store);
  triggerSchedulerWake(ctx.workspaceDir);
  return { ok: true, payload: { task: updated } };
};

export const cronRemoveHandler: GatewayMethodHandler = async (params, ctx) => {
  const record = params && typeof params === "object" ? (params as Record<string, unknown>) : {};
  const taskId = typeof record.id === "string" ? record.id : "";
  if (!taskId) {
    return { ok: false, error: { code: "invalid_params", message: "id required" } };
  }
  const store = loadTaskStore(ctx.workspaceDir);
  const nextTasks = store.tasks.filter((t) => t.id !== taskId && t.name !== taskId);
  if (nextTasks.length === store.tasks.length) {
    return { ok: false, error: { code: "not_found", message: "task not found" } };
  }
  store.tasks = nextTasks;
  saveTaskStore(ctx.workspaceDir, store);
  triggerSchedulerWake(ctx.workspaceDir);
  return { ok: true, payload: { removed: taskId } };
};
