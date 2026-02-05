# Environment Setup

**Complete guide to setting up your development environment for FF Terminal.**

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 20.0.0 | Latest LTS (20.x or 22.x) |
| npm | 9.0.0 | Latest version |
| Memory | 4 GB RAM | 8 GB RAM |
| Disk Space | 2 GB free | 5 GB free |
| OS | macOS, Linux, Windows | macOS (best tool support) |

### Optional Dependencies

| Tool | Purpose | When Needed |
|------|---------|-------------|
| Python 3 | Tool execution, some skills | Running Python-based tools |
| FFmpeg | Video processing | Remotion skills |
| Git | Version control | All development |
| Docker | Containerization | Production deployment |

---

## Installation

### Clone Repository

```bash
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
cd ff-terminal-ts
```

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install web client dependencies
cd src/web/client && npm install && cd ../..

# Install FieldView dependencies
cd src/web/fieldview && npm install && cd ../..
```

### Verify Installation

```bash
# Check Node version
node --version  # Should be >= 20

# Check npm version
npm --version

# Verify dependencies installed
ls node_modules  # Should show packages
```

---

## Build System

### Build Commands

```bash
# Full build (TypeScript + web frontends)
npm run build

# Build TypeScript only
tsc -p tsconfig.json

# Build web client
npm run build:web

# Build FieldView
npm run build:fieldview

# Clean build
rm -rf dist src/web/client/dist src/web/fieldview/dist
npm run build
```

### Build Output Structure

```
dist/
├── bin/                  # Compiled CLI entry points
├── cli/                  # Compiled terminal UI
├── daemon/               # Compiled WebSocket daemon
├── runtime/              # Compiled runtime core
├── web/                  # Compiled web server
├── whatsapp/             # Compiled WhatsApp integration
└── runtime/tools/implementations/macos_control/kb/  # Copied macOS keyboard layouts
```

---

## IDE Setup

### VSCode Configuration

**Recommended Extensions**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "bierner.markdown-mermaid"
  ]
}
```

**Workspace Settings** (`.vscode/settings.json`)

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

### JetBrains IDEs (WebStorm, IntelliJ)

**TypeScript Configuration**
1. Open `Settings > Languages & Frameworks > TypeScript`
2. Set "TypeScript Service" to "Use"
3. Set "TypeScript language version" to "Use workspace version"

**Node.js Configuration**
1. Open `Settings > Languages & Frameworks > Node.js`
2. Set "Node interpreter" to your Node 20+ installation
3. Enable "Coding assistance for Node.js"

---

## Development Scripts

### Core Development Scripts

```bash
# Run CLI directly (transpiled on-the-fly with tsx)
npm run dev

# Start daemon in development mode
npm run dev:daemon

# Start terminal UI in development mode
npm run dev:cli

# Start daemon + UI together
npm run dev:start

# Start web server in development
npm run dev:web

# Start FieldView in development
npm run dev:fieldview

# Quick test with single prompt
npm run dev:run
```

### Production Scripts

```bash
# Start compiled daemon
npm start:daemon

# Start compiled CLI
npm start:cli

# Start compiled web server
npm start:web
```

### Testing Scripts

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --run readFile.test.ts
```

---

## Environment Variables

### Core Configuration

```bash
# Workspace Location
export FF_WORKSPACE_DIR="/path/to/custom/workspace"

# Daemon Port (default: 28888)
export FF_TERMINAL_PORT=28888

# Web Client Port (default: 8787)
export FF_WEB_PORT=8787

# FieldView Port (default: 8788)
export FF_FIELDVIEW_PORT=8788
```

### Model Configuration

```bash
# Main conversation model
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"

# Subagent execution model
export FF_SUBAGENT_MODEL="openai/gpt-4o-mini"

# Tool calling model
export FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"

# Web interface model
export FF_WEB_MODEL="anthropic/claude-3-5-sonnet-20241022"

# Image generation model
export FF_IMAGE_MODEL="dall-e-3"

# Video generation model
export FF_VIDEO_MODEL="video-model-name"
```

### Feature Flags

```bash
# Enable browser automation
export FF_ALLOW_BROWSER_USE=1

# Enable macOS automation
export FF_ALLOW_MACOS_CONTROL=1

# Enable text-to-speech
export FF_TTS_ENABLED=1

# TTS voice selection
export FF_TTS_VOICE="am_adam"
```

### Debug Configuration

```bash
# Enable verbose logging
export FF_DEBUG=true

# Enable daemon stdout/stderr
export FF_DAEMON_LOG=1

# Enable JSONL tool call logging
export FF_LOG_HOOKS_JSONL=true

# File size limit for reads (default: 1MB)
export FF_READ_FILE_MAX_BYTES=1048576

# Parallel tool call limit (default: 10)
export FF_MAX_PARALLEL_CALLS=10
```

### Provider-Specific Variables

```bash
# OpenRouter
export OPENROUTER_API_KEY="sk-or-..."

# Z.ai
export ZAI_API_KEY="..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# MiniMax
export MINIMAX_API_KEY="..."

# LM Studio (local)
export LM_STUDIO_URL="http://localhost:1234/v1/chat/completions"
```

---

## Profile Setup

### Initialize Profiles

```bash
# Interactive profile setup
./dist/bin/ff-terminal.js profile setup

# Or via npm script
npm run dev:cli -- profile setup
```

### Profile File Location

**macOS**: `~/Library/Application Support/ff-terminal/profiles.json`
**Linux**: `~/.config/ff-terminal/profiles.json`
**Windows**: `%APPDATA%/ff-terminal/profiles.json`

### Example Profile

```json
{
  "profiles": [
    {
      "name": "development",
      "provider": "openrouter",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "subagentModel": "openai/gpt-4o-mini",
      "toolModel": "anthropic/claude-3-haiku-20240307",
      "webModel": "anthropic/claude-3-5-sonnet-20241022",
      "imageModel": "dall-e-3",
      "videoModel": "video-model",
      "apiBase": "https://openrouter.ai/api/v1/chat/completions",
      "apiKey": "$OPENROUTER_API_KEY"
    }
  ],
  "defaultProfile": "development"
}
```

### Credential Storage

FF Terminal uses OS-native credential managers:

```bash
# List all tool credentials
ff-terminal profile tool-keys

# Set tool credential
ff-terminal profile set-tool-key openai api_key sk-...

# Remove tool credential
ff-terminal profile remove-tool-key openai api_key
```

---

## Workspace Initialization

### Create Workspace Directory

```bash
# Use default location
mkdir -p ~/ff-terminal-workspace

# Use custom location via environment variable
export FF_WORKSPACE_DIR="/custom/path/workspace"
mkdir -p $FF_WORKSPACE_DIR
```

### Workspace Structure

```bash
ff-terminal-workspace/
├── commands/              # Custom slash commands
├── agents/                # Agent configurations
├── skills/                # Custom skills
├── memory_core/           # Core memory files
│   └── scheduled_tasks/   # Task definitions
├── projects/              # Project workspaces
├── logs/                  # Session and run logs
│   ├── sessions/
│   ├── runs/
│   └── scheduled_runs/
└── sessions/              # Conversation histories
```

---

## Verification Checklist

### Step 1: Verify Dependencies

```bash
# Node version
node --version  # >= 20.0.0 ✓

# npm version
npm --version   # >= 9.0.0 ✓

# Dependencies installed
ls node_modules | head -20  # Should show packages ✓
```

### Step 2: Verify Build

```bash
# Full build
npm run build  # Should complete without errors ✓

# Check output
ls -la dist/  # Should show compiled files ✓
ls -la src/web/client/dist/  # Should show built web client ✓
ls -la src/web/fieldview/dist/  # Should show built FieldView ✓
```

### Step 3: Verify Tests

```bash
# Run tests
npm test  # All tests should pass ✓
```

### Step 4: Verify Daemon

```bash
# Start daemon
npm run dev:daemon

# In another terminal, test connection
curl http://localhost:28888/status  # Should respond ✓

# Or use nc for WebSocket check
nc -z localhost 28888  # Should succeed ✓
```

### Step 5: Verify CLI

```bash
# Start CLI
npm run dev:cli

# Test basic interaction
# Type: Hello
# Should see response ✓

# Test command
# Type: /help
# Should show help ✓
```

### Step 6: Verify Web Server

```bash
# Start web server
npm run dev:web

# Open browser
# http://localhost:8787  # Should load web UI ✓
```

### Step 7: Verify Profile

```bash
# List profiles
ff-terminal profile list  # Should show profiles ✓

# Verify default
ff-terminal profile list  # Should indicate default ✓
```

---

## Common Issues

### Issue: Module Not Found

**Symptom**: `Error: Cannot find module 'xyz'`

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port Already in Use

**Symptom**: `Error: EADDRINUSE: address already in use :::28888`

**Solution**:
```bash
# Find process on port
lsof -ti:28888

# Kill process
kill -9 $(lsof -ti:28888)

# Or use different port
export FF_TERMINAL_PORT=28889
```

### Issue: TypeScript Compilation Errors

**Symptom**: Build fails with TS errors

**Solution**:
```bash
# Check TypeScript version
npm list typescript

# Reinstall dependencies
rm -rf node_modules/.cache
npm install

# Full rebuild
rm -rf dist
npm run build
```

### Issue: Web Client Build Fails

**Symptom**: `npm run build:web` fails

**Solution**:
```bash
# Check web client dependencies
cd src/web/client
npm install
npm run build
cd ../..

# Check Node version
node --version  # Must be >= 20
```

### Issue: Daemon Won't Start

**Symptom**: Daemon exits immediately

**Solution**:
```bash
# Enable debug logging
export FF_DEBUG=true
export FF_DAEMON_LOG=1

# Start daemon with logging
npm run dev:daemon 2>&1 | tee daemon.log

# Check log file for errors
cat daemon.log
```

---

## Next Steps

After completing environment setup:

1. Read [Development Workflow](02-development-workflow.md) for development practices
2. Read [Testing Guide](03-testing-guide.md) for testing procedures
3. Explore the codebase starting with `src/daemon/daemon.ts`
4. Create your first test in `src/runtime/tools/`

---

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Vitest Documentation](https://vitest.dev/)
- [Project README](../../README.md)

---

**Last Updated**: 2026-02-02
