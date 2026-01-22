# FF Terminal

<div align="center">

```
███████╗ █████╗ ██████╗ ███╗   ███╗    ██████╗ ███████╗ ██████╗████████╗███████╗██████╗ ███╗   ███╗
██╔════╝██╔══██╗██╔══██╗████╗ ████║    ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
█████╗  ███████║██████╔╝██╔████╔██║    ██║  ██║█████╗  ██║        ██║   █████╗  ██████╔╝██╔████╔██║
██╔══╝  ██╔══██║██╔══██╗██║╚██╔╝██║    ██║  ██║██╔══╝  ██║        ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
██║     ██║  ██║██║  ██║██║ ╚═╝ ██║    ██████╔╝███████╗╚██████╗   ██║   ███████╗██║  ██║██║ ╚═╝ ██║
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝    ╚═════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
```

**Multi-Modal AI Agent Runtime with Specialized Skill Ecosystem**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Ink](https://img.shields.io/badge/Ink-FF6B6B?style=flat&logo=react&logoColor=white)](https://github.com/vadimdemedes/ink)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## Overview

FF Terminal is a production-grade AI agent runtime featuring a unique dual-process architecture that separates the AI daemon from the user interface, ensuring reliability and enabling advanced capabilities like autonomous operation, task scheduling, and multi-modal interaction across terminal and web interfaces.

### Core Architecture

- **Dual-Process Model**: Independent AI daemon (WebSocket server) + UI client for crash resilience
- **Multi-Modal UI**: Three interface modes - Ink Terminal, Web Client, FieldView Classic
- **WebSocket Streaming**: Real-time bidirectional communication with delta encoding
- **AsyncLocalStorage Context**: Thread-safe tool execution context management
- **Session Management**: JSON-based conversation history with UUID session IDs
- **Workspace Isolation**: Global vs local workspace modes with automatic port allocation

### AI Provider Integration

- **OpenRouter** - OpenAI-compatible API with streaming and structured outputs
- **Z.ai** - High-performance Anthropic Claude with optimizations
- **Anthropic** - Direct Claude API access
- **MiniMax** - Advanced multimodal capabilities
- **LM Studio** - Local model hosting
- **OpenAI-compatible** - Generic API endpoints
- **Factory AI** - Direct integration
- **Per-Purpose Models**: Configure distinct models for main, subagent, tool, web, image, and video tasks

---

## Features

### Interactive Terminal UI

- **Ink-based React Interface**: Beautiful terminal UI built with Ink 6.x and React 19
- **Real-Time Streaming**: Live content, thinking, and tool call display
- **Syntax Highlighting**: Code blocks with language detection
- **Keyboard Shortcuts**: Intuitive navigation and command execution
- **Multi-Session Support**: Switch between conversation sessions

### Specialized Skill Ecosystem

FF Terminal includes 40+ production-ready skills across eight categories:

**Design Skills**
- `canvas-design` - Create visual designs and graphics
- `award_winning_designer` - Transform websites into breathtaking digital experiences
- `theme-factory` - Apply consistent theming across artifacts
- `brand-guidelines` - Apply Anthropic brand colors and typography
- `frontend_design` - Create distinctive, production-grade frontend interfaces
- `responsive_web_design` - Mobile-first responsive design with modern CSS

**Development Skills**
- `component_library` - Create reusable, accessible UI components
- `algorithmic-art` - Generate algorithmic art with p5.js
- `mcp-builder` - Build MCP servers for external API integration
- `macos-spm-app-packaging` - Scaffold and package SwiftPM macOS apps
- `web-artifacts-builder` - Create elaborate multi-component web artifacts

**Testing & Quality**
- `webapp-testing` - Test local web apps with Playwright
- `code_first_responder` - Debug pipeline with failure capture and patch planning
- `cli-production-readiness-reviewer` - Evaluate CLI tools for production deployment

**Research & Intelligence**
- `rapid_research` - Lightweight research with citation tracking
- `satellite-osint` - Satellite imagery analysis for land and buildings
- `hf_evaluation_manager` - Track ML model performance in agricultural contexts

**Media & Content Creation**
- `remotion-expert` - Generate videos using Remotion with React components
- `slack-gif-creator` - Create Slack-optimized animated GIFs
- `openaiImage` - Generate images with DALL-E and other models

**Automation & Deployment**
- `dreamhost-manager` - Deploy React apps and static sites via SFTP/SSH
- `discord-server` - Complete Discord bot integration
- `telegram-bot-creator` - Create and manage Telegram bots
- `applescript_automation` - Enterprise macOS automation

**Specialized Domains**
- `shopify_ops` - Complete Shopify store management
- `hf_dataset_creator` - Create and publish datasets on Hugging Face Hub
- `model_trainer` - Fine-tune language models with TRL
- `hugging_face_paper_publisher` - Publish research papers to Hugging Face Hub

**Internal Tools**
- `skill-creator` - Guide for creating new skills
- `internal-comms` - Write internal communications and status reports
- `run-other-cli-agents` - Orchestrate external CLI-based agents

### Advanced Capabilities

**Personas & Agents**
- Specialized agent configurations with tool restrictions
- Custom system prompts for distinct roles (code reviewer, QA specialist, technical writer)
- Subagent launching with controlled tool access

**Commands System**
- Custom slash commands with markdown templates
- Variable substitution ($1, $2, $ARGUMENTS)
- Nested command namespaces (/git:commit, /git:status)

**Planning & Execution**
- Automatic plan extraction from natural language
- Step-by-step execution with validation
- Progress tracking and completion detection

**Autonomy Loop**
- Long-running autonomous agents with Oracle escalation
- Configurable stall detection and intervention
- Session strategies for conversation management

**Task Scheduling**
- RRULE-based recurring tasks (RFC 5545)
- OS-level integration with launchd/systemd
- Headless execution with structured logging

**Hooks System**
- Plan validation with retry logic
- Todo management enforcement
- Skill restriction validation
- Custom hook support without core modifications

---

## Installation

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** or **yarn**
- **Git**
- **Python 3** (for certain skills and tools)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
cd ff-terminal-ts

# Install dependencies
npm install

# Build the project (includes web frontend)
npm run build

# Install CLI launcher
./scripts/install-cli.sh

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

# Verify installation
ff-terminal --help
```

### Build Requirements

The build process automatically compiles TypeScript and builds both web frontends. If you encounter issues:

```bash
# Rebuild web frontend only
npm run build:web

# Rebuild FieldView frontend only
npm run build:fieldview

# Full clean rebuild
rm -rf dist src/web/client/dist src/web/fieldview/dist
npm run build
```

---

## Getting Started

### Profile Setup

FF Terminal uses profiles to manage AI provider configurations and credentials:

```bash
# Interactive profile setup
ff-terminal profile setup

# List all profiles
ff-terminal profile list

# Set default profile
ff-terminal profile default my-profile

# Launch with specific profile
ff-terminal start my-profile
```

Profiles support per-purpose model configuration:
- `main` - Primary conversation model
- `subagent` - Subagent execution model
- `tool` - Tool call model
- `web` - Web interface model
- `image` - Image generation model
- `video` - Video generation model

### First Launch

```bash
# Start interactive mode with daemon and UI
ff-terminal start

# Start with web interface
ff-terminal start --web

# Start with FieldView Classic UI
ff-terminal start --fieldview

# Enable text-to-speech
ff-terminal start --tts --voice am_adam
```

### Environment Variables

```bash
# Override default models
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
export FF_SUBAGENT_MODEL="openai/gpt-4o-mini"
export FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"

# Enable restricted tools
export FF_ALLOW_BROWSER_USE=1
export FF_ALLOW_MACOS_CONTROL=1

# Customize workspace
export FF_WORKSPACE_DIR="/custom/path/workspace"

# Debug logging
export FF_DEBUG=true
export FF_DAEMON_LOG=1
export FF_LOG_HOOKS_JSONL=true
```

---

## Usage Examples

### Interactive Mode

```bash
# Launch interactive session
ff-terminal start

# Internal commands
/help                    # Show available commands
/mode                    # Switch between auto/confirm/read_only/planning
/tools                   # List available tools
/agents                  # List available agents
/theme                   # Change color theme
/clear                   # Clear screen
/quit                    # Exit application

# Custom slash commands
/review                  # Review code changes (requires custom command)
/deploy                  # Deploy application (requires custom command)

# Special commands
//                       # Force send as message (bypass command parsing)
Tab                      # Toggle mode
t                        # Show thinking (when available)
```

### Headless Execution

```bash
# Single prompt execution
ff-terminal run --prompt "Summarize this repository" --headless

# Use specific profile
ff-terminal run --prompt "Analyze performance" --profile production --headless

# Reuse session
ff-terminal run --prompt "Continue analysis" --session my-session-id --headless

# Auto-start autonomy if requested
ff-terminal run --prompt "Research topic" --autonomy-auto --headless
```

### Scheduled Tasks

```bash
# List scheduled tasks
ff-terminal schedule list

# Check task status
ff-terminal schedule status daily-report

# Execute scheduled task
ff-terminal run --scheduled-task daily-report --headless
```

### Autonomy Loop

```bash
# Interactive autonomy setup
ff-terminal autonomy --wizard

# Run from prompt file
ff-terminal autonomy --prompt-file research-prompts.txt --max-loops 10

# Configure Oracle mode
ff-terminal autonomy --prompt-file task.txt --oracle critical --stall-limit 5

# Oracle modes: off, critical, on_complete, on_stall, on_high_risk, always
```

### Web Servers

```bash
# Start standalone web server
ff-terminal web

# Start FieldView Classic
ff-terminal fieldview

# Custom ports
FF_WEB_PORT=8888 ff-terminal web
FF_FIELDVIEW_PORT=8889 ff-terminal fieldview
```

### WhatsApp Integration

```bash
# Link WhatsApp device
ff-terminal whatsapp login

# Check status
ff-terminal whatsapp status

# Approve pairing
ff-terminal whatsapp approve ABC123
```

---

## Architecture

### Dual-Process Architecture

FF Terminal employs a unique dual-process design that separates the AI runtime from the user interface:

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Ink Terminal  │ ◄─────────────► │  AI Daemon      │
│   (React UI)    │   port 28888    │  (Node.js)      │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   ▼
         ▼                           ┌─────────────────┐
┌─────────────────┐                 │  Tool Registry  │
│  Web Client     │                 │  (35+ Tools)    │
│  (React/Vite)   │                 └─────────────────┘
└─────────────────┘                          │
         │                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│ FieldView       │                 │  AI Providers   │
│ (Terminal UI)   │                 │  • OpenRouter   │
└─────────────────┘                 │  • Z.ai         │
                                    │  • Anthropic    │
                                    │  • MiniMax      │
                                    │  • LM Studio    │
                                    └─────────────────┘
```

### Key Components

**Terminal UI (`src/cli/`)**
- Ink-based React interface with real-time streaming
- WebSocket client with automatic reconnection
- Multi-mode support: chat, commands, agents, skills
- Syntax highlighting and thinking display
- TTS integration with audio playback queue

**AI Daemon (`src/daemon/`)**
- WebSocket server on port 28888
- Message types: hello, start_turn, cancel_turn, list_tools
- Streaming chunks: content, thinking, tool_call, error, status
- Independent process persistence (survives UI crashes)

**Runtime (`src/runtime/`)**
- Agent loop with multi-turn iteration (500 max turns)
- Tool execution with parallel call support
- Provider abstraction layer (6+ providers)
- Profile and credential management
- Session storage and retrieval

**Tool System (`src/runtime/tools/`)**
- 35+ built-in tools across multiple categories
- Skill system for specialized capabilities (40+ skills)
- Commands system for custom slash commands
- Hooks for validation and restriction
- AsyncLocalStorage context propagation

**Web Interface (`src/web/`)**
- Original Client: React + Vite with responsive design
- FieldView Classic: Terminal-aesthetic with artifact preview
- Shared WebSocket protocol with daemon
- File upload and session management
- Smart scroll and mobile drawer support

### Communication Protocol

**WebSocket Messages (Daemon ↔ UI)**

```typescript
// Client → Daemon
{ type: "hello", client: "ink" | "web", version?: string }
{ type: "start_turn", input: string, sessionId?: string }
{ type: "cancel_turn", turnId: string }
{ type: "list_tools" }

// Daemon → Client  
{ type: "hello", daemonVersion: string }
{ type: "turn_started", sessionId: string, turnId: string }
{ type: "chunk", turnId: string, seq: number, chunk: string }
{ type: "turn_finished", turnId: string, ok: boolean, error?: string }
{ type: "tools", tools: string[] }
```

**Chunk Types (Streaming)**
- `content` - Response text content
- `thinking` - Reasoning/thought process
- `thinking_xml` - Structured thinking in XML
- `tool_call` - Tool execution request
- `error` - Error message
- `status` - Status update
- `task_completed` - Task completion signal

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run CLI directly with tsx |
| `npm run dev:daemon` | Start WebSocket agent runtime (port 28888) |
| `npm run dev:cli` | Start Ink terminal UI |
| `npm run dev:start` | Launch daemon + UI together |
| `npm run dev:web` | Start web server (port 8787) |
| `npm run dev:fieldview` | Start FieldView dev server |
| `npm test` | Run Vitest test suite |
| `npm test -- <filename>` | Run specific test file |
| `npm test -- --watch` | Watch mode for development |
| `npm run build` | Compile TypeScript + build web frontends |
| `npm run build:web` | Build Original Client frontend only |
| `npm run build:fieldview` | Build FieldView frontend only |
| `npm start:daemon` | Production daemon |
| `npm start:cli` | Production CLI |
| `npm start:web` | Production web server |

### Development Workflow

```bash
# Terminal 1: Start daemon
npm run dev:daemon

# Terminal 2: Start UI
npm run dev:cli

# Terminal 3: Run tests
npm test -- --watch

# Edit source code - changes reflect immediately
```

### TypeScript Configuration

- Target: ES2022 with NodeNext modules
- Strict mode enabled
- Separate configs for main code and web frontends
- Path mapping for runtime and shared modules

### Web Frontend Development

**Original Client (`src/web/client/`)**
```bash
cd src/web/client
npm install
npm run dev  # Port 5173
```

**FieldView Classic (`src/web/fieldview/`)**
```bash
cd src/web/fieldview  
npm install
npm run dev  # Port 5174
```

### Troubleshooting

**Web UI Blank Page**
```bash
# Check if frontend is built
ls -la src/web/client/dist/

# Rebuild if empty
npm run build:web
```

**Port Conflicts**
```bash
# Kill process on port
lsof -ti:28888 | xargs kill

# Use custom port
FF_TERMINAL_PORT=28889 ff-terminal start
```

**Build Failures**
```bash
# Clear and rebuild
rm -rf dist node_modules/.cache
npm run build
```

---

## Configuration

### Profile System

Profiles manage AI providers, models, and credentials:

**Location**: `~/.ff-terminal-profiles.json`

**Example Profile**
```json
{
  "profiles": [
    {
      "name": "production",
      "provider": "openrouter",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "subagentModel": "openai/gpt-4o-mini",
      "toolModel": "anthropic/claude-3-haiku-20240307"
    }
  ]
}
```

**Credential Storage**
- OS Keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- Plaintext fallback in workspace directory
- Per-profile and global tool credentials

### Workspace Structure

```
ff-terminal-workspace/
├── commands/              # Custom slash commands
│   ├── review.md
│   └── deploy.md
├── agents/                # Agent configurations
│   ├── code-reviewer.json
│   └── qa-specialist.json
├── memory_core/
│   ├── session_summary.md
│   └── scheduled_tasks/
├── projects/
│   └── my-project/
├── logs/
│   ├── sessions/
│   └── runs/
└── sessions/
```

### Configuration Hierarchy

1. **Embedded Defaults** - `packet/default_config.json`
2. **Platform Config** - `~/Library/Application Support/ff-terminal/config.json`
3. **Environment Variables** - `FF_*` prefixed variables
4. **Runtime Overrides** - Command-line flags
5. **Profile Settings** - Provider and model selections

### Key Environment Variables

```bash
# Core
FF_WORKSPACE_DIR         # Custom workspace location
FF_TERMINAL_PORT         # Daemon port (default: 28888)
FF_WEB_PORT              # Web UI port (default: 8787)
FF_FIELDVIEW_PORT        # FieldView port (default: 8788)

# Models
FF_MODEL                 # Override main model
FF_SUBAGENT_MODEL        # Subagent execution model
FF_TOOL_MODEL            # Tool calling model
FF_WEB_MODEL             # Web interface model

# Features
FF_ALLOW_BROWSER_USE     # Enable browser automation
FF_ALLOW_MACOS_CONTROL   # Enable macOS automation
FF_TTS_ENABLED           # Enable text-to-speech
FF_TTS_VOICE             # TTS voice selection

# Debugging
FF_DEBUG                 # Verbose logging
FF_DAEMON_LOG            # Daemon stdout/stderr
FF_LOG_HOOKS_JSONL       # JSONL tool call logging
FF_READ_FILE_MAX_BYTES   # File size limit (default: 1MB)
FF_MAX_PARALLEL_CALLS    # Parallel tool limit (default: 10)
```

---

## Testing

### Agent Testing Suite

World-class testing framework for evaluating AI agent performance:

**Features**
- Long-horizon task evaluation (multi-step workflows)
- A/B testing support (compare models, prompts, configs)
- Comprehensive metrics (success rates, tool usage, tokens, duration)
- React web UI for test management and visualization
- Rich HTML reports with Mermaid diagrams and knowledge graphs

**Quick Start**
```bash
cd agent-testing-suite
npm install && npm run build

# Initialize test workspace
ff-test init

# Run test suite
ff-test run example-coding-tasks

# View results
ff-test report <run-id>

# Start web UI
npm run dev serve
```

**Test Suite Structure**
```yaml
# suites/custom/my-tests.yaml
name: Code Generation Tests
description: Evaluate code generation capabilities

scenarios:
  - name: Generate React component
    prompt: Create a responsive card component
    rubrics:
      - name: code-quality
        weight: 1.0
        criteria: Component compiles and renders
```

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- readFile.test.ts

# Watch mode
npm test -- --watch
```

**Test Coverage**: 124+ tests across 5 test files
- File & Bash Tools (47 tests)
- Logging System (24 tests)
- Profile/Provider System (13 tests)
- Execution Plans (29 tests)
- Plan Validation Hook (11 tests)

### E2E Testing

```bash
# Direct runtime validation
./scripts/e2e_loop.sh "<profile-name>" auto <<'EOT'
Hello
Summarize this repository
EOT
```

### Manual Testing

Comprehensive 67-test checklist available in `MANUAL_TESTING_CHECKLIST.md`:
- Display commands and navigation
- Mode switching and wizards
- Profile and tool management
- Web UI functionality
- Edge cases and error handling

---

## Advanced Usage

### Creating Custom Commands

Commands are Markdown files in `ff-terminal-workspace/commands/`:

```markdown
---
description: "Review code changes and provide feedback"
allowed-tools: ["read_file", "grep", "ast_grep"]
model: "main"
---

Review the code changes and provide:
1. Security analysis
2. Performance considerations
3. Best practice recommendations

Focus area: $1
```

**Usage**: `/review authentication`

### Creating Custom Agents

Agent configurations in `ff-terminal-workspace/agents/`:

```json
{
  "id": "security-auditor",
  "name": "Security Auditor", 
  "description": "Specializes in security vulnerability analysis",
  "systemPromptAddition": "\n\nFocus on security vulnerabilities, OWASP Top 10, and secure coding practices.",
  "allowedTools": ["read_file", "grep", "search_code"],
  "deniedTools": ["write_file", "run_command"],
  "mode": "read_only",
  "maxTurns": 10
}
```

**Usage**: Launch subagent with `agent="security-auditor"`

### Creating Custom Skills

```bash
# Draft new skill via natural language
Use skill_draft tool to create a skill for Kubernetes deployment

# Apply draft to activate
Use skill_apply tool with draft ID

# Skill becomes available via skill_loader
```

### Planning & Execution

```bash
# Enable planning mode
/mode planning

# Agent automatically extracts plan from requests
# Execute step by step with validation
# Track progress and completion
```

---

## Production Deployment

### Global Installation

```bash
# Install CLI to ~/.local/bin
./scripts/install-cli.sh

# Add to shell profile
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Verify
which ff-terminal
```

### Docker Deployment

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 28888 8787
CMD ["npm", "start:daemon"]
```

### Process Management

```bash
# Start daemon in background
nohup ff-terminal daemon &

# Check daemon status
curl http://localhost:28888/status

# Graceful shutdown
kill -SIGTERM <daemon-pid>
```

### Port Configuration

```bash
# Environment-based port configuration
FF_TERMINAL_PORT=28889  # Daemon
FF_WEB_PORT=8888        # Web UI  
FF_FIELDVIEW_PORT=8889  # FieldView

# Port conflict resolution - automatic offset for local mode
ff-terminal local  # Creates isolated workspace with unique port
```

### Log Management

```bash
# Log locations
~/ff-terminal-workspace/logs/sessions/<session-id>.jsonl
~/ff-terminal-workspace/logs/runs/<run-id>.jsonl
~/ff-terminal-workspace/logs/scheduled_runs/

# Structured logging with JSON format
# Rotation and retention handled automatically
```

---

## Troubleshooting

### Common Issues

**Daemon Won't Start**
```bash
# Check port availability
lsof -i:28888

# Kill conflicting process
kill -9 <pid>

# Use different port
FF_TERMINAL_PORT=28889 ff-terminal daemon
```

**Web UI Blank Page**
```bash
# Verify frontend built
ls -la src/web/client/dist/index.html

# Rebuild
npm run build:web

# Check browser console for errors
```

**Tool Not Found**
```bash
# Verify tool registration
ff-terminal start --display-mode verbose

# Check tool schemas
ls packet/tool_schemas.openai.json

# Rebuild after TypeScript changes
npm run build
```

**Profile Issues**
```bash
# Reset profiles
rm ~/.ff-terminal-profiles.json
ff-terminal profile setup

# Check credential storage
ff-terminal profile tool-keys
```

**Skill Loading Problems**
```bash
# Check skill cache
ls ff-terminal-workspace/skills/

# Reload skills
# Use /wizard → Skills → Reload

# Verify skill structure
cat skills/my-skill/SKILL.md
```

### Debug Mode

```bash
# Enable verbose logging
FF_DEBUG=true ff-terminal start

# Daemon logging
FF_DAEMON_LOG=1 ff-terminal daemon

# Tool call logging
FF_LOG_HOOKS_JSONL=true ff-terminal start

# Combined debug
FF_DEBUG=true FF_DAEMON_LOG=1 ff-terminal start
```

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
cd ff-terminal-ts

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test

# Start development environment
npm run dev:start
```

### Project Structure

```
src/
├── bin/                 # CLI entry points
│   └── ff-terminal.ts   # Main CLI router
├── cli/                 # Terminal UI
│   ├── app.tsx          # Ink React interface
│   └── tts/             # Text-to-speech
├── daemon/              # AI daemon
│   ├── daemon.ts        # WebSocket server
│   └── protocol.ts      # Message types
├── runtime/             # Core runtime
│   ├── agentLoop.ts     # Multi-turn agent loop
│   ├── config/          # Configuration management
│   ├── profiles/        # Profile and credential storage
│   ├── tools/           # Tool implementations (35+)
│   ├── planning/        # Plan extraction and execution
│   ├── scheduling/      # RRULE task scheduler
│   ├── autonomy/        # Autonomous agent loop
│   ├── hooks/           # Validation hooks
│   └── session/         # Session management
├── web/                 # Web interfaces
│   ├── server.ts        # WebSocket + HTTP server
│   ├── client/          # Original Client (React/Vite)
│   └── fieldview/       # FieldView Classic (React/Vite)
├── types/               # TypeScript definitions
├── shared/              # Shared utilities
└── acp/                 # Anthropic Claude Protocol
```

### Code Style

- TypeScript with strict mode
- ESLint for code quality
- Prettier for formatting
- Conventional commits for git messages

### Testing Requirements

- Unit tests for new tools and utilities
- Integration tests for workflows
- Manual testing checklist completion
- Agent testing suite validation

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Ink Team** - Terminal UI framework
- **React Team** - UI library and ecosystem
- **Vite Team** - Fast build tool and dev server
- **WebSocket Community** - Real-time communication primitives
- **OpenRouter, Z.ai, Anthropic, MiniMax, LM Studio** - AI provider APIs

---

## Support

- **Documentation**: Check `/docs` and `CLAUDE.md` for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: GitHub Discussions for questions
- **Testing Guide**: See `MANUAL_TESTING_CHECKLIST.md` for testing procedures

---

<div align="center">

**Built with technical precision and agentic intelligence**

[![GitHub stars](https://img.shields.io/github/stars/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts?style=social)](https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts)

</div>
