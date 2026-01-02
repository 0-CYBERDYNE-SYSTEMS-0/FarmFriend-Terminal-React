import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { DateTime } from "luxon";

import { StructuredLogger, parseLogLevel } from "../logging/structuredLogger.js";
import { computeNextRRuleExecutionTimestamp, resolveScheduleTimeZone } from "./rrule.js";
import { loadTaskStore, saveTaskStore, type ScheduledTask } from "./taskStore.js";

type SchedulerRunOptions = {
  repoRoot: string;
  workspaceDir: string;
  once?: boolean;
  pollIntervalMs?: number;
  logLevel?: string;
  logMaxBytes?: number;
  logRetention?: number;
};

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const LOCK_TTL_MS = 5 * 60_000;
const RUN_STALE_MS = 6 * 60 * 60_000;

function schedulerLockPath(workspaceDir: string): string {
  return path.join(workspaceDir, "memory_core", "scheduled_tasks", "scheduler.lock");
}

function nowUtcSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toLuxonWeekday(day: number): number | null {
  if (!Number.isFinite(day)) return null;
  if (day === 0) return 7; // Sunday
  if (day >= 1 && day <= 6) return day; // Monday=1..Saturday=6
  return null;
}

function computeNextDailyRun(after: DateTime, hour: number, minute: number): DateTime {
  let candidate = after.set({ hour, minute, second: 0, millisecond: 0 });
  if (candidate <= after) candidate = candidate.plus({ days: 1 });
  return candidate;
}

function computeNextWeeklyRun(after: DateTime, weekdays: number[], hour: number, minute: number): DateTime | null {
  if (!weekdays.length) return null;
  const candidates: DateTime[] = [];
  for (const day of weekdays) {
    const targetWeekday = toLuxonWeekday(day);
    if (!targetWeekday) continue;
    const currentWeekday = after.weekday;
    let delta = (targetWeekday - currentWeekday + 7) % 7;
    let candidate = after.set({ hour, minute, second: 0, millisecond: 0 }).plus({ days: delta });
    if (delta === 0 && candidate <= after) {
      candidate = candidate.plus({ days: 7 });
    }
    candidates.push(candidate);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.toMillis() - b.toMillis());
  return candidates[0];
}

export function computeNextRunAt(task: ScheduledTask, after: DateTime): number | null {
  const schedule = task.schedule;
  const tzid = resolveScheduleTimeZone(schedule.timezone);
  const afterTz = after.setZone(tzid);

  if (schedule.schedule_type === "one_time") {
    const ts = schedule.execution_timestamp;
    if (!ts || ts <= after.toSeconds()) return null;
    return Math.floor(ts);
  }

  if (schedule.schedule_type === "interval") {
    const interval = schedule.interval_seconds;
    if (!interval || interval < 60) throw new Error("schedule_task: interval_seconds must be >= 60");
    const lastRun = task.last_run?.started_at
      ? DateTime.fromISO(task.last_run.started_at).toUTC()
      : null;
    if (!lastRun) {
      return Math.floor(after.toUTC().plus({ seconds: interval }).toSeconds());
    }
    const elapsed = Math.max(0, after.toUTC().diff(lastRun, "seconds").seconds);
    const steps = Math.max(1, Math.ceil(elapsed / interval));
    return Math.floor(lastRun.plus({ seconds: steps * interval }).toSeconds());
  }

  if (schedule.schedule_type === "daily") {
    const hour = schedule.hour ?? 0;
    const minute = schedule.minute ?? 0;
    return Math.floor(computeNextDailyRun(afterTz, hour, minute).toUTC().toSeconds());
  }

  if (schedule.schedule_type === "weekly") {
    const hour = schedule.hour ?? 0;
    const minute = schedule.minute ?? 0;
    const weekdays = schedule.weekdays ?? [];
    const next = computeNextWeeklyRun(afterTz, weekdays, hour, minute);
    return next ? Math.floor(next.toUTC().toSeconds()) : null;
  }

  if (schedule.schedule_type === "rrule") {
    return computeNextRRuleExecutionTimestamp({
      rule: schedule.schedule_rule || "",
      timezone: schedule.timezone,
      start: schedule.start_datetime,
      after: after.toUTC().toJSDate()
    });
  }

  return null;
}

export function ensureNextRunAt(task: ScheduledTask, after?: DateTime): boolean {
  const base = after ?? DateTime.now();
  const next = computeNextRunAt(task, base);
  const normalized = next ?? undefined;
  if (task.next_run_at !== normalized) {
    task.next_run_at = normalized;
    task.updated_at = new Date().toISOString();
    return true;
  }
  return false;
}

function acquireSchedulerLock(workspaceDir: string, logger: StructuredLogger): boolean {
  const lockPath = schedulerLockPath(workspaceDir);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const existing = fs.readFileSync(lockPath, "utf8");
    const info = JSON.parse(existing) as { pid?: number; started_at?: string };
    if (info.pid) {
      try {
        process.kill(info.pid, 0);
        logger.log("warn", "scheduler_lock_active", { pid: info.pid });
        return false;
      } catch {
        // stale, continue
      }
    }
    const stat = fs.statSync(lockPath);
    const age = Date.now() - stat.mtimeMs;
    if (age < LOCK_TTL_MS) {
      logger.log("warn", "scheduler_lock_recent", { age_ms: age });
      return false;
    }
  } catch {
    // no lock or invalid
  }

  const payload = JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() });
  try {
    fs.writeFileSync(lockPath, payload, { flag: "wx" });
    return true;
  } catch {
    try {
      fs.writeFileSync(lockPath, payload, "utf8");
      return true;
    } catch {
      logger.log("error", "scheduler_lock_failed");
      return false;
    }
  }
}

function releaseSchedulerLock(workspaceDir: string): void {
  const lockPath = schedulerLockPath(workspaceDir);
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // ignore
  }
}

async function spawnScheduledRun(repoRoot: string, taskId: string, logger: StructuredLogger): Promise<boolean> {
  const cli = path.join(repoRoot, "dist", "bin", "ff-terminal.js");
  if (!fs.existsSync(cli)) {
    logger.log("error", "scheduler_missing_build", { cli });
    return false;
  }
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, "run", "--scheduled-task", taskId, "--headless"], {
      stdio: "inherit"
    });
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function runSchedulerLoop(opts: SchedulerRunOptions): Promise<void> {
  const runtimeCfgPath = path.join(opts.repoRoot, "packet", "default_config.json");
  const logLevel = parseLogLevel(opts.logLevel ?? process.env.FF_LOG_LEVEL ?? undefined);
  const logger = new StructuredLogger({
    filePath: path.join(opts.workspaceDir, "logs", "scheduler", "scheduler.jsonl"),
    level: logLevel,
    maxBytes: opts.logMaxBytes,
    retention: opts.logRetention
  });

  logger.log("info", "scheduler_start", {
    repoRoot: opts.repoRoot,
    workspaceDir: opts.workspaceDir,
    once: opts.once ?? false,
    poll_interval_ms: opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    config_hint: runtimeCfgPath
  });

  if (!acquireSchedulerLock(opts.workspaceDir, logger)) {
    logger.log("error", "scheduler_lock_unavailable");
    return;
  }

  try {
    while (true) {
      const store = loadTaskStore(opts.workspaceDir);
      const now = DateTime.now();
      let dirty = false;

      for (const task of store.tasks) {
        if (!task.enabled) continue;
        if (!task.next_run_at || task.next_run_at <= 0) {
          try {
            dirty = ensureNextRunAt(task, now) || dirty;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.log("error", "scheduler_next_run_failed", {
              task_id: task.id,
              task_name: task.name,
              message: msg
            });
          }
        }
      }

      if (dirty) saveTaskStore(opts.workspaceDir, store);

      const nowSeconds = nowUtcSeconds();
      const dueTasks = store.tasks
        .filter((t) => t.enabled && t.next_run_at !== undefined && t.next_run_at <= nowSeconds)
        .filter((t) => {
          if (!t.last_run || t.last_run.finished_at) return true;
          const startedAt = DateTime.fromISO(t.last_run.started_at);
          if (!startedAt.isValid) return true;
          return Date.now() - startedAt.toMillis() > RUN_STALE_MS;
        })
        .sort((a, b) => (a.next_run_at ?? 0) - (b.next_run_at ?? 0));

      if (!dueTasks.length) {
        if (opts.once) break;
        const nextAt = store.tasks
          .filter((t) => t.enabled && t.next_run_at !== undefined)
          .map((t) => t.next_run_at as number)
          .sort((a, b) => a - b)[0];
        const delaySeconds = nextAt ? Math.max(5, nextAt - nowSeconds) : 60;
        await sleep(Math.min(delaySeconds * 1000, opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS));
        continue;
      }

      for (const task of dueTasks) {
        if (task.last_run && !task.last_run.finished_at) {
          const startedAt = DateTime.fromISO(task.last_run.started_at);
          if (!startedAt.isValid || Date.now() - startedAt.toMillis() > RUN_STALE_MS) {
            logger.log("warn", "scheduler_stale_run_override", {
              task_id: task.id,
              task_name: task.name,
              started_at: task.last_run.started_at
            });
          }
        }
        logger.log("info", "scheduler_task_due", { task_id: task.id, task_name: task.name, next_run_at: task.next_run_at });
        const ok = await spawnScheduledRun(opts.repoRoot, task.id, logger);
        logger.log("info", "scheduler_task_finished", { task_id: task.id, task_name: task.name, ok });

        const refreshed = loadTaskStore(opts.workspaceDir);
        const refTask = refreshed.tasks.find((t) => t.id === task.id);
        if (refTask && refTask.enabled) {
          try {
            const changed = ensureNextRunAt(refTask, DateTime.now());
            if (changed) saveTaskStore(opts.workspaceDir, refreshed);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.log("error", "scheduler_reschedule_failed", { task_id: task.id, task_name: task.name, message: msg });
          }
        }
      }

      if (opts.once) break;
    }
  } finally {
    releaseSchedulerLock(opts.workspaceDir);
    logger.log("info", "scheduler_stop");
  }
}
