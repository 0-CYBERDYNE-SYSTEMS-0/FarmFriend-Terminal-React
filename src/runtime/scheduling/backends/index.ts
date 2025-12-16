import { SchedulerBackend } from "./types.js";
import { macosLaunchdBackend } from "./macosLaunchd.js";

export function getSchedulerBackend(): SchedulerBackend | null {
  if (process.env.FF_DISABLE_OS_SCHEDULER === "1") return null;
  if (process.platform === "darwin") return macosLaunchdBackend();
  return null;
}

