# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Common Tasks
- **Start development**: `pnpm dev` or `npm run dev` - Runs the CLI directly with tsx
- **Build for production**: `pnpm build` or `npm run build` - Compiles TypeScript to dist/
- **Run daemon**: `pnpm dev:daemon` or `npm run dev:daemon` - Starts the WebSocket agent runtime on port 28888
- **Run CLI**: `pnpm dev:cli` or `npm run dev:cli` - Starts the Ink (React) terminal UI
- **Start both daemon + UI**: `pnpm dev:start` or `npm run dev:start` - Launches daemon and UI together (primary development workflow)
- **Local workspace mode**: `pnpm dev -- local` or `ff-terminal local` - Launches ff-terminal with workspace in current directory (creates `ff-terminal-workspace/` locally)
- **Run headless**: `pnpm dev:run` or `npm run dev:run` - Single-turn headless execution with a test prompt
- **Manage profiles**: `pnpm dev -- profile setup|list|default|delete` - Profile and provider configuration
- **Launch wizard**: `pnpm dev -- start` or `npm run dev -- start` - Interactive profile/model selector

**Note for development**: This is a private package, so use `pnpm run` or `npm run` commands to execute commands. The `ff-terminal` command is only available after `pnpm build` and global installation.

### Testing & Debugging
- **Run tests**: `pnpm test` or `npm test`
- **Run tests with UI**: `pnpm test:ui` or `npm run test:ui`
- **Test coverage**: `pnpm test:coverage` or `npm run test:coverage`
- **Run a single turn**: `pnpm dev -- run --prompt "your prompt here"` or `npm run dev -- run --prompt "your prompt here"`
- **Start scheduler**: `pnpm dev:daemon` then check `~/.config/ff-terminal/` for scheduled tasks
- **Web server** (alternative UI): `pnpm dev:web` or `npm run dev:web` on port 8787

### Build Verification
After making changes, always run:
```bash
npm run build
```
This catches TypeScript errors before deployment.

### Native Dependencies & Build Scripts

The project has optional native dependencies:
- `@ast-grep/cli` - Semantic code search (C++ binding)
- `esbuild` - Fast JavaScript bundler (Go binding)
- `keytar` - Secure credential storage via OS keychain (C++ binding)

If pnpm shows a warning about "Ignored build scripts", you can safely ignore it for development. These dependencies have prebuilt binaries that work without compilation. To suppress the warning and enable builds for profiling:
```bash
pnpm approve-builds
```

### Logging & Observability
- Structured JSONL session logs are written to `ff-terminal-workspace/logs/sessions/<session>.jsonl` (rotated, level-controlled via `log_level` in config). Per-run headless logs live in `ff-terminal-workspace/logs/runs/`.
- Tool start/end events include redacted args and output previews; turn completion entries capture duration and tool counts.
- To trace a failing run quickly: `tail -f ff-terminal-workspace/logs/sessions/<session>.jsonl`.

## Project Structure

The codebase follows a modular architecture with clear separation of concerns:

### **Entry Point: `src/bin/ff-terminal.ts`**
Central command router handling:
- `daemon` - Starts WebSocket agent runtime
- `ui` - Starts Ink terminal UI
- `start [profile]` - Launches both daemon and UI together
- `run --prompt "..."` - Single headless execution
- `profile` - Manages provider profiles and credentials
- `schedule` - Manages scheduled tasks
- `web` - Starts HTTP+WebSocket web server

The design spawns daemon and UI as separate child processes, allowing daemon to persist independently of UI crashes.

### **Core Modules**

#### **CLI (`src/cli/app.tsx`)**
React/Ink-based terminal UI connecting to daemon via WebSocket on port 28888.
- Displays chat transcript with syntax highlighting
- Shows operation modes: auto, confirm, read_only, planning
- Provides wizards for model/mount/project configuration
- Implements commands: `/help`, `/tools`, `/init-project`, etc.
- Allows profile-specific model overrides
- Real-time connection status and streaming output rendering

#### **Daemon (`src/daemon/daemon.ts`)**
WebSocket server (port 28888) that receives messages from UI:
- `hello` - Client identification
- `start_turn` - Begin agent processing with user prompt
- `cancel_turn` - Abort running agent
- `list_tools` - Query available tools

Streams `StreamChunk` objects back to UI containing:
- `content:` - LLM response text (delta)
- `thinking:` - Extended thinking/reasoning
- `error:` - Tool or system errors
- `status` - Status messages
- `task_completed` - Turn completion marker

#### **Runtime (`src/runtime/`)**
The core agent execution engine with multiple responsibilities:

**Agent Loop (`agentLoop.ts`)**
- Loads or creates session from persistent storage
- Builds system prompt with repo context, available skills, session summary
- Implements multi-turn iteration (default 8 max turns)
- Streams LLM output for content, thinking, and tool calls
- Executes tools in parallel, validates completions via hooks
- Logs tool execution to JSONL if enabled (FF_LOG_HOOKS_JSONL)
- Respects AbortSignal for cancellation

**Tool System (`tools/`)**
- `registry.ts` - Map-based tool registration and dispatch
- `toolSchemas.ts` - Loads OpenAI-compatible function schemas from port packet
- `executeTools.ts` - Parallel tool execution with start/finish hooks
- `context.ts` - AsyncLocalStorage providing sessionId/workspaceDir/repoRoot to tools
- `implementations/` - 40+ tool implementations (see list below)

**LLM Providers (`providers/`)**
- `factory.ts` - Provider selection (OpenRouter, Z.ai, MiniMax, LM Studio, Anthropic)
- Each provider implements Anthropic Messages API or OpenAI-compatible streaming
- Streaming enables real-time output to UI without buffering
- Handles model detection and API formatting

**Configuration (`config/`)**
- `loadConfig.ts` - Loads RuntimeConfig with tool limits, hooks, model overrides
- `paths.ts` - Platform-specific directory paths (macOS, Linux, Windows)
- `repoRoot.ts` - Finds repo root via `.git` or `.ff-terminal` marker
- `dotenv.ts` - Loads `.env` and `.env.local` for tool API keys
- `mounts.ts` - Read-only mount configuration for external skills

**Profiles & Credentials (`profiles/`)**
- Stores profiles in `~/.ff-terminal-profiles.json`
- Primary: OS keychain via optional `keytar` package
- Fallback: Plaintext in config (with warning)
- Supports multiple LLM providers per profile
- Per-purpose model overrides (main, subagentModel, toolModel, etc.)

**Session Persistence (`session/`)**
- Conversation history stored as JSON per sessionId
- Auto-loaded for context reconstruction across turns

**Task Scheduling (`scheduling/`)**
- Stores tasks in workspace `memory_core/scheduled_tasks/tasks.json`
- `taskStore.ts` - Manages one-time, daily, weekly, interval schedules
- `scheduleTaskTool.ts` - Tool for creating scheduled tasks
- `backends/` - OS-specific integration (macOS launchd)

**Hooks (`hooks/`)**
- `registry.ts` - Hook registration
- `completionValidator.ts` - Validates promise extraction from tool results
- Built-in: `completionValidationStopHook.ts` - Default completion validation

**Logging (`logging/`)**
- `structuredLogger.ts` - JSONL logger with rotation/redaction used by agent loop and headless runs.

#### **Web (`src/web/server.ts`)**
Alternative HTTP+WebSocket server on port 8787 for web-based UI.
- Serves React frontend
- Similar WebSocket API to daemon
- Health endpoint for orchestration

#### **Shared (`src/shared/`)**
- `ids.ts` - ID generation utilities

## Tool System Architecture

### Tool Categories (50+ total)

**File I/O**
- `read_file`, `write_file`, `edit_file`, `multi_edit_file`, `glob`, `grep`

**Execution**
- `run_command` - Shell execution with sandboxing

**Meta**
- `think` - Extended thinking/reasoning
- `session_summary` - Generate conversation summary
- `quick_update` - Status update to user
- `manage_task` - Manage todo lists
- `completion_validation` - Validate tool promise completion

**Code Search & Analysis**
- `search_code` - Full-text code search
- `semantic_search` - AI-powered code search
- `ast_grep` - Structured code queries

**Skills System** (Modular tools mounted from `.claude/skills`)
- `skill_loader` - Discover available skills
- `skill_documentation` - Get skill details
- `skill_import` - Import skill definitions
- `skill_draft` - Create new skill
- `skill_apply` - Execute skill
- `skill_sequencer` - Chain skills together

**Web Tools**
- `tavily_search`, `tavily_extract`, `tavily_map`, `tavily_crawl` - Comprehensive web search
- `perplexity_search` - Alternative search provider
- `browse_web` - Lightweight URL fetching

**Data & Analysis**
- `analyze_data` - Data processing and statistics
- `notebook_edit` - Jupyter notebook manipulation

**Media Generation**
- `generate_image_gemini`, `analyze_image_gemini`, `edit_image_gemini` - Google Gemini
- `generate_image_openai`, `analyze_image_openai` - OpenAI APIs
- `generate_video_gemini`, `analyze_video_gemini` - Video processing

**Automation & Control**
- `macos_control` - macOS system control (Dock, Finder, etc.)
- `workflow_automation` - Task automation framework
- `ask_oracle` - Delegation to specialized agents

**System**
- `schedule_task` - Create recurring tasks
- `list_templates` - Available project templates
- `project_template` - Apply template to project
- `smart_cleanup` - Code cleanup utilities

### How Tools Work

1. **Registration**: Tools registered in `registerDefaultTools()` with name and handler function
2. **Schema**: OpenAI-compatible schemas loaded from `port_packet/tool_schemas.openai.json`
3. **Discovery**: Only registered tools matching available schemas are advertised to LLM
4. **Execution**: LLM calls tools with JSON arguments; executed in parallel
5. **Context**: Tools access sessionId/workspaceDir/repoRoot via `getToolContext()`
6. **Validation**: Optional hooks can validate tool results and trigger re-attempts
7. **Cancellation**: AbortSignal respects UI cancellation requests

### Important Constraints

- **file safety**: `read_file` blocks `.git` and `.ssh` directories
- **file size limits**: Configurable via `FF_READ_FILE_MAX_BYTES` (default 1MB)
- **parallel limits**: Tool execution respects FF_MAX_PARALLEL_CALLS

## Configuration & Profiles

### Configuration Hierarchy (in priority order)
1. Embedded defaults from `port_packet/default_config.json`
2. User config file (platform-specific location)
3. Environment variables (FF_CONFIG_PATH, FF_PROVIDER, FF_MODEL, FF_WORKSPACE_DIR, etc.)
4. Runtime parameter overrides

### Profile System
Profiles combine provider + credentials + model selections:

```json
{
  "name": "gpt4",
  "provider": "openrouter",
  "baseUrl": "https://openrouter.ai/api/v1",
  "model": "openai/gpt-4-turbo",
  "subagentModel": "openai/gpt-4-turbo",
  "toolModel": "openai/gpt-4-turbo"
}
```

**Setup wizard**: `tsx src/bin/ff-terminal.ts profile setup`

**Credential Storage**:
- Primary: OS keychain (optional `keytar`)
- Fallback: Plaintext in `~/.ff-terminal-profiles.json` (with warning)
- Global fallback for tool keys: TAVILY_API_KEY, PERPLEXITY_API_KEY, OPENAI_API_KEY

### Supported Providers
- **OpenRouter** - OpenAI-compatible API
- **Z.ai** - OpenAI-compatible Chinese API
- **MiniMax** - Anthropic Messages API
- **LM Studio** - Local OpenAI-compatible server
- **Anthropic** - Direct Anthropic API (requires API key)

## Workspace Directory Structure

```
~/.config/ff-terminal/ (Linux)
~/Library/Application Support/ff-terminal/ (macOS)
%APPDATA%\ff-terminal\ (Windows)

memory_core/
├── session_summary.md           # Conversation summary
├── scheduled_tasks/
│   └── tasks.json              # Scheduled task definitions
└── skills/                      # Imported external skills
projects/
├── <project_name>/
│   ├── FF_PROJECT.md           # Project metadata
│   └── PROJECT.md              # User documentation
logs/
├── hooks/tools_<sessionId>.jsonl # Tool execution log
└── scheduled_runs/             # Execution logs from scheduler
sessions/
└── <sessionId>.json            # Conversation history JSON
```

## Key Architectural Patterns

### Process Model (Two-Process Architecture)
```
ff-terminal start
  ├─ Child: daemon.ts (WebSocket server, stateless)
  └─ Child: app.tsx (Ink UI, WebSocket client)
```
This allows daemon persistence across UI crashes and enables reconnection logic.

### Async Local Storage for Context
Tools automatically access context without parameter threading:
```typescript
withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
  const ctx = getToolContext(); // Available in any tool
})
```

### Generator-Based Streaming
Agent loop returns `AsyncGenerator<StreamChunk>` for memory-efficient real-time updates:
```typescript
async function* runAgentTurn(...): AsyncGenerator<StreamChunk>
```

### Hook System for Extensibility
- Completion validation hook: Retries tool calls if promises unfulfilled
- JSONL logging: Records all tool calls for analytics (FF_LOG_HOOKS_JSONL)
- Custom hooks can be registered without modifying core loop

### Port Packet Compatibility
System prompts and tool schemas are loaded from Python reference implementation to ensure identical behavior.

### Read-Only Skill Mounts
`.claude/skills` and `.factory/skills` mounted read-only; discovered dynamically and ranked by relevance.

## Important Notes

### Session ID Format
Sessions are identified by sessionId (UUID format). Each session maintains its own conversation history and state in `sessions/<sessionId>.json`.

### Workspace Directory

**Global Mode (default)**:
The default workspace is determined by:
1. `FF_WORKSPACE_DIR` environment variable
2. `workspace_dir` in config
3. Default: `~/ff-terminal-workspace`

**Local Mode**:
When using `ff-terminal local`, the workspace is created in the current directory:
- Workspace location: `<current-directory>/ff-terminal-workspace/`
- All sessions, logs, and state stay in this local directory
- Each local workspace gets a unique port (generated from workspace path hash)
- Port stored in `ff-terminal-workspace/.daemon-port` for daemon-UI communication
- Profiles and credentials inherited from global config
- Multiple local workspaces can run simultaneously without conflicts

**Use Cases**:
- `ff-terminal start` - Global workspace for general work
- `ff-terminal local` - Project-specific workspace for isolated development

### Model Selection Priority
1. Runtime override (FF_MODEL, FF_SUBAGENT_MODEL)
2. Profile-specific model
3. Default from config

### System Message Variants
The system supports multiple system message variants (A, B, C) for different agent behaviors:
- Variant C is the simplified version that reduces tool obsession
- Configured via `system_message_variant` in settings

### Debugging Agent Execution
Enable JSONL logging of tool calls:
```bash
FF_LOG_HOOKS_JSONL=true npm run dev
# Check: ~/.config/ff-terminal/logs/hooks/tools_*.jsonl
```

### Extended Thinking
Some providers support extended thinking (e.g., Anthropic claude-opus-4):
- Enable via config: `use_extended_thinking: true`
- Returns `thinking:` chunks in stream
- Useful for complex reasoning tasks

### Safe File Operations
The runtime enforces safety boundaries:
- `read_file`: Blocks `.git` and `.ssh` directories
- `write_file`: Stricter safety than read
- File size limits: `FF_READ_FILE_MAX_BYTES` (default 1MB)

### Headless & Scheduled Execution
- One-shot: `npm run dev -- run --prompt "Hello"`
- Scheduled: Create task via `schedule_task` tool, then execute with `npm run dev -- run --scheduled-task <id>`
- Logs saved to workspace under `logs/scheduled_runs/`

## Debugging Tips

1. **Check daemon connection**: Look for WebSocket connection messages in CLI output
2. **Enable verbose logging**: Set `FF_DEBUG=true` environment variable
3. **Inspect tool calls**: Enable `FF_LOG_HOOKS_JSONL=true` for detailed execution log
4. **Test tool isolation**: Run individual tools with mock context via `withToolContext()`
5. **Provider debugging**: Add console.log in provider adapter files (src/runtime/providers/)
6. **Profile issues**: Run `tsx src/bin/ff-terminal.ts profile list` to verify setup

## Performance Considerations

- **Parallel tool execution**: All tools from single LLM response run concurrently
- **Streaming protocol**: Uses delta encoding to minimize bandwidth
- **Session caching**: Conversation history loaded once at start
- **Tool schema caching**: Schemas loaded once from port packet
- **Workspace size**: Session history grows with conversation length

## Testing Strategy

### Running Tests
- **All tests**: `pnpm test` or `npm test` - Runs full test suite with Vitest
- **Watch mode**: `pnpm test -- --watch` - Continuous testing during development
- **Single file**: `pnpm test -- <filename>` - Run tests for specific file
- **Test UI**: `pnpm test:ui` or `npm run test:ui` - Interactive test explorer
- **Coverage report**: `pnpm test:coverage` or `npm run test:coverage` - Generate coverage metrics

### Test Configuration
- **Framework**: Vitest with Node environment
- **Globals enabled**: No need to import `describe`, `it`, `expect`
- **TypeScript**: Automatically transpiled via tsx
- **Configuration**: `vitest.config.ts` - Minimal setup, uses ES2022 target

## Quick Troubleshooting

### Build Issues
- **TypeScript errors**: Run `npm run build` to catch compilation errors
- **Module resolution**: Check `tsconfig.json` for moduleResolution: "NodeNext"
- **JSX in .ts files**: Ensure files using JSX have proper import statements

### Daemon/UI Issues
- **WebSocket connection fails**: Verify daemon is running on port 28888
- **Port already in use**: Kill existing process: `lsof -ti:28888 | xargs kill`
- **Tool not found**: Check tool is registered in `registerDefaultTools()` in tools/registry.ts
- **Profile issues**: Validate profile exists: `pnpm dev -- profile list`

### Common Environment Setup
- Set `FF_WORKSPACE_DIR` to use custom workspace location
- Set `FF_DEBUG=true` for verbose logging output
- Set `FF_LOG_HOOKS_JSONL=true` to enable tool call logging for debugging