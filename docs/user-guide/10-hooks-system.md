# Hooks System

**Plan validation, todo enforcement, and custom hooks**

---

## Overview

The hooks system provides extensibility for validation, enforcement, and automation. Hooks can intercept tool execution, agent decisions, and system events to enforce policies, validate actions, and integrate with external systems.

---

## Hook Types

| Hook Type | Description | Trigger |
|-----------|-------------|---------|
| `pre_tool_execution` | Validate tool before execution | Before each tool call |
| `post_tool_execution` | Handle tool after execution | After each tool call |
| `tool_error` | Handle tool errors | When tool fails |
| `agent_stop` | Validate agent stop conditions | When agent considers stopping |

---

## Built-in Hooks

### Plan Validation Hook

Ensures plans are valid before execution:

```bash
# Enable plan validation
export FF_HOOK_PLAN_VALIDATION=true

# Configure retry attempts
export FF_HOOK_PLAN_RETRY=3
```

**Behavior:**
- Validates plan steps before execution
- Retries on transient failures
- Blocks invalid plans

### Todo Management Hook

Enforces todo list creation and updates:

```bash
# Enable todo enforcement
export FF_HOOK_TODO_ENFORCEMENT=true

# Require todos for complex tasks
export FF_HOOK_TODO_REQUIRE_COMPLEX=true
```

**Behavior:**
- Requires todo list for multi-step tasks
- Updates todos on progress
- Validates todo completion

### Skill Restriction Hook

Validates skill usage restrictions:

```bash
# Enable skill restrictions
export FF_HOOK_SKILL_RESTRICTIONS=true

# Block dangerous skills
export FF_HOOK_SKILL_BLOCKED="delete_files,system_commands"
```

**Behavior:**
- Enforces skill allowlists/denylists
- Logs skill usage
- Blocks restricted skills

---

## Hook Context

Each hook receives a context object:

### Pre-Tool Context

```typescript
{
  type: "pre_tool_execution",
  sessionId: "abc123",
  repoRoot: "/path/to/repo",
  workspaceDir: "/path/to/workspace",
  call: {
    name: "read_file",
    arguments: { path: "/file.txt" }
  }
}
```

### Post-Tool Context

```typescript
{
  type: "post_tool_execution",
  sessionId: "abc123",
  repoRoot: "/path/to/repo",
  workspaceDir: "/path/to/workspace",
  call: {
    name: "read_file",
    arguments: { path: "/file.txt" }
  },
  ok: true,
  output: "file content",
  durationMs: 50
}
```

### Tool Error Context

```typescript
{
  type: "tool_error",
  sessionId: "abc123",
  repoRoot: "/path/to/repo",
  workspaceDir: "/path/to/workspace",
  call: {
    name: "read_file",
    arguments: { path: "/nonexistent.txt" }
  },
  error: "File not found"
}
```

### Agent Stop Context

```typescript
{
  type: "agent_stop",
  sessionId: "abc123",
  repoRoot: "/path/to/repo",
  workspaceDir: "/path/to/workspace",
  userInput: "Build a REST API",
  assistantContent: "Here is the API code...",
  iteration: 5,
  maxIterations: 10,
  toolExecutionsCount: 25
}
```

---

## Hook Actions

### Pre-Tool Actions

| Action | Description |
|--------|-------------|
| `allow` | Allow the tool call |
| `block` | Block the tool call |
| `modify` | Modify tool arguments |

### Agent Stop Actions

| Action | Description |
|--------|-------------|
| `allow` | Allow agent to stop |
| `block` | Prevent agent from stopping |
| `need_user` | Require user confirmation |

---

## Creating Custom Hooks

### Hook File Location

Custom hooks are defined in:

```
<workspace>/hooks/<hook-name>.ts
```

### Hook Structure

```typescript
import type { Hook, PreToolContext, PreToolResult } from './runtime/hooks/types.js';

export const myHook: Hook = {
  type: 'pre_tool_execution',
  name: 'my-custom-hook',
  priority: 100,
  enabled: true,
  run: async (ctx: PreToolContext): Promise<PreToolResult> => {
    // Check tool name
    if (ctx.call.name === 'delete_file') {
      return {
        action: 'block',
        reason: 'Deletion is not allowed in this session'
      };
    }

    // Allow the call
    return { action: 'allow' };
  }
};
```

### Hook Registration

```typescript
// hooks/index.ts
import { myHook } from './my-hook.js';

export const hooks = [
  myHook
];
```

### Enable Custom Hooks

```bash
# Via environment variable
export FF_HOOKS_PATH=/path/to/hooks

# Or in configuration file
{
  "hooks": {
    "path": "/path/to/hooks",
    "enabled": true
  }
}
```

---

## Hook Priority

Hooks run in priority order (lower number = higher priority):

```typescript
{
  type: 'pre_tool_execution',
  name: 'security-hook',
  priority: 10,    // Runs first
  // ...
}

{
  type: 'pre_tool_execution',
  name: 'logging-hook',
  priority: 100,   // Runs after security
  // ...
}
```

### Priority Ranges

| Priority | Use Case |
|----------|----------|
| 1-10 | Security hooks |
| 11-50 | Validation hooks |
| 51-100 | Logging hooks |
| 101+ | Custom hooks |

---

## Example Hooks

### Security Hook

```typescript
import type { Hook, PreToolContext, PreToolResult } from './runtime/hooks/types.js';

export const securityHook: Hook = {
  type: 'pre_tool_execution',
  name: 'security-check',
  priority: 10,
  enabled: true,
  run: async (ctx: PreToolContext): Promise<PreToolResult> => {
    // Block dangerous operations
    const dangerous = ['delete_file', 'run_command', 'delete_dir'];
    
    if (dangerous.includes(ctx.call.name)) {
      // Check for confirmation mode
      if (ctx.workspaceDir?.includes('/trusted/')) {
        return { action: 'allow' };
      }
      
      return {
        action: 'block',
        reason: `Tool ${ctx.call.name} is restricted for safety`
      };
    }

    return { action: 'allow' };
  }
};
```

### Logging Hook

```typescript
import type { Hook, PostToolContext } from './runtime/hooks/types.js';

export const loggingHook: Hook = {
  type: 'post_tool_execution',
  name: 'tool-logger',
  priority: 100,
  enabled: true,
  run: async (ctx: PostToolContext): Promise<void> => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      tool: ctx.call.name,
      status: ctx.ok ? 'success' : 'failure',
      duration: ctx.durationMs,
      session: ctx.sessionId
    }));
  }
};
```

### Retry Hook

```typescript
import type { Hook, ToolErrorContext } from './runtime/hooks/types.js';

export const retryHook: Hook = {
  type: 'tool_error',
  name: 'retry-handler',
  priority: 50,
  enabled: true,
  run: async (ctx: ToolErrorContext): Promise<void> => {
    // Simple retry logic
    if (ctx.error.includes('timeout')) {
      // Would implement retry logic here
      console.log(`Retrying ${ctx.call.name} after timeout`);
    }
  }
};
```

### Agent Stop Hook

```typescript
import type { Hook, AgentStopContext, AgentStopResult } from './runtime/hooks/types.js';

export const confirmStopHook: Hook = {
  type: 'agent_stop',
  name: 'confirm-stop',
  priority: 50,
  enabled: true,
  run: async (ctx: AgentStopContext): Promise<AgentStopResult> => {
    // Require confirmation for early stops
    if (ctx.iteration < ctx.maxIterations / 2) {
      return {
        action: 'need_user',
        reason: 'Agent stopped before reaching max iterations',
        statusMessage: 'Review and confirm to stop'
      };
    }

    return { action: 'allow' };
  }
};
```

---

## Configuration

### Environment Variables

```bash
# Enable hooks system
export FF_HOOKS_ENABLED=true

# Hooks directory
export FF_HOOKS_PATH="./ff-terminal-workspace/hooks"

# Built-in hooks
export FF_HOOK_PLAN_VALIDATION=true
export FF_HOOK_TODO_ENFORCEMENT=true
export FF_HOOK_SKILL_RESTRICTIONS=false

# Logging
export FF_LOG_HOOKS_JSONL=true
export FF_HOOK_LOG_PATH="./logs/hooks"
```

### Configuration File

Create `~/.config/ff-terminal/hooks.json`:

```json
{
  "enabled": true,
  "path": "./ff-terminal-workspace/hooks",
  "hooks": {
    "planValidation": {
      "enabled": true,
      "retry": 3
    },
    "todoEnforcement": {
      "enabled": true,
      "requireComplex": false
    },
    "skillRestrictions": {
      "enabled": false,
      "blocked": ["delete_files"],
      "allowed": ["read_file", "grep"]
    }
  },
  "logging": {
    "enabled": true,
    "jsonl": true,
    "path": "./logs/hooks"
  }
}
```

---

## Hook Logging

### JSONL Logging

When enabled, hooks are logged to:

```
<workspace>/logs/hooks/<session-id>.jsonl
```

### Log Format

```json
{"timestamp":"2026-02-02T18:00:00Z","type":"pre_tool_execution","hook":"security-check","tool":"read_file","action":"allow"}
{"timestamp":"2026-02-02T18:00:01Z","type":"post_tool_execution","hook":"tool-logger","tool":"read_file","status":"success","duration":50}
{"timestamp":"2026-02-02T18:00:02Z","type":"tool_error","hook":"retry-handler","tool":"read_file","error":"timeout","action":"retry"}
```

### View Hook Logs

```bash
# Tail real-time logs
tail -f <workspace>/logs/hooks/<session-id>.jsonl

# Search for specific hook
grep "security-check" <workspace>/logs/hooks/<session-id>.jsonl

# Filter by action
grep '"action":"block"' <workspace>/logs/hooks/<session-id>.jsonl
```

---

## Troubleshooting

### Hook Not Running

```bash
# Check hooks are enabled
echo $FF_HOOKS_ENABLED

# Verify hooks path
echo $FF_HOOKS_PATH
ls -la $FF_HOOKS_PATH

# Check hook file syntax
npx tsc --noEmit <hooks-path>/*.ts
```

### Hook Blocking Unintentionally

```bash
# Check hook logs for blocks
grep '"action":"block"' <workspace>/logs/hooks/*.jsonl

# Review hook priority
cat <hooks-path>/<hook-name>.ts | grep priority

# Disable hook temporarily
# Rename hook file to .disabled
```

### Performance Issues

```bash
# Check hook execution time
grep "duration" <workspace>/logs/hooks/*.jsonl

# Reduce hook complexity
# Lower hook priority for less critical hooks

# Disable unused hooks
export FF_HOOK_PLAN_VALIDATION=false
```

---

## Best Practices

### For Security

- Use `pre_tool_execution` for blocking dangerous operations
- Set priority 1-10 for security hooks
- Log all block actions
- Use `allow` by default, `block` explicitly

### For Validation

- Use `post_tool_execution` for output validation
- Use `tool_error` for retry logic
- Set priority 11-50 for validation hooks
- Provide clear error messages

### For Logging

- Use `post_tool_execution` for success logging
- Use `tool_error` for error logging
- Set priority 51-100 for logging hooks
- Use JSONL format for parsing

### For Custom Hooks

- Keep hooks simple and focused
- Handle errors gracefully
- Provide meaningful error messages
- Test hooks in isolation

---

## Hook API

### Programmatic Hook Registration

```typescript
import { registerHook } from './runtime/hooks/index.js';

registerHook({
  type: 'pre_tool_execution',
  name: 'my-hook',
  run: async (ctx) => {
    return { action: 'allow' };
  }
});
```

### Hook Event Listeners

```typescript
import { onHookEvent } from './runtime/hooks/index.js';

onHookEvent('pre_tool_execution', (ctx) => {
  console.log('Tool call:', ctx.call.name);
});

onHookEvent('block', (ctx) => {
  console.log('Blocked:', ctx.call.name, ctx.reason);
});
```

---

## Examples

### Simple File Read Hook

```typescript
// hooks/file-read-logger.ts
export const fileReadLogger = {
  type: 'post_tool_execution' as const,
  name: 'file-read-logger',
  priority: 100,
  enabled: true,
  run: async (ctx) => {
    if (ctx.call.name === 'read_file') {
      const bytes = ctx.output?.length || 0;
      console.log(`Read ${bytes} bytes from ${ctx.call.arguments.path}`);
    }
  }
};
```

### API Rate Limit Hook

```typescript
// hooks/rate-limit.ts
const apiCalls = new Map<string, number>();

export const rateLimitHook = {
  type: 'pre_tool_execution' as const,
  name: 'rate-limit',
  priority: 20,
  enabled: true,
  run: async (ctx) => {
    if (ctx.call.name.startsWith('api_')) {
      const now = Date.now();
      const count = apiCalls.get(ctx.sessionId) || 0;
      
      if (count >= 10) {
        return {
          action: 'block',
          reason: 'API rate limit exceeded (10 calls/minute)'
        };
      }
      
      apiCalls.set(ctx.sessionId, count + 1);
    }
    return { action: 'allow' };
  }
};
```

---

## Next Steps

1. **[WhatsApp Integration](11-whatsapp-integration.md)** - Access via WhatsApp
2. **[Configuration Guide](12-configuration-guide.md)** - Complete configuration reference
3. **[Architecture Overview](../architecture/01-file-structure.md)** - System architecture

---

**Built with technical precision and agentic intelligence**
