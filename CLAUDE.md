# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Run CLI directly with tsx
- `npm run build` - Compile TypeScript + build web frontend
- `npm run dev:daemon` - Start WebSocket agent runtime (port 28888)
- `npm run dev:cli` - Start Ink terminal UI
- `npm run dev:start` - Launch daemon + UI together (primary workflow)
- `npm run dev:web` - Start web server (port 8787)
- `npm test` - Run Vitest test suite
- `npm test -- <filename>` - Run specific test file
- `npm test -- --watch` - Watch mode

### CLI Modes
- `npm run dev -- start [profile]` - Interactive mode with daemon + UI
- `npm run dev -- local [profile]` - Local workspace mode (creates `ff-terminal-workspace/` in current dir)
- `npm run dev -- run --prompt "..."` - Single headless execution
- `npm run dev -- profile setup|list|default` - Profile management
- `npm run dev -- acp` - Anthropic Claude Protocol server
- `--display-mode verbose|clean` - Control output verbosity
- `--allow-macos-control` / `--allow-browser-use` - Enable restricted tools

### Testing & Debugging
- `FF_LOG_HOOKS_JSONL=true npm run dev` - Enable JSONL tool call logging
- `FF_DAEMON_LOG=1 npm run dev -- start` - Enable daemon logging
- `FF_DEBUG=true` - Verbose logging
- Session logs: `ff-terminal-workspace/logs/sessions/<session>.jsonl`
- Agent testing suite: `cd agent-testing-suite && ff-test run <suite>`

### Build & Install
Always rebuild after TypeScript changes: `npm run build`

Install CLI globally:
```bash
./scripts/install-cli.sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
```

## Architecture Overview

### Two-Process Model
```
ff-terminal start
  ├─ daemon.ts (WebSocket server, port 28888)
  └─ app.tsx (Ink UI, WebSocket client)
```
Daemon persists independently of UI crashes.

### Entry Point: `src/bin/ff-terminal.ts`
Central router for: `daemon`, `ui`, `start`, `local`, `run`, `profile`, `schedule`, `web`, `acp`

### Core Modules

**CLI (`src/cli/app.tsx`)**
- React/Ink terminal UI
- WebSocket connection to daemon
- Real-time streaming with syntax highlighting
- Modes: auto, confirm, read_only, planning

**Daemon (`src/daemon/daemon.ts`)**
- WebSocket server receiving: `hello`, `start_turn`, `cancel_turn`, `list_tools`
- Streams: `content`, `thinking`, `error`, `status`, `task_completed`

**Runtime (`src/runtime/`)**
- `agentLoop.ts` - Multi-turn iteration (500 max), tool execution, streaming
- `tools/` - 35+ tool implementations, schemas from `packet/tool_schemas.openai.json`
- `providers/` - OpenRouter, Z.ai, MiniMax, LM Studio, Anthropic
- `config/` - Config loading, paths, dotenv, mounts
- `profiles/` - Profile storage in `~/.ff-terminal-profiles.json`
- `session/` - Conversation history as JSON
- `scheduling/` - RRULE task scheduler with OS integration
- `planning/` - Plan extraction, validation, step tracking
- `hooks/` - Validation hooks (plan, todo, skill restrictions)

**Web (`src/web/`)**
- `server.ts` - HTTP+WebSocket server (port 8787)
- `client/` - React+Vite UI with responsive design (mobile: 768px breakpoint)
  - Desktop: side-by-side chat/console
  - Mobile: bottom drawer (45vh) slides over chat
  - Smart scroll, thinking display, file upload
  - Build separately: `cd src/web/client && npm install && npm run build`

### Tool System
**52 native tools** in 14 categories:

**File I/O (7):** read_file, write_file, edit_file, multi_edit_file, glob, grep, notebook_edit
**Code Analysis (3):** semantic_search, search_code, ast_grep
**Execution (2):** run_command, schedule_task
**Web & Search (6):** tavily_search, tavily_extract, tavily_crawl, tavily_map, perplexity_search, browse_web
**Media (5):** generate_image_gemini, analyze_image_gemini, edit_image_gemini, analyze_video_gemini, generate_image_openai
**Session & Memory (7):** session_summary, reset_session, manage_memory, sessions_list, sessions_history, sessions_send, sessions_spawn
**Workflow (3):** macos_control (513 AppleScript/JXA scripts), workflow_automation, completion_validation
**Skills (9):** skill_loader, skill_documentation, skill_draft, skill_apply, skill_import, skill_sequencer, agent_draft, agent_apply, subagent_tool
**Agent Coordination (2):** ask_oracle (DeepSeek V3.2), subagent_tool
**Commands (2):** command_draft, command_apply
**UX/Meta (5):** think, quick_update, TodoWrite, manage_task, list_templates
**Data (1):** analyze_data
**Templates (1):** project_template

**Tool Flow:**
1. Registration in `registerDefaultTools()` with handler
2. Schema from `packet/tool_schemas.openai.json`
3. LLM calls with JSON args
4. Parallel execution via `executeTools.ts`
5. Context via AsyncLocalStorage: `getToolContext()`
6. Optional hook validation

**Key Tools:**
- `browse_web` - Playwright Chromium browser automation (headless/visual)
- `macos_control` - 513 AppleScript/JXA scripts for macOS automation (14 categories)
- `semantic_search` - Embedding-based code search (osgrep)
- `ask_oracle` - Escalate to DeepSeek V3.2 via OpenRouter
- `subagent_tool` - Launch specialized AI sub-agents (full/mini/nano tiers)

**Constraints:**
- `read_file` blocks `.git`, `.ssh`
- File size limit: `FF_READ_FILE_MAX_BYTES` (1MB default)
- Parallel limit: `FF_MAX_PARALLEL_CALLS`

**Skill-based tools:** 37+ available as external skills (Discord, Shopify, DreamHost, etc.)

## Configuration

### Config Hierarchy
1. `packet/default_config.json` (embedded defaults)
2. Platform-specific user config
3. Environment variables (`FF_*`)
4. Runtime overrides

### Profiles
Stored in `~/.ff-terminal-profiles.json`:
- Provider + credentials + model selections
- Per-purpose models: main, subagentModel, toolModel, webModel, imageModel, videoModel
- Credential storage: OS keychain (via `keytar`) or plaintext fallback
- Tool key management: `npm run dev -- profile tool-keys`

### Providers
OpenRouter, Z.ai, MiniMax, LM Studio, Anthropic, OpenAI-compatible, Anthropic-compatible

### Workspace Structure
```
~/.config/ff-terminal/ (Linux)
~/Library/Application Support/ff-terminal/ (macOS)

memory_core/
├── session_summary.md
├── scheduled_tasks/tasks.json
├── plans/<plan-id>.json
└── skills/
projects/<project_name>/
logs/sessions/<session-id>.jsonl
logs/runs/<run-id>.jsonl
sessions/<sessionId>.json
```

**Local Mode:**
- `ff-terminal local` creates `ff-terminal-workspace/` in current directory
- Unique port (28889-38888) based on path hash
- Port stored in `.daemon-port`
- Multiple local workspaces run simultaneously

### Workspace Contract Files
Auto-created in workspace root, injected into agent prompts via `loadWorkspaceContractSnapshot()`:
- **AGENTS.md** - Operating instructions for the runtime
- **BOOTSTRAP.md** - First-run onboarding ritual (auto-cleared after completion)
- **SOUL.md** - Voice, tone, and ethical boundaries
- **TOOLS.md** - Tool policy and access restrictions (parsed for `allowed-tools` list)
- **USER.md** - User profile and preferences
- **IDENTITY.md** - Agent identity and role
- **MEMORY.md** - Long-term facts and decisions
- **PLAN.md** - Auto-updated from runtime plan store
- **TASKS.md** - Auto-updated from todo store
- **LOG.md** - Chronological action log (tailed, latest entries shown)
- **HEARTBEAT.md** - Optional periodic check-in reminders (keep tiny, ~600 chars max)

**Implementation:** `src/runtime/workspace/contract.ts`
- `ensureWorkspaceContractFiles()` - Creates missing files with templates
- `loadWorkspaceContractSnapshot()` - Loads files with character limits (~6000 total)
- `formatWorkspaceContractForPrompt()` - Formats for system prompt injection
- `writePlanSnapshot()` / `writeTasksSnapshot()` - Auto-sync from runtime state
- `appendWorkspaceLog()` - Append to LOG.md with timestamps
- `loadToolManifest()` - Parse allowed-tools from TOOLS.md or tools.json

## Key Patterns

**AsyncLocalStorage for Context:**
```typescript
withToolContext({ sessionId, workspaceDir, repoRoot }, async () => {
  const ctx = getToolContext(); // Available anywhere
})
```

**Generator-Based Streaming:**
```typescript
async function* runAgentTurn(...): AsyncGenerator<StreamChunk>
```

**Hook System:**
- Plan validation: retries if steps incomplete
- Todo validation: ensures task management
- Skill restrictions: enforces allowed tools
- Custom hooks: no core modification needed

**Packet Compatibility:**
System prompts and schemas from `packet/` ensure cross-implementation consistency.

## Important Notes

### Session Management
- Session modes: `main` (persistent), `last` (resume last active), `new` (fresh each turn)
- Defaults: `session_mode: "main"`, `main_session_id: "main"` in `packet/default_config.json`
- Config overrides:
  ```json
  {
    "session_mode": "main",
    "main_session_id": "main",
    "session": {
      "idleMinutes": 0,
      "autoSummarize": false,
      "maxHistoryTokens": 100000
    }
  }
  ```
- CLI overrides: `--session-mode <main|last|new>`, `--session-id <id>`, `--new-session`
- Ink UI helpers: `/session [info|list|mode|reset|model]`, `/compact`, `/status`
- Session tools: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`
- History in `sessions/<sessionId>.json` (with stats + message counts)
- Session transcripts/logs in `logs/sessions/<sessionId>.jsonl`
- Bootstrap ritual file: `BOOTSTRAP.md` (first-run onboarding, auto-cleared by the agent)
- Session scope: `session.scope` (`main`, `per-sender`, `clawdbot`) controls session key mapping
- Per-session overrides stored in `session.meta.overrides` (e.g., `model`)

### Model Selection Priority
1. Runtime override (`FF_MODEL`, etc.)
2. Profile-specific model
3. Config default

### System Messages
- Unified variant (consolidated from A/B/C/D)
- Template: `packet/system_prompt_unified.TEMPLATE.md`

### Extended Thinking
- Enable via `enable_thinking: true`
- Returns `thinking` chunks with XML tags
- Web UI shows clear visual separation

### Headless & Scheduled Tasks
**One-shot execution:**
```bash
npm run dev -- run --prompt "..."
```

**Scheduled tasks** (via `schedule_task` tool):
- **Schedule types:** one_time, daily, weekly, interval, rrule (RFC 5545)
- **Session targeting:** main (shared), isolated (per-task persistent), new (fresh each run)
- **Wake modes:** next-heartbeat (normal polling), now (immediate via signal file)
- **Payload types:** agentTurn (prompt execution), systemEvent (text notification)
- **Per-task overrides:** model, thinking level, timeout_seconds
- **Result delivery:** Webhook POST with best-effort/strict semantics
- **Actions:** add, list, remove, enable, disable, status, run, update, history
- **Run history:** JSONL logs in `logs/scheduled_runs/`
- **Post to main:** Send results to main session with prefix

**Implementation:**
- Task store: `src/runtime/scheduling/taskStore.ts`
- Scheduler loop: `src/runtime/scheduling/scheduler.ts` (60-second heartbeat)
- Tool: `src/runtime/scheduling/scheduleTaskTool.ts`
- Delivery: `src/runtime/scheduling/delivery.ts`
- Execution: `src/bin/ff-terminal.ts` (~lines 706-1000)

## Testing

### Unit Tests (124 tests across 5 files)
- File & Bash Tools (47 tests)
- Logging System (24 tests)
- Profile/Provider (13 tests)
- Execution Plans (29 tests)
- Plan Validation Hook (11 tests)

### Agent Testing Suite
Standalone framework in `agent-testing-suite/`:
- End-to-end evaluation with YAML test suites
- Parallel execution with worker pools
- Multi-dimensional rubrics (basic-completion, efficiency, code-quality, long-horizon, safety)
- HTML/PDF reports with Mermaid diagrams
- Trend analysis and regression detection
- React+Vite web UI

**Quick Start:**
```bash
cd agent-testing-suite
npm install && npm run build
ff-test init
ff-test run example-coding-tasks
ff-test report <run-id>
```

### Standard Benchmark
Hacker News Scraper & Dashboard tests: API integration, file I/O, multi-language code gen, visualization, error handling

**Success Criteria:**
- Iterations: 20-40 (excellent: <20)
- Duration: 3-8 minutes
- Tool validation errors: <5%
- No HTML encoding issues
- No circuit breaker trips
- All deliverables complete

**Common Issues:**
1. File truncation → increase `max_tokens` in `packet/default_config.json`
2. HTML encoding → verify unescaping in provider adapters
3. Infinite loops → check circuit breaker, disable todo hook if needed
4. High validation errors → use provider with structured outputs
5. Context truncation → increase `context_window`

## Troubleshooting

### Build Issues
- TypeScript errors: `npm run build`
- Module resolution: check `tsconfig.json`

### Daemon/UI Issues
- WebSocket fails: verify daemon on port 28888
- Port conflict: `lsof -ti:28888 | xargs kill`
- Local mode: check `.daemon-port` file
- Web UI blank: rebuild frontend with `npm run build:web`
- Tool not found: check `registerDefaultTools()` in `src/runtime/registerDefaultTools.ts`

### Web UI Development
- Vite dev server: `cd src/web/client && npm run dev`
- Tailwind dark theme: `bg-neutral-950`, `text-neutral-100`
- No external state library (React hooks only)

### Environment Variables
- `FF_WORKSPACE_DIR` - Custom workspace location
- `FF_DEBUG=true` - Verbose logging
- `FF_LOG_HOOKS_JSONL=true` - Tool call logging
- `FF_DAEMON_LOG=1` - Daemon stdout/stderr
- `FF_ALLOW_MACOS_CONTROL=1` - macOS automation
- `FF_ALLOW_BROWSER_USE=1` - Browser automation

## Performance Notes

- Parallel tool execution from single LLM response
- Streaming with delta encoding
- Session caching (loaded once)
- Tool schema caching (from packet)
- Plan extraction: disable via `plan_auto_extraction: false`
