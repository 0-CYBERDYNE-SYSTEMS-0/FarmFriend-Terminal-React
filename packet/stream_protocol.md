# Stream Protocol (Agent → Ink UI)

The Python UI consumes a stream of *strings* from `ChatAgent.process_task()`:

- `content:<delta>` — assistant content delta
- `thinking:<delta>` — thinking/reasoning delta (optional per provider)
- `error:<message>` — error message
- `task_completed` — stop streaming and return to prompt
- anything else — treated as progress/status text

Special stop token:
- If a `content:` chunk contains `[AWAITING_INPUT]`, the UI strips it, treats the turn as complete,
  and returns control to the prompt.

Source of truth: `main_refactored.py` (stream parsing) and `ff_terminal/agents/chat_agent.py` (yield points).
