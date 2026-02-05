# Session Management

## Overview

Sessions persist conversation history, metadata, and state across multiple agent turns. FF Terminal stores sessions as JSON files in the workspace directory, enabling long-running conversations and context continuity.

## Session Data Model

```typescript
type SessionFile = {
  version: 1;
  session_id: string;
  created_at: string;
  updated_at: string;
  conversation: ConversationMessage[];
  meta?: Record<string, unknown>;
};

type ConversationMessage = {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content: string;
  created_at: string;
};
```

### Session File Example

```json
{
  "version": 1,
  "session_id": "session_a1b2c3d4",
  "created_at": "2026-02-02T21:31:00.000Z",
  "updated_at": "2026-02-02T21:45:00.000Z",
  "conversation": [
    {
      "role": "user",
      "content": "Help me build a web application",
      "created_at": "2026-02-02T21:31:00.000Z"
    },
    {
      "role": "assistant",
      "content": "I'll help you build a web application. What type of app would you like to create?",
      "created_at": "2026-02-02T21:31:05.000Z"
    },
    {
      "role": "tool",
      "tool_call_id": "call_001",
      "name": "read_file",
      "content": "package.json contents...",
      "created_at": "2026-02-02T21:32:00.000Z"
    }
  ],
  "meta": {
    "provider": "openrouter",
    "model": "claude-3-sonnet"
  }
}
```

## Session Lifecycle

### Creation

```typescript
export function createSession(sessionId: string): SessionFile {
  const now = new Date().toISOString();
  return {
    version: 1,
    session_id: sessionId,
    created_at: now,
    updated_at: now,
    conversation: []
  };
}
```

**Triggered when:**
- New user connects without specifying session
- `newSessionId()` generates fresh ID
- File doesn't exist in sessions directory

### Loading

```typescript
export function loadSession(
  sessionId: string,
  sessionDir = defaultSessionDir()
): SessionFile | null {
  const p = sessionPath(sessionId, sessionDir);

  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as SessionFile;
  } catch {
    // Try legacy location
    try {
      const legacyPath = sessionPath(sessionId, legacySessionDir());
      return JSON.parse(fs.readFileSync(legacyPath, "utf8")) as SessionFile;
    } catch {
      return null;
    }
  }
}
```

**Session location precedence:**
1. Workspace sessions: `workspace/sessions/{sessionId}.json`
2. Legacy location: `~/.ff-terminal/sessions/{sessionId}.json`

### Saving

```typescript
export function saveSession(
  session: SessionFile,
  sessionDir = defaultSessionDir()
): void {
  const p = sessionPath(session.session_id, sessionDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });

  session.updated_at = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(session, null, 2) + "\n", "utf8");
}
```

**Auto-save triggers:**
- After each user message
- After each assistant response
- After each tool result
- On session state changes

## Session Directory Structure

```
ff-terminal-workspace/
├── sessions/
│   ├── session_a1b2c3d4.json
│   ├── session_e5f6g7h8.json
│   └── session_i9j0k1l2.json
├── logs/
│   └── sessions/
│       ├── session_a1b2c3d4.jsonl
│       └── ...
├── todos/
│   └── sessions/
│       ├── session_a1b2c3d4.json
│       └── ...
├── memory_core/
│   └── session_summary.md
```

## Session Tracking

### Last Active Session

```typescript
function loadLastActiveSession(workspaceDir: string): string | null {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    if (!fs.existsSync(filePath)) return null;

    const sessionId = fs.readFileSync(filePath, "utf8").trim();
    if (!isValidSessionId(sessionId)) {
      cleanupLastActiveSession(workspaceDir);
      return null;
    }

    const sessionPath = path.join(workspaceDir, "sessions", `${sessionId}.json`);
    if (!fs.existsSync(sessionPath)) {
      cleanupLastActiveSession(workspaceDir);
      return null;
    }

    return sessionId;
  } catch {
    return null;
  }
}

function saveLastActiveSession(workspaceDir: string, sessionId: string): void {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, sessionId, "utf8");
  } catch (err) {
    console.warn(`Failed to save last active session: ${err}`);
  }
}
```

**Purpose:**
- Resume previous session on new connection
- Single session per workspace
- Overwritten on new turn

### Session ID Format

```typescript
const SESSION_ID_REGEX = /^session_[a-z0-9]{8}$/;

export function isValidSessionId(sessionId: string): boolean {
  return SESSION_ID_REGEX.test(sessionId);
}

export function newSessionId(): string {
  return newId("session");  // Generates: session_a1b2c3d4
}
```

## Conversation Management

### Adding Messages

```typescript
function addMessage(
  session: SessionFile,
  role: ConversationMessage["role"],
  content: string
): void {
  session.conversation.push({
    role,
    content,
    created_at: new Date().toISOString()
  });
}

// User input
addMessage(session, "user", userInput);

// Assistant response
addMessage(session, "assistant", assistantContent);

// Tool results (not added to conversation, only to messages for LLM)
```

### Message History Limits

```typescript
// Limit conversation context to last N messages
const MAX_MESSAGES = 40;

// Get recent messages for prompt
const recentMessages = session.conversation.slice(-MAX_MESSAGES);

// System prompt is prepended separately
const messages: OpenAIMessage[] = [
  { role: "system", content: systemPrompt },
  ...recentMessages.map(m => ({
    role: m.role as OpenAIMessage["role"],
    content: m.content
  }))
];
```

### Message Types

**User Messages:**
```typescript
{
  role: "user",
  content: "Read the package.json file",
  created_at: "2026-02-02T21:31:00.000Z"
}
```

**Assistant Messages:**
```typescript
{
  role: "assistant",
  content: "I'll read the package.json for you.",
  created_at: "2026-02-02T21:31:05.000Z"
}
```

**Tool Messages (LLM context only, not in conversation):**
```typescript
{
  role: "tool",
  tool_call_id: "call_001",
  name: "read_file",
  content: "{\"name\": \"my-app\", \"version\": \"1.0.0\"}",
  created_at: "2026-02-02T21:32:00.000Z"
}
```

## Session Metadata

### Meta Field

```typescript
type SessionMeta = {
  provider?: string;
  model?: string;
  workspace_dir?: string;
  last_turn_id?: string;
  custom_data?: Record<string, unknown>;
};

// Setting metadata
session.meta = session.meta || {};
session.meta.provider = provider.name;
session.meta.model = model;
```

### Session Summary

```typescript
function loadSessionSummary(workspaceDir: string): string | undefined {
  const p = path.join(workspaceDir, "memory_core", "session_summary.md");
  try {
    if (!fs.existsSync(p)) return undefined;
    const raw = fs.readFileSync(p, "utf8");
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    // Truncate if too long
    const MAX = 8000;
    return trimmed.length > MAX
      ? trimmed.slice(0, MAX) + "\n\n...(truncated)"
      : trimmed;
  } catch (err) {
    console.warn(`Failed to load session summary: ${err}`);
    return undefined;
  }
}
```

**Purpose:**
- Persistent context across sessions
- Key information from previous interactions
- Auto-generated or manually maintained

## Session Recovery

### On Connection

```typescript
wss.on("connection", (ws) => {
  let sessionId: string | null = null;

  ws.on("message", async (raw) => {
    const msg = parseClientMessage(raw);

    if (msg.type === "start_turn") {
      // Determine session ID
      const resolvedSessionId = msg.sessionId
        ?? loadLastActiveSession(workspaceDir)
        ?? newSessionId();

      sessionId = resolvedSessionId;
      saveLastActiveSession(workspaceDir, resolvedSessionId);

      // Load or create session
      const session = loadSession(sessionId) ?? createSession(sessionId);

      // Run agent turn
      const turnId = await runAgentTurn({
        sessionId,
        userInput: msg.input,
        session
      });
    }
  });
});
```

### Reconnection Handling

```typescript
// Client reconnects with previous session ID
ws.send(JSON.stringify({
  type: "start_turn",
  input: "Continue from where we left off",
  sessionId: "session_a1b2c3d4"  // Resume previous session
}));
```

## Session Cleanup

### Manual Cleanup

```bash
# Delete specific session
rm ff-terminal-workspace/sessions/session_a1b2c3d4.json

# Delete all sessions
rm ff-terminal-workspace/sessions/*.json

# Clear last session tracker
rm ff-terminal-workspace/.last-session-id
```

### Automatic Cleanup

**Retention policy:** Sessions persist indefinitely by default

**Size management:**
- Log rotation: `logs/sessions/*.jsonl`
- Max file size: 5MB (configurable)
- Retention: 3 files (configurable)

```typescript
const logger = new StructuredLogger({
  filePath: sessionLogPath,
  level: logLevel,
  maxBytes: 5 * 1024 * 1024,  // 5MB
  retention: 3
});
```

## Session Logging

### Structured Logs

```typescript
const sessionLogPath = path.join(
  workspaceDir,
  "logs",
  "sessions",
  `${sessionId}.jsonl`
);

const logger = new StructuredLogger({
  filePath: sessionLogPath,
  level: logLevel,
  maxBytes: logMaxBytes,
  retention: logRetention
});

// Log events
logger.log("info", "turn_start", {
  session_id: sessionId,
  turn_id: turnId,
  user_input_preview: truncateForLog(userInput, 400)
});

logger.log("info", "turn_complete", {
  session_id: sessionId,
  turn_id: turnId,
  duration_ms: Date.now() - runStartedAt,
  iterations: iterationCount,
  tool_calls_executed: toolCallsExecuted
});
```

### Log Format

```json
{"level":"info","event":"turn_start","ts":"2026-02-02T21:31:00.000Z","session_id":"session_a1b2c3d4","turn_id":"turn_e5f6g7h8","user_input_preview":"..."}
{"level":"info","event":"tool_start","ts":"2026-02-02T21:31:05.000Z","session_id":"session_a1b2c3d4","tool_name":"read_file","arguments":"..."}
{"level":"info","event":"tool_end","ts":"2026-02-02T21:31:06.000Z","session_id":"session_a1b2c3d4","tool_name":"read_file","ok":true,"duration_ms":450}
{"level":"info","event":"turn_complete","ts":"2026-02-02T21:31:30.000Z","session_id":"session_a1b2c3d4","turn_id":"turn_e5f6g7h8","duration_ms":30000}
```

## Multiple Sessions

### Concurrent Sessions

```typescript
// Multiple WebSocket connections can have different sessions
const sessions = new Map<string, SessionFile>();

wss.on("connection", (ws) => {
  let sessionId = newSessionId();
  sessions.set(sessionId, createSession(sessionId));

  ws.on("message", async (raw) => {
    const msg = parseClientMessage(raw);

    if (msg.type === "start_turn") {
      const session = sessions.get(sessionId)!;
      await runAgentTurn({ sessionId, session, ... });
    }

    if (msg.type === "switch_session") {
      // Client requests session switch
      const newSessionId = msg.sessionId;
      const existing = loadSession(newSessionId);
      if (existing) {
        sessions.set(newSessionId, existing);
        sessionId = newSessionId;
      }
    }
  });

  ws.on("close", () => {
    // Keep session in memory for reconnection window
    setTimeout(() => {
      if (!ws OPEN) {
        sessions.delete(sessionId);
      }
    }, 60000);  // 1 minute reconnection window
  });
});
```

### Session Isolation

Each session maintains:
- Independent conversation history
- Separate tool execution state
- Individual log streams
- Unique session summary

## Related Documentation

- [03-websocket-protocol.md](./03-websocket-protocol.md) - Session in messages
- [04-execution-flow.md](./04-execution-flow.md) - Session in agent loop
- [07-workspace-system.md](./07-workspace-system.md) - Workspace session storage
- [10-async-context.md](./10-async-context.md) - Session context
