# `schedule_task` (KEY CAPABILITY)

In FF-Terminal, scheduling is implemented as:

1) A tool: `schedule_task` (see `ff_terminal/simple_tools/scheduled_task_tool.py`)
   - The agent supplies a structured schedule (or a `time_string` that the tool parses)
   - The tool persists scheduled task metadata to:
     - `ff-terminal-workspace/memory_core/scheduled_tasks/tasks.json`

2) A platform scheduler: macOS `launchd`
   - Implemented by `ff_terminal/core/launchd_manager.py`
   - Generates a LaunchAgent plist with:
     - `ProgramArguments`: runs `main_refactored.py --execute-scheduled-task <task_id> --display-mode clean`
     - `WorkingDirectory`: repo root
     - `StandardOutPath` / `StandardErrorPath`: `logs/scheduled_<task>.{log,err}`
   - Label prefix: `ai.factory.fft` (see `LAUNCHD_LABEL_PREFIX`)
   - Plist directory: `~/Library/LaunchAgents`

Port guidance (TS/Ink):

- Preserve the tool contract (name + parameters) so the LLM can schedule work.
- Keep scheduling reliable and observable:
  - write task definitions to disk before installing the schedule
  - show clear status to the user (“installed”, “enabled”, “disabled”, “last run”)
  - keep logs per task execution
- Cross-platform requirement (macOS priority, then Linux, then Windows):
  implement a pluggable scheduler backend interface with these backends:

  1) macOS: `launchd` (LaunchAgents) — parity with Python.
     - emit plist
     - `launchctl load/unload`

  2) Linux: `systemd` timers (preferred) with cron fallback
     - emit `<name>.service` + `<name>.timer` into `~/.config/systemd/user/`
     - `systemctl --user daemon-reload`, `enable --now`, `disable --now`
     - fallback: write a crontab entry if systemd user units unavailable

  3) Windows: Task Scheduler
     - create tasks via `schtasks /Create ...`
     - delete via `schtasks /Delete ...`

  4) Fallback: in-process scheduler daemon (only when OS scheduler is not available).
     - This is NOT sufficient for “run after reboot when no terminal is open”.

- Recommended process model:
  the scheduled job should execute a headless “runner” entrypoint that can run without the Ink UI.
  In Python this is `main_refactored.py --execute-scheduled-task <task_id> --display-mode clean`.
  In TS, implement an equivalent `ff-terminal run --scheduled-task <task_id> --headless`.
