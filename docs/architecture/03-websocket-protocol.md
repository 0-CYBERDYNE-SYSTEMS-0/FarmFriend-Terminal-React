# WebSocket Protocol

## Overview

FF Terminal uses a custom WebSocket protocol for bidirectional communication between UI clients and the daemon process. The protocol is designed for real-time streaming of agent responses and efficient session management.

## Connection

### URL Format

```
ws://127.0.0.1:<port>
```

### Default Port
- **Global default:** 28888
- **Workspace-specific:** 28889-38888 (deterministic hash)

### Handshake Sequence

```
Client                    Server
  │                         │
  ├─ WebSocket Connect ─────→│
  │←─ hello ─────────────────┤
  │  { daemonVersion }       │
  │                         │
  ├─ hello ─────────────────→│
  │  { client: "ink" }      │
  │                         │
  ├─ list_tools ────────────→│
  │←─ tools ─────────────────┤
  │  { tools: [...] }       │
```

## Message Types

### Client Messages

All client messages share this structure:
```typescript
type ClientMessage =
  | { type: "hello"; client: "ink" | "web"; version?: string }
  | { type: "start_turn"; input: string | any[]; sessionId?: string }
  | { type: "cancel_turn"; turnId: string }
  | { type: "list_tools" };
```

#### 1. Hello

Client identification and version negotiation.

```typescript
{
  type: "hello",
  client: "ink" | "web",  // Client type
  version?: string           // Optional client version
}
```

**Usage:**
- Send immediately after connection
- Required for proper session handling

#### 2. Start Turn

Initiate a new agent turn.

```typescript
{
  type: "start_turn",
  input: string | any[],      // User input (text or content blocks)
  sessionId?: string          // Optional session ID to resume
}
```

**Usage:**
- Main interaction message
- `input` can be plain string or array of content blocks
- Omit `sessionId` to start new session
- Include `sessionId` to continue existing session

**Content blocks example:**
```typescript
{
  type: "start_turn",
  input: [
    { type: "text", text: "Analyze this image" },
    { type: "image", image: "data:image/jpeg;base64,..." }
  ]
}
```

#### 3. Cancel Turn

Cancel a currently running turn.

```typescript
{
  type: "cancel_turn",
  turnId: string  // Turn ID from turn_started message
}
```

**Usage:**
- Abort long-running agent turns
- Turn ID comes from `turn_started` response

#### 4. List Tools

Request list of available tools.

```typescript
{
  type: "list_tools"
}
```

**Usage:**
- Get all registered tool names
- Useful for UI tool selection

### Server Messages

All server messages share this structure:
```typescript
type ServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "tools"; tools: string[] }
  | { type: "todo_update"; todos: Todo[] }
  | { type: "subagent_start"; agentId: string; task: string }
  | { type: "subagent_progress"; agentId: string; action: string; file?: string; toolCount: number; tokens: number }
  | { type: "subagent_complete"; agentId: string; status: "done" | "error"; error?: string };
```

#### 1. Hello

Server greeting with version information.

```typescript
{
  type: "hello",
  daemonVersion: string
}
```

#### 2. Turn Started

Confirmation that a new turn has started.

```typescript
{
  type: "turn_started",
  sessionId: string,  // Session ID (new or resumed)
  turnId: string      // Unique turn ID for this interaction
}
```

#### 3. Chunk

Streaming response chunk (main message type).

```typescript
{
  type: "chunk",
  turnId: string,      // Turn ID (from turn_started)
  seq: number,         // Monotonically increasing sequence number
  chunk: string        // Wire-encoded StreamChunk (see Wire Encoding)
}
```

**Usage:**
- Primary streaming message
- Multiple chunks per turn
- Decode `chunk` field with `parseWire()` to get StreamChunk

#### 4. Turn Finished

Turn completion status.

```typescript
{
  type: "turn_finished",
  turnId: string,
  ok: boolean,         // True if successful, false if error
  error?: string       // Error message if ok=false
}
```

#### 5. Tools

Response to `list_tools` request.

```typescript
{
  type: "tools",
  tools: string[]  // Alphabetically sorted tool names
}
```

#### 6. Todo Update

Real-time todo list updates.

```typescript
{
  type: "todo_update",
  todos: Todo[]  // Current todo list state
}

type Todo = {
  id: string,
  content: string,
  status: "pending" | "in_progress" | "completed",
  priority: "high" | "medium" | "low",
  completedAt?: number
}
```

#### 7. Subagent Events

Messages about subagent execution.

**Subagent Start:**
```typescript
{
  type: "subagent_start",
  agentId: string,
  task: string  // Task description
}
```

**Subagent Progress:**
```typescript
{
  type: "subagent_progress",
  agentId: string,
  action: string,        // Current action description
  file?: string,         // File being processed
  toolCount: number,     // Tools executed so far
  tokens: number        // Tokens consumed
}
```

**Subagent Complete:**
```typescript
{
  type: "subagent_complete",
  agentId: string,
  status: "done" | "error",
  error?: string  // Error message if status="error"
}
```

## Wire Encoding

Chunks contain wire-encoded StreamChunk objects. This encoding is used to serialize complex streaming events efficiently.

### Encoding

```typescript
function toWire(chunk: StreamChunk): string {
  // Encode StreamChunk to single-line string
  return JSON.stringify(chunk);
}
```

### Decoding

```typescript
function parseWire(raw: string): StreamChunk {
  return JSON.parse(raw);
}
```

### StreamChunk Types

```typescript
type StreamChunk =
  | { kind: "content"; delta: string }
  | { kind: "thinking"; delta: string }
  | { kind: "status"; message: string }
  | { kind: "error"; message: string }
  | { kind: "task_completed" };
```

## Message Flow Examples

### Simple Turn

```
Client                    Server
  │                         │
  ├─ start_turn ──────────→│
  │  { input: "Hello" }    │
  │←─ turn_started ─────────┤
  │  { sessionId: "..." }   │
  │                         │
  │←─ chunk (seq=0) ───────┤
  │  { kind: "content",    │
  │    delta: "Hello!" }    │
  │                         │
  │←─ chunk (seq=1) ───────┤
  │  { kind: "content",    │
  │    delta: " How can I   │
  │    help you?" }         │
  │                         │
  │←─ turn_finished ────────┤
  │  { ok: true }           │
```

### Turn with Tool Execution

```
Client                    Server
  │                         │
  ├─ start_turn ──────────→│
  │  { input: "Read file" }│
  │←─ turn_started ─────────┤
  │                         │
  │←─ chunk (seq=0) ───────┤
  │  { kind: "content",    │
  │    delta: "I'll read   │
  │    the file..." }       │
  │                         │
  │←─ chunk (seq=1) ───────┤
  │  { kind: "status",     │
  │    message:             │
  │    "tool_start:read_    │
  │    file|Reading file..." }│
  │                         │
  │←─ chunk (seq=2) ───────┤
  │  { kind: "status",     │
  │    message:             │
  │    "tool_end:read_file│
  │    |0.2s|ok|Read 42   │
  │    lines" }             │
  │                         │
  │←─ chunk (seq=3) ───────┤
  │  { kind: "content",    │
  │    delta: "Here's the  │
  │    content..." }        │
  │                         │
  │←─ turn_finished ────────┤
```

### Turn with Error

```
Client                    Server
  │                         │
  ├─ start_turn ──────────→│
  │  { input: "..." }       │
  │←─ turn_started ─────────┤
  │                         │
  │←─ chunk (seq=0) ───────┤
  │  { kind: "content",    │
  │    delta: "I'll..." }   │
  │                         │
  │←─ chunk (seq=1) ───────┤
  │  { kind: "error",      │
  │    message: "Failed to  │
  │    read file" }         │
  │                         │
  │←─ turn_finished ────────┤
  │  { ok: false,           │
  │    error: "..." }       │
```

## Sequence Numbers

Chunks are ordered by `seq` field:

```typescript
// Client should process chunks in order
const chunks: Map<number, ServerMessage> = new Map();

ws.on("message", (raw) => {
  const msg = JSON.parse(raw) as ServerMessage;

  if (msg.type === "chunk") {
    chunks.set(msg.seq, msg);

    // Process in order
    while (chunks.has(nextSeq)) {
      const chunk = chunks.get(nextSeq)!;
      processChunk(chunk);
      chunks.delete(nextSeq);
      nextSeq++;
    }
  }
});
```

## Reconnection Handling

### Client Reconnection Logic

```typescript
let ws: WebSocket | null = null;
let turnId: string | null = null;

function connect() {
  ws = new WebSocket(`ws://127.0.0.1:${port}`);

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "hello", client: "ink" }));
  });

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw) as ServerMessage;

    if (msg.type === "turn_started") {
      turnId = msg.turnId;
    }
  });

  ws.on("close", () => {
    // Reconnect after delay
    setTimeout(connect, 1000);
  });
}
```

### Session Continuity

On reconnection, client can resume session:

```typescript
ws.send(JSON.stringify({
  type: "start_turn",
  sessionId: previousSessionId,  // Resume previous session
  input: "Continue where we left off"
}));
```

## Error Handling

### Invalid Messages

Server responds with error chunk:

```typescript
{
  type: "chunk",
  turnId: "unknown",
  seq: 0,
  chunk: JSON.stringify({
    kind: "error",
    message: "Invalid message"
  })
}
```

### Connection Errors

Client should handle gracefully:

```typescript
ws.on("error", (err) => {
  console.error("WebSocket error:", err);
  // Attempt reconnection
  setTimeout(connect, 2000);
});
```

## Security

### Localhost Only
- Daemon binds to `127.0.0.1` (not `0.0.0.0`)
- No external network access
- Firewall should block if needed

### Message Validation
Server validates client messages:

```typescript
function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== "object") return false;

  const type = (value as any).type;

  if (type === "hello") {
    return (value as any).client === "ink" || (value as any).client === "web";
  }

  if (type === "start_turn") {
    return typeof (value as any).input === "string" ||
           Array.isArray((value as any).input);
  }

  if (type === "cancel_turn") {
    return typeof (value as any).turnId === "string";
  }

  if (type === "list_tools") {
    return true;
  }

  return false;
}
```

## Related Documentation

- [02-dual-process-design.md](./02-dual-process-design.md) - Process architecture
- [04-execution-flow.md](./04-execution-flow.md) - How turns are executed
- [06-session-management.md](./06-session-management.md) - Session persistence
