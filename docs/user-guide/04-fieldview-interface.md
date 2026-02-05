# FieldView Classic Interface

**Terminal-aesthetic web interface with artifact preview**

---

## Overview

FieldView Classic is a terminal-inspired web interface that combines the aesthetics of a terminal with the capabilities of a modern web UI. Features include artifact preview, terminal-style display, and responsive design.

---

## Starting FieldView Classic

### Basic Launch

```bash
ff-terminal fieldview
```

FieldView Classic is available at: **http://localhost:8788**

### Launch with Options

```bash
# Custom port
FF_FIELDVIEW_PORT=8889 ff-terminal fieldview

# Specific profile
ff-terminal fieldview --profile production

# Custom workspace
ff-terminal fieldview --workspace /custom/path
```

### Build FieldView Frontend

The FieldView frontend is automatically built during `npm run build`. To rebuild manually:

```bash
npm run build:fieldview
```

Built files are in: `src/web/fieldview/dist/`

---

## Interface Layout

FieldView Classic combines a terminal-style message display with modern web features:

```
┌─────────────────────────────────────────────────────────┐
│ FF Terminal • FieldView Classic • Session: abc123       │
├─────────────────────────────────────────────────────────┤
│ Terminal Display                                         │
│ $ hello                                                 │
│ Hello! How can I help you today?                        │
│                                                          │
│ $ list files                                             │
│ [Tool output in terminal format]                        │
│                                                          │
│ [Artifact Preview Panel]                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Generated code artifact...                          │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Input: [Your command...]                                │
│ [Mode: Auto ▼] [Send]                                  │
└─────────────────────────────────────────────────────────┘
```

### Status Bar

The top status bar displays:
- **Session ID**: Unique identifier for the conversation
- **Mode**: Current execution mode (auto/confirm/read_only/planning)
- **Profile**: Active profile name

---

## Features

### Terminal-Style Display

FieldView Classic displays messages in a terminal-style format:
- Monospace fonts
- Dark background
- Terminal-style prompts
- ANSI color codes support

### Artifact Preview

When the agent generates code or content, it appears in a preview panel:
- Syntax highlighting
- Copy-to-clipboard
- Download artifact
- Full-screen view

### Real-Time Streaming

Messages stream in real-time just like in a terminal:
- Character-by-character streaming
- Smooth typing effect
- No buffering delays

### Responsive Design

The interface adapts to different screen sizes:
- **Desktop**: Terminal + artifact preview side-by-side
- **Tablet**: Adjusted layout with drawer navigation
- **Mobile**: Touch-optimized with mobile drawer

---

## Mode Switching

FieldView Classic supports the same four execution modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| `auto` | Automatically approve all tool calls | Fastest execution, trusted environments |
| `confirm` | Prompt before each tool call | Balanced oversight |
| `read_only` | No tool execution, analysis only | Safe exploration |
| `planning` | Extract and execute plans step-by-step | Complex multi-step tasks |

### Switch Modes

Use the mode dropdown in the input area:
```
[Mode: Auto ▼]
```

Or use the command:
```bash
/mode confirm
```

---

## Message Display

### Terminal-Style Messages

```
$ hello
Hello! How can I help you today?

$ what files are in this directory?
[Tool: list_files]
├── src/
│   ├── cli/
│   ├── daemon/
│   └── runtime/
├── package.json
└── README.md
```

### Thinking Process

```
Thinking: Let me analyze the directory structure...
```

### Tool Calls

```
[Tool: read_file]
Path: /Users/scrimwiggins/ff-terminal-ts/package.json
[Tool output in terminal format]
```

### Errors

Errors are displayed in red:

```
Error: File not found: /path/to/nonexistent/file
```

---

## Artifact Preview

### What Are Artifacts?

Artifacts are generated content:
- Code files (React components, scripts, etc.)
- Documents (Markdown, text)
- Configuration files
- Data files

### Preview Panel

The artifact preview panel shows:
- **File Name**: Name of the generated artifact
- **Language**: Detected programming language
- **Content**: Formatted with syntax highlighting
- **Actions**: Copy, Download, Full-screen

### Artifact Actions

| Action | Description |
|--------|-------------|
| Copy | Copy artifact content to clipboard |
| Download | Download as a file |
| Full-screen | Open artifact in full-screen view |
| Close | Close preview panel |

### Artifact Storage

Artifacts are stored in:
```
<workspace>/artifacts/<session-id>/<artifact-name>
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Ctrl+C` | Copy selected text |
| `Ctrl+V` | Paste |
| `Ctrl+K` | Clear input |
| `Ctrl+L` | Clear terminal |
| `Esc` | Close dialogs/drawers |
| `Ctrl+F` | Search in terminal |

---

## Session Management

### Create New Session

Click "New Session" button in the navigation.

### Switch Sessions

1. Click "Sessions" in the navigation
2. Select a session from the list
3. The conversation loads in terminal format

### Export Session

1. Click "Sessions" in the navigation
2. Click the export icon next to a session
3. Choose export format (JSON, Markdown, Terminal)

### Delete Session

1. Click "Sessions" in the navigation
2. Click the delete icon next to a session
3. Confirm deletion

### Session Storage

Sessions are stored in:
```
<workspace>/sessions/<session-id>.jsonl
```

---

## Custom Commands

FieldView Classic supports custom slash commands with terminal-style execution:

```bash
/review authentication
/deploy production
```

### List Commands

Click "Commands" in the navigation to see all available commands.

### Create Custom Commands

See [Custom Commands](06-custom-commands.md) for details.

---

## Agent Integration

### Launch Subagent

Use the `agents` tool in the terminal input:

```
$ use agent "code-reviewer" to analyze this file
```

### Available Agents

Click "Agents" in the navigation to see all available agents.

| Agent | Description |
|-------|-------------|
| `code-reviewer` | Specialized in code review |
| `qa-specialist` | Quality assurance testing |
| `technical-writer` | Technical documentation |
| `security-auditor` | Security vulnerability analysis |

See [Personas & Agents](05-personas-agents.md) for details.

---

## Responsive Design

### Desktop (≥768px)

- Terminal + artifact preview side-by-side
- Full-width navigation
- Maximum width: 1200px

### Tablet (≥768px, <1200px)

- Stacked terminal and artifact preview
- Drawer navigation
- Adjusted layout

### Mobile (<768px)

- Terminal only (artifact preview modal)
- Mobile drawer navigation
- Touch-optimized interface
- Swipe gestures for navigation

---

## Navigation

The navigation provides quick access to:

- **Sessions**: View and manage conversation sessions
- **Commands**: List available custom commands
- **Agents**: View available agents
- **Tools**: Browse available tools
- **Settings**: Configure interface options

### Toggle Navigation

Click the hamburger menu (☰) to toggle the navigation.

### Mobile Drawer

On mobile devices, the navigation becomes a drawer:
- Swipe from left to open
- Click outside or swipe right to close
- Touch-optimized navigation

---

## Settings

### Access Settings

Click "Settings" in the navigation to configure:

- **Theme**: Light/Dark mode
- **Font Size**: Small, Medium, Large
- **Thinking Display**: Show/hide AI reasoning
- **Streaming**: Enable/disable real-time streaming
- **Terminal Style**: Classic/Modern

### Terminal Style Options

- **Classic**: Traditional terminal look
- **Modern**: Enhanced terminal with modern features

### Theme Options

- **Light Mode**: Light background with dark text
- **Dark Mode**: Dark background with light text (default)

---

## WebSocket Connection

FieldView Classic communicates with the daemon via WebSocket:
- **Port:** 8788 (default)
- **Protocol:** Bidirectional message exchange
- **Reconnection:** Automatic reconnection on disconnect

### Connection Status

The status indicator shows:
- **Green**: Connected
- **Yellow**: Reconnecting
- **Red**: Disconnected

### Troubleshooting Connection

```bash
# Check daemon status
ff-terminal daemon status

# Restart daemon
ff-terminal daemon restart

# Check port availability
lsof -i:8788
```

---

## Terminal Features

### Command History

Use arrow keys to navigate:
- `↑` - Previous command
- `↓` - Next command

### Clear Terminal

```bash
/clear
```

Or press `Ctrl+L`.

### Search in Terminal

Press `Ctrl+F` to search within the terminal output.

### Copy/Paste

- **Copy:** Select text, then `Ctrl+C` (or `Cmd+C` on Mac)
- **Paste:** `Ctrl+V` (or `Cmd+V` on Mac)

---

## Artifact Management

### View Artifact History

Artifacts from the current session are listed in the sidebar:
- Click "Artifacts" in the navigation
- Select an artifact to preview
- Artifacts are organized by session

### Download Artifact

1. Open artifact in preview
2. Click "Download" button
3. File downloads to your default download location

### Copy Artifact Code

1. Open artifact in preview
2. Click "Copy" button
3. Code copied to clipboard

### Full-Screen Artifact

1. Open artifact in preview
2. Click "Full-screen" button
3. Artifact opens in full-screen modal
4. Press `Esc` to close

---

## Export and Sharing

### Export Terminal

Export the terminal session:
1. Click "Export" in the navigation
2. Choose format (JSON, Markdown, Terminal)
3. Download the file

### Export Artifact

Export an artifact:
1. Open artifact in preview
2. Click "Download" button
3. File downloads as a separate file

---

## Troubleshooting

### Blank Page

```bash
# Verify frontend is built
ls -la src/web/fieldview/dist/

# Rebuild FieldView frontend
npm run build:fieldview

# Clear browser cache
# (Ctrl+Shift+R or Cmd+Shift+R)
```

### WebSocket Connection Failed

```bash
# Check daemon is running
ff-terminal daemon status

# Restart daemon
ff-terminal daemon restart

# Check port availability
lsof -i:8788
```

### Artifact Preview Not Showing

- Check if artifact was generated successfully
- Verify artifact file exists in workspace
- Check browser console for errors
- Try refreshing the page

---

## Browser Compatibility

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

**Recommended:** Use the latest version of Chrome or Firefox for the best experience.

---

## Comparison: Terminal vs Web vs FieldView

| Feature | Terminal UI | Web Interface | FieldView Classic |
|---------|-------------|---------------|-------------------|
| Aesthetic | Pure terminal | Modern web | Terminal-inspired |
| Artifact Preview | Inline | Modal | Side panel |
| Keyboard Shortcuts | Extensive | Basic | Terminal-style |
| File Upload | N/A | Drag & drop | N/A |
| Responsive | N/A | Yes | Yes |
| Terminal Style | Native | N/A | Emulated |
| Best For | CLI workflows | Visual workflows | Code generation |

---

## Best Practices

### For Daily Use

- Use FieldView Classic for code generation
- Use artifact preview for reviewing generated code
- Copy artifacts to clipboard for quick use
- Download artifacts for long-term storage

### For Development

- Use terminal-style commands for speed
- Use artifact preview for syntax highlighting
- Use full-screen view for large artifacts
- Export sessions for documentation

### For Collaboration

- Export terminals as Markdown for sharing
- Share artifacts via download or copy
- Document important workflows
- Use session naming for organization

---

## Next Steps

1. **[Personas & Agents](05-personas-agents.md)** - Set up specialized agents
2. **[Custom Commands](06-custom-commands.md)** - Create your own commands
3. **[Planning & Execution](07-planning-execution.md)** - Learn about plan extraction

---

**Built with technical precision and agentic intelligence**
