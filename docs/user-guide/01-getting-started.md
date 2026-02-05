# Getting Started with FF Terminal

**Installation, configuration, and first launch guide**

---

## Overview

FF Terminal is a production-grade AI agent runtime with multiple interface modes (terminal, web, and FieldView Classic). It features a unique dual-process architecture that separates the AI daemon from the user interface, ensuring reliability and enabling advanced capabilities.

---

## Prerequisites

Before installing FF Terminal, ensure you have:

- **Node.js** 20.0.0 or higher
- **npm** or **yarn** package manager
- **Git** for cloning the repository
- **Python 3** (required for certain skills and tools)

### Verify Node.js Installation

```bash
node --version  # Should be 20.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
cd ff-terminal-ts
```

### Install Dependencies

```bash
npm install
```

This installs all required dependencies including:
- Ink 6.x for terminal UI
- React 19 for user interfaces
- WebSocket libraries for daemon communication
- AI provider SDKs

### Build the Project

```bash
npm run build
```

This command:
- Compiles TypeScript to JavaScript
- Builds the web frontend (Original Client)
- Builds the FieldView Classic frontend
- Creates production-ready artifacts in `dist/`

**Build verification:**

```bash
ls -la dist/
# Should show compiled JS files
ls -la src/web/client/dist/
# Should show built web UI
ls -la src/web/fieldview/dist/
# Should show built FieldView UI
```

### Install CLI Launcher

The CLI launcher makes `ff-terminal` available system-wide:

```bash
./scripts/install-cli.sh
```

This installs the `ff-terminal` executable to `~/.local/bin/`.

### Add to PATH

Add the launcher to your shell profile:

**For bash:**
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**For zsh:**
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

### Verify Installation

```bash
ff-terminal --help
```

You should see the CLI help menu with all available commands.

---

## Profile Setup

FF Terminal uses profiles to manage AI provider configurations and credentials. Profiles allow you to switch between different providers and models easily.

### Interactive Profile Setup

```bash
ff-terminal profile setup
```

This launches an interactive wizard that guides you through:
1. Choosing an AI provider (OpenRouter, Anthropic, Z.ai, MiniMax, LM Studio, etc.)
2. Entering API credentials
3. Selecting default models for different purposes
4. Saving the profile configuration

### List All Profiles

```bash
ff-terminal profile list
```

### Set Default Profile

```bash
ff-terminal profile default my-profile
```

### Profile Configuration

Profiles support per-purpose model configuration:

| Purpose | Description |
|---------|-------------|
| `main` | Primary conversation model |
| `subagent` | Model for subagent execution |
| `tool` | Model for tool calling |
| `web` | Model for web interface interactions |
| `image` | Model for image generation |
| `video` | Model for video generation |

**Example profile configuration (`~/.ff-terminal-profiles.json`):**

```json
{
  "profiles": [
    {
      "name": "production",
      "provider": "openrouter",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "subagentModel": "openai/gpt-4o-mini",
      "toolModel": "anthropic/claude-3-haiku-20240307",
      "webModel": "anthropic/claude-3-5-sonnet-20241022",
      "imageModel": "openai/dall-e-3",
      "videoModel": "stability-ai/stable-video-diffusion"
    }
  ]
}
```

---

## First Launch

### Start Interactive Mode

Launch FF Terminal with the default interface:

```bash
ff-terminal start
```

This starts:
- The AI daemon (WebSocket server on port 28888)
- The terminal UI (Ink-based React interface)
- Loads your default profile
- Creates or uses an existing session

### Start with Web Interface

Launch FF Terminal with the web client:

```bash
ff-terminal start --web
```

The web interface is available at: **http://localhost:8787**

### Start with FieldView Classic

Launch FF Terminal with the FieldView Classic terminal UI:

```bash
ff-terminal start --fieldview
```

FieldView Classic is available at: **http://localhost:8788**

### Enable Text-to-Speech

Launch with TTS enabled:

```bash
ff-terminal start --tts --voice am_adam
```

**Available TTS voices:**
- `am_adam` - Male voice (English)
- `am_michael` - Male voice (English)
- `am_richard` - Male voice (English)
- `fm_sara` - Female voice (English)
- Plus others depending on your system

### Specify Profile

Launch with a specific profile:

```bash
ff-terminal start --profile production
```

---

## Basic Usage

### Internal Commands

FF Terminal provides built-in commands for managing the session:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/mode` | Switch between modes (auto/confirm/read_only/planning) |
| `/tools` | List available tools |
| `/agents` | List available agents |
| `/theme` | Change color theme |
| `/clear` | Clear the screen |
| `/quit` | Exit the application |

### Mode Switching

FF Terminal supports four execution modes:

| Mode | Description |
|------|-------------|
| `auto` | Automatically approve all tool calls (fastest) |
| `confirm` | Prompt before each tool call (balanced) |
| `read_only` | No tool execution, analysis only |
| `planning` | Extract and execute plans step-by-step |

**Switch modes:**
```bash
/mode confirm
```

**Keyboard shortcut:** Press `Tab` to cycle through modes.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Cycle through execution modes |
| `t` | Toggle thinking display (when available) |
| `Ctrl+C` | Cancel current operation |
| `Ctrl+L` | Clear screen (same as `/clear`) |
| `/help` | Show all commands and shortcuts |

### Custom Slash Commands

FF Terminal supports custom commands defined in Markdown files:

**Example:** `/review authentication`

Commands can include:
- Variable substitution (`$1`, `$2`, `$ARGUMENTS`)
- Tool restrictions
- Model selection
- Custom prompts

See [Custom Commands](06-custom-commands.md) for details.

---

## Environment Variables

FF Terminal can be configured via environment variables. These override defaults and profile settings.

### Core Variables

```bash
# Workspace directory
export FF_WORKSPACE_DIR="/custom/path/workspace"

# Daemon port (default: 28888)
export FF_TERMINAL_PORT=28888

# Web UI port (default: 8787)
export FF_WEB_PORT=8787

# FieldView port (default: 8788)
export FF_FIELDVIEW_PORT=8788
```

### Model Overrides

```bash
# Override main model
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"

# Override subagent model
export FF_SUBAGENT_MODEL="openai/gpt-4o-mini"

# Override tool calling model
export FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"
```

### Feature Flags

```bash
# Enable browser automation
export FF_ALLOW_BROWSER_USE=1

# Enable macOS automation
export FF_ALLOW_MACOS_CONTROL=1

# Enable text-to-speech
export FF_TTS_ENABLED=1

# Set default TTS voice
export FF_TTS_VOICE=am_adam
```

### Debugging

```bash
# Enable verbose logging
export FF_DEBUG=true

# Enable daemon stdout/stderr logging
export FF_DAEMON_LOG=1

# Enable JSONL tool call logging
export FF_LOG_HOOKS_JSONL=true

# Set maximum file read size (default: 1MB)
export FF_READ_FILE_MAX_BYTES=1048576

# Set maximum parallel tool calls (default: 10)
export FF_MAX_PARALLEL_CALLS=5
```

### Set Environment Variables Permanently

Add to your shell profile (`~/.bashrc` or `~/.zprofile`):

```bash
# FF Terminal Configuration
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
export FF_WORKSPACE_DIR="$HOME/ff-terminal-workspace"
export FF_TTS_ENABLED=1
```

---

## Workspace Structure

FF Terminal creates a workspace directory for storing:

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

**Default location:** `~/ff-terminal-workspace`

**Override workspace location:**
```bash
export FF_WORKSPACE_DIR="/custom/path"
```

---

## Quick Examples

### Interactive Chat

```bash
ff-terminal start
```

Then type:
```
Hello! Can you help me with my project?
```

### Headless Execution

Execute a single prompt without launching the UI:

```bash
ff-terminal run --prompt "Summarize this repository" --headless
```

### Use Specific Profile

```bash
ff-terminal run --prompt "Analyze performance" --profile production --headless
```

### Reuse Session

Continue a previous session:

```bash
ff-terminal run --prompt "Continue analysis" --session my-session-id --headless
```

### Web Interface

```bash
# Start web server
ff-terminal web

# Open browser to http://localhost:8787
```

### FieldView Classic

```bash
# Start FieldView
ff-terminal fieldview

# Open browser to http://localhost:8788
```

---

## Troubleshooting

### Port Already in Use

If port 28888 is already in use:

```bash
# Find process using the port
lsof -i:28888

# Kill the process
kill -9 <PID>

# Or use a different port
FF_TERMINAL_PORT=28889 ff-terminal start
```

### Build Failures

```bash
# Clean and rebuild
rm -rf dist node_modules/.cache
npm install
npm run build
```

### Web UI Blank Page

```bash
# Check if frontend is built
ls -la src/web/client/dist/

# Rebuild web frontend
npm run build:web
```

### Profile Issues

```bash
# Reset profiles
rm ~/.ff-terminal-profiles.json
ff-terminal profile setup
```

### Permission Errors

```bash
# Make CLI launcher executable
chmod +x ~/.local/bin/ff-terminal
```

---

## Next Steps

Now that FF Terminal is installed and running:

1. **[Terminal Interface Guide](02-terminal-interface.md)** - Learn about the Ink-based terminal UI
2. **[Web Interface Guide](03-web-interface.md)** - Explore the web client features
3. **[FieldView Interface Guide](04-fieldview-interface.md)** - Discover the classic terminal UI
4. **[Personas & Agents](05-personas-agents.md)** - Set up specialized agents
5. **[Custom Commands](06-custom-commands.md)** - Create your own slash commands

---

## Additional Resources

- **Main README:** `/Users/scrimwiggins/ff-terminal-ts/README.md`
- **CLI Commands:** `/Users/scrimwiggins/ff-terminal-ts/CLI_COMMAND_REVIEW.md`
- **Testing:** `/Users/scrimwiggins/ff-terminal-ts/MANUAL_TESTING_CHECKLIST.md`
- **Architecture:** See `/Users/scrimwiggins/ff-terminal-ts/docs/architecture/`

---

## Support

- **Documentation:** Check `/docs` and `CLAUDE.md` for detailed guides
- **Issues:** Report bugs via GitHub Issues
- **Discussions:** GitHub Discussions for questions

---

**Built with technical precision and agentic intelligence**
