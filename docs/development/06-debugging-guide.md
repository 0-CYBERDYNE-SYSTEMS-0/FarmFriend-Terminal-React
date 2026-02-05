# Debugging Guide

**Comprehensive debugging strategies, tools, and techniques for FF Terminal development.**

---

## Overview

Debugging FF Terminal requires understanding its dual-process architecture, WebSocket communication, and asynchronous tool execution. This guide covers common issues, debugging techniques, and troubleshooting procedures.

### Debugging Levels

| Level | Scope | Tools |
|-------|-------|-------|
| **Application** | Full system | Debug mode, logging |
| **Daemon** | WebSocket server | Node debugger, logs |
| **CLI/Web UI** | User interface | React DevTools, browser console |
| **Runtime** | Tool execution | Tool-specific debugging |
| **Network** | WebSocket/API | Wireshark, network logs |

---

## Debug Mode

### Enabling Debug Mode

```bash
# Enable verbose logging
export FF_DEBUG=true

# Enable daemon stdout/stderr
export FF_DAEMON_LOG=1

# Enable JSONL tool call logging
export FF_LOG_HOOKS_JSONL=true

# Enable hook logging
export FF_LOG_HOOKS=true

# Enable all debug flags
export FF_DEBUG=true FF_DAEMON_LOG=1 FF_LOG_HOOKS_JSONL=true
```

### Starting with Debug Mode

```bash
# Start daemon with debug logging
FF_DEBUG=true FF_DAEMON_LOG=1 npm run dev:daemon 2>&1 | tee daemon.log

# Start CLI with debug mode
FF_DEBUG=true npm run dev:cli

# Start web server with debug mode
FF_DEBUG=true npm run dev:web
```

### Debug Output Locations

| Component | Log Location |
|-----------|--------------|
| Daemon | `daemon.log` (if logged) |
| CLI | stdout/stderr |
| Web UI | Browser console |
| Tool Calls | `ff-terminal-workspace/logs/runs/*.jsonl` |
| Sessions | `ff-terminal-workspace/logs/sessions/*.jsonl` |

---

## Node.js Debugger

### Command-Line Debugging

```bash
# Start daemon with debugger
node --inspect-brk src/daemon/daemon.ts

# Start CLI with debugger
node --inspect-brk src/cli/app.tsx

# Run with custom inspect port
node --inspect=9229 src/daemon/daemon.ts
```

### Using Chrome DevTools

1. Start daemon with `--inspect-brk`
2. Open Chrome and go to `chrome://inspect`
3. Click "Configure" and add `localhost:9229`
4. Click "Inspect" on the target

### Using VSCode Debugger

**`.vscode/launch.json`**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Daemon",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:daemon"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "FF_DEBUG": "true",
        "FF_DAEMON_LOG": "1"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:cli"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "FF_DEBUG": "true"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Daemon",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Debugging Breakpoints

In VSCode, set breakpoints in your code:

```typescript
// src/daemon/daemon.ts
export async function startDaemon() {
  const server = createServer({
    // Set breakpoint here
    const port = config.port;  // ← Click here to set breakpoint
    server.listen(port);
});
```

### Inspecting Variables

```typescript
// Add debugger statement
function executeTool(tool: Tool, input: any) {
  debugger;  // Execution pauses here
  const result = await tool.execute(input, context);
  return result;
}
```

### Stepping Through Code

In VSCode or Chrome DevTools:

- **F5** or **Continue** - Run to next breakpoint
- **F10** or **Step Over** - Execute current line
- **F11** or **Step Into** - Step into function
- **Shift+F11** or **Step Out** - Exit current function
- **Shift+F5** or **Stop** - Stop debugging

---

## WebSocket Debugging

### WebSocket Connection Test

```bash
# Check if daemon is listening
lsof -ti:28888

# Test with websocat
echo '{"type":"hello","client":"test","version":"1.0.0"}' | \
  websocat ws://localhost:28888 --text

# Test with wscat
wscat -c ws://localhost:28888
```

### WebSocket Message Logging

```typescript
// src/daemon/daemon.ts
export function setupWebSocketLogging() {
  const originalSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function(data: string) {
    console.log('WebSocket sent:', data);
    return originalSend.call(this, data);
  };

  const originalOnMessage = WebSocket.prototype.onmessage;
  WebSocket.prototype.onmessage = function(event: MessageEvent) {
    console.log('WebSocket received:', event.data);
    return originalOnMessage?.call(this, event);
  };
}
```

### Monitoring WebSocket Traffic

```bash
# Use tcpdump to monitor WebSocket traffic
sudo tcpdump -i lo port 28888 -A

# Use Wireshark for GUI monitoring
# Filter: tcp.port == 28888
```

---

## Tool Execution Debugging

### Tool-Specific Debugging

```bash
# Enable tool execution logging
export FF_LOG_HOOKS_JSONL=true

# Run a test
npm run dev:run

# Check log file
tail -f ff-terminal-workspace/logs/runs/*.jsonl
```

### Tool Execution Trace

```typescript
// Add to tool execution
export async function executeTool(tool: Tool, input: any, context: any) {
  console.log('[TOOL] Executing:', tool.name);
  console.log('[TOOL] Input:', JSON.stringify(input, null, 2));

  const startTime = Date.now();
  const result = await tool.execute(input, context);
  const duration = Date.now() - startTime;

  console.log('[TOOL] Result:', JSON.stringify(result, null, 2));
  console.log('[TOOL] Duration:', duration, 'ms');

  return result;
}
```

### Tool Timeout Debugging

```typescript
// Add timeout monitoring
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  toolName: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${toolName} timed out after ${timeout}ms`)),
        timeout
      )
    ),
  ]);
}
```

---

## React/Ink Debugging

### Ink Component Debugging

```typescript
import { render } from 'ink-testing-library';

// Test component
const { lastFrame } = render(<MyComponent prop="value" />);

// Assert output
expect(lastFrame()).toContain('value');
```

### React DevTools for Ink

```bash
# Install ink-testing-library
npm install --save-dev ink-testing-library

# Create test file
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { lastFrame } = render(<MyComponent />);
    expect(lastFrame()).toContain('Hello World');
  });
});
```

### State Debugging

```typescript
// Add state logging
const [state, setState] = useState<string>('initial');

// Log state changes
useEffect(() => {
  console.log('[STATE] Changed:', state);
}, [state]);
```

---

## Async/Await Debugging

### Promise Tracking

```typescript
// Track promise resolution
const promises = [];

export function trackedPromise<T>(
  promise: Promise<T>,
  name: string
): Promise<T> {
  const startTime = Date.now();

  promise.then(
    (result) => {
      const duration = Date.now() - startTime;
      console.log(`[PROMISE] ${name} resolved in ${duration}ms`);
      return result;
    },
    (error) => {
      const duration = Date.now() - startTime;
      console.error(`[PROMISE] ${name} rejected after ${duration}ms:`, error);
      throw error;
    }
  );

  promises.push({ name, promise, startTime });
  return promise;
}
```

### Async Call Stack

```typescript
// Capture call stack for async operations
export function getAsyncStackTrace(): string {
  const stack = new Error().stack || '';
  // Filter out internal frames
  return stack.split('\n')
    .filter(line => !line.includes('node_modules'))
    .join('\n');
}
```

---

## Memory Debugging

### Memory Profiling

```bash
# Start daemon with heap snapshot
node --heapsnapshot-signal=SIGUSR2 src/daemon/daemon.ts

# Trigger heap snapshot
kill -USR2 <daemon-pid>

# Analyze with Chrome DevTools
# chrome://inspect → Profiles → Load heap snapshot
```

### Memory Leak Detection

```typescript
// Track object references
class ObjectTracker {
  private static instances = new Map<string, any[]>();

  static track<T>(obj: T, label: string): T {
    if (!this.instances.has(label)) {
      this.instances.set(label, []);
    }
    this.instances.get(label)!.push({ obj, timestamp: Date.now() });
    return obj;
  }

  static dump(label: string) {
    const instances = this.instances.get(label) || [];
    console.log(`[MEMORY] ${label}: ${instances.length} instances`);
    return instances;
  }
}
```

### Garbage Collection

```bash
# Force garbage collection (requires --expose-gc)
node --expose-gc --inspect src/daemon/daemon.ts

# In debugger console
global.gc();
```

---

## Error Handling Debugging

### Error Logging

```typescript
// Enhanced error logging
export function logError(error: Error, context: any) {
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    context,
    timestamp: new Date().toISOString(),
  });
}
```

### Error Boundary

```typescript
// React error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    console.error('[ERROR BOUNDARY]', error);
    return { error };
  }

  render() {
    if (this.state.error) {
      return <Text color="red">Error: {this.state.error.message}</Text>;
    }
    return this.props.children;
  }
}
```

### Unhandled Rejection

```typescript
// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason, promise);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error);
  process.exit(1);
});
```

---

## Performance Profiling

### CPU Profiling

```bash
# Start with profiler
node --prof src/daemon/daemon.ts

# Stop after running tests
# Generate profile
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > profile.txt

# Analyze profile
# Look for hot spots and performance bottlenecks
```

### Performance Tracing

```typescript
// Add performance marks
performance.mark('tool-execution-start');

await tool.execute(input, context);

performance.mark('tool-execution-end');
performance.measure(
  'tool-execution',
  'tool-execution-start',
  'tool-execution-end'
);

const measure = performance.getEntriesByName('tool-execution')[0];
console.log(`[PERF] Tool execution: ${measure.duration}ms`);
```

---

## Common Issues and Solutions

### Issue: Daemon Won't Start

**Symptom**: `Error: EADDRINUSE: address already in use :::28888`

**Solutions**:

```bash
# Find and kill process on port
lsof -ti:28888 | xargs kill

# Use different port
export FF_TERMINAL_PORT=28889

# Check what's using the port
lsof -i:28888
```

### Issue: WebSocket Connection Fails

**Symptom**: `WebSocket connection to 'ws://localhost:28888' failed`

**Solutions**:

```bash
# Verify daemon is running
lsof -ti:28888

# Test WebSocket connection
wscat -c ws://localhost:28888

# Check firewall settings
# Ensure port 28888 is not blocked
```

### Issue: Tool Execution Hangs

**Symptom**: Tool execution never completes

**Solutions**:

```typescript
// Add timeout to tool execution
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    ),
  ]);
}

// Use timeout
await executeWithTimeout(
  () => tool.execute(input, context),
  30000  // 30 second timeout
);
```

### Issue: Memory Usage Grows

**Symptom**: Memory usage increases over time

**Solutions**:

```typescript
// Clear caches periodically
setInterval(() => {
  toolCache.clear();
  console.log('[GC] Tool cache cleared');
}, 300000);  // Every 5 minutes

// Use weak references
const weakCache = new WeakMap<object, any>();

// Avoid memory leaks
const largeObject = { /* ... */ };
// Use reference, then clear
largeObject.anyReference = null;
```

### Issue: Slow Tool Execution

**Symptom**: Tools take too long to execute

**Solutions**:

```typescript
// Profile tool execution
const start = Date.now();
await tool.execute(input, context);
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`[PERF] Slow tool execution: ${tool.name} took ${duration}ms`);
}

// Optimize slow operations
// - Add caching
// - Use parallel execution
// - Batch operations
```

---

## Logging Best Practices

### Structured Logging

```typescript
// Use structured logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

logger.info({ tool: 'readFile', path: '/path/to/file' }, 'Executing tool');
logger.error({ error: error.stack }, 'Tool execution failed');
```

### Contextual Logging

```typescript
// Add context to all logs
export function withContext<T>(fn: () => T, context: any): T {
  const previousContext = currentContext;
  currentContext = { ...previousContext, ...context };

  try {
    return fn();
  } finally {
    currentContext = previousContext;
  }
}

// Use context
withContext(() => {
  console.log('[EXEC] Tool execution', currentContext);
}, { tool: 'readFile', path: '/path/to/file' });
```

---

## Remote Debugging

### VS Code Remote Debugging

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Remote",
  "address": "remote-server-ip",
  "port": 9229,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/path/to/remote/ff-terminal-ts",
  "skipFiles": ["<node_internals>/**"]
}
```

### Docker Debugging

```dockerfile
# Dockerfile for debugging
FROM node:20

WORKDIR /app
COPY . .

# Install dependencies
RUN npm ci

# Build
RUN npm run build

# Expose debug port
EXPOSE 9229 28888

# Start with debug
CMD ["node", "--inspect=0.0.0.0:9229", "dist/daemon/daemon.js"]
```

---

## Resources

- [Node.js Debugging](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Vitest Debugging](https://vitest.dev/guide/debugging.html)
- [React Debugging](https://react.dev/learn/react-developer-tools)

---

**Last Updated**: 2026-02-02
