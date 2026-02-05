# File Structure

## Overview

FF Terminal is organized as a TypeScript project with clear separation between runtime, CLI, web UI, and extension points.

## Directory Tree

```
ff-terminal-ts/
├── src/
│   ├── acp/                    # AI Command Protocol (ACP) server
│   ├── agent-testing-suite/    # E2E testing infrastructure
│   ├── bin/                    # CLI entry point
│   ├── cli/                    # Ink-based terminal UI
│   │   └── tts/              # Text-to-speech subsystem
│   ├── daemon/                 # WebSocket daemon
│   ├── runtime/                # Core agent runtime
│   │   ├── agents/           # Agent configuration & templates
│   │   ├── autonomy/         # Autonomous execution loop
│   │   ├── browser/          # Playwright browser automation
│   │   ├── commands/         # Custom command parsing
│   │   ├── config/           # Configuration loading
│   │   ├── hooks/            # Lifecycle hooks system
│   │   ├── logging/          # Structured logging
│   │   ├── planning/         # Execution plan tracking
│   │   ├── profiles/         # User profile management
│   │   ├── prompts/          # Prompt engineering
│   │   ├── providers/        # LLM provider abstraction
│   │   ├── scheduling/       # Task scheduling
│   │   ├── session/          # Session persistence
│   │   ├── tools/            # Tool registry & execution
│   │   └── workspace/        # Workspace management
│   ├── shared/                # Shared utilities
│   ├── web/                   # Web UIs
│   │   ├── client/          # React-based web client
│   │   └── fieldview/       # FieldView UI
│   └── whatsapp/              # WhatsApp integration
├── skills/                    # User skill library (external)
├── tests/                     # Unit tests
└── docs/                      # Documentation
```

## Key Directories

### `/src/runtime` - Core Runtime

The heart of FF Terminal. Contains the agent loop, tool execution, provider abstraction, and all runtime infrastructure.

**Critical files:**
- `agentLoop.ts` - Main agent execution loop
- `tools/registry.ts` - Tool registration and lookup
- `tools/executeTools.ts` - Parallel tool execution
- `providers/factory.ts` - Provider selection logic
- `session/sessionStore.ts` - Session persistence

### `/src/daemon` - WebSocket Daemon

Long-running daemon process that handles WebSocket connections and orchestrates agent turns.

**Key responsibilities:**
- WebSocket server (port 28888)
- Session management
- Tool registry initialization
- Request/response streaming

### `/src/cli` - Terminal UI

Ink-based terminal interface for interactive sessions.

**Components:**
- `app.tsx` - Main UI application
- `tts/` - Text-to-speech playback
- `colorTheme.ts` - Terminal color schemes

### `/src/web` - Web Interfaces

React-based web UIs for browser-based interaction.

**Sub-interfaces:**
- `client/` - Standard web UI
- `fieldview/` - FieldView UI with artifact preview

### `/skills` - Skill Library

External skill definitions (not compiled into binary). Skills are discovered and loaded at runtime.

**Structure:**
```
skills/
├── skill-name/
│   ├── SKILL.md          # Skill metadata (frontmatter + docs)
│   ├── tools.ts          # Tool implementations (optional)
│   └── agents.ts         # Agent definitions (optional)
```

## File Naming Conventions

### TypeScript/JavaScript
- **Files:** `camelCase.ts` (e.g., `agentLoop.ts`)
- **Exports:** `export function`, `export class`
- **Imports:** Use `.js` extension (TypeScript requires this for ES modules)

### Markdown
- **Skill docs:** `SKILL.md` (uppercase)
- **Command docs:** `command-name.md` (lowercase, kebab-case)
- **Agent configs:** `agent-name.json`

### Tests
- **Unit tests:** `filename.test.ts`
- **Integration tests:** `filename.integration.test.ts`

## Configuration Files

### Root Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript compiler options
- `vite.config.ts` - Vite bundler configuration
- `.env` - Environment variables (gitignored)

### User Configuration
- `~/.ff-terminal/config.json` - User profiles
- `~/.ff-terminal/credentials/` - Encrypted API keys
- `~/.ff-terminal/mounts.json` - External resource mounts

## Output Directories

### Compiled Code
- `dist/` - JavaScript output from TypeScript compilation

### Workspace
- `ff-terminal-workspace/` - Default workspace directory
  - `sessions/` - Session JSON files
  - `logs/` - Structured logs
  - `skills/` - Workspace-local skills
  - `commands/` - Workspace-local commands
  - `agents/` - Workspace-local agents
  - `todos/` - Todo state per session
  - `memory_core/` - Long-term memory

### Documentation Output
- `docs-site/` - Built documentation site (Astro)

## Import Patterns

### Absolute Imports
Use `../` relative paths for same-package imports:
```typescript
import { ToolRegistry } from "../runtime/tools/registry.js";
import { startDaemon } from "../daemon/daemon.js";
```

### Shared Utilities
```typescript
import { newId } from "../../shared/ids.js";
```

### External Packages
```typescript
import fs from "node:fs";
import path from "node:path";
```

## Extension Points

### Adding a Tool
1. Create implementation in `runtime/tools/implementations/`
2. Register in `runtime/registerDefaultTools.ts`
3. Add schema if needed in `runtime/tools/toolSchemas.ts`

### Adding a Provider
1. Create provider in `runtime/providers/`
2. Add to factory in `runtime/providers/factory.ts`
3. Implement `Provider` interface from `providers/types.ts`

### Adding a Skill
1. Create directory in `skills/` or workspace
2. Add `SKILL.md` with frontmatter
3. Add optional `tools.ts` for custom tools
4. Skill auto-discovered at runtime

## Build Artifacts

### Development Mode
```bash
npm run dev
# Watches source files
# Compiles to dist/
# Runs daemon + UI
```

### Production Build
```bash
npm run build
# Compiles TypeScript to dist/
# Bundles web UIs with Vite
# Creates executable in dist/bin/
```

## File Sizes

**Typical file sizes:**
- Core runtime files: 500-2000 lines
- Tool implementations: 100-500 lines
- Provider implementations: 200-800 lines
- UI components: 100-400 lines

**Total project:** ~40,000 lines of TypeScript (excluding tests and docs)

## Related Documentation

- [02-dual-process-design.md](./02-dual-process-design.md) - Daemon and UI separation
- [04-execution-flow.md](./04-execution-flow.md) - How code flows through files
- [09-tool-registry.md](./09-tool-registry.md) - Tool system details
