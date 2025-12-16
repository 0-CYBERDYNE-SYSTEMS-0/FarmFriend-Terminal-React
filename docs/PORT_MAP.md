# Python → TypeScript Port Map (Working Notes)

This repo contains the Python reference implementation under `reference source code python ver/` and a TS/Ink runtime WIP under `ff-terminal-ts/`.

## Source of truth (Python)

- Interactive CLI + stream parsing: `reference source code python ver/main_refactored.py`
- Core loop + tool calling: `reference source code python ver/ff_terminal/agents/chat_agent.py`
- Provider abstraction: `reference source code python ver/ff_terminal/core/model_providers.py`
- Global config: `reference source code python ver/ff_terminal/core/config.py`
- Sessions + persistence: `reference source code python ver/ff_terminal/core/session.py`
- Tool registry + schemas: `reference source code python ver/ff_terminal/tools/base_tool.py`
- Tool registration: `reference source code python ver/ff_terminal/simple_tools/integration.py`
- Scheduling tool + launchd: `reference source code python ver/ff_terminal/simple_tools/scheduled_task_tool.py`, `reference source code python ver/ff_terminal/core/launchd_manager.py`
- Web UI + websocket protocol: `reference source code python ver/ff_terminal/web/api/websocket/terminal.py`, `reference source code python ver/ff_terminal/web/frontend/src/App.tsx`

## Port packet artifacts (extracted)

- System prompt templates: `ff_terminal_port_packet 2/system_prompt_variant_{a,b}.TEMPLATE.md`
- Exact stop token text: `ff_terminal_port_packet 2/critical_interaction_protocol.EXACT.md`
- Tool schemas (43): `ff_terminal_port_packet 2/tool_schemas.openai.json`
- Defaults: `ff_terminal_port_packet 2/default_config.json`
- Stream protocol: `ff_terminal_port_packet 2/stream_protocol.md`
- Concurrency + background runner guidance: `ff_terminal_port_packet 2/concurrency.md`, `ff_terminal_port_packet 2/background_execution.md`

## Target architecture (TS)

- Runtime daemon (local service): owns agent loop, sessions, tool registry, scheduling.
- UI(s) in React:
  - Ink CLI: connects to daemon via WebSocket (fast terminal UX).
  - Web React UI: compatible WS endpoint + message types for the existing frontend.
- Headless runner: `ff-terminal run --scheduled-task <id> --headless` to support OS schedulers without UI.

## Current TS status

- Daemon + WS protocol: `ff-terminal-ts/src/daemon/*`
- Minimal agent turn + tool executor: `ff-terminal-ts/src/runtime/*`
- Scheduling persistence (tasks.json): `ff-terminal-ts/src/runtime/scheduling/*`

Next: implement real provider(s) + session persistence + “web frontend compatible” WS adapter.

