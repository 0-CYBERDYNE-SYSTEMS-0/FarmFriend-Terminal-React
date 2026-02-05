# Async Context

## Overview

Async context management enables safe propagation of request-scoped data (session, workspace, cancellation) across async boundaries. FF Terminal uses `AsyncLocalStorage` and `AbortSignal` for robust context handling.

## AbortSignal

### Signal Overview

`AbortSignal` provides a unified mechanism for cancellation across all async operations.

```typescript
const controller = new AbortController();

try {
  for await (const ev of provider.streamChat({ signal: controller.signal })) {
    // Process event
    if (shouldCancel) {
      controller.abort();
    }
  }
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    // Operation was cancelled
  } else {
    // Other error
  }
}
```

### Signal Propagation

```typescript
// Pass signal to all async operations
async function runAgentTurn({ signal }: { signal: AbortSignal }) {
  // Provider
  for await (const ev of provider.streamChat({ signal })) {
    // ...
  }

  // Tools
  const results = await executeToolCalls(registry, calls, { signal });

  // Nested calls
  await performComplexOperation({ signal });
}

async function performComplexOperation({ signal }: { signal: AbortSignal }) {
  const controller = AbortSignal.any([signal, timeoutSignal]);

  await Promise.all([
    operation1({ signal }),
    operation2({ signal }),
    operation3({ signal: controller })
  ]);
}
```

### Signal Timeout

```typescript
function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fn().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Usage
await withTimeout(
  () => provider.streamChat({ signal, ... }),
  60000  // 60 second timeout
);
```

### Client Cancellation

```typescript
// Client sends cancel request
ws.send(JSON.stringify({
  type: "cancel_turn",
  turnId: currentTurn.id
}));

// Server handles cancel
if (msg.type === "cancel_turn") {
  if (currentTurn?.id === msg.turnId) {
    currentTurn.controller.abort();  // Triggers AbortError
    send(ws, { type: "chunk", turnId, chunk: "canceled" });
  }
}
```

## AsyncLocalStorage

### Context Store

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

type ToolContext = {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  emitSubagentEvent?: (event: SubagentEvent) => void;
};

const toolContext = new AsyncLocalStorage<ToolContext>();
```

### Context Propagation

```typescript
export function withToolContext<T>(
  ctx: ToolContext,
  fn: () => T
): T {
  return toolContext.run(ctx, fn);
}

export function getToolContext(): ToolContext | undefined {
  return toolContext.getStore();
}
```

### Usage in Agent Loop

```typescript
export async function* runAgentTurn({
  sessionId,
  userInput,
  signal
}: {
  sessionId: string;
  userInput: string;
  signal: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const toolCtx: ToolContext = {
    sessionId,
    workspaceDir: resolveWorkspaceDir(),
    repoRoot: findRepoRoot()
  };

  await withToolContext(toolCtx, async () => {
    for await (const chunk of executeTurn(userInput, signal)) {
      yield chunk;
    }
  });
}
```

### Usage in Tools

```typescript
export async function readFileTool(args: {
  file_path: string;
}): Promise<string> {
  const ctx = getToolContext();
  if (!ctx) {
    throw new Error("Tool called outside tool context");
  }

  const resolvedPath = path.resolve(
    ctx.workspaceDir,
    args.file_path
  );

  return fs.readFileSync(resolvedPath, "utf8");
}
```

### Nested Context

```typescript
async function outerFunction() {
  const ctx1: ToolContext = {
    sessionId: "session_1",
    workspaceDir: "/workspace"
  };

  await withToolContext(ctx1, async () => {
    // ctx1 is active
    await innerFunction();

    const ctx2: ToolContext = {
      sessionId: "session_2",  // Different session
      workspaceDir: "/workspace"
    };

    await withToolContext(ctx2, async () => {
      // ctx2 is now active
      await anotherFunction();
    });

    // Back to ctx1
    await yetAnotherFunction();
  });
}
```

## Subagent Events

### Event Types

```typescript
type SubagentEvent =
  | { event: "start"; agentId: string; task?: string }
  | { event: "progress"; agentId: string; action: string; file?: string; toolCount: number; tokens: number }
  | { event: "complete"; agentId: string; status: "done" | "error"; error?: string };

type SubagentProgress = {
  agentId: string;
  task: string;
  status: "running" | "done" | "error";
  currentAction?: string;
  currentFile?: string;
  toolCount: number;
  tokens: number;
};
```

### Event Emission

```typescript
function emitSubagentEvent(event: SubagentEvent) {
  const ctx = getToolContext();
  if (!ctx?.emitSubagentEvent) return;

  if (event.event === "start") {
    ctx.emitSubagentEvent({
      event: "start",
      agentId: event.agentId,
      task: event.task || ""
    });
  } else if (event.event === "progress") {
    ctx.emitSubagentEvent({
      event: "progress",
      agentId: event.agentId,
      action: event.action,
      file: event.file,
      toolCount: event.toolCount,
      tokens: event.tokens
    });
  } else if (event.event === "complete") {
    ctx.emitSubagentEvent({
      event: "complete",
      agentId: event.agentId,
      status: event.status,
      error: event.error
    });
  }
}
```

### WebSocket Forwarding

```typescript
wss.on("connection", (ws) => {
  let currentTurn: { id: string; controller: AbortController } | null = null;

  ws.on("message", async (raw) => {
    const msg = parseClientMessage(raw);

    if (msg.type === "start_turn") {
      currentTurn = { id: newTurnId(), controller: new AbortController() };

      await withToolContext(
        {
          sessionId: resolvedSessionId,
          workspaceDir,
          repoRoot,
          emitSubagentEvent: (event) => {
            // Forward to WebSocket client
            if (event.event === "start") {
              send(ws, {
                type: "subagent_start",
                agentId: event.agentId,
                task: event.task || ""
              });
            } else if (event.event === "progress") {
              send(ws, {
                type: "subagent_progress",
                agentId: event.agentId,
                action: event.action,
                file: event.file,
                toolCount: event.toolCount,
                tokens: event.tokens
              });
            } else if (event.event === "complete") {
              send(ws, {
                type: "subagent_complete",
                agentId: event.agentId,
                status: event.status,
                error: event.error
              });
            }
          }
        },
        async () => {
          for await (const chunk of runAgentTurn({ ... })) {
            // ...
          }
        }
      );
    }
  });
});
```

## Circuit Breaker

### Circuit State

```typescript
const consecutiveToolFailures = new Map<string, number>();
const CIRCUIT_BREAKER_THRESHOLD = 5;
```

### Failure Tracking

```typescript
const results = await executeToolCalls(registry, calls, { signal });

for (const r of results) {
  if (!r.ok) {
    const failCount = (consecutiveToolFailures.get(r.name) ?? 0) + 1;
    consecutiveToolFailures.set(r.name, failCount);

    if (failCount >= CIRCUIT_BREAKER_THRESHOLD) {
      // Trip circuit breaker
      trippedTools.push(r.name);
    }
  } else {
    consecutiveToolFailures.set(r.name, 0);  // Reset on success
  }
}
```

### Circuit Breaker Response

```typescript
if (trippedTools.length > 0) {
  const allFailed = results.every(r => !r.ok);

  logger.log("warn", "circuit_breaker_tripped", {
    tripped_tools: trippedTools,
    all_failed: allFailed
  });

  // Inject guidance to LLM
  messages.push({
    role: "system",
    content: `CIRCUIT BREAKER: Tools ${trippedTools.join(", ")} ` +
      `failed 5+ times. STOP using them. Try different approach.`
  });

  if (allFailed) {
    break;  // Force stop if all failed
  }
}
```

## Structured Logging

### Logger Creation

```typescript
import { StructuredLogger } from "./logging/structuredLogger.js";

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
```

### Log Events

```typescript
logger.log("info", "turn_start", {
  session_id: sessionId,
  turn_id: turnId,
  user_input_preview: truncateForLog(userInput, 400)
});

logger.log("info", "tool_start", {
  session_id: sessionId,
  tool_call_id: call.id,
  tool_name: call.name,
  arguments: call.arguments
});

logger.log("info", "tool_end", {
  session_id: sessionId,
  tool_call_id: call.id,
  tool_name: call.name,
  ok: result.ok,
  duration_ms: durationMs
});

logger.log("info", "turn_complete", {
  session_id: sessionId,
  turn_id: turnId,
  duration_ms: Date.now() - runStartedAt,
  iterations: iterationCount,
  tool_calls_executed: toolCallsExecuted,
  aborted: signal.aborted
});
```

### Log Format

```json
{"level":"info","event":"turn_start","ts":"2026-02-02T21:31:00.000Z","session_id":"session_abc","turn_id":"turn_123","user_input_preview":"..."}
{"level":"info","event":"tool_start","ts":"2026-02-02T21:31:05.000Z","session_id":"session_abc","tool_call_id":"call_001","tool_name":"read_file"}
{"level":"info","event":"tool_end","ts":"2026-02-02T21:31:06.000Z","session_id":"session_abc","tool_call_id":"call_001","tool_name":"read_file","ok":true,"duration_ms":450}
{"level":"info","event":"turn_complete","ts":"2026-02-02T21:31:30.000Z","session_id":"session_abc","turn_id":"turn_123","duration_ms":30000,"iterations":5,"tool_calls_executed":3,"aborted":false}
```

## Error Handling

### Error Propagation

```typescript
try {
  await withToolContext(ctx, async () => {
    await operationThatMayFail();
  });
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    // Operation was cancelled
    console.log("Operation cancelled");
  } else {
    // Other error
    logger.log("error", "operation_failed", {
      error: err instanceof Error ? err.message : String(err)
    });
  }
}
```

### Error Boundaries

```typescript
async function safeOperation<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`Operation failed: ${err}`);
    return fallback;
  }
}

// Usage
const result = await safeOperation(
  () => toolHandler(args, signal),
  { ok: false, output: "Tool execution failed" }
);
```

### Finally Block

```typescript
try {
  for await (const chunk of runAgentTurn({ signal })) {
    yield chunk;
  }
} finally {
  // Always log completion, even on cancellation
  logger.log("info", "turn_complete", {
    session_id: sessionId,
    aborted: signal.aborted
  });

  // Cleanup
  cleanupResources();
}
```

## Performance Considerations

### Promise.all for Parallel Operations

```typescript
// Execute tools in parallel
const results = await Promise.all(
  calls.map(async (call) => {
    const handler = registry.get(call.name);
    return handler(call.arguments, signal);
  })
);
```

### Promise.allSettled for Graceful Degradation

```typescript
const results = await Promise.allSettled(
  calls.map(async (call) => {
    const handler = registry.get(call.name);
    return handler(call.arguments, signal);
  })
);

// Collect results
const settledResults = results.map((r, i) => {
  if (r.status === "fulfilled") {
    return { id: calls[i].id, ok: true, output: r.value };
  } else {
    return { id: calls[i].id, ok: false, output: String(r.reason) };
  }
});
```

### Batched Operations

```typescript
async function processBatched<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => fn(item))
    );
    results.push(...batchResults);
  }

  return results;
}
```

## Related Documentation

- [04-execution-flow.md](./04-execution-flow.md) - Async execution patterns
- [06-session-management.md](./06-session-management.md) - Session context
- [09-tool-registry.md](./09-tool-registry.md) - Tool execution context
