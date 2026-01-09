# Session Management

This guide explains how ff-terminal handles persistent sessions, session modes, and long-term memory.

## Overview

ff-terminal supports a **persistent “main” session** that aggregates all conversations across channels
(CLI, web UI, WhatsApp, iMessage). Sessions are stored as JSON files with message history and stats,
while long-term memory lives in `MEMORY.md` plus daily logs under `memory/`.

## Session Modes

| Mode | Behavior | Best For |
| --- | --- | --- |
| `main` | All interactions map to a single `main` session ID | Long-running assistant with continuity |
| `last` | CLI resumes the last active session; other channels can keep per-sender | Mixed workflows |
| `new` | Always create a fresh session | Isolated tasks / experiments |

## Default Configuration

`packet/default_config.json` ships with the persistent main session defaults:

```json
{
  "session_mode": "main",
  "main_session_id": "main",
  "session": {
    "scope": "main",
    "idleMinutes": 0,
    "autoSummarize": false,
    "maxHistoryTokens": 100000,
    "contextPruning": {
      "enabled": false,
      "mode": "adaptive"
    }
  }
}
```

- `idleMinutes: 0` disables idle expiry (infinite session).
- `autoSummarize` enables automatic summarization when history grows too large.
- `maxHistoryTokens` sets a soft threshold for auto-summarization.

## Session Scope (Clawdbot-style keys)

You can choose how inbound channels map to session keys:

- `main`: all chats map to the main session (default)
- `per-sender`: each sender/group gets its own session key
- `clawdbot`: direct chats map to `main`, groups/channels get isolated keys

Example:

```json
{
  "session": { "scope": "clawdbot" }
}
```

## CLI Flags

`ff-terminal start` and `ff-terminal local` accept session overrides:

```
--session-mode <main|last|new>   Override session mode for this run
--session-id <id>               Force a session ID (used by the CLI)
--new-session                   Shorthand for --session-mode new
```

## Ink UI Helpers

Inside the Ink UI, use:

- `/session` or `/session info` — show current mode and session stats
- `/session list` — list available session files
- `/session mode <main|last|new>` — update config (restart daemon to apply)
- `/session reset <archive|clear|summarize>` — manage session history
- `/session model <name|clear>` — set or clear a per-session model override
- `/compact` — summarize older history for the current session
- `/status` — show session + workspace status

## Session Tools (Agent)

The agent can also manage sessions via tools:

- `sessions_list` — list session files and stats
- `sessions_history` — fetch conversation history for a session
- `sessions_send` — send a message into another session and return its response
- `sessions_spawn` — spawn a sub-agent run in a new session and return its response

## Session Lifecycle

### Idle Expiry

If `session.idleMinutes > 0`, the runtime checks the last active timestamp:

- When idle time is exceeded, the current session is reset.
- The old session is archived as `sessions/<id>_archive_<timestamp>.json`.
- If `autoSummarize` is enabled, a summary of the archived session is injected into the fresh session.

### Manual Reset

Use the `reset_session` tool (or `/session reset`) to:

- `archive`: archive current session and start fresh
- `clear`: delete all messages, keep the same session ID
- `summarize`: replace old history with a summary + recent messages

### Manual Compaction

Use `/compact` (or `reset_session` with `action: summarize`) to summarize older history without resetting the session ID.

### Send Policy (optional)

Block replies to certain providers or chat types:

```json
{
  "session": {
    "sendPolicy": {
      "default": "allow",
      "rules": [
        { "action": "deny", "match": { "provider": "whatsapp", "chatType": "group" } }
      ]
    }
  }
}
```

### Context Pruning (tool results)

When enabled, context pruning trims **old tool outputs** before each model call, without touching
the on-disk session history. This keeps long-running sessions responsive.

### Per-Session Overrides

Session overrides are stored in `session.meta.overrides` and can be patched at runtime via the gateway.
Currently supported fields:

- `model` — per-session model override
- `thinkingLevel`, `verboseLevel`, `reasoningLevel` — stored for future expansion

## Memory vs Session

| Aspect | Session History | Memory (MEMORY.md) |
| --- | --- | --- |
| Scope | Full conversation messages | Extracted facts / decisions |
| Reset | Can be archived or cleared | Persists across resets |
| Loading | Included in each turn | Injected into system prompt |
| Purpose | Conversational context | Long-term knowledge |

## Auto-Summarization

When `autoSummarize: true` and the estimated token count exceeds `maxHistoryTokens`:

1. Oldest messages are summarized with the configured model.
2. Summary is inserted into the session history.
3. Recent messages remain verbatim.

## Migration

If you already have many per-session files and want to consolidate:

```
./scripts/migrate-to-main-session.sh
```

This script can:
- list session files
- optionally merge them into `main`
- archive old sessions
- extract key memory into `MEMORY.md`

## Files and Paths

```
ff-terminal-workspace/
├── sessions/
│   ├── main.json
│   ├── session_<uuid>.json
│   └── main_archive_<timestamp>.json
├── logs/sessions/<sessionId>.jsonl
├── MEMORY.md
└── memory/YYYY-MM-DD.md
```

## Tips

- Use `main` for a long-lived assistant that remembers context.
- Use `new` when you need strict isolation between tasks.
- Use `/session reset summarize` to reduce session size without losing context.
