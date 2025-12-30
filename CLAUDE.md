# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Common Tasks
- **Start development**: `npm run dev` - Runs the CLI directly with tsx
- **Build for production**: `npm run build` - Compiles TypeScript to dist/
- **Run daemon**: `npm run dev:daemon` - Starts the WebSocket agent runtime on port 28888
- **Run CLI**: `npm run dev:cli` - Starts the Ink (React) terminal UI
- **Start both daemon + UI**: `npm run dev:start` - Launches daemon and UI together (primary development workflow)
- **Local workspace mode**: `npm run dev -- local` or `ff-terminal local` - Launches ff-terminal with workspace in current directory (creates `ff-terminal-workspace/` locally)
- **Run headless**: `npm run dev:run` - Single-turn headless execution with a test prompt
- **Manage profiles**: `npm run dev -- profile setup|list|default|delete` - Profile and provider configuration
- **Launch wizard**: `npm run dev -- start` - Interactive profile/model selector
- **Web UI**: `npm run dev:web` - Starts web server on port 8787 with browser-based interface
- **ACP server**: `npm run dev -- acp` - Starts Anthropic Claude Protocol server for IDE integration

**Note**: This is a private package, so use `npm run` commands for development. The `ff-terminal` command is only available after `npm run build` and installation.

### Testing & Debugging
- **Run tests**: `npm test` - Full test suite with Vitest
- **Run tests with UI**: `npm run test:ui` - Interactive test explorer
- **Test coverage**: `npm run test:coverage` - Generate coverage metrics
- **Run specific test file**: `npm test -- <filename>`
- **Run tests in watch mode**: `npm test -- --watch`
- **Run a single turn**: `npm run dev -- run --prompt "your prompt here"`
- **Test scheduled task**: `npm run dev -- run --scheduled-task <id-or-name> --headless`

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

These dependencies have prebuilt binaries that work without compilation.

### Logging & Observability
- Structured JSONL session logs: `ff-terminal-workspace/logs/sessions/<session>.jsonl` (rotated, level-controlled via `log_level` in config)
- Per-run headless logs: `ff-terminal-workspace/logs/runs/`
- Tool start/end events include redacted args and output previews
- Turn completion entries capture duration and tool counts
- To trace a failing run: `tail -f ff-terminal-workspace/logs/sessions/<session>.jsonl`

## Project Structure

The codebase follows a modular architecture with clear separation of concerns:

### **Entry Point: `src/bin/ff-terminal.ts`**
Central command router handling:
- `daemon` - Starts WebSocket agent runtime
- `ui` - Starts Ink terminal UI
- `start [profile]` - Launches both daemon and UI together
- `local [profile]` - Local workspace mode with per-directory isolation
- `run --prompt "..."` - Single headless execution
- `profile` - Manages provider profiles and credentials
- `schedule` - Manages scheduled tasks with RRULE support
- `web` - Starts HTTP+WebSocket web server
- `acp` - Starts Anthropic Claude Protocol server

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
- `content` - LLM response text (delta)
- `thinking` - Extended thinking/reasoning (XML tags supported)
- `error` - Tool or system errors
- `status` - Status messages
- `task_completed` - Turn completion marker

#### **Runtime (`src/runtime/`)**
The core agent execution engine with multiple responsibilities:

**Agent Loop (`agentLoop.ts`)**
- Loads or creates session from persistent storage
- Builds system prompt with repo context, available skills, session summary
- Implements multi-turn iteration (default 500 max turns)
- Streams LLM output for content, thinking, and tool calls
- Executes tools in parallel, validates completions via hooks
- Logs tool execution to JSONL if enabled (FF_LOG_HOOKS_JSONL)
- Respects AbortSignal for cancellation
- Supports XML thinking tags for structured reasoning output

**Tool System (`tools/`)**
- `registry.ts` - Map-based tool registration and dispatch
- `toolSchemas.ts` - Loads OpenAI-compatible function schemas from packet
- `executeTools.ts` - Parallel tool execution with start/finish hooks
- `context.ts` - AsyncLocalStorage providing sessionId/workspaceDir/repoRoot to tools
- `implementations/` - 35+ tool implementations (file I/O, search, web, media, etc.)

**LLM Providers (`providers/`)**
- `factory.ts` - Provider selection (OpenRouter, Z.ai, MiniMax, LM Studio, Anthropic)
- Each provider implements Anthropic Messages API or OpenAI-compatible streaming
- Streaming enables real-time output to UI without buffering
- Handles model detection and API formatting
- Support for extended thinking via XML tags

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
- Per-purpose model overrides (main, subagentModel, toolModel, webModel, imageModel, videoModel)

**Session Persistence (`session/`)**
- Conversation history stored as JSON per sessionId
- Auto-loaded for context reconstruction across turns

**Task Scheduling (`scheduling/`)**
- Stores tasks in workspace `memory_core/scheduled_tasks/tasks.json`
- `taskStore.ts` - Manages scheduled task definitions
- `scheduleTaskTool.ts` - Tool for creating scheduled tasks
- `rrule.ts` - RRULE (RFC 5545) scheduling with timezone support
- `backends/` - OS-specific integration (macOS launchd for recurring tasks)
- Supports one-time, daily, weekly, interval, and custom RRULE schedules

**Planning System (`planning/`)**
- `planExtractor.ts` - Extracts execution plans from LLM responses
- `planStore.ts` - Persists plans to workspace
- `types.ts` - Plan and step type definitions
- Auto-extraction of plans from content when enabled
- Plan validation hooks ensure step completion
- Track step attempts and status (pending, in_progress, completed, failed)

**Hooks (`hooks/`)**
- `registry.ts` - Hook registration
- `builtin/` - Built-in hooks for validation and control
  - `planValidationStopHook.ts` - Validates plan step completion
  - `todoStopHook.ts` - Validates todo task completion
  - `skillAllowedToolsHook.ts` - Enforces skill tool restrictions
- Custom hooks can be registered without modifying core loop

**Logging (`logging/`)**
- `structuredLogger.ts` - JSONL logger with rotation/redaction used by agent loop and headless runs

#### **Web (`src/web/`)**
Alternative HTTP+WebSocket server on port 8787 for web-based UI.

**Server (`server.ts`)**
- HTTP+WebSocket server for browser-based interface
- Similar messaging protocol to daemon (command, response, thinking, tool_call, etc.)
- Health endpoint for orchestration
- File upload support via multipart/form-data

**Client (`client/`)**
- React-based web UI built with Vite
- Main component: `App.tsx` - manages WebSocket connection, message state, and dual-view layout
- Console/Chat toggle: Shows either chat-only view or split view with ConsoleEventLog
- **Responsive design**: Uses `isMobile` state (breakpoint: 768px) to adapt layout
  - Desktop: Side-by-side chat and console panels when console is enabled
  - Mobile: Bottom drawer (45vh height) slides up over chat, input field fixed above drawer at `bottom-[45vh]`
  - No backdrop blur - chat remains visible and readable when console drawer is open
  - Messages area adds bottom margin (`mb-[calc(45vh+6rem)]`) to prevent content hiding under drawer
- **Console event handling**: Streaming response chunks are aggregated, only complete responses shown in console to avoid word-by-word event spam
- **Smart scroll behavior**: Auto-scroll only triggers if user is near bottom (<150px), preventing interruption when reading scrolled-up content
- **Thinking display**: XML thinking tags are parsed and displayed with clear visual separation from responses
- Components:
  - `ConsoleEventLog.tsx` - Displays system events, tool calls, and thinking with tool previews
  - `Markdown.tsx` - Renders markdown with syntax highlighting
  - `ArtifactPreview.tsx` - Displays HTML/JSON artifacts
  - `CodeBlock.tsx` - Syntax-highlighted code blocks
  - `FileUpload.tsx` - Drag-and-drop file attachment support

#### **ACP Server (`src/acp/`)**
Anthropic Claude Protocol server for IDE integration (experimental).

#### **Shared (`src/shared/`)**
- `ids.ts` - ID generation utilities

## Tool System Architecture

### Tool Categories (35+ total)

**File I/O**
- `read_file`, `write_file`, `edit_file`, `multi_edit_file`, `glob`, `grep`

**Execution**
- `run_command` - Shell execution with sandboxing

**Meta**
- `think` - Extended thinking/reasoning
- `session_summary` - Generate conversation summary
- `quick_update` - Status update to user
- `TodoWrite` - Manage todo lists
- `completion_validation` - Validate tool promise completion (internal)

**Code Search & Analysis**
- `search_code` - Full-text code search
- `semantic_search` - AI-powered code search
- `ast_grep` - Structured code queries via ast-grep

**Skills System** (Modular tools mounted from `.claude/skills`)
- `skill_loader` - Discover available skills
- `skill_documentation` - Get skill details
- `skill_import` - Import skill definitions
- `skill_draft` - Create new skill
- `skill_apply` - Execute skill
- `skill_sequencer` - Chain skills together

**Agents & Commands**
- `agent_draft`, `agent_apply` - Agent workflow management
- `command_draft`, `command_apply` - Command workflow management

**Web Tools**
- `tavily_search`, `tavily_extract`, `tavily_map`, `tavily_crawl` - Comprehensive web search (requires TAVILY_API_KEY)
- `perplexity_search` - Alternative search provider (requires PERPLEXITY_API_KEY)
- `browse_web` - Lightweight URL fetching

**Data & Analysis**
- `analyze_data` - Data processing and statistics
- `notebook_edit` - Jupyter notebook manipulation

**Media Generation**
- `generate_image_gemini`, `analyze_image_gemini`, `edit_image_gemini` - Google Gemini (requires GOOGLE_GEMINI_API_KEY)
- `analyze_video_gemini` - Video processing
- `generate_image_openai` - OpenAI image generation (requires OPENAI_API_KEY)

**Automation & Control**
- `macos_control` - macOS system control (Dock, Finder, etc.) - requires `FF_ALLOW_MACOS_CONTROL=1`
- `workflow_automation` - Task automation framework
- `ask_oracle` - Delegation to specialized agents (requires OPENROUTER_API_KEY)

**System**
- `schedule_task` - Create recurring tasks with RRULE support
- `list_templates` - Available project templates
- `project_template` - Apply template to project
- `smart_cleanup` - Code cleanup utilities

### How Tools Work

1. **Registration**: Tools registered in `registerDefaultTools()` with name and handler function
2. **Schema**: OpenAI-compatible schemas loaded from `packet/tool_schemas.openai.json`
3. **Discovery**: Only registered tools matching available schemas are advertised to LLM
4. **Execution**: LLM calls tools with JSON arguments; executed in parallel
5. **Context**: Tools access sessionId/workspaceDir/repoRoot via `getToolContext()`
6. **Validation**: Optional hooks can validate tool results and trigger re-attempts
7. **Cancellation**: AbortSignal respects UI cancellation requests

### Important Constraints

- **File safety**: `read_file` blocks `.git` and `.ssh` directories
- **File size limits**: Configurable via `FF_READ_FILE_MAX_BYTES` (default 1MB)
- **Parallel limits**: Tool execution respects `FF_MAX_PARALLEL_CALLS`

## Configuration & Profiles

### Configuration Hierarchy (in priority order)
1. Embedded defaults from `packet/default_config.json`
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
  "toolModel": "openai/gpt-4-turbo",
  "webModel": "openai/gpt-4-turbo",
  "imageModel": "gemini-2.5-flash",
  "videoModel": "gemini-2.5-flash"
}
```

**Setup wizard**: `npm run dev -- profile setup`

**Credential Storage**:
- Primary: OS keychain (optional `keytar`)
- Fallback: Plaintext in `~/.ff-terminal-profiles.json` (with warning)
- Global fallback for tool keys: TAVILY_API_KEY, PERPLEXITY_API_KEY, GOOGLE_GEMINI_API_KEY, OPENAI_API_KEY, OPENWEATHER_API_KEY

**Tool Key Management**: `npm run dev -- profile tool-keys` - Interactive manager for API keys

### Supported Providers
- **OpenRouter** - OpenAI-compatible API with access to many models
- **Z.ai** - Anthropic-compatible API (Chinese provider)
- **MiniMax** - Anthropic Messages API
- **LM Studio** - Local OpenAI-compatible server
- **Anthropic** - Direct Anthropic API (requires API key)
- **OpenAI-compatible** - Generic OpenAI-compatible endpoint
- **Anthropic-compatible** - Generic Anthropic-compatible endpoint

## Workspace Directory Structure

```
~/.config/ff-terminal/ (Linux)
~/Library/Application Support/ff-terminal/ (macOS)
%APPDATA%\ff-terminal\ (Windows)

memory_core/
├── session_summary.md           # Conversation summary
├── scheduled_tasks/
│   └── tasks.json              # Scheduled task definitions
├── plans/
│   └── <plan-id>.json          # Execution plans
└── skills/                      # Imported external skills
projects/
├── <project_name>/
│   ├── FF_PROJECT.md           # Project metadata
│   └── PROJECT.md              # User documentation
logs/
├── sessions/
│   └── <session-id>.jsonl      # Session logs
├── runs/
│   └── <run-id>.jsonl          # Headless run logs
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

### Local Workspace Mode
```
ff-terminal local
  ├─ Creates ff-terminal-workspace/ in current directory
  ├─ Generates unique port (28889-38888) based on workspace path hash
  └─ Stores port in .daemon-port for UI discovery
```
Multiple local workspaces can run simultaneously without port conflicts.

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
- Plan validation hook: Retries tool calls if plan steps are incomplete
- Todo validation hook: Ensures todo tasks are properly managed
- Skill allowed tools hook: Enforces skill tool restrictions
- JSONL logging: Records all tool calls for analytics (FF_LOG_HOOKS_JSONL)
- Custom hooks can be registered without modifying core loop

### Port Packet Compatibility
System prompts and tool schemas are loaded from `packet/` directory to ensure consistent behavior across implementations.

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
1. Runtime override (FF_MODEL, FF_SUBAGENT_MODEL, FF_TOOL_MODEL, FF_WEB_MODEL, FF_IMAGE_MODEL, FF_VIDEO_MODEL)
2. Profile-specific model
3. Default from config

### System Message Variants
The system uses a unified system message variant:
- Default: `unified` (consolidated from previous A/B/C/D variants)
- Configured via `system_message_variant` in packet/default_config.json
- Templates located in `packet/system_prompt_unified.TEMPLATE.md`

### Debugging Agent Execution
Enable JSONL logging of tool calls:
```bash
FF_LOG_HOOKS_JSONL=true npm run dev
# Check: ff-terminal-workspace/logs/sessions/<session>.jsonl
```

Enable daemon logging:
```bash
FF_DAEMON_LOG=1 npm run dev -- start
```

### Extended Thinking
Models can use extended thinking via XML tags:
- Enable via config: `enable_thinking: true`
- Returns `thinking` chunks in stream with XML tags
- Useful for complex reasoning tasks
- Web UI displays thinking with clear visual separation

### Safe File Operations
The runtime enforces safety boundaries:
- `read_file`: Blocks `.git` and `.ssh` directories
- `write_file`: Stricter safety than read
- File size limits: `FF_READ_FILE_MAX_BYTES` (default 1MB)

### Headless & Scheduled Execution
- One-shot: `npm run dev -- run --prompt "Hello"`
- Scheduled: Create task via `schedule_task` tool, then execute with `npm run dev -- run --scheduled-task <id> --headless`
- RRULE support: Use RFC 5545 RRULE syntax for complex recurring schedules
- Timezone support: Specify timezone for accurate scheduling across regions
- Logs saved to workspace under `logs/scheduled_runs/`

## Debugging Tips

1. **Check daemon connection**: Look for WebSocket connection messages in CLI output
2. **Enable verbose logging**: Set `FF_DEBUG=true` environment variable
3. **Inspect tool calls**: Enable `FF_LOG_HOOKS_JSONL=true` for detailed execution log
4. **Test tool isolation**: Run individual tools with mock context via `withToolContext()`
5. **Provider debugging**: Add console.log in provider adapter files (src/runtime/providers/)
6. **Profile issues**: Run `npm run dev -- profile list` to verify setup
7. **Planning issues**: Check `ff-terminal-workspace/memory_core/plans/` for plan state
8. **Scheduled task issues**: Run `npm run dev -- schedule list` to see all tasks
9. **Port conflicts**: For local mode, check `.daemon-port` file in workspace

## Performance Considerations

- **Parallel tool execution**: All tools from single LLM response run concurrently
- **Streaming protocol**: Uses delta encoding to minimize bandwidth
- **Session caching**: Conversation history loaded once at start
- **Tool schema caching**: Schemas loaded once from packet
- **Workspace size**: Session history grows with conversation length
- **Plan extraction**: Auto-extraction can be disabled via `plan_auto_extraction: false`

## Testing Strategy

### Running Tests
- **All tests**: `npm test` - Runs full test suite with Vitest
- **Watch mode**: `npm test -- --watch` - Continuous testing during development
- **Single file**: `npm test -- <filename>` - Run tests for specific file
- **Test UI**: `npm run test:ui` - Interactive test explorer
- **Coverage report**: `npm run test:coverage` - Generate coverage metrics

### Test Configuration
- **Framework**: Vitest with Node environment
- **Globals enabled**: No need to import `describe`, `it`, `expect`
- **TypeScript**: Automatically transpiled via tsx
- **Configuration**: `vitest.config.ts` - Minimal setup, uses ES2022 target
- **Excludes**: node_modules, dist, ff-terminal-workspace, .test-workspace

## End-to-End Agent Testing

This section provides a standardized way to test the agent's performance across different LLM providers and models. Use this to benchmark agent quality, identify provider-specific issues, and verify bug fixes.

### Standard Benchmark Prompt

The **Hacker News Scraper & Dashboard** task is our standard end-to-end benchmark. It tests:
- File creation (Python, HTML, JSON, Markdown)
- External API integration (Hacker News API)
- Error handling and retry logic
- Multi-file coordination
- Complex HTML/CSS/JavaScript generation
- Documentation quality

**Standard benchmark command**:
```bash
npm run dev -- run --profile <PROFILE_NAME> --prompt "Build a web scraper and dashboard system:

1. Create a scraper that fetches the top 10 stories from Hacker News
   - Use the HN API or web scraping
   - Extract: title, URL, points, comment count, author, timestamp

2. Store the data in a JSON file (hn_data.json)
   - Well-formatted with proper structure
   - Include metadata (fetch timestamp, source)

3. Create an interactive HTML dashboard (dashboard.html) with:
   - Sortable table showing all stories
   - Bar chart of points distribution
   - Pie chart of comment count ranges (0-10, 11-50, 51-100, 100+)
   - Summary statistics (avg points, total comments, etc.)
   - Dark theme with responsive design
   - No external dependencies - use vanilla JS/CSS

4. Create a README.md with:
   - How to run the scraper
   - How to view the dashboard
   - Description of the data structure
   - Example usage

5. Add error handling for:
   - Network failures
   - Missing data fields
   - Invalid responses

Requirements:
- All code must be original (no copy-paste from examples)
- Must work when run immediately
- Dashboard must render without internet after initial scrape
- Code must be well-commented"
```

### How to Run Tests

**Basic test run**:
```bash
# Test with specific profile
npm run dev -- run --profile ZAI-GLM-4.7 --prompt "<benchmark prompt>"

# Test with default profile
npm run dev -- run --prompt "<benchmark prompt>"

# Test in background and monitor logs
npm run dev -- run --profile <PROFILE> --prompt "<prompt>" &
tail -f ff-terminal-workspace/logs/sessions/*.jsonl | grep -E "iteration|error|validation"
```

**Kill stuck tests**:
```bash
# Find and kill running test
pkill -f "tsx src/bin/ff-terminal.ts.*run"

# Or use Ctrl+C if running in foreground
```

### Analyzing Test Results

After a test completes (or is killed), analyze the session log to identify issues:

**Find the newest session log**:
```bash
ls -lt ff-terminal-workspace/logs/sessions/*.jsonl | head -1
```

**Extract key metrics**:
```bash
SESSION_LOG="ff-terminal-workspace/logs/sessions/<session-id>.jsonl"

# Count iterations
grep '"iteration":' $SESSION_LOG | tail -1

# Count tool calls
grep '"event":"tool_call"' $SESSION_LOG | wc -l

# Find validation errors
grep '"tool_validation_failed"' $SESSION_LOG

# Find HTML encoding issues (should be 0)
grep '&gt;\|&lt;\|&amp;' $SESSION_LOG

# Check circuit breaker triggers
grep '"circuit_breaker"' $SESSION_LOG

# Get duration
grep '"task_completed"' $SESSION_LOG
```

**Verify deliverables**:
```bash
# Check which files were created
ls -lh ff-terminal-workspace/*.py ff-terminal-workspace/*.html ff-terminal-workspace/*.json ff-terminal-workspace/*.md

# Verify Python syntax
python3 -m py_compile ff-terminal-workspace/*.py

# Verify HTML has proper structure
grep -E '<html|<head|<body|</html>' ff-terminal-workspace/dashboard.html

# Check JSON validity
python3 -c "import json; json.load(open('ff-terminal-workspace/hn_data.json'))"
```

### Key Metrics for Success

A **successful run** should have:
- ✅ **Iterations**: 20-40 (lower is better, <20 is excellent)
- ✅ **Duration**: 3-8 minutes for this benchmark
- ✅ **Tool validation errors**: <5% of tool calls
- ✅ **HTML encoding issues**: 0 (after HTML unescaping fix)
- ✅ **Circuit breaker triggers**: 0
- ✅ **Deliverables**: All 4 files created and valid
- ✅ **File completeness**: No truncated files (check line counts match expectations)

A **problematic run** shows:
- ❌ **Iterations**: >50 (infinite loops, stuck on errors)
- ❌ **Duration**: >10 minutes or killed before completion
- ❌ **Tool validation errors**: >10% of tool calls
- ❌ **HTML encoding issues**: Any occurrences of `&gt;`, `&lt;`, `&amp;` in code
- ❌ **Circuit breaker triggers**: >0 (tool failing repeatedly)
- ❌ **Deliverables**: Missing files or incomplete files
- ❌ **File truncation**: Files ending mid-generation (dashboard.html stopping at line 144, etc.)

### Common Issues and Root Causes

#### Issue 1: Files Truncated Mid-Generation
**Symptom**: Files end abruptly (e.g., Python file stops at line 144, HTML file is only JavaScript without HTML wrapper)

**Root Cause**: `max_tokens` setting too low for the model

**Check**:
```bash
grep '"content":' $SESSION_LOG | tail -20  # See if content stops mid-thought
wc -l ff-terminal-workspace/*.py  # Should be ~150-200 lines, not 144
```

**Fix**: Increase `max_tokens` in `packet/default_config.json`:
```json
{
  "max_tokens": 16384  // Increased from 12000
}
```

#### Issue 2: HTML Encoding Breaking Code
**Symptom**: Python type hints like `def foo() -> str:` become `def foo() -&gt; str:`, causing SyntaxError

**Root Cause**: Some providers (Z.ai, certain OpenRouter models) HTML-encode special characters in tool arguments

**Check**:
```bash
grep '&gt;\|&lt;\|&amp;' $SESSION_LOG
grep 'SyntaxError.*&gt;' $SESSION_LOG
```

**Fix**: HTML unescaping is implemented in `src/runtime/providers/zai.ts` and `src/runtime/providers/openaiCompat.ts`. Verify it's working:
```bash
# Should show 0 matches after fix
grep '&gt;\|&lt;\|&amp;' $SESSION_LOG
```

#### Issue 3: Agent Stuck in Infinite Loops
**Symptom**: Same error repeated across 20+ iterations, agent keeps retrying the same failing approach

**Root Causes**:
1. **Circuit breaker not triggering**: Tool technically "succeeds" (ok: true) but produces bad output
2. **Completion validation blocking**: Hook incorrectly detecting unfulfilled promises in completion summaries
3. **Model quality**: Low-quality model making same mistake repeatedly

**Check**:
```bash
# Find repeated errors
grep '"error"' $SESSION_LOG | sort | uniq -c | sort -rn

# Check if circuit breaker is being evaluated
grep 'circuit_breaker' $SESSION_LOG

# Check if completion validation is blocking
grep 'completion_validation' $SESSION_LOG
```

**Fix**:
- **Disable todo hook temporarily** (if blocking on false positives):
  ```typescript
  // src/runtime/agentLoop.ts:450
  hookRegistry.register(
    createTodoStopHook({
      enabled: false,  // Disable for testing
      workspaceDir
    })
  );
  ```
- **Improve validation**: Add post-write verification hooks
- **Switch providers**: Try different model if quality is consistently poor

#### Issue 4: Validation Errors Too High
**Symptom**: >10% of tool calls fail validation (missing arguments, wrong types)

**Root Cause**: Model doesn't support OpenAI's `strict: true` structured outputs mode

**Check**:
```bash
# Count validation failures
grep '"tool_validation_failed"' $SESSION_LOG | wc -l

# Count total tool calls
grep '"tool_call"' $SESSION_LOG | wc -l

# Calculate failure rate
echo "scale=2; $(grep '"tool_validation_failed"' $SESSION_LOG | wc -l) * 100 / $(grep '"tool_call"' $SESSION_LOG | wc -l)" | bc
```

**Fix**: Use provider that supports structured outputs (OpenRouter with most models, Anthropic direct)

#### Issue 5: Context Window Truncation
**Symptom**: Agent "forgets" what it did in earlier iterations, re-reads files, recreates files that already exist

**Root Cause**: `context_window` setting too low, conversation history being truncated

**Check**:
```bash
# Look for repeated actions
grep '"tool_name":"read_file"' $SESSION_LOG | grep 'scraper.py' | wc -l  # Should be 1-2, not 5+
```

**Fix**: Increase `context_window` in `packet/default_config.json`:
```json
{
  "context_window": 200000  // Supports all frontier models (128K-200K)
}
```

### Comparing Providers

To benchmark different providers, run the same prompt with different profiles:

```bash
# Test Z.ai GLM-4.7
npm run dev -- run --profile ZAI-GLM-4.7 --prompt "<benchmark>" > /tmp/zai-test.log 2>&1

# Test OpenRouter DeepSeek V3
npm run dev -- run --profile deepseek-v3.2 --prompt "<benchmark>" > /tmp/deepseek-test.log 2>&1

# Test Anthropic Claude
npm run dev -- run --profile claude-sonnet --prompt "<benchmark>" > /tmp/claude-test.log 2>&1

# Compare results
ls -lt ff-terminal-workspace/logs/sessions/*.jsonl | head -3 | while read -r line; do
  session=$(echo $line | awk '{print $NF}')
  echo "=== $session ==="
  echo "Iterations: $(grep '"iteration":' $session | tail -1 | grep -oP '"iteration":\K\d+')"
  echo "Duration: $(grep '"task_completed"' $session | grep -oP '"duration":\K[\d.]+' || echo 'N/A')"
  echo "Tool calls: $(grep '"tool_call"' $session | wc -l)"
  echo "Validation errors: $(grep '"tool_validation_failed"' $session | wc -l)"
  echo ""
done
```

### Expected Performance by Provider

Based on testing, here are typical performance characteristics:

**Claude Sonnet 4.5** (Best):
- Iterations: 15-25
- Duration: 3-5 minutes
- Validation errors: 0-2 (0-1%)
- HTML encoding issues: 0
- File truncation: Never
- Quality: Excellent, complete deliverables

**GPT-4o / GPT-4 Turbo** (Excellent):
- Iterations: 18-30
- Duration: 4-6 minutes
- Validation errors: 1-3 (2-5%)
- HTML encoding issues: 0
- File truncation: Rare
- Quality: Very good, minor issues

**DeepSeek V3** (Good):
- Iterations: 25-35
- Duration: 5-7 minutes
- Validation errors: 3-8 (5-10%)
- HTML encoding issues: 0
- File truncation: Occasional
- Quality: Good, may need retry

**GLM-4.7 via Z.ai** (Requires Fixes):
- Iterations: 20-40 (after fixes), 50+ (before fixes)
- Duration: 5-8 minutes
- Validation errors: 5-10 (7-11%)
- HTML encoding issues: Fixed (was: many)
- File truncation: Fixed (was: frequent)
- Quality: Decent after configuration tuning

### Build and Rebuild After Changes

**Always rebuild after modifying TypeScript files**:
```bash
npm run build
```

This is critical for changes to:
- Provider implementations (`src/runtime/providers/`)
- Tool implementations (`src/runtime/tools/implementations/`)
- Agent loop logic (`src/runtime/agentLoop.ts`)
- Configuration loading (`src/runtime/config/`)

### Quick Test Workflow

**Standard workflow for testing a fix**:
```bash
# 1. Make code changes
vim src/runtime/providers/zai.ts

# 2. Rebuild
npm run build

# 3. Run benchmark
npm run dev -- run --profile ZAI-GLM-4.7 --prompt "<benchmark>"

# 4. Monitor in another terminal
tail -f ff-terminal-workspace/logs/sessions/*.jsonl | grep -E "iteration|validation_failed|circuit"

# 5. After completion, analyze
SESSION=$(ls -t ff-terminal-workspace/logs/sessions/*.jsonl | head -1)
echo "Iterations: $(grep '"iteration":' $SESSION | tail -1)"
echo "Errors: $(grep 'validation_failed' $SESSION | wc -l)"

# 6. Verify deliverables
ls -lh ff-terminal-workspace/*.py ff-terminal-workspace/*.html
python3 -m py_compile ff-terminal-workspace/*.py
grep -E '<html|</html>' ff-terminal-workspace/dashboard.html
```

### What This Benchmark Tests

The HN scraper benchmark is comprehensive because it tests:

1. **API Integration**: HTTP requests to external API (Hacker News)
2. **Data Processing**: JSON parsing, transformation, aggregation
3. **File I/O**: Writing 4 different file types (Python, HTML, JSON, Markdown)
4. **Code Generation**: Complete working programs in multiple languages
5. **Frontend Development**: HTML + CSS + JavaScript with no libraries
6. **Visualization**: Creating charts with vanilla JS (bar chart, pie chart)
7. **Error Handling**: Network failures, missing data, invalid responses
8. **Documentation**: Comprehensive README with examples
9. **Multi-file Coordination**: Files that reference each other (HTML loads JSON)
10. **Complexity**: Large files (dashboard.html ~500-700 lines total)

A model that can successfully complete this benchmark demonstrates:
- ✅ Strong tool calling reliability
- ✅ Multi-turn planning and execution
- ✅ Error recovery and retry logic
- ✅ Complete output generation (no truncation)
- ✅ Proper syntax across multiple languages
- ✅ Understanding of web standards (HTML structure)
- ✅ Ability to create working, runnable code

## Quick Troubleshooting

### Build Issues
- **TypeScript errors**: Run `npm run build` to catch compilation errors
- **Module resolution**: Check `tsconfig.json` for moduleResolution: "NodeNext"
- **JSX in .ts files**: Ensure files using JSX have proper import statements

### Daemon/UI Issues
- **WebSocket connection fails**: Verify daemon is running on port 28888
- **Port already in use**: Kill existing process: `lsof -ti:28888 | xargs kill`
- **Local mode port conflicts**: Each local workspace uses unique port; check `.daemon-port`
- **Web UI connection fails**: Verify web server is running on port 8787: `npm run dev:web`
- **Tool not found**: Check tool is registered in `registerDefaultTools()` in src/runtime/registerDefaultTools.ts
- **Profile issues**: Validate profile exists: `npm run dev -- profile list`

### Web UI Development
- **Client changes**: Web client uses Vite for development - changes auto-reload
- **Client build**: Client files are in `src/web/client/` with separate `package.json`
- **Styling**: Uses Tailwind CSS with dark theme (`bg-neutral-950`, `text-neutral-100`)
- **State management**: React useState/useEffect hooks - no external state library
- **Console events**: Check browser console for WebSocket connection issues

### Common Environment Setup
- Set `FF_WORKSPACE_DIR` to use custom workspace location
- Set `FF_DEBUG=true` for verbose logging output
- Set `FF_LOG_HOOKS_JSONL=true` to enable tool call logging for debugging
- Set `FF_DAEMON_LOG=1` to see daemon stdout/stderr
- Set `FF_ALLOW_MACOS_CONTROL=1` to enable macOS automation tools
- Set `FF_ALLOW_BROWSER_USE=1` to enable browser automation (experimental)
