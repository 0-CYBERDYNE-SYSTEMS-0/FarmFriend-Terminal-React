# Concurrency / Parallelism / Multi-process (Port Target)

Product intent: “lean into Ink + React project management and fully utilize async/parallel execution,
websockets, and multiple processes”.

Recommended architecture:

1) UI process (Ink)
   - Renders transcript + streaming deltas + todo panel
   - Sends user input and control commands (cancel, mode change) to a local agent-runtime over WebSocket
   - Never blocks on long-running tool execution; it only renders state/events.

2) Agent Runtime process (local daemon/service)
   - Owns the agent loop, session store, tool registry, provider calls, scheduling backend, and concurrency.
   - Exposes a local WebSocket API (or IPC) for:
     - starting a turn
     - streaming deltas/events
     - canceling a turn
     - listing sessions/tasks/scheduled jobs

3) Worker pool (optional but recommended)
   - Executes tool calls in parallel (file ops, grep/glob, web fetch, etc.)
   - Implement as:
     - Node worker_threads for CPU-heavy tasks (parsing/embeddings)
     - child_process for shell commands (isolation + cancellation)

Concurrency rules to preserve from Python:
- If multiple independent tool calls are present in a single model response, execute them in parallel
  and gather results (Python does this in `ChatAgent._handle_tool_calls()`).
- Preserve per-session tool history ordering for validation, even if executed concurrently.
- Provide cancellation: cancel in-flight worker jobs when the user hits Ctrl+C (or sends cancel).
- Keep scheduling jobs isolated: scheduled tasks should run in a headless runner process, not in the UI.

Observability:
- Emit structured events: tool_start/tool_end, subagent_start/subagent_end, provider_call_start/end.
- Persist logs per scheduled task run.
