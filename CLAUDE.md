# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Common Tasks
- **Start development**: `pnpm dev` or `npm run dev` - Runs the CLI directly with tsx
- **Build for production**: `pnpm build` or `npm run build` - Compiles TypeScript to dist/ (includes web frontend)
- **Run daemon**: `pnpm dev:daemon` or `npm run dev:daemon` - Starts the WebSocket agent runtime on port 28888
- **Run CLI**: `pnpm dev:cli` or `npm run dev:cli` - Starts the Ink (React) terminal UI
- **Start both daemon + UI**: `pnpm dev:start` or `npm run dev:start` - Launches daemon and UI together (primary development workflow)
- **Local workspace mode**: `pnpm dev -- local` or `ff-terminal local` - Launches ff-terminal with workspace in current directory (creates `ff-terminal-workspace/` locally)
- **Run headless**: `pnpm dev:run` or `npm run dev:run` - Single-turn headless execution with a test prompt
- **Manage profiles**: `pnpm dev -- profile setup|list|default|delete` - Profile and provider configuration
- **Launch wizard**: `pnpm dev -- start` or `npm run dev -- start` - Interactive profile/model selector
- **Display modes**: Add `--display-mode verbose` for detailed output or `--display-mode clean` for minimal UI
- **ACP server**: `pnpm dev -- acp` or `npm run dev -- acp` - Starts Anthropic Computer Protocol server
- **Tool permissions**: Add `--allow-macos-control` or `--allow-browser-use` flags to enable restricted automation tools

**Note for development**: This is a private package, so use `pnpm run` or `npm run` commands to execute commands. The `ff-terminal` command is only available after `pnpm build` and global installation.

### Testing & Debugging
- **Run tests**: `pnpm test` or `npm test`
- **Run tests with UI**: `pnpm test:ui` or `npm run test:ui`
- **Test coverage**: `pnpm test:coverage` or `npm run test:coverage`
- **Run a single turn**: `pnpm dev -- run --prompt "your prompt here"` or `npm run dev -- run --prompt "your prompt here"`
- **Start scheduler**: `pnpm dev:daemon` then check `~/.config/ff-terminal/` for scheduled tasks
- **Web server** (alternative UI): `pnpm dev:web` or `npm run dev:web` on port 8787
- **Agent testing**: `cd agent-testing-suite && ff-test run <suite>` - End-to-end agent evaluation (see Agent Testing Suite section)

### Build Verification
After making changes, always run:
```bash
npm run build
```
This catches TypeScript errors before deployment and builds the web frontend.

### CLI Installation (for local development)
After building, install the CLI globally:
```bash
./scripts/install-cli.sh
```
This installs `ff-terminal` to `~/.local/bin`. Ensure it's on your PATH:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

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
- Serves React frontend built with Vite (located in `src/web/client/`)
- Similar WebSocket API to daemon
- Health endpoint for orchestration
- Supports color theming system with customizable UI colors

**Web Frontend Development**:
The web UI is a separate Vite + React project. To develop it:
```bash
cd src/web/client
npm install
npm run dev  # Starts Vite dev server on port 5173
```

**Common Issue**: If web UI shows blank page, rebuild the frontend:
```bash
npm run build:web
# Or manually: cd src/web/client && npm install && npm run build
```

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

### ACP (Anthropic Computer Protocol) Server
The project includes an ACP server for integration with Anthropic's computer control protocol:
```bash
# Start ACP server with specific profile
npm run dev -- acp --profile my-profile
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
7. **Agent behavior testing**: Use Agent Testing Suite for end-to-end evaluation with metrics and reports (see Agent Testing Suite section)

## Performance Considerations

- **Parallel tool execution**: All tools from single LLM response run concurrently
- **Streaming protocol**: Uses delta encoding to minimize bandwidth
- **Session caching**: Conversation history loaded once at start
- **Tool schema caching**: Schemas loaded once from port packet
- **Workspace size**: Session history grows with conversation length
- **Parallel agent testing**: Agent Testing Suite supports concurrent scenario execution with worker pools for faster evaluation

## Unit & Integration Tests

*For end-to-end agent evaluation and benchmarking, see the Agent Testing Suite section below.*

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

### Current Test Coverage
The project has **124 passing tests** across 5 test files:

1. **File & Bash Tools** (`tests/fileAndBashTools.test.ts` - 47 tests)
   - Tests: `read_file`, `write_file`, `edit_file`, `multi_edit_file`, `glob`, `grep`, `run_command`
   - Patterns: Setup/teardown, positive and negative cases, integration tests

2. **Logging System** (`tests/logging/structuredLogger.test.ts` - 24 tests)
   - Tests: Structured logging, secret redaction, log level filtering, JSONL serialization
   - Focus: Security (automatic credential redaction), observability

3. **Profile/Provider System** (`tests/profile-system.test.ts` - 13 tests)
   - Tests: Profile loading, provider selection, credential retrieval
   - Focus: Configuration management, environment variable handling

4. **Execution Plans** (`src/runtime/planning/planStore.test.ts` - 29 tests)
   - Tests: Plan persistence, step tracking, completion detection
   - Focus: State management, immutability, circuit breaker logic

5. **Plan Validation Hook** (`src/runtime/hooks/builtin/planValidationStopHook.test.ts` - 11 tests)
   - Tests: Agent stop validation, circuit breaker, error handling
   - Focus: Business logic for agent execution control

### Critical Testing Gaps
Approximately 90 runtime modules remain untested:
- Agent execution loop and multi-turn iteration
- LLM provider implementations (OpenAI, Anthropic, etc.)
- Most tool implementations (web tools, media generation, etc.)
- CLI UI components and daemon initialization
- Session persistence and conversation management
- Web server routes and WebSocket handling

## Agent Testing Suite

### Overview

The Agent Testing Suite is a standalone end-to-end testing framework for AI agent evaluation, located in the `agent-testing-suite/` subdirectory. This is a world-class testing system (57 files, 9,165 lines) designed to comprehensively evaluate agent behavior, performance, and reliability.

**Purpose:**
- **Long-horizon task evaluation** - Test complex multi-step agent workflows that span multiple turns
- **A/B testing** - Compare different models, prompts, system configurations, and provider settings
- **Comprehensive benchmarking** - Measure performance with research-backed metrics
- **Visual reporting** - Generate detailed HTML/PDF reports with charts, graphs, and knowledge visualizations
- **Trend analysis** - Track agent performance over time with regression detection

**Research Foundation:**
Integrates patterns and methodologies from leading AI research:
- **Anthropic Bloom** - Dynamic scenario generation, LLM-as-judge, contamination detection
- **Sierra Tau-Bench** - Multi-turn realistic testing, reliability metrics
- **LangChain** - Parallel test execution, reproducible environments
- **Galileo AI** - Cost efficiency metrics, Pareto analysis
- **Elastic** - System-level evaluation, observability patterns
- **Sentient SPIN-Bench** - Long-horizon planning, multi-agent coordination
- **Berkeley/Princeton** - Out-of-distribution detection, edge case performance

### Quick Start

```bash
# Navigate to testing suite
cd agent-testing-suite

# Install dependencies
npm install

# Build the suite
npm run build

# Initialize test workspace (creates directory structure)
ff-test init

# Run a built-in test suite
ff-test run example-coding-tasks

# List all test runs
ff-test list

# Generate detailed report
ff-test report <run-id>

# Compare two runs (A/B testing)
ff-test compare <run1> <run2>

# Run tests in parallel (4 workers)
ff-test run example-coding-tasks --parallel 4
```

### Test Suite Format

Test suites are defined in YAML format:

```yaml
name: my-test-suite
description: Tests agent behavior on specific tasks
category: long-horizon  # Categories: long-horizon, tool-usage, reasoning, safety
version: 1.0.0

scenarios:
  - name: file-manipulation-task
    description: Test agent's ability to create and modify files
    prompts:
      - "Create a file called test.txt with 'Hello World'"
      - "Now add a second line saying 'Testing 123'"

    evaluation:
      rubric: basic-completion  # Rubrics: basic-completion, efficiency, code-quality, long-horizon, safety

      assertions:
        # Check output contains expected text
        - type: output
          condition: contains
          expected: "Created test.txt"

        # Check file was created
        - type: filesystem
          condition: file_exists
          expected: "test.txt"

        # Check file contents
        - type: filesystem
          condition: file_contains
          expected: "Hello World\nTesting 123"

        # Ensure task completed in reasonable time
        - type: duration
          condition: less_than
          expected: 300  # seconds

      human_review: false

    timeout_minutes: 10
    expected_duration_minutes: 2
```

**Assertion Types:**
- `output` - Match content in agent's response (contains, equals, regex)
- `filesystem` - File system checks (file_exists, file_contains, directory_exists)
- `tool_pattern` - Validate tool usage patterns (tool_called, tool_count, tool_sequence)
- `duration` - Time-based validation (less_than, greater_than)
- `exit_code` - Process exit status validation

### Architecture

```
agent-testing-suite/
├── src/
│   ├── bin/
│   │   └── ff-test.ts              # CLI entry point
│   ├── api/
│   │   └── server.ts               # REST API (port 8787)
│   ├── testing/
│   │   ├── e2eRunner.ts           # Core end-to-end test execution
│   │   ├── scenarios/
│   │   │   └── generator.ts       # Dynamic scenario generation (Bloom pipeline)
│   │   ├── execution/
│   │   │   ├── parallelRunner.ts  # Worker pool manager for parallel execution
│   │   │   └── parallelWorker.ts  # Worker thread implementation
│   │   ├── evaluation/
│   │   │   ├── evaluators/        # Automated assertion evaluators
│   │   │   │   ├── outputMatcher.ts
│   │   │   │   ├── fileSystemChecker.ts
│   │   │   │   ├── durationChecker.ts
│   │   │   │   └── toolPatternValidator.ts
│   │   │   ├── rubrics/           # Multi-dimensional scoring rubrics
│   │   │   │   ├── basic-completion.yaml
│   │   │   │   ├── efficiency.yaml
│   │   │   │   ├── code-quality.yaml
│   │   │   │   ├── long-horizon.yaml
│   │   │   │   └── safety.yaml
│   │   │   └── plugins/          # Custom evaluator plugins
│   │   │       ├── llmJudge.ts    # LLM-as-judge evaluator
│   │   │       └── ruleEngine.ts  # Rule-based evaluator
│   │   ├── metrics/
│   │   │   ├── logParser.ts       # JSONL log parsing
│   │   │   ├── metricsCalculator.ts  # Compute task/tool/system metrics
│   │   │   ├── comparator.ts      # A/B comparison with statistics
│   │   │   ├── trendAnalyzer.ts   # Long-term trend tracking
│   │   │   └── advancedMetrics.ts # Cost, Pareto, OOD, reliability
│   │   ├── reports/
│   │   │   ├── htmlReportGenerator.ts  # Interactive HTML reports
│   │   │   ├── mermaidGenerator.ts     # Diagram generation
│   │   │   ├── pdfReportGenerator.ts   # PDF export
│   │   │   └── csvExporter.ts          # CSV export
│   │   ├── suites/
│   │   │   ├── library/           # Built-in test suites
│   │   │   │   ├── example-coding-tasks.yaml
│   │   │   │   ├── example-file-operations.yaml
│   │   │   │   └── example-web-search.yaml
│   │   │   └── testSuite.schema.json
│   │   └── types.ts              # Shared TypeScript types
│   └── testing-ui/                # React + Vite web interface
│       └── src/
│           ├── api.ts             # API client
│           ├── components/
│           │   ├── KnowledgeGraph.tsx  # D3.js force-directed graphs
│           │   └── TrendCharts.tsx     # Trend visualization
│           └── pages/
│               ├── Dashboard.tsx
│               ├── TestList.tsx
│               ├── TestRunDetail.tsx
│               ├── Review.tsx        # Human review workflow
│               └── Trends.tsx       # Trend analysis dashboard
```

### Metrics & Evaluation

**Task-Level Metrics:**
- **Success Rate** - Percentage of scenarios that passed all assertions
- **Completion Rate** - Percentage of scenarios that finished (didn't timeout or error)
- **Average Duration** - Mean time per scenario completion
- **Total Duration** - Overall test suite runtime

**Tool-Level Metrics:**
- **Call Count** - Number of times each tool was invoked
- **Success Rate** - Percentage of successful tool executions
- **Average Duration** - Mean execution time per tool
- **Error Types** - Categorized failure reasons (timeout, permission, validation)

**System-Level Metrics:**
- **Circuit Breaker Trips** - Safety trigger activations
- **Plan Validation Events** - Execution plan extraction and validation
- **Hook Execution** - Pre/post tool hook invocations

**Cost Metrics** (Advanced):
- **Token Usage** - Input/output token counts
- **Cost per Task** - Estimated API costs
- **Cost Efficiency** - Cost per successful completion

**Reliability Metrics** (Advanced):
- **MTBF** (Mean Time Between Failures) - Average time between errors
- **Timeout Rate** - Percentage of scenarios exceeding time limits
- **Stability Score** - Consistency across multiple runs

**Safety Metrics** (Advanced):
- **Refusal Rate** - Percentage of tasks appropriately declined
- **Jailbreak Attempts** - Detected safety bypass attempts
- **Hallucination Detection** - False information generation

### Evaluation Rubrics

**1. basic-completion** (Pass/Fail)
- Binary pass/fail based on assertions
- Fast evaluation, minimal overhead

**2. efficiency** (1-5 Scale)
- Tool usage optimization
- Time efficiency
- Resource utilization
- Overall efficiency score

**3. code-quality** (4 Dimensions)
- Correctness - Functional requirements met
- Readability - Code clarity and style
- Safety - Error handling and validation
- Efficiency - Performance optimization

**4. long-horizon** (4 Dimensions)
- Planning - Step decomposition quality
- Execution - Implementation correctness
- Recovery - Error handling and retry logic
- Completion - Task finish rate

**5. safety** (Multiple Criteria)
- Guardrail adherence
- Harmful content prevention
- Privacy protection
- Ethical behavior

### Advanced Features

**Parallel Execution:**
```bash
# Run 4 scenarios concurrently
ff-test run my-suite --parallel 4

# Specify custom timeout
ff-test run my-suite --parallel 8 --timeout 30
```

**Dynamic Scenario Generation:**
```typescript
import { ScenarioGenerator } from "./src/testing/scenarios/generator";

const generator = new ScenarioGenerator({
  templatesDir: "./templates",
  variationCount: 10,
  difficultyLevels: ["easy", "medium", "hard"]
});

const scenarios = await generator.generate();
await generator.saveToFile(scenarios, "./generated-suite.yaml");
```

**Trend Analysis:**
```typescript
import { TrendAnalyzer } from "./src/testing/metrics/trendAnalyzer";

const analyzer = new TrendAnalyzer(workspaceDir);
await analyzer.initialize();

// Detect regressions
const regression = await analyzer.detectRegression("success_rate");
if (regression.detected) {
  console.log(`Regression detected: ${regression.severity}`);
}

// Get alerts
const alerts = await analyzer.loadAlerts();
```

**LLM-as-Judge Evaluation:**
```yaml
assertions:
  - type: llm_judge
    judge_prompt: "Does the response demonstrate clear reasoning?"
    grading_rubric: "Score 1-5 based on logical coherence"
    passing_score: 4
```

**Knowledge Graph Visualization:**
- D3.js force-directed graph showing tool relationships
- Color-coded by success rate (green = high, red = low)
- Interactive: zoom, pan, drag nodes
- Shows tool usage patterns and dependencies

**Pareto Analysis:**
- Accuracy vs cost frontier visualization
- Identifies optimal configurations
- Helps balance performance and efficiency

**Out-of-Distribution (OOD) Detection:**
- Measures distribution drift from training data
- Identifies edge cases and unusual scenarios
- Tests generalization capability

### Web UI

The testing suite includes a professional React + Vite web interface:

```bash
# Start web UI (from agent-testing-suite directory)
cd src/testing-ui
npm install
npm run dev

# Visit http://localhost:3000
```

**Features:**
- **Dashboard** - Overview with success rates, run history, quick stats
- **Test Runs** - List all runs with filtering and search
- **Run Details** - Detailed metrics, scenario results, tool usage breakdowns
- **Trends** - Long-term performance visualization with regression alerts
- **Review** - Human review queue with annotation tools
- **Knowledge Graph** - Interactive D3.js visualization of tool relationships

### Integration with ff-terminal

The Agent Testing Suite integrates seamlessly with the main ff-terminal codebase:

**Workspace Integration:**
- Uses same workspace structure: `ff-terminal-workspace/tests/`
- Reads JSONL logs from ff-terminal sessions for analysis
- Shares profile and credential configuration

**Test Execution:**
- Spawns real ff-terminal agent sessions
- Tests actual agent behavior end-to-end
- Supports all configured profiles and providers

**Log Analysis:**
- Parses structured JSONL logs from `ff-terminal-workspace/logs/`
- Extracts tool calls, turn completions, errors
- Correlates events across multi-turn sessions

**Metrics Alignment:**
- Uses same tool names and schemas
- Tracks same success/failure patterns
- Compatible with hook system metrics

### Report Generation

**HTML Reports:**
```bash
ff-test report <run-id>
# Generates: ff-terminal-workspace/tests/reports/<run-id>/report.html
```

Contains:
- Executive summary with key metrics
- Detailed scenario results with status badges
- Tool usage breakdown with statistics
- Mermaid diagrams (flowcharts, sequence diagrams, knowledge graphs)
- Recommendations for improvement

**PDF Export:**
```bash
ff-test report <run-id> --format pdf
```

Professional PDF with:
- Executive summary
- Metrics tables
- Scenario details
- Pagination and headers

**CSV Export:**
```bash
ff-test report <run-id> --format csv
```

Export formats:
- Full report (all data)
- Metrics only
- Criteria scores only

### CLI Reference

**Initialization:**
```bash
ff-test init                    # Initialize test workspace
```

**Running Tests:**
```bash
ff-test run <suite>             # Run specific suite
ff-test run-all                 # Run all suites
ff-test run <suite> --parallel 4    # Parallel execution
ff-test run <suite> --dry-run  # Simulate without executing
```

**Results:**
```bash
ff-test list                    # List all runs
ff-test report <run-id>         # Generate report
ff-test compare <run1> <run2>   # A/B comparison
```

**Web UI:**
```bash
ff-test serve                   # Start web UI on port 3000
ff-test serve --port 8080       # Custom port
```

### Development & Extension

**Adding Custom Evaluators:**

```typescript
// src/testing/evaluation/evaluators/myEvaluator.ts
export const myEvaluator: Evaluator = {
  name: 'my-custom-check',
  evaluate: async (result: ScenarioResult, context: EvalContext) => {
    // Your evaluation logic
    const passed = /* your condition */;

    return {
      passed,
      score: passed ? 1.0 : 0.0,
      criteria_results: [],
      human_review_required: false,
      message: "Evaluation complete"
    };
  }
};
```

**Adding Custom Rubrics:**

```yaml
# src/testing/evaluation/rubrics/my-rubric.yaml
id: my-custom-rubric
name: My Custom Evaluation
scoring: scale1-5
criteria:
  - dimension: correctness
    weight: 0.5
    description: Output matches expected
  - dimension: efficiency
    weight: 0.3
    description: Minimal tool usage
  - dimension: safety
    weight: 0.2
    description: No unsafe operations
```

### Performance Optimization

**Parallel Execution:**
- Worker pool with configurable concurrency
- Isolated test environments (worker threads)
- Load balancing across workers
- Result aggregation with statistical analysis

**Caching:**
- Test suite schema validation cached
- Rubric loading cached
- Provider initialization reused

**Resource Management:**
- Timeout enforcement per scenario
- Memory limits per worker
- Cleanup after each scenario

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
- Set `FF_ALLOW_MACOS_CONTROL=1` to enable macOS automation tools
- Set `FF_ALLOW_BROWSER_USE=1` to enable browser-use automation

### Display Modes
The CLI supports different display modes for output verbosity:
- `--display-mode verbose` - Shows detailed tool execution and internal processing
- `--display-mode clean` - Minimal UI with only essential information
- Default mode balances information and readability

Example:
```bash
npm run dev -- start --display-mode clean
```