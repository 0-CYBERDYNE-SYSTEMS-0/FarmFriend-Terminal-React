# Testing Guide

**Comprehensive testing practices and procedures for FF Terminal.**

---

## Overview

FF Terminal uses **Vitest** as its testing framework, providing fast unit tests, integration tests, and coverage reporting. The test suite covers tools, utilities, configuration, and critical runtime components.

### Test Statistics

| Category | Tests | Coverage |
|----------|-------|----------|
| File & Bash Tools | 47 | ~90% |
| Logging System | 24 | ~95% |
| Profile/Provider System | 13 | ~85% |
| Execution Plans | 29 | ~80% |
| Plan Validation Hook | 11 | ~90% |
| **Total** | **124+** | **~85%** |

---

## Test Structure

### Directory Layout

```
src/
├── runtime/
│   ├── tools/
│   │   ├── implementations/
│   │   │   ├── readFile.test.ts
│   │   │   ├── writeFile.test.ts
│   │   │   ├── runCommand.test.ts
│   │   │   └── ...
│   │   └── registry.test.ts
│   ├── config/
│   │   └── config.test.ts
│   ├── profiles/
│   │   └── profileManager.test.ts
│   ├── planning/
│   │   ├── planExtractor.test.ts
│   │   └── planExecutor.test.ts
│   ├── hooks/
│   │   └── planValidator.test.ts
│   └── logging/
│       └── logger.test.ts
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests once (without watch)
npm test -- --run

# Run specific test file
npm test -- readFile.test.ts

# Run tests matching pattern
npm test -- --grep "readFile"

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests with coverage and threshold check
npm test -- --coverage --coverage.thresholds.lines=80
```

### Running Test Suites by Category

```bash
# Tool tests
npm test -- --run src/runtime/tools/

# Configuration tests
npm test -- --run src/runtime/config/

# Planning tests
npm test -- --run src/runtime/planning/

# Hook tests
npm test -- --run src/runtime/hooks/
```

---

## Writing Tests

### Test File Naming

Test files must end with `.test.ts`:

```
readFile.ts          → readFile.test.ts
runCommand.ts        → runCommand.test.ts
planExtractor.ts     → planExtractor.test.ts
```

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ToolName', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize test data
  });

  // Cleanup after each test
  afterEach(() => {
    // Clean up test data
    vi.clearAllMocks();
  });

  // Test cases
  describe('execute', () => {
    it('should execute successfully with valid input', async () => {
      // Arrange
      const input = { param1: 'value1' };

      // Act
      const result = await tool.execute(input, {});

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle missing required parameters', async () => {
      const result = await tool.execute({}, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

---

## Testing Patterns

### 1. Testing Tools

**Template**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolName } from './toolName.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('toolName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should succeed with valid parameters', async () => {
      const result = await toolName.execute(
        { param: 'value' },
        { workspace: '/tmp' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail with missing required parameter', async () => {
      const result = await toolName.execute({}, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should handle errors gracefully', async () => {
      const result = await toolName.execute(
        { param: 'invalid' },
        { workspace: '/tmp' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

### 2. Testing with Mocks

**Mocking File System**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'fs/promises';

describe('readFile tool', () => {
  it('should read file content', async () => {
    vi.mock('fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('file content'),
    }));

    const result = await readFile('/path/to/file.txt', 'utf-8');

    expect(result).toBe('file content');
  });
});
```

**Mocking External APIs**:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchTool } from './fetchTool.js';

describe('fetchTool', () => {
  it('should fetch URL content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'response content',
    });

    global.fetch = mockFetch;

    const result = await fetchTool.execute({ url: 'https://example.com' }, {});

    expect(result.success).toBe(true);
    expect(result.data).toBe('response content');
  });
});
```

### 3. Testing Async Operations

```typescript
describe('async operations', () => {
  it('should handle promise resolution', async () => {
    const promise = Promise.resolve('result');

    await expect(promise).resolves.toBe('result');
  });

  it('should handle promise rejection', async () => {
    const promise = Promise.reject(new Error('failed'));

    await expect(promise).rejects.toThrow('failed');
  });

  it('should handle timeouts', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('result'), 1000);
    });

    const result = await promise;
    expect(result).toBe('result');
  });
});
```

### 4. Testing Error Cases

```typescript
describe('error handling', () => {
  it('should handle file not found error', async () => {
    const result = await readFile('/nonexistent/file.txt');

    expect(result.success).toBe(false);
    expect(result.error).toContain('ENOENT');
  });

  it('should handle permission errors', async () => {
    const result = await readFile('/root/protected.txt');

    expect(result.success).toBe(false);
    expect(result.error).toContain('EACCES');
  });

  it('should handle invalid input', async () => {
    const result = await tool.execute({ param: null }, {});

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 5. Testing with Fixtures

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('tool with fixtures', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = '/tmp/test-workspace';
  });

  it('should use workspace from context', async () => {
    const result = await tool.execute(
      { path: 'file.txt' },
      { workspace }
    );

    expect(result.success).toBe(true);
  });
});
```

---

## Test Coverage

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report in browser
npm run test:coverage -- --coverage.reporter=html
open coverage/index.html
```

### Coverage Thresholds

Add to `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### Interpreting Coverage

| Metric | Description |
|--------|-------------|
| Statements | Percentage of statements executed |
| Branches | Percentage of conditional branches executed |
| Functions | Percentage of functions called |
| Lines | Percentage of lines executed |

**Target Coverage**: 80%+ for all metrics

---

## Integration Tests

### E2E Test Script

```bash
# Run end-to-end test
./scripts/e2e_loop.sh "<profile-name>" auto <<'EOT'
Hello
Summarize this repository
EOT
```

### Testing Agent Loop

```typescript
import { describe, it, expect } from 'vitest';
import { runAgentLoop } from '../../runtime/agentLoop.js';

describe('Agent Loop Integration', () => {
  it('should complete multi-turn conversation', async () => {
    const result = await runAgentLoop({
      input: 'Create a file named test.txt with content "hello"',
      provider: 'openai',
      model: 'gpt-4',
      maxTurns: 10,
    });

    expect(result.success).toBe(true);
    expect(result.turns).toBeGreaterThan(1);
  });
});
```

### Testing Tool Chains

```typescript
describe('tool chain integration', () => {
  it('should execute multiple tools in sequence', async () => {
    // Create file
    const createResult = await writeFile.execute(
      { path: '/tmp/test.txt', content: 'content' },
      {}
    );
    expect(createResult.success).toBe(true);

    // Read file
    const readResult = await readFile.execute(
      { path: '/tmp/test.txt' },
      {}
    );
    expect(readResult.success).toBe(true);
    expect(readResult.data).toBe('content');

    // Delete file
    const deleteResult = await deleteFile.execute(
      { path: '/tmp/test.txt' },
      {}
    );
    expect(deleteResult.success).toBe(true);
  });
});
```

---

## Manual Testing

### Testing Checklist

Follow the 67-test checklist in `MANUAL_TESTING_CHECKLIST.md`:

#### Display Commands & Navigation
- [ ] `/help` shows all commands
- [ ] `/tools` lists available tools
- [ ] `/agents` lists available agents
- [ ] `/mode` switches between modes
- [ ] `/clear` clears the screen
- [ ] `/quit` exits cleanly

#### Mode Switching & Wizards
- [ ] Auto mode executes tools automatically
- [ ] Confirm mode asks before tool execution
- [ ] Read-only mode refuses write operations
- [ ] Planning mode extracts and displays plans
- [ ] Profile setup wizard creates valid profile
- [ ] Skill setup wizard installs skills

#### Profile & Tool Management
- [ ] Create new profile
- [ ] Set default profile
- [ ] List all profiles
- [ ] Delete profile
- [ ] Set tool credentials
- [ ] List tool credentials

#### Web UI Functionality
- [ ] Web server starts correctly
- [ ] WebSocket connection established
- [ ] Real-time streaming works
- [ ] File upload works
- [ ] Session management works
- [ ] Mobile view responsive

#### Edge Cases & Error Handling
- [ ] Invalid tool parameters
- [ ] Missing required parameters
- [ ] Tool execution failures
- [ ] Network errors
- [ ] File system errors
- [ ] WebSocket disconnection

---

## Continuous Integration

### GitHub Actions

**`.github/workflows/test.yml`**:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test -- --run

      - name: Generate coverage
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

**`.husky/pre-commit`**:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm test -- --run --reporter=verbose
```

---

## Performance Testing

### Benchmarking Tool Execution

```typescript
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('performance benchmarks', () => {
  it('should execute readFile within 100ms', async () => {
    const start = performance.now();
    await readFile('/tmp/small-file.txt');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent tool calls efficiently', async () => {
    const start = performance.now();
    await Promise.all([
      readFile('/tmp/file1.txt'),
      readFile('/tmp/file2.txt'),
      readFile('/tmp/file3.txt'),
    ]);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });
});
```

---

## Troubleshooting Tests

### Test Fails Locally but Passes in CI

**Check**:
1. Node version matches CI
2. Dependencies are up to date
3. Environment variables are set
4. File permissions are correct

### Test Times Out

**Solutions**:
```typescript
// Increase timeout for slow tests
it('should complete within timeout', async () => {
  // ...
}, 10000); // 10 seconds
```

### Flaky Tests

**Causes**:
- Race conditions
- Non-deterministic ordering
- External dependencies
- Timing issues

**Solutions**:
```typescript
// Use vi.waitFor() for async conditions
await vi.waitFor(() => {
  expect(condition).toBe(true);
}, { timeout: 5000 });
```

---

## Best Practices

### 1. Write Tests First (TDD)

```typescript
// 1. Write failing test
it('should calculate sum', () => {
  expect(add(2, 3)).toBe(5);
});

// 2. Write implementation
function add(a: number, b: number): number {
  return a + b;
}

// 3. Refactor
```

### 2. Test Behavior, Not Implementation

```typescript
// Good - tests behavior
it('should return success when file is created', async () => {
  const result = await writeFile.execute({ path: '/tmp/test.txt' }, {});
  expect(result.success).toBe(true);
});

// Bad - tests implementation
it('should call fs.writeFile with correct args', async () => {
  await writeFile.execute({ path: '/tmp/test.txt' }, {});
  expect(fs.writeFile).toHaveBeenCalledWith('/tmp/test.txt');
});
```

### 3. Use Descriptive Test Names

```typescript
// Good
it('should handle file not found error gracefully', async () => {});

// Bad
it('should work', async () => {});
```

### 4. Keep Tests Independent

```typescript
// Good - each test is independent
describe('readFile', () => {
  beforeEach(() => {
    // Create fresh file for each test
  });

  it('should read file content', async () => {});
  it('should handle missing file', async () => {});
});

// Bad - tests depend on each other
describe('readFile', () => {
  it('should create file', async () => {});
  it('should read file created in previous test', async () => {});
});
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Last Updated**: 2026-02-02
