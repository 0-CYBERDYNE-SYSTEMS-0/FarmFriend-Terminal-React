import { newId } from "../../shared/ids.js";
import { loadTaskStore, saveTaskStore, ScheduledTask } from "./taskStore.js";
import { getSchedulerBackend } from "./backends/index.js";

type Args = {
  action: "add" | "list" | "remove" | "enable" | "disable" | "status";
  name?: string;
  prompt?: string;
  workflow?: string;
  schedule_type?: "one_time" | "daily" | "weekly" | "interval";
  hour?: number;
  minute?: number;
  weekdays?: number[];
  interval_seconds?: number;
  execution_timestamp?: number;
  time_string?: string;
  auto_remove?: boolean;
  dry_run?: boolean;
  open_result?: boolean;
};

export async function scheduleTaskTool(argsRaw: unknown, workspaceDir: string): Promise<string> {
  const args = argsRaw as Args;
  if (!args?.action) throw new Error("schedule_task: missing action");

  const store = loadTaskStore(workspaceDir);

  if (args.action === "list") {
    return JSON.stringify(store.tasks, null, 2);
  }

  const name = args.name;
  if (!name) throw new Error("schedule_task: missing name");

  const existingIndex = store.tasks.findIndex((t) => t.name === name);

  if (args.action === "remove") {
    if (existingIndex === -1) return `No such task: ${name}`;
    const [removed] = store.tasks.splice(existingIndex, 1);
    saveTaskStore(workspaceDir, store);
    const backend = getSchedulerBackend();
    if (backend) {
      const res = await backend.remove({ taskName: removed.name });
      if (!res.ok) return `Removed task definition, but failed to remove OS schedule: ${res.message}`;
    }
    return `Removed task ${removed.name} (${removed.id})`;
  }

  if (args.action === "enable" || args.action === "disable") {
    if (existingIndex === -1) return `No such task: ${name}`;
    const task = store.tasks[existingIndex];
    task.enabled = args.action === "enable";
    task.updated_at = new Date().toISOString();
    saveTaskStore(workspaceDir, store);
    const backend = getSchedulerBackend();
    if (backend) {
      const res =
        args.action === "enable"
          ? await backend.enable({ taskName: task.name })
          : await backend.disable({ taskName: task.name });
      if (!res.ok) return `${task.enabled ? "Enabled" : "Disabled"} task definition, but OS scheduler failed: ${res.message}`;
    }
    return `${task.enabled ? "Enabled" : "Disabled"} task ${task.name}`;
  }

  if (args.action === "status") {
    if (existingIndex === -1) return `No such task: ${name}`;
    const backend = getSchedulerBackend();
    const task = store.tasks[existingIndex];
    if (!backend) return JSON.stringify(task, null, 2);
    const status = await backend.status({ taskName: task.name });
    return JSON.stringify({ task, os_schedule: status }, null, 2);
  }

  // add
  if (args.action === "add") {
    const schedule_type = args.schedule_type;
    if (!schedule_type) {
      // Port note: Python supports parsing time_string; implement later.
      if (args.time_string) throw new Error("schedule_task: time_string parsing not implemented yet; pass schedule_type/hour/minute/etc.");
      throw new Error("schedule_task: missing schedule_type");
    }

    const now = new Date().toISOString();

    const task: ScheduledTask = {
      id: newId("task"),
      name,
      prompt: args.prompt,
      workflow: args.workflow,
      schedule: {
        schedule_type,
        hour: args.hour,
        minute: args.minute,
        weekdays: args.weekdays,
        interval_seconds: args.interval_seconds,
        execution_timestamp: args.execution_timestamp
      },
      enabled: true,
      created_at: now,
      updated_at: now
    };

    if (existingIndex !== -1) {
      store.tasks[existingIndex] = task;
    } else {
      store.tasks.push(task);
    }

    saveTaskStore(workspaceDir, store);

    if (args.dry_run) {
      return `Dry run: saved task definition for ${name} (not installing OS schedule yet).`;
    }

    const backend = getSchedulerBackend();
    if (!backend) return `Saved task ${name} (${task.id}). OS scheduler not available in this build.`;

    const res = await backend.install({ taskName: name, taskId: task.id, schedule: task.schedule });
    if (!res.ok) return `Saved task ${name} (${task.id}), but failed to install OS schedule: ${res.message}`;
    return `Saved task ${name} (${task.id}). ${res.message}`;
  }

  throw new Error(`schedule_task: unsupported action ${args.action}`);
}
