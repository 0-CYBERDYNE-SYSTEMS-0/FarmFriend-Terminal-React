# Task Scheduling

**RRULE-based recurring task scheduling**

---

## Overview

FF Terminal includes a task scheduling system based on RRULE (RFC 5545) for defining recurring tasks. Tasks can be scheduled to run at specific times, intervals, or using complex recurrence patterns.

---

## Scheduling Architecture

### Scheduler Components

```
┌─────────────────────────────────────────────────────────┐
│ Task Scheduler                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Task Store  │──►│  Scheduler  │──►│  Executor   │ │
│  │  (JSON)     │    │  (Timer)    │    │  (Daemon)   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                                     │        │
│         ▼                                     ▼        │
│  ┌─────────────┐                      ┌─────────────┐ │
│  │  RRULE      │                      │  Logs       │ │
│  │  Parser     │                      │  (JSONL)    │ │
│  └─────────────┘                      └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Backend Support

| Platform | Backend |
|----------|---------|
| macOS | launchd |
| Linux | systemd |
| Windows | Task Scheduler (coming soon) |

---

## Creating Scheduled Tasks

### Interactive Creation

```bash
ff-terminal schedule create
```

This launches an interactive wizard:
1. Enter task name
2. Select schedule type
3. Configure recurrence
4. Set command to execute
5. Confirm and save

### Command Line Creation

```bash
ff-terminal schedule create \
  --name "daily-report" \
  --schedule "FREQ=DAILY;BYHOUR=9;BYMINUTE=0" \
  --command "ff-terminal run --prompt 'Generate daily report' --headless"
```

### Schedule Formats

**Daily at 9 AM:**
```
FREQ=DAILY;BYHOUR=9;BYMINUTE=0
```

**Every Monday at 9 AM:**
```
FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0
```

**First day of each month:**
```
FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=8;BYMINUTE=0
```

**Every 15 minutes:**
```
FREQ=MINUTELY;INTERVAL=15
```

---

## Schedule Syntax (RRULE)

### Frequency Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `FREQ` | Frequency (SECONDLY, MINUTELY, HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY) | `FREQ=DAILY` |
| `INTERVAL` | Repeat interval | `INTERVAL=2` (every 2 days) |
| `COUNT` | Number of occurrences | `COUNT=10` |
| `UNTIL` | End date | `UNTIL=20261231T235959Z` |

### By-Position Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `BYDAY` | Days of week (MO, TU, WE, TH, FR, SA, SU) | `BYDAY=MO,WE,FR` |
| `BYMONTHDAY` | Days of month | `BYMONTHDAY=1,15` |
| `BYMONTH` | Months | `BYMONTH=1,4,7,10` |
| `BYHOUR` | Hours | `BYHOUR=9,17` |
| `BYMINUTE` | Minutes | `BYMINUTE=0,30` |

### Complex Examples

**Every weekday at 9 AM:**
```
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9;BYMINUTE=0
```

**First Monday of each month:**
```
FREQ=MONTHLY;BYDAY=1MO;BYHOUR=8;BYMINUTE=0
```

**Every 2 hours during business hours:**
```
FREQ=HOURLY;INTERVAL=2;BYHOUR=9,10,11,12,13,14,15,16,17
```

**Last day of each quarter:**
```
FREQ=YEARLY;BYMONTH=3,6,9,12;BYMONTHDAY=-1
```

---

## Managing Tasks

### List Scheduled Tasks

```bash
ff-terminal schedule list
```

**Output:**
```
Scheduled Tasks:
✓ daily-report      DAILY at 09:00 CST
✓ weekly-summary    WEEKLY on MON at 18:00 CST
○ monthly-audit     MONTHLY on day 1 at 08:00 CST
```

### Task Status

| Status | Description |
|--------|-------------|
| ✓ | Active and scheduled |
| ○ | Paused |
| ✗ | Error / Failed |

### View Task Details

```bash
ff-terminal schedule show daily-report
```

**Output:**
```
Task: daily-report
Schedule: FREQ=DAILY;BYHOUR=9;BYMINUTE=0
Command: ff-terminal run --prompt 'Generate daily report' --headless
Last Run: 2026-02-02 09:00:00 CST
Next Run: 2026-02-03 09:00:00 CST
Status: Active
```

### Pause Task

```bash
ff-terminal schedule pause daily-report
```

### Resume Task

```bash
ff-terminal schedule resume daily-report
```

### Delete Task

```bash
ff-terminal schedule delete daily-report
```

---

## Running Tasks Manually

### Execute Now

```bash
ff-terminal run --scheduled-task daily-report --headless
```

### Run with Overrides

```bash
ff-terminal run --scheduled-task daily-report \
  --headless \
  --prompt "Custom prompt for this run"
```

---

## Task Storage

Tasks are stored in:

```
<workspace>/memory_core/scheduled_tasks/
├── tasks.json           # Task definitions
├── scheduler.lock       # Scheduler lock file
└── runs/                # Run history
    ├── daily-report-20260202.jsonl
    └── daily-report-20260203.jsonl
```

### Task Definition Format

```json
{
  "id": "daily-report",
  "name": "Daily Report",
  "schedule": {
    "schedule_type": "rrule",
    "rrule_string": "FREQ=DAILY;BYHOUR=9;BYMINUTE=0",
    "timezone": "America/Chicago"
  },
  "command": "ff-terminal run --prompt 'Generate daily report' --headless",
  "enabled": true,
  "last_run": null,
  "next_run": 1706870400,
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Scheduler Configuration

### Environment Variables

```bash
# Poll interval (milliseconds)
export FF_SCHEDULE_POLL_INTERVAL=60000

# Default timezone
export FF_SCHEDULE_TIMEZONE=America/Chicago

# Lock TTL (milliseconds)
export FF_SCHEDULE_LOCK_TTL=300000

# Run stale timeout (milliseconds)
export FF_SCHEDULE_RUN_STALE=21600000
```

### Configuration File

Create `~/.config/ff-terminal/scheduler.json`:

```json
{
  "pollIntervalMs": 60000,
  "timezone": "America/Chicago",
  "lockTtlMs": 300000,
  "runStaleMs": 21600000,
  "backends": {
    "macos": {
      "type": "launchd"
    },
    "linux": {
      "type": "systemd"
    }
  }
}
```

---

## Timezone Support

### Setting Timezone

```bash
# Via command line
ff-terminal schedule create \
  --name "task" \
  --schedule "FREQ=DAILY;BYHOUR=9" \
  --timezone "America/New_York"

# Via environment
export FF_SCHEDULE_TIMEZONE=Europe/London
```

### Supported Timezones

Uses IANA timezone database:
- `America/New_York`
- `America/Los_Angeles`
- `Europe/London`
- `Asia/Tokyo`
- And all other IANA timezones

---

## Run History

### View Run History

```bash
ff-terminal schedule history daily-report
```

**Output:**
```
Run History for daily-report:
2026-02-02 09:00:00  ✓ Success  (2.3s, 1500 tokens)
2026-02-01 09:00:00  ✓ Success  (2.1s, 1420 tokens)
2026-01-31 09:00:00  ✗ Failed   (Error: API timeout)
2026-01-30 09:00:00  ✓ Success  (1.9s, 1380 tokens)
```

### Run Log Format

```json
{
  "timestamp": "2026-02-02T09:00:00Z",
  "taskId": "daily-report",
  "status": "success",
  "durationMs": 2300,
  "tokens": 1500,
  "output": "Report generated successfully",
  "error": null
}
```

---

## One-Time Tasks

### Create One-Time Task

```bash
ff-terminal schedule create \
  --name "single-run" \
  --schedule "2026-02-15T10:00:00" \
  --command "ff-terminal run --prompt 'One-time task' --headless"
```

### Schedule Types

| Type | Description |
|------|-------------|
| `one_time` | Run once at specific time |
| `interval` | Run at fixed intervals |
| `rrule` | RRULE-based recurrence |

---

## Troubleshooting

### Task Not Running

```bash
# Check scheduler status
ff-terminal schedule status

# Check task is enabled
ff-terminal schedule show task-name

# Verify daemon is running
ff-terminal daemon status

# Check logs
cat <workspace>/logs/scheduled_runs/<task>*.jsonl
```

### Timezone Issues

```bash
# Verify timezone setting
ff-terminal schedule show task-name | grep Timezone

# Check system timezone
TZ=America/Chicago date

# Use correct timezone
export FF_SCHEDULE_TIMEZONE=America/Chicago
```

### Lock File Issues

```bash
# Check for stale lock
cat <workspace>/memory_core/scheduled_tasks/scheduler.lock

# Remove stale lock (if scheduler not running)
rm <workspace>/memory_core/scheduled_tasks/scheduler.lock

# Restart scheduler
ff-terminal schedule restart
```

---

## Best Practices

### For Daily Tasks

- Use `FREQ=DAILY` with specific `BYHOUR`
- Set appropriate timezone
- Test manually before scheduling

### For Weekly Tasks

- Use `FREQ=WEEKLY` with `BYDAY`
- Consider business hours
- Set up failure notifications

### For Monthly Tasks

- Use `FREQ=MONTHLY` with `BYMONTHDAY`
- Handle month-length variations
- Use `BYMONTHDAY=-1` for last day

### For Safety

- Test commands manually first
- Set up error notifications
- Use `COUNT` for trial periods
- Monitor run history regularly

---

## Scheduling API

### Programmatic Task Creation

```typescript
import { createScheduledTask } from './runtime/scheduling/index.js';

const task = await createScheduledTask({
  name: 'daily-report',
  schedule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0',
  timezone: 'America/Chicago',
  command: 'ff-terminal run --prompt "Generate report" --headless'
});
```

### Event Listeners

```typescript
import { onTaskRun } from './runtime/scheduling/index.js';

onTaskRun('daily-report', (event) => {
  console.log('Task ran:', event.status);
});

onTaskRun('error', (event) => {
  console.error('Task failed:', event.error);
});
```

---

## Examples

### Daily Report at 9 AM

```bash
ff-terminal schedule create \
  --name "daily-report" \
  --schedule "FREQ=DAILY;BYHOUR=9;BYMINUTE=0" \
  --command "ff-terminal run --prompt 'Generate daily report' --headless"
```

### Weekly Summary on Monday

```bash
ff-terminal schedule create \
  --name "weekly-summary" \
  --schedule "FREQ=WEEKLY;BYDAY=MO;BYHOUR=18;BYMINUTE=0" \
  --command "ff-terminal run --prompt 'Generate weekly summary' --headless"
```

### Monthly Audit on First Day

```bash
ff-terminal schedule create \
  --name "monthly-audit" \
  --schedule "FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=8;BYMINUTE=0" \
  --command "ff-terminal run --prompt 'Run monthly security audit' --headless"
```

### Every 15 Minutes

```bash
ff-terminal schedule create \
  --name "health-check" \
  --schedule "FREQ=MINUTELY;INTERVAL=15" \
  --command "ff-terminal run --prompt 'Check system health' --headless"
```

---

## Next Steps

1. **[Hooks System](10-hooks-system.md)** - Configure validation hooks
2. **[WhatsApp Integration](11-whatsapp-integration.md)** - Access via WhatsApp
3. **[Configuration Guide](12-configuration-guide.md)** - Complete configuration reference

---

**Built with technical precision and agentic intelligence**
