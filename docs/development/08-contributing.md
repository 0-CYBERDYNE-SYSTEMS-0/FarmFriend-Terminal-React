# Contributing Guide

**Guidelines for contributing to FF Terminal development.**

---

## Overview

Thank you for your interest in contributing to FF Terminal! This guide covers how to set up your development environment, submit changes, and follow our coding standards.

### Ways to Contribute

| Type | Description | Difficulty |
|------|-------------|------------|
| **Bug Fixes** | Fix existing issues | Beginner |
| **Documentation** | Improve guides and docs | Beginner |
| **New Tools** | Add new tool implementations | Intermediate |
| **New Skills** | Create specialized skills | Intermediate |
| **Features** | Add new functionality | Advanced |
| **Infrastructure** | Improve build/test systems | Advanced |

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Git** - Version control
- **Node.js 20+** - Runtime
- **npm 9+** - Package manager
- **Text editor** - VSCode, Zed, or vim
- **Terminal** - iTerm2, Alacritty, or similar

### Step 1: Fork the Repository

1. Go to [GitHub Repository](https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts)
2. Click **Fork** button
3. Clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/ff-terminal-ts.git
cd ff-terminal-ts
```

### Step 2: Set Up Upstream Remote

```bash
# Add upstream remote
git remote add upstream https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git

# Verify remotes
git remote -v
# origin    https://github.com/YOUR-USERNAME/ff-terminal-ts.git (fetch)
# origin    https://github.com/YOUR-USERNAME/ff-terminal-ts.git (push)
# upstream  https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git (fetch)
# upstream  https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git (push)
```

### Step 3: Sync with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Switch to main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Push to your fork
git push origin main
```

---

## Development Setup

### Install Dependencies

```bash
# Install all dependencies
npm install

# Install web client dependencies
cd src/web/client && npm install && cd ../..

# Install FieldView dependencies
cd src/web/fieldview && npm install && cd ../..
```

### Build Project

```bash
# Full build
npm run build

# Verify build output
ls -la dist/
```

### Run Tests

```bash
# Run all tests
npm test

# Verify all tests pass
```

---

## Workflow

### 1. Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description

# Branch naming conventions:
# feature/ - New features
# bugfix/ - Bug fixes
# docs/ - Documentation changes
# chore/ - Maintenance tasks
# hotfix/ - Urgent production fixes
```

### 2. Make Changes

```bash
# Make your code changes
# Follow coding standards (see below)

# Stage changes
git add path/to/changed/file.ts

# Or stage all changes
git add .

# Commit changes
git commit -m "feat(tools): add new file_search tool

- Implements grep-like search across workspace
- Supports case-insensitive and regex patterns
- Returns line numbers and context

Closes #123"
```

### 3. Push Changes

```bash
# Push branch to your fork
git push origin feature/your-feature-name
```

### 4. Create Pull Request

1. Go to [GitHub](https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts/pulls)
2. Click **New Pull Request**
3. Select your branch
4. Fill in PR template
5. Submit PR

---

## Coding Standards

### TypeScript Style

**File Naming**:
```typescript
// Files: kebab-case
file-name.ts
tool-registry.ts

// Component files: PascalCase
MyComponent.tsx

// Test files: .test.ts
tool-name.test.ts
```

**Naming Conventions**:
```typescript
// Interfaces: PascalCase
interface ToolConfig {}

// Types: PascalCase
type ToolResult = {}

// Classes: PascalCase
class ToolRegistry {}

// Functions/Variables: camelCase
function executeTool() {}
let toolResult = {};

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Private members: underscore prefix
class ToolRegistry {
  private _tools: Map<string, Tool>;
}
```

**Type Annotations**:
```typescript
// Always annotate function returns
function execute(input: ToolInput): Promise<ToolResult> {
  // ...
}

// Use explicit types over any
function processData(data: string[]): number[] {
  return data.map((item: string) => item.length);
}

// Avoid any
// ❌ Bad: function foo(x: any) { ... }
// ✅ Good: function foo(x: string) { ... }
```

**Error Handling**:
```typescript
// Always handle errors
async function executeTool(input: ToolInput): Promise<ToolResult> {
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
```

**Immutability**:
```typescript
// Prefer const over let
const results: number[] = [];

// Use spread for immutable updates
const newItems = [...items, newItem];

// Avoid mutating parameters
function addItem(items: string[], item: string): string[] {
  return [...items, item];  // Returns new array
}
```

### React/Ink Components

```typescript
// Functional components with proper typing
interface Props {
  title: string;
  onAction: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  // Use hooks for state
  const [count, setCount] = useState<number>(0);

  // Event handlers
  const handleClick = () => {
    setCount(c => c + 1);
    onAction();
  };

  return (
    <Box>
      <Text>{title}</Text>
      <Text>Count: {count}</Text>
    </Box>
  );
};
```

### Commit Messages

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

**Examples**:
```
feat(tools): add file_search tool with regex support

Implements grep-like search across workspace files with support
for case-insensitive and regex patterns. Returns line numbers
and surrounding context for each match.

Closes #123
```

```
fix(daemon): handle WebSocket connection drops gracefully

- Add automatic reconnection with exponential backoff
- Preserve session state across reconnections
- Fix race condition in message queue

Fixes #456
```

---

## Testing Requirements

### Unit Tests

All new tools and utilities must include unit tests:

```typescript
import { describe, it, expect } from 'vitest';
import { yourTool } from './yourTool.js';

describe('yourTool', () => {
  it('should execute successfully with valid input', async () => {
    const result = await yourTool.execute({ param: 'value' }, {});
    expect(result.success).toBe(true);
  });
});
```

**Coverage Requirements**:
- New code: 80%+ coverage
- Critical paths: 90%+ coverage

### Integration Tests

For complex features, add integration tests:

```typescript
describe('tool integration', () => {
  it('should chain multiple tools', async () => {
    // writeFile → readFile → deleteFile
    const write = await writeFile.execute({ path: '/tmp/test.txt' }, {});
    const read = await readFile.execute({ path: '/tmp/test.txt' }, {});
    const del = await deleteFile.execute({ path: '/tmp/test.txt' }, {});

    expect(write.success).toBe(true);
    expect(read.success).toBe(true);
    expect(read.data).toBe('test content');
    expect(del.success).toBe(true);
  });
});
```

### E2E Tests

For user-facing features, document manual test steps:

```markdown
## Manual Test Steps

1. Start daemon: `npm run dev:daemon`
2. Start CLI: `npm run dev:cli`
3. Type: `/help`
4. Verify: All commands display correctly
```

---

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows style guide
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] New code has unit tests
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature)
- [ ] Documentation update

## Testing
Describe how changes were tested

## Screenshots (if applicable)
Add screenshots to explain changes

## Checklist
- [ ] My code follows style guidelines
- [ ] I have performed self-review
- [ ] I have commented complex code
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] Tests pass locally
- [ ] Related issue has been linked
```

### Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Code Review**: Maintainers review code
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves PR
5. **Merge**: Maintainer merges PR

---

## Adding New Tools

### Tool Structure

**Location**: `src/runtime/tools/implementations/new-tool.ts`

```typescript
import { Tool } from '../../types/tool.js';

export const newTool: Tool = {
  name: 'new_tool',
  description: 'Brief description',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param1'],
  },
  execute: async (input, context) => {
    try {
      const { param1 } = input;
      const result = await doSomething(param1);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
```

### Register Tool

**Location**: `src/runtime/tools/registry.ts`

```typescript
import { newTool } from './implementations/new-tool.js';

export const TOOLS = [
  // ... existing tools
  newTool,
];
```

### Add Tests

**Location**: `src/runtime/tools/implementations/new-tool.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { newTool } from './new-tool.js';

describe('newTool', () => {
  it('should execute successfully', async () => {
    const result = await newTool.execute({ param1: 'test' }, {});
    expect(result.success).toBe(true);
  });
});
```

---

## Adding New Skills

### Skill Structure

```
skills/
└── my-skill/
    ├── SKILL.md              # Skill documentation
    ├── tools/
    │   └── tool-implementation.ts
    └── prompts/
        └── system-prompt.md
```

### SKILL.md Template

```markdown
# My Skill

Brief description of what this skill does.

## Usage
Describe how to use the skill

## Capabilities
- Capability 1
- Capability 2

## Examples
Provide usage examples

## Requirements
- Prerequisite 1
- Prerequisite 2
```

---

## Documentation Guidelines

### Updating Documentation

When adding features, update relevant docs:

| Change | Update |
|--------|--------|
| New tool | `docs/` or `SKILL.md` |
| New command | `docs/` or README |
| Breaking change | `CHANGELOG.md` |
| New feature | README feature list |

### Documentation Style

```markdown
## Feature Name

Brief description

### Usage

```bash
# Example command
ff-terminal command --option value
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option | string | default | Description |
```

---

## Communication

### Issue Tracking

- Search existing issues before creating new ones
- Use issue templates
- Provide clear reproduction steps
- Include relevant logs and versions

### Questions & Discussions

- Use GitHub Discussions for questions
- Search existing discussions
- Be respectful and constructive
- Provide context for your question

---

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone.

### Our Standards

**Positive behaviors**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Negative behaviors**:
- Harassment and discriminatory language
- Trolling and insulting behavior
- Publishing private information
- Other unprofessional conduct

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

---

## Recognition

Contributors are recognized in:

- [CONTRIBUTORS.md](../../CONTRIBUTORS.md)
- Release notes
- Project documentation

---

## Resources

### Useful Links

- [Git Documentation](https://git-scm.com/doc)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Vitest Testing](https://vitest.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

### Related Guides

- [Environment Setup](01-environment-setup.md)
- [Development Workflow](02-development-workflow.md)
- [Testing Guide](03-testing-guide.md)
- [Debugging Guide](06-debugging-guide.md)
- [Troubleshooting](07-troubleshooting.md)

---

## Thank You!

Your contributions make FF Terminal better for everyone. We appreciate your time and effort!

---

**Last Updated**: 2026-02-02
