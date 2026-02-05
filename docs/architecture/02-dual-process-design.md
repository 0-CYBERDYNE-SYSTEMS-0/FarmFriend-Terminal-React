# Dual Process Design

## Overview

FF Terminal uses a dual-process architecture: a **daemon** process for long-running operations and a **UI process** for user interaction. This separation provides stability, flexibility, and multiple interface options.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Process                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Ink UI      │  │  Web UI      │  │ FieldView    │  │
│  │  (Terminal)  │  │  (Browser)   │  │  (Browser)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │            │
│         └─────────────────┴─────────────────┘            │
│                           │                               │
│                    WebSocket Client                       │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │ WebSocket     │
                    │ (port 28888)│
                    └───────┬───────┘
                            │
┌───────────────────────────┼───────────────────────────────┐
│                  Daemon Process                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  WebSocket Server                              │      │
│  │  - Handles client connections                 │      │
│  │  - Manages sessions                           │      │
│  │  - Dispatches agent turns                    │      │
│  └──────────┬─────────────────────────────────────┘      │
│             │                                             │
│  ┌──────────▼─────────────────────────────────────┐      │
│  │  Agent Runtime                                │      │
│  │  - Agent loop                                │      │
│  │  - Tool execution                            │      │
│  │  - Provider communication                    │      │
│  └──────────┬─────────────────────────────────────┘      │
│             │                                             │
│  ┌──────────▼─────────────────────────────────────┐      │
│  │  State Persistence                            │      │
│  │  - Sessions                                   │      │
│  │  - Logs                                      │      │
│  │  - Todo lists                                │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Process Lifecycle

### Startup Sequence

```
User runs: ff-terminal start
    │
    ├─→ Spawn daemon process
    │   - Start WebSocket server
    │   - Initialize tool registry
    │   - Load workspace state
    │   - Listen on port 28888
    │
    └─→ Spawn UI process (after 300ms delay)
        - Connect to daemon via WebSocket
        - Display interface
        - Forward user input
        - Stream agent responses
```

### Graceful Shutdown

```
User exits UI (Ctrl+C or UI quit)
    │
    ├─→ UI process terminates
    │   - Close WebSocket connection
    │   - Clean up resources
    │
    └─→ Daemon continues running (for other clients)
        - Maintains state
        - Ready for new connections
        - Can be stopped explicitly with: kill <pid>
```

## Communication Protocol

### WebSocket Messages

**Client → Daemon:**
```typescript
// Start new turn
{
  type: "start_turn",
  input: string,
  sessionId?: string
}

// Cancel running turn
{
  type: "cancel_turn",
  turnId: string
}

// List available tools
{
  type: "list_tools"
}

// Handshake
{
  type: "hello",
  client: "ink" | "web",
  version?: string
}
```

**Daemon → Client:**
```typescript
// Turn started
{
  type: "turn_started",
  sessionId: string,
  turnId: string
}

// Streaming response chunk
{
  type: "chunk",
  turnId: string,
  seq: number,
  chunk: string  // Wire-encoded StreamChunk
}

// Turn finished
{
  type: "turn_finished",
  turnId: string,
  ok: boolean,
  error?: string
}

// Tool list
{
  type: "tools",
  tools: string[]
}

// Todo update
{
  type: "todo_update",
  todos: Todo[]
}

// Subagent event
{
  type: "subagent_start" | "subagent_progress" | "subagent_complete",
  agentId: string,
  // ... event-specific fields
}
```

### Message Flow

```
Client                    Daemon                    Provider
  │                         │                          │
  ├─ start_turn ──────────→│                          │
  │                         ├─ load session            │
  │                         ├─ build prompt           │
  │                         ├─ streamChat ───────────→│
  │                         │                          ├─ generate
  │                         │←─ content delta ─────────┤
  │←─ chunk (content) ──────┤                          │
  │                         ├─ execute tools           │
  │                         ├─ streamChat ───────────→│
  │                         │←─ tool_call ────────────┤
  │←─ chunk (status) ──────┤                          │
  │←─ chunk (content) ──────┤                          │
  │                         │                          │
  │←─ turn_finished ─────────┤                          │
```

## Benefits of Dual Process

### 1. **UI Independence**
- Multiple UIs can connect to same daemon
- UI crashes don't affect running agent
- UI can be replaced without restarting daemon

### 2. **State Persistence**
- Daemon maintains state between UI sessions
- Long-running tasks continue in background
- Reconnect to in-progress sessions

### 3. **Resource Isolation**
- UI doesn't block agent execution
- Agent continues even if UI is unresponsive
- Clean separation of concerns

### 4. **Multiple Interface Options**
- Terminal UI (Ink)
- Web UI (React)
- FieldView (enhanced web)
- Custom UIs via WebSocket

## Process Management

### Spawning in Development

```typescript
// From ff-terminal.ts (main entry point)
const daemonCmd = isDevTs ? "tsx" : process.execPath;
const daemonArgs = isDevTs ? ["src/daemon/daemon.ts"] : ["dist/daemon/daemon.js"];

const daemon = spawn(daemonCmd, daemonArgs, {
  env,
  stdio: ["ignore", "pipe", "pipe"],  // Don't inherit stdio
  shell: true,
  cwd: projectDir
});

// Start UI after daemon is ready
await new Promise((r) => setTimeout(r, 300));

const uiCmd = isDevTs ? "tsx" : process.execPath;
const uiArgs = isDevTs ? ["src/cli/app.tsx"] : ["dist/cli/app.js"];

const ui = spawn(uiCmd, uiArgs, {
  env,
  stdio: "inherit",  // UI needs terminal
  shell: true,
  cwd: projectDir
});
```

### Signal Handling

**Daemon:**
```typescript
process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});
```

**UI:**
```typescript
ui.on("exit", (code) => {
  // Optionally kill daemon on UI exit
  daemon.kill("SIGTERM");
  process.exit(code);
});
```

## WebSocket Configuration

### Default Port
- **Port:** 28888
- **Host:** 127.0.0.1 (localhost only)
- **Protocol:** WebSocket (ws://)

### Port Selection

**Global default:** `FF_TERMINAL_PORT=28888`
**Local workspace:** Deterministic hash of workspace path
  - Range: 28889-38888
  - Allows multiple workspaces concurrently

### Connection Options

```typescript
// UI connection
const ws = new WebSocket(`ws://127.0.0.1:${port}`);

// With reconnection
function connect() {
  const ws = new WebSocket(url);
  ws.on("close", () => {
    setTimeout(connect, 1000);  // Reconnect after 1s
  });
  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "hello", client: "ink" }));
  });
}
```

## Session Isolation

Each WebSocket connection gets its own session context:

```typescript
wss.on("connection", (ws) => {
  let sessionId: string | null = null;
  let currentTurn: TurnState | null = null;

  ws.on("message", async (raw) => {
    const msg = parseClientMessage(raw);

    if (msg.type === "start_turn") {
      // Resolve session ID or create new
      sessionId = msg.sessionId ?? loadLastSession() ?? newSessionId();

      // Run agent turn
      currentTurn = await runAgentTurn({
        sessionId,
        input: msg.input,
        registry
      });

      // Stream chunks to client
      for await (const chunk of currentTurn) {
        ws.send(JSON.stringify({
          type: "chunk",
          turnId: currentTurn.id,
          chunk: encodeWire(chunk)
        }));
      }
    }
  });
});
```

## Error Handling

### Daemon Errors

```typescript
try {
  await runAgentTurn({ ... });
} catch (err) {
  ws.send(JSON.stringify({
    type: "chunk",
    turnId,
    chunk: encodeWire({
      kind: "error",
      message: err.message
    })
  }));

  ws.send(JSON.stringify({
    type: "turn_finished",
    turnId,
    ok: false,
    error: err.message
  }));
}
```

### Client Errors

```typescript
ws.on("error", (err) => {
  console.error("WebSocket error:", err);
  // Attempt reconnection
  setTimeout(connect, 2000);
});
```

## Related Documentation

- [03-websocket-protocol.md](./03-websocket-protocol.md) - Full protocol specification
- [06-session-management.md](./06-session-management.md) - Session persistence
- [04-execution-flow.md](./04-execution-flow.md) - Turn execution details
