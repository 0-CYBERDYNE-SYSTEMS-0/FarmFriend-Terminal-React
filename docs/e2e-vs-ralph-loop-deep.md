# Deep Comparison: ff-terminal E2E Loop vs. Ralph Wiggum Loop

**Date:** January 4, 2026

## Scope and Sources
This analysis compares:
- **ff-terminal E2E loop** (local code: `scripts/e2e_loop.sh` + `src/bin/ff-terminal.ts` + `src/runtime/agentLoop.ts`).
- **Ralph Wiggum loop** (external references only; no code in this repo).

External sources used for Ralph Wiggum details:
- Ralph technique post with the canonical while-loop form. (ghuntley.com/ralph) citeturn0search1
- Ralph for Claude Code README summary (frankbria/ralph-claude-code). citeturn0search0turn1search1
- Plugin command overview and loop behavior (awesomeclaude.ai/ralph-wiggum). citeturn1search0

> Note: The official Claude plugin README was not accessible during this pass; plugin details are from a secondary source.

---

## 1) End-to-End Loop (ff-terminal) — How It Works (Step-by-Step)

### A. Script Layer: `scripts/e2e_loop.sh`
1. **Read prompts** from stdin, one line per prompt.
2. **Choose profile** (arg1) and **session ID** (arg2). If session is `auto`, generate a random `session_<r1>_<r2>`.
3. **Resolve repo root** from the script location.
4. For each non-empty prompt, run:
   - `node dist/bin/ff-terminal.js run --profile <profile> --session <session> --prompt <prompt> --headless`.
5. Print location of the **session JSONL** log file at the end.

### B. CLI Layer: `src/bin/ff-terminal.ts` → `run` command
1. Parse `--prompt`, `--session`, `--profile`, `--headless`.
2. **Resolve repo root and workspace dir** using config and environment overrides.
3. **Profile resolution** and **credentials injection** (provider, model, per‑purpose models, tool keys).
4. **Initialize tool registry** and register all tools.
5. **Create run logger** under `logs/runs/`.
6. Call `runAgentTurn(...)` inside `withToolContext({ sessionId, workspaceDir, repoRoot })` and stream chunks to stdout.
7. On completion, log run stats to the run logger; scheduled task branches also write extra logs.

### C. Runtime Layer: `src/runtime/agentLoop.ts` → `runAgentTurn`
1. **Load config**, provider, tool schemas, and session history.
2. **Initialize hooks** (plan validation, todo stop hook, skill tools policies).
3. **Loop** up to `FF_MAX_ITERATIONS` (default 500):
   - Stream model output (content, thinking, status).
   - Capture **tool calls** (if any).
   - If no tool calls, run **stop hooks** to decide whether to stop, continue, or ask user.
   - Validate tool args against schema and run **pre-tool hooks**.
   - Execute tools in parallel; run **post-tool hooks**; log tool events.
   - Feed tool outputs back into model context.
   - Update plan store and todo reminders.
4. **Circuit breakers** for repeated tool failures and thought loops.
5. **Log everything** (turn start/end, tools, stop decisions) into JSONL logs.
6. Yield a final `task_completed` chunk and close.

**Key property:** the E2E loop is a harness that drives *the same runtime* the daemon/UI uses, which makes it a faithful integration test.

---

## 2) Ralph Wiggum Loop — How It Works (Step-by-Step)

Ralph has two “faces”:
- A **minimal technique** (pure bash loop).
- A **productized implementation** (Ralph for Claude Code).

### A. Minimal Technique (canonical loop)
1. Place your instructions in `PROMPT.md`.
2. Run an infinite bash loop that pipes `PROMPT.md` into the agent:
   - `while :; do cat PROMPT.md | <agent>; done`
3. The agent iterates forever unless interrupted manually.

This is the “deterministically bad in an undeterministic world” technique. citeturn0search1

### B. Productized Implementation (Ralph for Claude Code)
1. **Read instructions** from `PROMPT.md`.
2. **Execute Claude Code** with the current context and task files.
3. **Track progress** using structured task lists (e.g., `@fix_plan.md`) and logs.
4. **Evaluate completion** using exit signals and heuristics (done signals, test loops, task completion).
5. **Repeat** until completion or limits are reached.

Safety + autonomy features reported:
- Intelligent exit detection and rate limiting. citeturn0search0turn1search1
- Circuit breaker for repeated failures. citeturn0search0turn1search1
- Handling Claude’s 5‑hour limit with user prompt. citeturn0search0turn1search1
- Optional tmux monitoring dashboard. citeturn0search0turn1search1

### C. Plugin Loop (Ralph Wiggum plugin commands)
1. Use `/ralph-wiggum:ralph-loop "<prompt>"`.
2. Loop until the **completion promise** string appears (exact match) or max iterations is reached.
3. Stop hook blocks the agent from exiting until completion criteria is met.

Commands and options (secondary source):
- `--max-iterations <n>`
- `--completion-promise "<text>"`
- `/ralph-wiggum:cancel-ralph` to stop

citeturn1search0

---

## 3) Step-by-Step Comparison (Direct Mapping)

### Step 1: Instruction Source
- **E2E loop:** stdin lines (each line is a prompt).
- **Ralph loop:** `PROMPT.md` file (and supporting files like `@fix_plan.md`).

**Implication:**
- E2E is explicit, test‑driven by *prompt list*.
- Ralph is project‑driven by *persistent files*.

### Step 2: Entry Point
- **E2E loop:** `node dist/bin/ff-terminal.js run --headless` per prompt.
- **Ralph loop:** `while :; do ...; done` or `ralph` / plugin command.

**Implication:**
- E2E is a CLI wrapper over the real runtime.
- Ralph is a perpetual loop shell or CLI for Claude Code.

### Step 3: Session & Context Handling
- **E2E loop:** explicit `--session <id>` to reuse context across prompts.
- **Ralph loop:** persistent project files act as shared context; uses its own heuristics for continuity.

**Implication:**
- E2E keeps state in ff-terminal session logs and memory store.
- Ralph keeps state in `PROMPT.md`, task files, and logs.

### Step 4: Execution Core
- **E2E loop:** ff-terminal `runAgentTurn` with tool registry and schema enforcement.
- **Ralph loop:** Claude Code execution (with its own toolset), repeated.

**Implication:**
- E2E validates *your* tool wiring; Ralph assumes Claude Code environment.

### Step 5: Stop / Continue Logic
- **E2E loop:** stop hooks decide when to stop when no tool calls remain.
- **Ralph loop:** completion signals + heuristics or max iterations; minimal loop never stops.

**Implication:**
- E2E emphasizes deterministic stop logic for a single prompt.
- Ralph emphasizes persistence until completion, with safety nets.

### Step 6: Safety and Circuit Breakers
- **E2E loop:** tool validation, circuit breaker on tool failures, thought loop detection.
- **Ralph loop:** rate limiting, circuit breaker, exit detection, usage limit handling.

**Implication:**
- E2E is tool‑safety oriented.
- Ralph is **cost and runaway loop** oriented.

### Step 7: Observability
- **E2E loop:** structured JSONL logs per run and session.
- **Ralph loop:** dedicated logs + tmux monitor.

**Implication:**
- E2E logs are built for post‑hoc forensic debugging.
- Ralph is built for live monitoring.

---

## 4) “Which Is Better?” — Contextual Answer

### If your goal is **correctness and integration validation**
**E2E loop wins.**
- It calls your real runtime.
- It validates tool schemas, hooks, and tool wiring.
- It produces deterministic logs tied to a session ID.

### If your goal is **overnight autonomous progress**
**Ralph loop wins.**
- It’s optimized for continuous, hands‑off iteration.
- It has built‑in rate limiting and stop heuristics.
- It assumes the project evolves via persistent files.

### Efficiency
- **E2E loop:** Efficient for *targeted tests* and *short prompts*.
- **Ralph loop:** Efficient for *long-horizon progress*, less efficient for quick tasks.

### Reliability
- **E2E loop:** Reliability depends on tool correctness and hook logic; strong logging helps debug.
- **Ralph loop:** Reliability depends heavily on prompt quality and exit detection.

### Cost Control
- **E2E loop:** No built‑in rate limiting (relies on provider limits).
- **Ralph loop:** Explicit rate limiting and usage limit handling.

---

## 5) Summary Table

| Dimension | E2E Loop (ff-terminal) | Ralph Wiggum Loop |
|---|---|---|
| Primary role | Runtime test harness | Autonomous iteration strategy |
| Input source | stdin prompts | PROMPT.md + task files |
| Core engine | ff-terminal runtime + tools | Claude Code loop |
| Stop logic | hook‑based stop checks | completion heuristics + max iterations |
| Safety focus | tool schema validation, hooks | rate limiting, exit detection |
| Observability | JSONL logs per run/session | tmux monitor + logs |
| Best fit | Integration verification | Long‑horizon autonomous work |

---

## 6) Practical Guidance

- Use the **E2E loop** to verify providers, tool wiring, and regression testing.
- Use **Ralph-style looping** when you need the agent to keep working until completion across long horizons.
- If you want the *behavior* of Ralph with *your runtime*, add a “persistent prompt file + completion promise” pattern and drive it through your existing E2E loop.

---

## 7) Open Gaps for a Fully Precise Comparison

To get an even deeper, code‑level comparison, we’d need:
- The official Claude plugin README or source for ralph-wiggum.
- The actual `ralph` implementation scripts (if you want behavior‑level matching).

