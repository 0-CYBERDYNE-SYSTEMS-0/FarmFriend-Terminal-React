# Terminal Interface

**Ink-based React terminal UI with real-time streaming**

---

## Overview

The terminal interface is built with **Ink 6.x** and **React 19**, providing a beautiful, responsive terminal experience with real-time AI streaming, syntax highlighting, and keyboard shortcuts.

---

## Starting the Terminal UI

### Basic Launch

```bash
ff-terminal start
```

This starts:
- The AI daemon (WebSocket server on port 28888)
- The terminal UI (Ink-based React interface)
- Loads your default profile
- Creates or uses an existing session

### Launch with Options

```bash
# Start with specific profile
ff-terminal start --profile production

# Start with TTS enabled
ff-terminal start --tts --voice am_adam

# Start in specific mode
ff-terminal start --mode confirm

# Start with custom workspace
ff-terminal start --workspace /custom/path
```

---

## Interface Layout

The terminal interface consists of:

```
┌─────────────────────────────────────────────────────────┐
│ FF Terminal • Session: abc123 • Mode: Auto              │
├─────────────────────────────────────────────────────────┤
│ User: Hello! Can you help me?                           │
│                                                          │
│ Assistant: Of course! How can I assist you today?       │
│                                                          │
│ [Streaming content appears here...]                      │
├─────────────────────────────────────────────────────────┤
│ > [Your input cursor]                                    │
└─────────────────────────────────────────────────────────┘
```

### Status Bar

The top status bar shows:
- **Session ID**: Unique identifier for the conversation
- **Mode**: Current execution mode (auto/confirm/read_only/planning)
- **Profile**: Active profile name

---

## Message Display

### User Messages

```
User: What files are in the current directory?
```

### Assistant Messages

```
Assistant: Here are the files in your current directory:
├── src/
│   ├── cli/
│   ├── daemon/
│   └── runtime/
├── package.json
└── README.md
```

### Thinking Process

When the AI is reasoning, you'll see:

```
Thinking: Let me analyze the directory structure to provide
an accurate answer. I need to use the list_files tool...
```

**Toggle thinking display:** Press `t` to show/hide thinking.

### Tool Calls

When the AI executes a tool, you'll see:

```
Tool: read_file
Path: /Users/scrimwiggins/ff-terminal-ts/package.json

[Tool output appears here]
```

### Errors

Errors are displayed in red:

```
Error: File not found: /path/to/nonexistent/file
```

---

## Execution Modes

FF Terminal supports four execution modes. Press `Tab` to cycle through them.

### Auto Mode

Automatically approve all tool calls. Fastest execution.

```bash
/mode auto
```

**Use when:** You trust the agent, working in safe environments.

### Confirm Mode

Prompt before each tool call. Balanced approach.

```bash
/mode confirm
```

**Use when:** You want oversight but don't need manual approval for everything.

### Read-Only Mode

No tool execution. Analysis and information only.

```bash
/mode read_only
```

**Use when:** Exploring capabilities, testing prompts, safe exploration.

### Planning Mode

Extract and execute plans step-by-step with validation.

```bash
/mode planning
```

**Use when:** Complex multi-step tasks that benefit from explicit planning.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Cycle through execution modes (auto → confirm → read_only → planning) |
| `t` | Toggle thinking display (show/hide reasoning) |
| `Ctrl+C` | Cancel current operation |
| `Ctrl+L` | Clear screen (equivalent to `/clear`) |
| `Ctrl+D` | Exit (equivalent to `/quit`) |
| `↑`/`↓` | Navigate message history |
| `Ctrl+C` twice | Force exit |

### Command Shortcuts

Type these commands at the prompt:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/mode` | Switch execution mode |
| `/tools` | List available tools |
| `/agents` | List available agents |
| `/skills` | List available skills |
| `/theme` | Change color theme |
| `/clear` | Clear the screen |
| `/quit` | Exit the application |

---

## Text-to-Speech (TTS)

FF Terminal can read responses aloud using the built-in TTS system.

### Enable TTS

```bash
ff-terminal start --tts --voice am_adam
```

### Available Voices

| Voice | Description |
|-------|-------------|
| `am_adam` | Male voice (English) |
| `am_michael` | Male voice (English) |
| `am_richard` | Male voice (English) |
| `fm_sara` | Female voice (English) |

### TTS Controls

During a session:
- Responses are automatically read aloud
- Audio playback queue manages multiple TTS requests
- Playback continues in background while new content streams

### Configure TTS via Environment

```bash
# Enable TTS
export FF_TTS_ENABLED=1

# Set default voice
export FF_TTS_VOICE=am_adam
```

---

## Color Themes

FF Terminal supports multiple color themes for visual customization.

### List Available Themes

```bash
/themelist
```

### Change Theme

```bash
/theme solarized
```

### Available Themes

| Theme | Description |
|-------|-------------|
| `default` | Standard dark theme |
| `solarized` | Solarized Dark colors |
| `monokai` | Monokai-inspired colors |
| `nord` | Nord color palette |

### Custom Themes

Themes are defined in `src/cli/colorTheme.ts`. Create custom themes by:

1. Defining a new theme object
2. Adding it to the theme registry
3. Restarting the terminal

---

## Session Management

### Current Session

The session ID is displayed in the status bar. Session history is automatically saved.

### Switch Sessions

```bash
ff-terminal start --session existing-session-id
```

### List Sessions

```bash
ff-terminal sessions list
```

### New Session

```bash
ff-terminal start --new
```

### Session Storage

Sessions are stored in:
```
<workspace>/sessions/<session-id>.jsonl
```

Each line is a JSON object containing:
- Role (user/assistant/system)
- Content
- Timestamp
- Tool calls (if any)

---

## Syntax Highlighting

Code blocks are automatically syntax-highlighted based on language detection:

```
┌─────────────────────────────────────────────────┐
│ ```typescript                                   │
│ const greeting = "Hello, World!";               │
│ console.log(greeting);                           │
│ ```                                             │
├─────────────────────────────────────────────────┤
│ Colors:                                         │
│ • Keywords: Blue                                │
│ • Strings: Orange                               │
│ • Comments: Gray                                │
│ • Functions: Yellow                             │
└─────────────────────────────────────────────────┘
```

Supported languages:
- JavaScript/TypeScript
- Python
- Shell/Bash
- JSON
- Markdown
- HTML/CSS
- And more

---

## Custom Slash Commands

FF Terminal supports custom commands defined in Markdown files.

### Example Command

Create `ff-terminal-workspace/commands/review.md`:

```markdown
---
description: "Review code changes"
allowed-tools: ["read_file", "grep", "ast_grep"]
model: "main"
---

Review the code changes and provide:
1. Security analysis
2. Performance considerations
3. Best practice recommendations

Focus area: $1
```

### Use Command

```bash
/review authentication
```

**Variable substitution:**
- `$1` - First argument
- `$2` - Second argument
- `$ARGUMENTS` - All arguments

### List Commands

```bash
/commands
```

See [Custom Commands](06-custom-commands.md) for details.

---

## Agent Integration

### Launch Subagent

Use the `agents` tool to launch specialized subagents:

```
Use agent "code-reviewer" to analyze this file
```

### Available Agents

List agents with `/agents`:

| Agent | Description |
|-------|-------------|
| `code-reviewer` | Specialized in code review |
| `qa-specialist` | Quality assurance testing |
| `technical-writer` | Technical documentation |
| `security-auditor` | Security vulnerability analysis |

### Agent Restrictions

Agents can have:
- Restricted tool access
- Custom system prompts
- Limited execution turns
- Specific modes (read_only, auto, etc.)

See [Personas & Agents](05-personas-agents.md) for details.

---

## Streaming Behavior

### Real-Time Streaming

The terminal interface streams AI responses in real-time:
- Content appears as it's generated
- No buffering delays
- Smooth, responsive experience

### Chunk Types

The daemon streams different chunk types:

| Chunk Type | Description |
|------------|-------------|
| `content` | Response text content |
| `thinking` | Reasoning/thought process |
| `tool_call` | Tool execution request |
| `error` | Error message |
| `status` | Status update |
| `task_completed` | Task completion signal |

### WebSocket Communication

The terminal UI communicates with the daemon via WebSocket:
- **Port:** 28888 (default)
- **Protocol:** Bidirectional message exchange
- **Reconnection:** Automatic reconnection on disconnect

---

## Display Modes

### Clean Mode

Hide verbose metadata for cleaner output:

```bash
ff-terminal start --display-mode clean
```

**Clean mode hides:**
- Provider information
- Model information
- Task completion signals
- Validation messages

### Verbose Mode

Show all metadata for debugging:

```bash
ff-terminal start --display-mode verbose
```

**Verbose mode shows:**
- Provider and model information
- Task completion signals
- Validation messages
- Tool execution details

---

## Navigation

### Message History

Use arrow keys to navigate:
- `↑` - Previous message
- `↓` - Next message
- `Ctrl+↑` - Scroll up
- `Ctrl+↓` - Scroll down

### Clear Screen

```bash
/clear
```

Or press `Ctrl+L`.

---

## Multi-Session Support

FF Terminal supports multiple concurrent sessions.

### Start New Session in New Terminal

```bash
ff-terminal start --new
```

Each terminal window has its own:
- Session ID
- Conversation history
- Context

### Share Session Across Terminals

```bash
# Terminal 1
ff-terminal start --session shared-session

# Terminal 2
ff-terminal start --session shared-session
```

Both terminals share the same conversation history.

---

## Advanced Features

### Subagent Progress Tracking

When a subagent is launched, you'll see:

```
Subagent started: code-reviewer
Task: Analyze authentication module
[Progress: 3/10 tools executed, 1240 tokens]
```

### Todo Updates

The agent can update a todo list:

```
Todos:
✓ Analyze codebase structure
○ Review authentication flow
○ Identify security vulnerabilities
```

### Status Updates

Real-time status updates during long operations:

```
Status: Processing files... (23/150)
Status: Generating analysis...
```

---

## Troubleshooting

### Terminal UI Won't Start

```bash
# Check daemon status
ff-terminal daemon status

# Restart daemon
ff-terminal daemon restart
```

### WebSocket Connection Failed

```bash
# Check port availability
lsof -i:28888

# Use different port
FF_TERMINAL_PORT=28889 ff-terminal start
```

### Display Issues

```bash
# Clear terminal cache
reset

# Or try different terminal
# (iTerm2, Terminal.app, etc.)
```

### TTS Not Working

```bash
# Check TTS is enabled
ff-terminal start --tts

# Verify voice is available
ff-terminal start --tts --voice am_adam

# Check audio output
# (system volume, audio device)
```

---

## Best Practices

### For Daily Use

- Use `confirm` mode for balanced oversight
- Enable TTS for hands-free operation
- Use keyboard shortcuts for efficiency
- Create custom commands for repetitive tasks

### For Development

- Use `auto` mode for trusted environments
- Use `read_only` mode for exploration
- Use `planning` mode for complex tasks
- Monitor thinking for debugging

### For Safety

- Use `read_only` mode in unknown environments
- Review tool calls before approving (confirm mode)
- Check agent restrictions before launching
- Monitor session history for anomalies

---

## Next Steps

1. **[Web Interface Guide](03-web-interface.md)** - Explore the web client
2. **[FieldView Interface Guide](04-fieldview-interface.md)** - Discover the classic UI
3. **[Personas & Agents](05-personas-agents.md)** - Set up specialized agents
4. **[Custom Commands](06-custom-commands.md)** - Create your own commands

---

**Built with technical precision and agentic intelligence**
