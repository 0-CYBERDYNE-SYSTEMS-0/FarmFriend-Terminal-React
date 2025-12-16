# Background Execution (No UI Running)

Requirement: scheduled tasks must run in the background even if the Ink UI is not running.

Recommended approach:

- Do NOT rely on the Ink UI process for any execution.
- Scheduled jobs should launch a headless “runner” entrypoint directly, via the OS scheduler.
  This provides true background execution after reboot, without requiring a resident daemon.

## Headless runner entrypoint

Provide a CLI command that can run without Ink:

- `ff-terminal run --scheduled-task <task_id> --headless`

Responsibilities:
- load config and provider credentials
- create a fresh session (default)
- run the agent loop for the task’s prompt/workflow
- write deliverables to the workspace
- write logs per run
- exit with a meaningful code

## OS scheduler invocation (per-run)

Each scheduled execution should:
- execute the packaged Node binary (or `node <dist>/cli.js`) with `--headless`
- run with a stable `WorkingDirectory` and workspace path
- set `stdout`/`stderr` log paths (rotate if needed)

## Secrets / credentials in background context

Background executions often run with a different environment than an interactive terminal.
Do not assume shell environment variables exist.

Recommended:
- config file location (cross-platform):
  - macOS: `~/Library/Application Support/ff-terminal/config.json`
  - Linux: `~/.config/ff-terminal/config.json`
  - Windows: `%APPDATA%\ff-terminal\config.json`
- store provider API keys in that config file (encrypted if possible) OR integrate with:
  - macOS Keychain
  - Windows Credential Manager
  - Linux Secret Service (libsecret) where available
- when keys are missing, log a clear actionable error and mark run failed.

## Concurrency policy for scheduled runs

Decide explicitly how to handle overlapping schedules:
- Default: allow concurrent runs, but isolate sessions and logs per run.
- Optional: per-task mutex (“skip if already running”).

Keep a per-task “lock file” or a sqlite row to prevent double-execution if required.

## Observability

- Write a per-run record (started_at, finished_at, success, error, session_id, log paths)
  to the scheduled task store.
- Provide CLI inspection:
  - `ff-terminal schedule list`
  - `ff-terminal schedule status <name>`
  - `ff-terminal schedule logs <name> --tail 200`
