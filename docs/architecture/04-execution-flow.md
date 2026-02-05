# Execution Flow

## Overview

Execution flow in FF Terminal follows a streaming agent loop pattern. The daemon processes user input, interacts with LLM providers, executes tools, and streams responses back to the client in real-time.

## High-Level Flow

```
User Input
    │
    ├─→ WebSocket Client (Ink/Web)
    │       │
    │       ├─→ WebSocket Daemon
    │               │
    │               ├─→ Agent Loop (runAgentTurn)
    │                       │
    │                       ├─→ Provider (LLM)
    │                       │       │
    │                       │       ├─→ Generate response
    │                       │       ├─→ Extract tool calls
    │                       │       └─→ Stream deltas
    │                       │
    │                       ├─→ Tool Execution
    │                       │       │
    │                       │       ├─→ Validate calls
    │                       │       ├─→ Run hooks
    │                       │       ├─→ Execute tools
    │                       │       └─→ Collect results
    │                       │
    │                       ├─→ Decision: Stop or Continue?
    │                       │       │
    │                       │       ├─ Yes → Stream final response
    │                       │       └─ No → Loop back to Provider
    │                       │
    │                       └─→ Stream chunks to client
    │
    └─→ Display to user
```

## Detailed Sequence Diagram

```
Client      Daemon     AgentLoop    Provider     ToolRegistry   Filesystem
  │           │           │            │              │              │
  │ start_turn│           │            │              │              │
  │──────────→│           │            │              │              │
  │           │ loadSession│            │              │              │
  │           │──────────→│            │              │              │
  │           │←──────────┤            │              │              │
  │           │ buildPrompt│           │              │              │
  │           │───────────→│            │              │              │
  │           │───────────────────────────────────────────────→│ (load skills, templates)
  │           │←───────────────────────────────────────────────┤
  │           │           │            │              │              │
  │←─────────┤ turn_started│           │              │              │
  │           │           │            │              │              │
  │           │           │ streamChat│              │              │
  │           │           │──────────→│              │              │
  │           │           │←─────────┤ content delta              │
  │←─────────┤ chunk (content)         │              │              │
  │           │           │←─────────┤ tool_call                  │
  │           │           │            │              │              │
  │           │           │ validate    │              │              │
  │           │           │──────────────────────────→│              │
  │           │           │←───────────────────────────┤              │
  │           │           │ pre-tool   │              │              │
  │           │           │ hooks      │              │              │
  │           │           │───────────→│              │              │
  │           │           │←───────────┤              │              │
  │           │←─────────┤ chunk (status: tool_start)              │
  │           │           │ execute    │              │              │
  │           │           │─────────────────────────────────────────→│
  │           │           │←─────────────────────────────────────────┤
  │           │←─────────┤ chunk (status: tool_end)              │
  │           │           │ post-tool  │              │              │
  │           │           │ hooks      │              │              │
  │           │           │───────────→│              │              │
  │           │           │←───────────┤              │              │
  │           │           │ streamChat│              │              │
  │           │           │──────────→│              │              │
  │           │           │←─────────┤ content delta              │
  │←─────────┤ chunk (content)         │              │              │
  │           │           │            │              │              │
  │           │           │ runAgentStopHook│          │              │
  │           │           │───────────→│              │              │
  │           │           │←───────────┤ (continue)  │              │
  │           │           │            │              │              │
  │           │           │ streamChat│              │              │
  │           │           │──────────→│              │              │
  │           │           │←─────────┤ content delta              │
  │←─────────┤ chunk (content)         │              │              │
  │           │           │←─────────┤ (no tool calls)            │
  │           │           │ runAgentStopHook│          │              │
  │           │           │───────────→│              │              │
  │           │           │←───────────┤ (stop)      │              │
  │           │           │            │              │              │
  │←─────────┤ chunk (task_completed)               │              │
  │←─────────┤ turn_finished│           │              │              │
```

## Turn Lifecycle

### 1. Initialization

```typescript
export async function* runAgentTurn(params: {
  userInput: string | any[];
  registry: ToolRegistry;
  sessionId: string;
  repoRoot?: string;
  signal: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const { userInput, registry, signal, sessionId } = params;

  // Initialize
  const turnId = newId("turn");
  yield { kind: "status", message: "Starting turn..." };

  // Load session
  const session = loadSession(sessionId) ?? createSession(sessionId);
  session.conversation.push({ role: "user", content: userInput });
  saveSession(session);

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    repoRoot,
    workingDir: process.cwd(),
    availableToolNames: registry.listNames()
  });

  // Create provider
  const { provider, model } = createProvider();
  yield { kind: "status", message: `Provider: ${provider.name} | Model: ${model}` };

  // ... continue execution
}
```

### 2. Main Loop

```typescript
const maxIterations = 500;
let toolCallsExecuted = 0;

for (let i = 0; i < maxIterations; i++) {
  logger.log("debug", "iteration_start", {
    session_id: sessionId,
    turn_id: turnId,
    iteration: i + 1
  });

  // 2.1. Call Provider
  let toolCalls: ToolCall[] = [];
  let assistantContent = "";

  for await (const ev of provider.streamChat({
    model,
    messages,  // Conversation history + system prompt
    tools,     // Available tool schemas
    signal,
    sessionId
  })) {
    if (ev.type === "content") {
      yield { kind: "content", delta: ev.delta };
      assistantContent += ev.delta;
    } else if (ev.type === "tool_calls") {
      toolCalls = ev.toolCalls;
    } else if (ev.type === "error") {
      yield { kind: "error", message: ev.message };
      break;
    }
  }

  // Save assistant response
  session.conversation.push({
    role: "assistant",
    content: assistantContent
  });
  saveSession(session);

  // 2.2. Check if done (no tool calls)
  if (toolCalls.length === 0) {
    const stop = await hookRegistry.runAgentStop({ ... });
    if (stop.action === "allow") {
      break;  // Turn complete
    }
    // Otherwise, continue with system prompt modification
    continue;
  }

  // 2.3. Execute Tools
  const results = await executeToolCalls(registry, toolCalls, {
    signal,
    hooks: {
      onStart: (call) => {
        logToolEvent({ event: "tool_start", ... });
        yield { kind: "status", message: `tool_start:${call.name}` };
      },
      onFinish: (call, result, durationMs) => {
        logToolEvent({ event: "tool_end", ... });
        yield { kind: "status", message: `tool_end:${call.name}` };
      }
    }
  });

  // 2.4. Feed results back to LLM
  for (const result of results) {
    messages.push({
      role: "tool",
      tool_call_id: result.id,
      name: result.name,
      content: result.output
    });
  }

  toolCallsExecuted += results.length;
}

yield { kind: "task_completed" };
```

### 3. Cleanup

```typescript
finally {
  logger.log("info", "turn_complete", {
    session_id: sessionId,
    turn_id: turnId,
    duration_ms: Date.now() - runStartedAt,
    iterations: iterationCount,
    tool_calls_executed: toolCallsExecuted,
    aborted: signal.aborted
  });

  yield { kind: "task_completed" };
}
```

## Tool Execution Flow

### Validation Phase

```typescript
const blockedResults: ToolResult[] = [];
const callsToRun: ToolCall[] = [];

for (const tc of toolCalls) {
  // Schema validation
  const validation = validateToolArgs(tc.name, tc.arguments, allSchemas);
  if (!validation.valid) {
    blockedResults.push({
      id: tc.id,
      name: tc.name,
      ok: false,
      output: validation.error
    });
    continue;
  }

  // Pre-tool hooks
  const pre = await hookRegistry.runPreTool({ call: tc });
  if (pre.action === "block") {
    blockedResults.push({
      id: tc.id,
      name: tc.name,
      ok: false,
      output: `Blocked by pre_tool hook: ${pre.reason}`
    });
    continue;
  }

  if (pre.action === "modify") {
    callsToRun.push({ ...tc, arguments: pre.modifiedArguments });
    continue;
  }

  callsToRun.push(tc);
}
```

### Execution Phase

```typescript
const results = await executeToolCalls(registry, callsToRun, {
  signal,
  hooks: {
    onStart: (call) => {
      logToolEvent({
        event: "tool_start",
        tool_name: call.name,
        arguments: call.arguments
      });
      yield { kind: "status", message: `tool_start:${call.name}|${context}` };
    },
    onFinish: (call, result, durationMs) => {
      logToolEvent({
        event: "tool_end",
        tool_name: call.name,
        ok: result.ok,
        duration_ms: durationMs,
        output_preview: result.output
      });
      yield { kind: "status", message: `tool_end:${call.name}|${durationSec}s|${status}|${preview}` };
    }
  }
});
```

### Post-Execution Phase

```typescript
const results = [...blockedResults, ...resultsRan];

// Circuit breaker check
for (const r of resultsRan) {
  if (!r.ok) {
    const failCount = (consecutiveToolFailures.get(r.name) ?? 0) + 1;
    consecutiveToolFailures.set(r.name, failCount);

    if (failCount >= CIRCUIT_BREAKER_THRESHOLD) {
      // Inject system prompt to stop retrying
      messages.push({
        role: "system",
        content: `CIRCUIT BREAKER: Tool ${r.name} failed 5+ times. STOP using it.`
      });
    }
  } else {
    consecutiveToolFailures.set(r.name, 0);
  }
}

// Post-tool hooks
for (const r of results) {
  await hookRegistry.runPostTool({
    call: originalCall,
    ok: r.ok,
    output: r.output
  });

  if (!r.ok) {
    await hookRegistry.runToolError({
      call: originalCall,
      error: r.output
    });
  }
}

// Feed results to LLM
for (const r of results) {
  messages.push({
    role: "tool",
    tool_call_id: r.id,
    name: r.name,
    content: r.output
  });
}
```

## Streaming Protocol

### Chunk Types

```typescript
type StreamChunk =
  | { kind: "content"; delta: string }       // Assistant text
  | { kind: "thinking"; delta: string }      // Hidden reasoning
  | { kind: "status"; message: string }      // Status update
  | { kind: "error"; message: string }       // Error message
  | { kind: "task_completed" };             // Turn complete
```

### Status Message Format

Status messages have a structured format for UI parsing:

```typescript
// Tool start
"tool_start:{tool_name}|{context_description}"

// Tool end
"tool_end:{tool_name}|{duration}s|{ok|error}|{preview}"

// Update
"update:{message}"

// Plan step status
"plan_step:{step_id}|{status}|{description}"
```

## Error Handling

### Provider Errors

```typescript
for await (const ev of provider.streamChat({ ... })) {
  if (ev.type === "error") {
    yield { kind: "error", message: ev.message };
    logger.log("error", "provider_error", {
      session_id: sessionId,
      turn_id: turnId,
      message: ev.message
    });
    break;  // Stop iteration
  }
}
```

### Tool Errors

```typescript
try {
  const output = await toolHandler(args, signal);
  return { id, name, ok: true, output };
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  return { id, name, ok: false, output: message };
}
```

### Circuit Breaker

Prevent infinite loops on failing tools:

```typescript
const CIRCUIT_BREAKER_THRESHOLD = 5;
const consecutiveToolFailures = new Map<string, number>();

if (failCount >= CIRCUIT_BREAKER_THRESHOLD) {
  yield { kind: "status", message: `Circuit breaker: ${toolName} failed 5x` };

  // Force evaluation
  const stop = await hookRegistry.runAgentStop({ ... });
  if (stop.action === "allow") {
    break;  // Force stop
  }
}
```

## Cancellation

### AbortSignal Support

```typescript
export async function* runAgentTurn({
  signal,
  // ...
}): AsyncGenerator<StreamChunk> {
  // Propagate signal to provider
  for await (const ev of provider.streamChat({ signal, ... })) {
    // ...
  }

  // Propagate signal to tool execution
  const results = await executeToolCalls(registry, callsToRun, {
    signal,
    // ...
  });

  // Finally block always logs completion
  finally {
    logger.log("info", "turn_complete", {
      aborted: signal.aborted
    });
  }
}
```

### Client Cancellation

```typescript
// Client sends cancel
ws.send(JSON.stringify({
  type: "cancel_turn",
  turnId: "..."
}));

// Daemon aborts
wss.on("message", async (raw) => {
  const msg = parseClientMessage(raw);

  if (msg.type === "cancel_turn") {
    if (currentTurn?.id === msg.turnId) {
      currentTurn.controller.abort();  // AbortSignal triggers
      ws.send(JSON.stringify({
        type: "chunk",
        turnId: currentTurn.id,
        seq: 0,
        chunk: toWire({ kind: "task_completed" })
      }));
    }
  }
});
```

## Performance Considerations

### Parallel Tool Execution

```typescript
// Tools execute in parallel (Python parity)
const results = await Promise.all(
  callsToRun.map(async (call) => {
    const handler = registry.get(call.name);
    const output = await handler(call.arguments, signal);
    return { id: call.id, name: call.name, ok: true, output };
  })
);
```

### Stream vs. Batch

- **Stream:** Real-time UI updates
- **Batch:** Reduced overhead for large operations

Both modes supported via provider interface.

### Prompt Caching

```typescript
const enablePromptCaching = cfg.enable_prompt_caching !== false;

const systemPromptBlocks = enablePromptCaching
  ? buildCacheableSystemPrompt({ enableCaching: true })
  : [{ type: "text", text: buildSystemPrompt({ ... }) }];
```

Cacheable prompts are split into static (cacheable) and dynamic parts.

## Related Documentation

- [03-websocket-protocol.md](./03-websocket-protocol.md) - Message streaming
- [05-provider-abstraction.md](./05-provider-abstraction.md) - LLM providers
- [09-tool-registry.md](./09-tool-registry.md) - Tool execution
- [10-async-context.md](./10-async-context.md) - AbortSignal and context
