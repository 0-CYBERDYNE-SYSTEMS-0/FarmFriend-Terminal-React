# Tool Registry

## Overview

The tool registry manages all available tools that the agent can call. It provides registration, lookup, validation, and execution capabilities for tools. FF Terminal supports 40+ built-in tools and custom tools from skills.

## Tool Registry Architecture

```typescript
export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type ToolResult = {
  id: string;
  name: string;
  ok: boolean;
  output: string;
};

export type ToolHandler = (
  args: unknown,
  signal: AbortSignal
) => Promise<string>;

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  // Registration
  register(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler);
  }

  // Lookup
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  get(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  // Discovery
  listNames(): string[] {
    return [...this.handlers.keys()].sort();
  }
}
```

## Tool Registration

### Register Default Tools

```typescript
export function registerDefaultTools(
  registry: ToolRegistry,
  opts: { workspaceDir: string }
): void {
  // File operations
  registry.register("read_file", async (args) => readFileTool(args));
  registry.register("write_file", async (args) => writeFileTool(args));
  registry.register("edit_file", async (args) => editFileTool(args));
  registry.register("multi_edit_file", async (args) => multiEditFileTool(args));

  // Execution
  registry.register("run_command", async (args, signal) => runCommandTool(args, signal));
  registry.register("schedule_task", async (args) => scheduleTaskTool(args, opts.workspaceDir));

  // Search
  registry.register("glob", async (args) => globTool(args));
  registry.register("grep", async (args, signal) => grepTool(args, signal));
  registry.register("search_code", async (args, signal) => searchCodeTool(args, signal));

  // Web
  registry.register("tavily_search", async (args, signal) => tavilySearchTool(args, signal));
  registry.register("perplexity_search", async (args, signal) => perplexitySearchTool(args, signal));
  registry.register("browse_web", async (args, signal) => browseWebTool(args, signal));

  // Task management
  registry.register("TodoWrite", async (args) => todoWriteTool(args));

  // Thinking & updates
  registry.register("think", async (args) => thinkTool(args));
  registry.register("quick_update", async (args) => quickUpdateTool(args));

  // Skills
  registry.register("skill_loader", async (args) => skillLoaderTool(args));
  registry.register("skill_documentation", async (args) => skillDocumentationTool(args));
  registry.register("skill_apply", async (args) => skillApplyTool(args));

  // Media
  registry.register("generate_image_gemini", async (args, signal) => generateImageGeminiTool(args, signal));
  registry.register("analyze_image_gemini", async (args, signal) => analyzeImageGeminiTool(args, signal));

  // System
  registry.register("macos_control", async (args, signal) => macosControlTool(args, signal));

  // ... more tools
}
```

## Tool Categories

### 1. File Operations

| Tool | Description | Arguments |
|------|-------------|-----------|
| `read_file` | Read file contents | `{ file_path: string }` |
| `write_file` | Create/overwrite file | `{ file_path: string, content: string }` |
| `edit_file` | Edit file at location | `{ file_path: string, old_string: string, new_string: string }` |
| `multi_edit_file` | Multiple edits | `{ file_path: string, edits: Edit[] }` |
| `glob` | Find files by pattern | `{ pattern: string }` |
| `grep` | Search text in files | `{ pattern: string, path?: string }` |

### 2. Execution

| Tool | Description | Arguments |
|------|-------------|-----------|
| `run_command` | Execute shell command | `{ command: string }` |
| `schedule_task` | Schedule recurring task | `{ name: string, prompt: string, schedule: string }` |

### 3. Search & Discovery

| Tool | Description | Arguments |
|------|-------------|-----------|
| `search_code` | Full-text search | `{ query: string }` |
| `semantic_search` | Semantic code search | `{ query: string }` |
| `ast_grep` | AST pattern search | `{ pattern: string, lang?: string }` |

### 4. Web & Research

| Tool | Description | Arguments |
|------|-------------|-----------|
| `tavily_search` | Web search | `{ query: string }` |
| `tavily_extract` | Extract from URL | `{ url: string }` |
| `perplexity_search` | AI-powered search | `{ query: string }` |
| `browse_web` | Browse web page | `{ url: string }` |

### 5. Task Management

| Tool | Description | Arguments |
|------|-------------|-----------|
| `TodoWrite` | Manage todo list | `{ todos: Todo[] }` |
| `manage_task` | Manage tasks | `{ action: string }` |

### 6. Thinking & Communication

| Tool | Description | Arguments |
|------|-------------|-----------|
| `think` | Private reasoning | `{ thought: string }` |
| `quick_update` | Status update | `{ message: string }` |
| `session_summary` | Generate summary | `{ summary?: string }` |

### 7. Skills

| Tool | Description | Arguments |
|------|-------------|-----------|
| `skill_loader` | Load skill | `{ skill_slug: string }` |
| `skill_documentation` | Get skill docs | `{ skill_slug: string }` |
| `skill_import` | Import skill | `{ source: string }` |

### 8. Media

| Tool | Description | Arguments |
|------|-------------|-----------|
| `generate_image_gemini` | Generate image | `{ prompt: string }` |
| `analyze_image_gemini` | Analyze image | `{ image: string, prompt: string }` |
| `generate_image_openai` | Generate with DALL-E | `{ prompt: string }` |

### 9. System

| Tool | Description | Arguments |
|------|-------------|-----------|
| `macos_control` | macOS automation | `{ script: string }` |
| `ask_oracle` | Escalate to oracle | `{ question: string }` |

## Tool Execution

### Execute Tool Calls

```typescript
export async function executeToolCalls(
  registry: ToolRegistry,
  calls: ToolCall[],
  opts?: {
    signal?: AbortSignal;
    hooks?: {
      onStart?: (call: ToolCall) => void;
      onFinish?: (call: ToolCall, result: ToolResult, durationMs: number) => void;
    };
  }
): Promise<ToolResult[]> {
  // Execute in parallel
  const results = await Promise.all(
    calls.map(async (call) => {
      const handler = registry.get(call.name);
      if (!handler) {
        return {
          id: call.id,
          name: call.name,
          ok: false,
          output: `Tool not found: ${call.name}`
        };
      }

      const startTime = Date.now();
      opts?.hooks?.onStart?.(call);

      try {
        const output = await handler(call.arguments, opts?.signal!);
        const result = {
          id: call.id,
          name: call.name,
          ok: true,
          output
        };

        const durationMs = Date.now() - startTime;
        opts?.hooks?.onFinish?.(call, result, durationMs);

        return result;
      } catch (err) {
        const result = {
          id: call.id,
          name: call.name,
          ok: false,
          output: err instanceof Error ? err.message : String(err)
        };

        const durationMs = Date.now() - startTime;
        opts?.hooks?.onFinish?.(call, result, durationMs);

        return result;
      }
    })
  );

  return results;
}
```

### Tool Result Format

```typescript
{
  id: "call_abc123",
  name: "read_file",
  ok: true,
  output: "file contents here..."
}
```

```typescript
{
  id: "call_abc123",
  name: "read_file",
  ok: false,
  output: "Error: ENOENT: no such file or directory..."
}
```

## Tool Schemas

### Schema Definition

```typescript
type ToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: "string" | "number" | "boolean" | "object" | "array";
        description?: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
};

export function loadToolSchemas(
  repoRoot: string,
  opts?: { strict?: boolean }
): ToolSchema[] {
  // Load all tool schemas
  const schemas: ToolSchema[] = [];

  // Built-in tool schemas
  schemas.push({
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Path to file to read"
          }
        },
        required: ["file_path"]
      }
    }
  });

  // ... more schemas

  return schemas;
}
```

### Schema Validation

```typescript
export function validateToolArgs(
  toolName: string,
  args: unknown,
  schemas: ToolSchema[]
): { valid: boolean; error?: string } {
  const schema = schemas.find(s => s.function.name === toolName);
  if (!schema) {
    return { valid: false, error: `No schema for tool: ${toolName}` };
  }

  // Basic type validation
  if (typeof args !== "object" || args === null) {
    return { valid: false, error: "Arguments must be an object" };
  }

  const argsObj = args as Record<string, unknown>;

  // Check required fields
  for (const required of schema.function.parameters.required) {
    if (!(required in argsObj)) {
      return { valid: false, error: `Missing required argument: ${required}` };
    }
  }

  // Check field types
  for (const [key, spec] of Object.entries(
    schema.function.parameters.properties
  )) {
    if (key in argsObj) {
      const value = argsObj[key];
      const expectedType = spec.type;

      if (expectedType === "array" && !Array.isArray(value)) {
        return { valid: false, error: `${key} must be an array` };
      }
      if (expectedType !== "array" && typeof value !== expectedType) {
        return { valid: false, error: `${key} must be ${expectedType}` };
      }
    }
  }

  return { valid: true };
}
```

## Tool Context

### Context Injection

```typescript
export type ToolContext = {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  emitSubagentEvent?: (event: SubagentEvent) => void;
};

const toolContext = new AsyncLocalStorage<ToolContext>();

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

### Context in Tools

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

  // Security: ensure path is within workspace
  if (!resolvedPath.startsWith(ctx.workspaceDir)) {
    throw new Error("Path outside workspace not allowed");
  }

  return fs.readFileSync(resolvedPath, "utf8");
}
```

## Security Guards

### FS Guard

```typescript
// runtime/tools/guards/fsGuard.ts

export function isPathSafe(
  filePath: string,
  workspaceDir: string
): boolean {
  const resolved = path.resolve(workspaceDir, filePath);

  // Must be within workspace
  if (!resolved.startsWith(workspaceDir)) {
    return false;
  }

  // Must not traverse outside
  const normalized = path.normalize(resolved);
  if (normalized.includes("..")) {
    // Allow if resolved path is still in workspace
    if (!normalized.startsWith(workspaceDir)) {
      return false;
    }
  }

  // Check for dangerous patterns
  const dangerous = [
    /\/etc\/passwd/,
    /\/etc\/shadow/,
    /\/root\/.ssh/,
    /\.aws\/credentials/,
  ];

  for (const pattern of dangerous) {
    if (pattern.test(resolved)) {
      return false;
    }
  }

  return true;
}
```

### Command Guard

```typescript
export function isCommandSafe(
  command: string,
  allowedCommands?: string[]
): boolean {
  // Block dangerous commands
  const dangerous = [
    /\brm\s+-rf\b/i,
    /\bmkfs\b/,
    /\bdd\b.*if=\/dev\//,
    /\bchmod\s+777\b/,
    /\bsudo\b.*passwd/,
    /\bformat\b/,
  ];

  for (const pattern of dangerous) {
    if (pattern.test(command)) {
      return false;
    }
  }

  // Check allowlist
  if (allowedCommands) {
    const baseCmd = command.split(" ")[0];
    return allowedCommands.includes(baseCmd);
  }

  return true;
}
```

## Tool Execution Lifecycle

### 1. Provider Calls Tool

```typescript
// LLM decides to call tool
const toolCalls = [
  {
    id: "call_001",
    name: "read_file",
    arguments: { file_path: "package.json" }
  }
];
```

### 2. Validation Phase

```typescript
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
      output: `Blocked: ${pre.reason}`
    });
    continue;
  }
}
```

### 3. Execution Phase

```typescript
const results = await executeToolCalls(registry, callsToRun, {
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
```

### 4. Post-Execution Phase

```typescript
for (const r of results) {
  // Post-tool hooks
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

  // Feed result to LLM
  messages.push({
    role: "tool",
    tool_call_id: r.id,
    name: r.name,
    content: r.output
  });
}
```

## Tool Debugging

### Debug Mode

```bash
# Enable tool debugging
export FF_DEBUG=1
```

### Debug Output

```typescript
if (process.env.FF_DEBUG === "1") {
  console.debug(`[tool] ${toolName} called with:`, args);
  console.debug(`[tool] ${toolName} returned:`, output);
}
```

### Tool Logging

```typescript
const toolsLogPath = path.join(
  workspaceDir,
  "logs",
  "hooks",
  `tools_${sessionId}.jsonl`
);

fs.appendFileSync(toolsLogPath, JSON.stringify({
  ts: new Date().toISOString(),
  event: "tool_end",
  session_id: sessionId,
  tool_call_id: call.id,
  tool_name: call.name,
  ok: result.ok,
  duration_ms: durationMs,
  output_preview: truncateForLog(result.output)
}) + "\n");
```

## Related Documentation

- [04-execution-flow.md](./04-execution-flow.md) - Tool execution in agent loop
- [08-skill-architecture.md](./08-skill-architecture.md) - Custom tools in skills
- [10-async-context.md](./10-async-context.md) - Tool context
