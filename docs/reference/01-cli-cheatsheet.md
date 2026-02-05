# CLI Cheatsheet

**Quick reference for FF Terminal commands and operations**

---

## Core Commands

### Session Management

```bash
# Start interactive session
ff-terminal start

# Start with web interface
ff-terminal start --web

# Start with FieldView Classic
ff-terminal start --fieldview

# Headless execution
ff-terminal run --prompt "Your prompt here" --headless

# Start daemon only
ff-terminal daemon

# Start web server only
ff-terminal web

# Start FieldView server only
ff-terminal fieldview
```

### Profile Operations

```bash
# Interactive profile setup
ff-terminal profile setup

# List all profiles
ff-terminal profile list

# Set default profile
ff-terminal profile default <profile-name>

# Use specific profile
ff-terminal start <profile-name>

# Show current profile
ff-terminal profile show
```

### Mode Switching

```bash
/mode                    # Show current mode
/mode auto               # Automatic tool execution
/mode confirm            # Confirm before tool execution
/mode read_only          # Read-only mode (no writes)
/mode planning           # Planning mode (no tool execution)
/planning                # Alias for /mode planning
Shift+Tab                # Cycle through modes
```

### Display Commands

```bash
/help                    # Show available commands
/tools                   # List available tools
/agents                  # Show agent configurations
/mounts                  # Show mount status
/theme                   # Display color themes
/colors                  # Alias for /theme
/clear                   # Clear screen
```

### Wizards

```bash
/wizard                  # Open wizard menu
/wizard models           # Models configuration wizard
/wizard mounts           # Mount configuration wizard
/wizard init-project     # Project initialization wizard
/wizard project          # Alias for init-project
/models                  # Open models wizard directly
```

### Project Initialization

```bash
/init                    # Initialize workspace summary
/init-project            # Open project picker
/init-project <path>     # Load project from path
/init-project ~/path     # Load with tilde expansion
```

### Session Management

```bash
/quit                    # Exit FF Terminal
/exit                    # Alias for /quit
```

### Special Commands

```bash
//text                   # Send literal text (bypasses command parsing)
t                        # Show thinking (when available)
Tab                      # Toggle mode (context-dependent)
```

---

## Keyboard Shortcuts

### General Navigation

| Key | Action |
|-----|--------|
| `Esc` | Exit wizard, cancel editing, return to chat |
| `↑` | Move up (wizard menu, list selection) |
| `↓` | Move down (wizard menu, list selection) |
| `Enter` | Select, submit, save, confirm |
| `Shift+Tab` | Cycle operation modes |
| `Tab` | Context-dependent toggle |
| `Backspace` | Delete character |
| `Delete` | Delete character |
| `Space` | Toggle checkbox (mounts wizard) |

### Mode Keyboard Shortcuts

| Mode | Keys |
|------|------|
| `auto` | Default, no special keys |
| `confirm` | Not implemented in daemon yet |
| `read_only` | No write operations allowed |
| `planning` | No tool execution |

### Wizard Keybindings

**Models Wizard**
- `Esc` - Exit / cancel edit
- `↑/↓` - Navigate model list
- `Enter` - Edit selected model
- `q` - Quit to chat (NOT when editing)

**Mounts Wizard**
- `Esc` - Exit to chat
- `↑/↓` - Navigate mount list
- `Space/Enter` - Toggle mount
- `q` - Quit to chat

**Init Project Wizard**
- `Esc` - Exit to chat
- `↑/↓` - Navigate project list
- `Enter` - Load selected project
- Type to filter projects

---

## Environment Variables

### Core Configuration

```bash
# Workspace and Ports
export FF_WORKSPACE_DIR="/custom/path/workspace"
export FF_TERMINAL_PORT=28888
export FF_WEB_PORT=8787
export FF_FIELDVIEW_PORT=8788

# Profile
export FF_PROFILE="production"
```

### Model Overrides

```bash
# Purpose-specific models
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
export FF_SUBAGENT_MODEL="openai/gpt-4o-mini"
export FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"
export FF_WEB_MODEL="anthropic/claude-3-haiku-20240307"
export FF_IMAGE_MODEL="openai/dall-e-3"
export FF_VIDEO_MODEL="openai/gpt-4-vision-preview"
```

### Feature Flags

```bash
# Enable restricted tools
export FF_ALLOW_BROWSER_USE=1
export FF_ALLOW_MACOS_CONTROL=1

# Text-to-Speech
export FF_TTS_ENABLED=1
export FF_TTS_VOICE="am_adam"
```

### Debugging

```bash
# Verbose logging
export FF_DEBUG=true
export FF_DAEMON_LOG=1
export FF_LOG_HOOKS_JSONL=true

# Limits
export FF_READ_FILE_MAX_BYTES=1048576  # 1MB default
export FF_MAX_PARALLEL_CALLS=10
```

---

## File Operations

### Quick Commands

```bash
# Read files (via tools)
Read file: path/to/file.txt
Read file: path/to/directory/

# Write files (via tools)
Write file: path/to/file.txt
Content: Your file content here

# Edit files (via tools)
Edit file: path/to/file.txt
Find: old text
Replace: new text
```

### Search Operations

```bash
# Grep search
Grep: "pattern" path/to/search

# Search code
Search code: "function_name"

# Glob patterns
Glob: "**/*.ts"
```

---

## Autonomy Loop

```bash
# Interactive autonomy setup
ff-terminal autonomy --wizard

# Run from prompt file
ff-terminal autonomy --prompt-file tasks.txt --max-loops 10

# Oracle configuration
ff-terminal autonomy --prompt-file task.txt --oracle critical --stall-limit 5

# Auto-start autonomy from prompt
ff-terminal run --prompt "Research topic" --autonomy-auto --headless
```

### Oracle Modes

- `off` - No Oracle intervention
- `critical` - Ask Oracle on critical failures
- `on_complete` - Ask Oracle on task completion
- `on_stall` - Ask Oracle when stalled
- `on_high_risk` - Ask Oracle on high-risk operations
- `always` - Ask Oracle for every decision

---

## Task Scheduling

```bash
# List scheduled tasks
ff-terminal schedule list

# Check task status
ff-terminal schedule status <task-name>

# Execute scheduled task
ff-terminal run --scheduled-task <task-name> --headless
```

---

## WhatsApp Integration

```bash
# Link WhatsApp device
ff-terminal whatsapp login

# Check status
ff-terminal whatsapp status

# Approve pairing
ff-terminal whatsapp approve <device-id>

# Logout
ff-terminal whatsapp logout
```

---

## Development Commands

```bash
# Development mode
npm run dev              # Run CLI with tsx
npm run dev:daemon       # Start daemon
npm run dev:cli          # Start UI
npm run dev:start        # Start daemon + UI
npm run dev:web          # Start web server
npm run dev:fieldview    # Start FieldView

# Build
npm run build            # Full build (TS + web)
npm run build:web        # Build web frontend only
npm run build:fieldview  # Build FieldView only

# Testing
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report

# Production
npm start:daemon         # Production daemon
npm start:cli            # Production CLI
npm start:web            # Production web server
```

---

## Quick Troubleshooting

### Port Conflicts

```bash
# Kill process on port
lsof -ti:28888 | xargs kill

# Use custom port
FF_TERMINAL_PORT=28889 ff-terminal start
```

### Daemon Issues

```bash
# Check daemon status
curl http://localhost:28888/status

# Restart daemon
kill -SIGTERM <daemon-pid>
ff-terminal daemon
```

### Web UI Issues

```bash
# Verify frontend built
ls -la src/web/client/dist/index.html

# Rebuild web frontend
npm run build:web
```

### Profile Reset

```bash
# Reset profiles
rm ~/.ff-terminal-profiles.json
ff-terminal profile setup
```

---

## Common Workflows

### Quick Code Review

```bash
# Start in planning mode
ff-terminal start
/mode planning

# Init project
/init-project ./my-project

# Ask for review
"Review the authentication system for security issues"
```

### Autonomous Research

```bash
# Create prompt file
cat > research.txt <<'EOF'
Research renewable energy trends in 2025
Focus on solar and wind
Compile findings into report
EOF

# Run autonomy
ff-terminal autonomy --prompt-file research.txt --max-loops 15 --oracle on_complete
```

### Web Interface Session

```bash
# Start with web
ff-terminal start --web

# Access web UI
open http://localhost:8787

# Use web UI for file uploads, artifact previews, session management
```

---

## Tips & Tricks

1. **Use planning mode** for complex tasks - allows you to review the plan before execution
2. **Custom commands** - Create markdown files in `ff-terminal-workspace/commands/` for reusable workflows
3. **Custom agents** - Create JSON configs in `ff-terminal-workspace/agents/` for specialized roles
4. **Session continuity** - Use session IDs to continue conversations across restarts
5. **Multi-modal** - Start with `--web` or `--fieldview` for richer UI experience
6. **Autonomy** - Use autonomy loop for long-running tasks with automatic Oracle escalation
7. **Profiles** - Create separate profiles for different use cases (development, testing, production)
8. **TTS** - Enable TTS with `--tts --voice am_adam` for audio output
9. **Local workspace** - Use `ff-terminal local` for isolated workspace with unique port
10. **Scheduled tasks** - Set up RRULE-based recurring tasks for automated workflows

---

## Version Info

```bash
# Show version
ff-terminal --version

# Show help
ff-terminal --help

# Show subcommand help
ff-terminal run --help
ff-terminal autonomy --help
ff-terminal schedule --help
```

---

**Last Updated:** February 2, 2026
