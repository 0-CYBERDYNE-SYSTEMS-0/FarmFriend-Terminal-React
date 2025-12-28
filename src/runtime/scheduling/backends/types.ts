export type ScheduleSpec = {
  schedule_type: "one_time" | "daily" | "weekly" | "interval" | "rrule";
  hour?: number;
  minute?: number;
  weekdays?: number[]; // 0=Sun .. 6=Sat
  interval_seconds?: number;
  execution_timestamp?: number; // unix seconds
  schedule_rule?: string; // RFC5545 RRULE (or DTSTART+RRULE)
  timezone?: string; // IANA TZID
  start_datetime?: string; // ISO 8601
};

export type SchedulerBackend = {
  install(params: { taskName: string; taskId: string; schedule: ScheduleSpec }): Promise<{ ok: boolean; message: string }>;
  enable(params: { taskName: string }): Promise<{ ok: boolean; message: string }>;
  disable(params: { taskName: string }): Promise<{ ok: boolean; message: string }>;
  remove(params: { taskName: string }): Promise<{ ok: boolean; message: string }>;
  status(params: { taskName: string }): Promise<{ ok: boolean; message: string; data?: unknown }>;
};
