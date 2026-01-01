import { newId } from "../../shared/ids.js";
import { loadTaskStore, saveTaskStore, ScheduledTask } from "./taskStore.js";
import { getSchedulerBackend } from "./backends/index.js";
import { computeNextRRuleExecutionTimestamp, resolveScheduleTimeZone } from "./rrule.js";
import { DateTime } from "luxon";

type Args = {
  action: "add" | "list" | "remove" | "enable" | "disable" | "status";
  name?: string;
  prompt?: string;
  workflow?: string;
  profile?: string;
  schedule_type?: "one_time" | "daily" | "weekly" | "interval" | "rrule";
  hour?: number;
  minute?: number;
  weekdays?: number[];
  interval_seconds?: number;
  execution_timestamp?: number;
  schedule_rule?: string;
  timezone?: string;
  start_datetime?: string;
  time_string?: string;
  auto_remove?: boolean;
  dry_run?: boolean;
  open_result?: boolean;
};

type ParsedTime =
  | { kind: "absolute"; hour: number; minute: number; dayOffset: number | null; explicitDay: boolean }
  | { kind: "relative"; seconds: number };

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6
};

function parseTimeString(input: string): ParsedTime | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const rel = text.match(/\bin\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/);
  if (rel) {
    const value = Number(rel[1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    const unit = rel[2];
    const seconds =
      unit.startsWith("sec") ? value :
        unit.startsWith("min") ? value * 60 :
          value * 3600;
    return { kind: "relative", seconds };
  }

  const explicitDay = text.includes("today") || text.includes("tomorrow");
  const dayOffset = text.includes("tomorrow") ? 1 : text.includes("today") ? 0 : null;

  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!timeMatch) return null;
  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  const ampm = timeMatch[3];
  if (ampm) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12;
    if (ampm === "pm") hour += 12;
  } else if (hour > 23) {
    return null;
  }

  return { kind: "absolute", hour, minute, dayOffset, explicitDay };
}

function resolveHourMinute(args: Args): { hour: number; minute: number } | null {
  if (args.hour !== undefined || args.minute !== undefined) {
    const hour = args.hour ?? 0;
    const minute = args.minute ?? 0;
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      throw new Error("schedule_task: hour/minute must be numbers");
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error("schedule_task: hour must be 0-23 and minute must be 0-59");
    }
    return { hour, minute };
  }
  if (args.time_string) {
    const parsed = parseTimeString(args.time_string);
    if (parsed?.kind === "absolute") {
      return { hour: parsed.hour, minute: parsed.minute };
    }
  }
  return null;
}

function resolveOneTimeTimestamp(args: Args): number {
  const tzid = resolveScheduleTimeZone(args.timezone);
  const now = DateTime.now().setZone(tzid);
  const execution = args.execution_timestamp;
  if (execution !== undefined && execution !== null) {
    if (!Number.isFinite(execution)) throw new Error("schedule_task: execution_timestamp must be a unix seconds number");
    if (execution * 1000 <= now.toMillis()) {
      throw new Error("schedule_task: execution_timestamp must be in the future");
    }
    return execution;
  }

  if (args.time_string) {
    const parsed = parseTimeString(args.time_string);
    if (!parsed) {
      throw new Error("schedule_task: unsupported time_string format (try '10:50am', 'today 10:50', or 'in 15 minutes')");
    }
    if (parsed.kind === "relative") {
      return Math.floor(now.plus({ seconds: parsed.seconds }).toUTC().toSeconds());
    }
    let target = now.set({ hour: parsed.hour, minute: parsed.minute, second: 0, millisecond: 0 });
    if (parsed.dayOffset !== null) {
      target = target.plus({ days: parsed.dayOffset });
    }
    if (!parsed.explicitDay && target.toMillis() <= now.toMillis()) {
      target = target.plus({ days: 1 });
    } else if (parsed.explicitDay && target.toMillis() <= now.toMillis()) {
      throw new Error("schedule_task: time_string resolves to a past time; use 'tomorrow' or provide a future execution_timestamp");
    }
    return Math.floor(target.toUTC().toSeconds());
  }

  if (args.hour !== undefined || args.minute !== undefined) {
    const hm = resolveHourMinute(args);
    if (!hm) throw new Error("schedule_task: hour/minute required for one_time schedule");
    let target = now.set({ hour: hm.hour, minute: hm.minute, second: 0, millisecond: 0 });
    if (target.toMillis() <= now.toMillis()) {
      target = target.plus({ days: 1 });
    }
    return Math.floor(target.toUTC().toSeconds());
  }

  throw new Error("schedule_task: missing execution_timestamp (or supply time_string or hour/minute)");
}

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
    let schedule_type = args.schedule_type;
    let inferredWeekdays: number[] | undefined;
    let inferredIntervalSeconds: number | undefined;

    if (args.schedule_rule) {
      schedule_type = "rrule";
    }

    if (!schedule_type && args.time_string) {
      const text = args.time_string.toLowerCase();
      const everyMatch = text.match(/\bevery\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/);
      if (everyMatch) {
        const value = Number(everyMatch[1]);
        if (Number.isFinite(value) && value > 0) {
          const unit = everyMatch[2];
          inferredIntervalSeconds =
            unit.startsWith("sec") ? value :
              unit.startsWith("min") ? value * 60 :
                value * 3600;
          schedule_type = "interval";
        }
      }

      if (!schedule_type && /\bweekdays\b/.test(text)) {
        schedule_type = "weekly";
        inferredWeekdays = [1, 2, 3, 4, 5];
      }

      if (!schedule_type && /\bweekends\b/.test(text)) {
        schedule_type = "weekly";
        inferredWeekdays = [0, 6];
      }

      if (!schedule_type) {
        const days = new Set<number>();
        for (const token of text.split(/[^a-z]+/)) {
          const day = WEEKDAY_MAP[token];
          if (day !== undefined) days.add(day);
        }
        if (days.size > 0) {
          schedule_type = "weekly";
          inferredWeekdays = Array.from(days.values()).sort();
        }
      }

      if (!schedule_type && (/\bdaily\b/.test(text) || /\bevery day\b/.test(text))) {
        schedule_type = "daily";
      }

      if (!schedule_type) schedule_type = "one_time";
    }

    if (!schedule_type) throw new Error("schedule_task: missing schedule_type");

    const now = new Date().toISOString();
    const hourMinute = resolveHourMinute(args);
    const executionTimestamp =
      schedule_type === "one_time"
        ? resolveOneTimeTimestamp(args)
        : schedule_type === "rrule"
          ? computeNextRRuleExecutionTimestamp({
              rule: args.schedule_rule || "",
              timezone: args.timezone,
              start: args.start_datetime
            })
          : args.execution_timestamp;
    const weekdays = args.weekdays ?? inferredWeekdays;
    const intervalSeconds = args.interval_seconds ?? inferredIntervalSeconds;

    if ((schedule_type === "daily" || schedule_type === "weekly") && !hourMinute) {
      throw new Error("schedule_task: missing hour/minute (or time_string) for daily/weekly schedule");
    }

    const timezone = args.timezone ? resolveScheduleTimeZone(args.timezone) : undefined;

    const task: ScheduledTask = {
      id: newId("task"),
      name,
      prompt: args.prompt,
      workflow: args.workflow,
      profile: args.profile,
      schedule: {
        schedule_type,
        hour: hourMinute?.hour ?? args.hour,
        minute: hourMinute?.minute ?? args.minute,
        weekdays,
        interval_seconds: intervalSeconds,
        execution_timestamp: executionTimestamp,
        schedule_rule: args.schedule_rule,
        timezone,
        start_datetime: args.start_datetime
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
