# Development Workflow

**Standard development practices, patterns, and procedures for FF Terminal.**

---

## Project Structure

### Directory Overview

```
ff-terminal-ts/
├── src/
│   ├── bin/                 # CLI entry points
│   │   └── ff-terminal.ts   # Main CLI router
│   ├── cli/                 # Terminal UI (Ink/React)
│   │   ├── app.tsx          # Main UI component
│   │   └── tts/             # Text-to-speech integration
│   ├── daemon/              # WebSocket daemon
│   │   ├── daemon.ts        # Daemon server
│   │   └── protocol.ts      # Message types
│   ├── runtime/             # Core runtime system
│   │   ├── agentLoop.ts     # Multi-turn agent loop
│   │   ├── config/          # Configuration management
│   │   ├── profiles/        # Profile & credential storage
│   │   ├── tools/           # Tool implementations
│   │   │   ├── implementations/
│   │   │   └── registry.ts  # Tool registry
│   │   ├── planning/        # Plan extraction/execution
│   │   ├── scheduling/      # Task scheduling (RRULE)
│   │   ├── autonomy/        # Autonomous agent loop
│   │   ├── hooks/           # Validation hooks
│   │   └── session/         # Session management
│   ├── web/                 # Web interfaces
│   │   ├── server.ts        # WebSocket + HTTP server
│   │   ├── client/          # Original Client
│   │   └── fieldview/       # FieldView Classic
│   ├── whatsapp/            # WhatsApp integration
│   ├── acp/                 # Anthropic Claude Protocol
│   ├── shared/              # Shared utilities
│   └── types/               # TypeScript definitions
├── docs/                    # Documentation
├── scripts/                 # Build and utility scripts
├── packet/                  # Embedded resources
│   ├── tool_schemas.openai.json
│   └── default_config.json
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies and scripts
```

---

## Development Patterns

### 1. Adding a New Tool

**File Location**: `src/runtime/tools/implementations/your_tool.ts`

**Template**:

```typescript
import { Tool } from '../../types/tool.js';

export const yourTool: Tool = {
  name: 'your_tool',
  description: 'Brief description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
      param2: {
        type: 'number',
        description: 'Numeric parameter',
      },
    },
    required: ['param1'],
  },
  execute: async (input, context) => {
    try {
      // Extract parameters
      const { param1, param2 } = input;

      // Tool logic here
      const result = await doSomething(param1, param2);

      // Return success
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Return error
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
```

**Register Tool**: Add to `src/runtime/tools/registry.ts`

```typescript
import { yourTool } from './implementations/your_tool.js';

export const TOOLS = [
  // ... existing tools
  yourTool,
];
```

**Test Tool**: Create `src/runtime/tools/implementations/your_tool.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { yourTool } from './your_tool.js';

describe('yourTool', () => {
  it('should execute successfully with valid input', async () => {
    const result = await yourTool.execute(
      { param1: 'test', param2: 42 },
      {}
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    const result = await yourTool.execute({ param1: 'invalid' }, {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 2. Creating Custom Commands

**File Location**: `ff-terminal-workspace/commands/command_name.md`

**Template**:

```markdown
---
description: "Brief command description"
allowed-tools: ["read_file", "write_file", "run_command"]
model: "main"
---

# Command Name

This command performs a specific task.

## Parameters

- $1 - First parameter (required)
- $2 - Second parameter (optional)

## Instructions

1. Do this first using $1
2. Then do that using $2
3. Return the results

## Output Format

Provide results in the following format:
```
✓ Step 1 complete
✓ Step 2 complete
```
```

**Usage**: `/command-name value1 value2`

### 3. Creating Custom Agents

**File Location**: `ff-terminal-workspace/agents/agent_id.json`

**Template**:

```json
{
  "id": "agent-id",
  "name": "Agent Name",
  "description": "Brief description of agent's purpose",
  "systemPromptAddition": "\n\nYou are a specialized agent focused on...",
  "allowedTools": ["read_file", "grep", "write_file"],
  "deniedTools": ["run_command", "browser_use"],
  "mode": "auto",
  "maxTurns": 10,
  "modelOverride": "anthropic/claude-3-haiku-20240307"
}
```

**Usage**: Launch via `agent="agent-id"` in system prompt or via UI

### 4. Adding Hooks

**File Location**: `src/runtime/hooks/your_hook.ts`

**Template**:

```typescript
import { HookContext, HookResult } from '../types/hooks.js';

export async function yourHook(
  context: HookContext
): Promise<HookResult> {
  try {
    // Extract context
    const { plan, tools, config } = context;

    // Validation logic
    if (someCondition) {
      return {
        success: false,
        error: 'Validation failed: reason',
      };
    }

    // Return success
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

**Register Hook**: Add to `src/runtime/hooks/index.ts`

### 5. Creating Custom Skills

**Use Built-in Skill Tools**:

```bash
# Via conversation
Use skill_draft tool to create a skill for X

# Apply draft
Use skill_apply tool with draft ID
```

**Manual Skill Structure**:

```
skills/my-skill/
├── SKILL.md              # Skill documentation
├── tools/                # Tool implementations
├── prompts/              # Custom prompts
└── examples/             # Usage examples
```

---

## Testing Workflow

### Unit Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- yourTool.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# UI mode
npm run test:ui
```

### Test Structure

```typescript
// src/runtime/tools/implementations/yourTool.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { yourTool } from './yourTool.js';

describe('yourTool', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize test data
  });

  // Cleanup after each test
  afterEach(() => {
    // Clean up test data
  });

  // Test groups
  describe('execute', () => {
    it('should handle valid input', async () => {
      const result = await yourTool.execute({ param: 'value' }, {});
      expect(result.success).toBe(true);
    });

    it('should handle missing required parameters', async () => {
      const result = await yourTool.execute({}, {});
      expect(result.success).toBe(false);
    });
  });
});
```

### Integration Testing

```bash
# Use e2e test script
./scripts/e2e_loop.sh "<profile-name>" auto <<'EOT'
Hello
Summarize this repository
EOT
```

### Manual Testing

Follow the checklist in `MANUAL_TESTING_CHECKLIST.md` (67 tests)

---

## Build Workflow

### Development Build

```bash
# TypeScript transpilation only
tsc -p tsconfig.json

# Web client only
cd src/web/client && npm run build && cd ../..

# FieldView only
cd src/web/fieldview && npm run build && cd ../..
```

### Production Build

```bash
# Full build
npm run build

# Verify output
ls -la dist/
```

### Incremental Build

```bash
# Build only changed files
npx tsc --incremental

# Or use npm script
npm run build  # TypeScript automatically uses incremental
```

---

## Debugging Workflow

### Enable Debug Mode

```bash
# Enable verbose logging
export FF_DEBUG=true
export FF_DAEMON_LOG=1

# Start daemon with logging
npm run dev:daemon 2>&1 | tee daemon.log
```

### Using Node.js Debugger

```bash
# Start with debug flag
node --inspect-brk src/daemon/daemon.ts

# Connect with Chrome DevTools
# chrome://inspect
```

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
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:cli"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## Git Workflow

### Branching Strategy

```
main                    # Production releases
├── develop             # Integration branch
│   ├── feature/        # Feature branches
│   ├── bugfix/         # Bug fix branches
│   └── hotfix/         # Production hotfixes
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:

```
feat(tools): add new file_search tool with regex support

- Implements grep-like search across workspace
- Supports case-insensitive and regex patterns
- Returns line numbers and context

Closes #123
```

```
fix(daemon): handle WebSocket connection drops gracefully

- Add automatic reconnection with exponential backoff
- Preserve session state across reconnections
- Fix race condition in message queue

Fixes #456
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Push branch and create PR
4. Ensure CI checks pass
5. Request code review
6. Address feedback
7. Merge to `develop`

### Release Process

1. Merge `develop` to `main`
2. Tag release: `git tag -a v1.0.0 -m "Release v1.0.0"`
3. Push tags: `git push origin v1.0.0`
4. Publish to npm (if applicable)

---

## Code Style

### TypeScript Style Guide

**Naming Conventions**:

```typescript
// Files: kebab-case
// file-name.ts

// Interfaces: PascalCase
interface ToolConfig {
  name: string;
  version: number;
}

// Types: PascalCase
type ToolResult = SuccessResult | ErrorResult;

// Classes: PascalCase
class ToolExecutor {}

// Functions/Variables: camelCase
function executeTool() {}
let toolResult;

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Private members: prefixed with underscore
class ToolRegistry {
  private _tools: Map<string, Tool>;
}
```

**Type Annotations**:

```typescript
// Always return types
function execute(input: ToolInput): Promise<ToolResult> {
  // ...
}

// Use interface for object shapes
interface ToolInput {
  param1: string;
  param2?: number;
}

// Use union types for alternatives
type ToolStatus = 'idle' | 'running' | 'completed' | 'failed';

// Use generic types for reusable code
function wrap<T>(value: T): Result<T> {
  return { success: true, value };
}
```

**Error Handling**:

```typescript
// Use try-catch for async operations
async function execute() {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Always handle errors
try {
  // ...
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately
}
```

### React/Ink Component Style

```typescript
// Functional components with hooks
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<string>('');

  // Handler functions
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    <Box flexDirection="column">
      <Text>{prop1}</Text>
      <Text>{state}</Text>
    </Box>
  );
};
```

---

## Performance Guidelines

### 1. Async Operations

```typescript
// Use Promise.all for parallel async operations
const results = await Promise.all([
  fetchResource1(),
  fetchResource2(),
  fetchResource3(),
]);

// Use Promise.allSettled to handle partial failures
const results = await Promise.allSettled([
  fetchResource1(),
  fetchResource2(),
]);
```

### 2. Caching

```typescript
// Cache expensive operations
const cache = new Map<string, any>();

async function getCachedResult(key: string): Promise<any> {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await expensiveOperation(key);
  cache.set(key, result);
  return result;
}
```

### 3. Streaming

```typescript
// Use streaming for large responses
async function* streamResponse(input: string): AsyncGenerator<string> {
  const response = await fetch(input);
  const reader = response.body!.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield new TextDecoder().decode(value);
  }
}
```

---

## Documentation Workflow

### Code Documentation

```typescript
/**
 * Executes a tool with the given input and context.
 *
 * @param input - The tool input parameters
 * @param context - The execution context (workspace, config, etc.)
 * @returns Promise resolving to the tool result
 *
 * @throws {Error} When the tool execution fails
 *
 * @example
 * ```typescript
 * const result = await tool.execute(
 *   { param: 'value' },
 *   { workspace: '/path' }
 * );
 * ```
 */
export async function execute(
  input: ToolInput,
  context: ToolContext
): Promise<ToolResult> {
  // ...
}
```

### README Updates

Update relevant READMEs when adding:
- New tools → `src/runtime/tools/README.md`
- New skills → `skills/README.md`
- New features → Main `README.md`

---

## Code Review Checklist

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] Code follows style guide
- [ ] New features have tests
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR description explains changes

### During Review

- [ ] Code is readable and maintainable
- [ ] Error handling is proper
- [ ] No performance issues
- [ ] Security concerns addressed
- [ ] Edge cases considered

---

## Common Pitfalls

### 1. Forgetting Async

```typescript
// Wrong
const result = operation();

// Correct
const result = await operation();
```

### 2. Not Handling Errors

```typescript
// Wrong
const result = await operation();
return result.data;

// Correct
try {
  const result = await operation();
  return result.data;
} catch (error) {
  return { success: false, error: error.message };
}
```

### 3. Mutable State

```typescript
// Wrong
function addTodo(todos: Todo[], todo: Todo) {
  todos.push(todo);
  return todos;
}

// Correct
function addTodo(todos: Todo[], todo: Todo) {
  return [...todos, todo];
}
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Vitest Documentation](https://vitest.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Last Updated**: 2026-02-02
