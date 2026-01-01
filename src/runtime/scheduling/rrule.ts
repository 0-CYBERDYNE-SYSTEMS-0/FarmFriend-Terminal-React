import rrulePkg from "rrule";
import { DateTime } from "luxon";

const { rrulestr } = rrulePkg as typeof rrulePkg & { rrulestr: typeof rrulePkg.rrulestr };

function normalizeRule(rule: string): string {
  const trimmed = rule.trim();
  if (!trimmed) throw new Error("schedule_task: schedule_rule is empty");
  if (/(^|\n)(DTSTART|RRULE|RDATE|EXRULE|EXDATE)/i.test(trimmed)) return trimmed;
  return `RRULE:${trimmed}`;
}

export function resolveScheduleTimeZone(tz?: string | null): string {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const candidate = (tz || "").trim();
  if (!candidate) return fallback;
  const dt = DateTime.now().setZone(candidate);
  if (!dt.isValid) throw new Error(`schedule_task: invalid timezone '${candidate}'`);
  return candidate;
}

function parseStartDateTime(start: string | undefined, tzid: string): DateTime {
  if (!start) return DateTime.now().setZone(tzid);
  const hasOffset = /[zZ]|[+-]\d{2}:\d{2}$/.test(start);
  const dt = hasOffset
    ? DateTime.fromISO(start, { setZone: true })
    : DateTime.fromISO(start, { zone: tzid });
  if (!dt.isValid) {
    throw new Error("schedule_task: invalid start_datetime (expected ISO 8601)");
  }
  return dt;
}

export function computeNextRRuleExecutionTimestamp(params: {
  rule: string;
  timezone?: string | null;
  start?: string;
  after?: Date;
}): number {
  const tzid = resolveScheduleTimeZone(params.timezone);
  const dtstart = parseStartDateTime(params.start, tzid).toUTC().toJSDate();
  const rule = normalizeRule(params.rule);
  const rrule = rrulestr(rule, { dtstart, tzid });

  const afterDt = (params.after ? DateTime.fromJSDate(params.after) : DateTime.now())
    .setZone(tzid)
    .toUTC()
    .toJSDate();

  const next = rrule.after(afterDt, false);
  if (!next) {
    throw new Error("schedule_task: schedule_rule produced no future occurrences");
  }
  return Math.floor(next.getTime() / 1000);
}
