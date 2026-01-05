# Autonomy Mode (Ralph-style loop)

## Overview
Autonomy Mode provides a long‑horizon loop that repeatedly runs the agent using persistent prompt/state files and optional Oracle checks. It is designed for multi‑day workflows without replacing the deterministic E2E loop.

## Entry Points

### 1) Script (Phase 1 orchestrator)
```
./scripts/ralph_loop.sh --prompt-file PROMPT.md --tasks-file TASKS.md --completion-promise "✅ COMPLETED"
```

### 2) CLI Command (Phase 2)
```
ff-terminal autonomy --prompt-file PROMPT.md --tasks-file TASKS.md \
  --completion-promise "✅ COMPLETED" \
  --max-loops 200 --stall-limit 5 --sleep-ms 30000 --oracle critical
```

## Oracle Policy (Best balance)
- Default: no always‑on Oracle.
- Oracle on critical moments only:
  1) On completion claim → Oracle validates or returns gaps.
  2) On stall (3–5 loops without measurable progress) → Oracle suggests recovery.
  3) On high‑risk tasks (money/deploy/irreversible) → Oracle required.

## Files
- `PROMPT.md` — Primary instruction set.
- `TASKS.md` — Persistent state / checklist.

## Environment Variables
- `FF_AUTONOMY_PROMPT_FILE`
- `FF_AUTONOMY_TASKS_FILE`
- `FF_AUTONOMY_COMPLETION_PROMISE`
- `FF_AUTONOMY_MAX_LOOPS`
- `FF_AUTONOMY_STALL_LIMIT`
- `FF_AUTONOMY_SLEEP_MS`
- `FF_AUTONOMY_ORACLE_MODE` (off|critical|on_complete|on_stall|on_high_risk|always)
- `FF_AUTONOMY_HIGH_RISK_KEYWORDS` (comma-separated)
- `FF_AUTONOMY_SESSION_STRATEGY` (reuse|new)

## Notes
- The standard E2E loop remains the primary deterministic runtime test harness.
- Autonomy Mode is optimized for long‑horizon progress, not short‑prompt regression testing.
