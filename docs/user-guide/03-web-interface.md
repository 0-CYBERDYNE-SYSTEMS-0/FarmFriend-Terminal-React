# Web Interface

**React-based web client with responsive design and streaming support**

---

## Overview

The FF Terminal web interface is a modern React application built with Vite, providing a browser-based interface with the same powerful AI capabilities as the terminal UI. Features include real-time streaming, file uploads, session management, and responsive design.

---

## Starting the Web Interface

### Basic Launch

```bash
ff-terminal web
```

The web interface is available at: **http://localhost:8787**

### Launch with Options

```bash
# Custom port
FF_WEB_PORT=8888 ff-terminal web

# Specific profile
ff-terminal web --profile production

# Custom workspace
ff-terminal web --workspace /custom/path
```

### Build Web Frontend

The web frontend is automatically built during `npm run build`. To rebuild manually:

```bash
npm run build:web
```

Built files are in: `src/web/client/dist/`

---

## Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│ FF Terminal • Session: abc123 • Mode: Auto              │
├─────────────────────────────────────────────────────────┤
│ Messages                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ User: What files are in this directory?            │ │
│ │                                                     │ │
│ │ Assistant: [Streaming response...]                 │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Input: [Your message here...]                           │
│ [Mode: Auto ▼] [Send] [File Upload]                    │
└─────────────────────────────────────────────────────────┘
```

### Status Bar

The top status bar displays:
- **Session ID**: Unique identifier for the conversation
- **Mode**: Current execution mode (auto/confirm/read_only/planning)
- **Profile**: Active profile name

---

## Features

### Real-Time Streaming

The web interface streams AI responses in real-time:
- Content appears as it's generated
- Smooth, responsive experience
- No buffering delays

### Syntax Highlighting

Code blocks are automatically syntax-highlighted with language detection:
- TypeScript/JavaScript
- Python
- Bash/Shell
- JSON
- Markdown
- HTML/CSS
- And more

### File Upload

Upload files directly to the web interface:
- Drag and drop files
- Click the upload button
- Files are accessible to the agent

### Session Management

- Create new sessions
- Switch between sessions
- View session history
- Export sessions

### Responsive Design

The web interface adapts to different screen sizes:
- **Desktop**: Full-width layout with sidebar
- **Tablet**: Adjusted layout with drawer navigation
- **Mobile**: Touch-optimized interface with mobile drawer

---

## Mode Switching

The web interface supports the same four execution modes as the terminal:

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

When the AI is reasoning:

```
Thinking: Let me analyze the directory structure...
```

**Toggle thinking:** Use the thinking toggle in the UI.

### Tool Calls

When the AI executes a tool:

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

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Ctrl+C` | Copy selected text |
| `Ctrl+V` | Paste |
| `Ctrl+K` | Clear input |
| `Ctrl+L` | Clear chat |
| `Esc` | Close dialogs/drawers |

---

## Session Management

### Create New Session

Click "New Session" button in the sidebar or top navigation.

### Switch Sessions

1. Click "Sessions" in the sidebar
2. Select a session from the list
3. The conversation loads automatically

### Export Session

1. Click "Sessions" in the sidebar
2. Click the export icon next to a session
3. Choose export format (JSON, Markdown)

### Delete Session

1. Click "Sessions" in the sidebar
2. Click the delete icon next to a session
3. Confirm deletion

### Session Storage

Sessions are stored in:
```
<workspace>/sessions/<session-id>.jsonl
```

---

## File Upload

### Upload Files

**Drag and drop:**
1. Drag files from your computer
2. Drop them in the chat area
3. Files are automatically uploaded

**Click upload:**
1. Click the upload button (📎 icon)
2. Select files from the file dialog
3. Files are uploaded to the session

### Supported File Types

- Text files (.txt, .md, .json, .yaml, .csv)
- Code files (.ts, .js, .py, .java, .c, .cpp)
- Images (.png, .jpg, .jpeg, .gif, .webp) - for vision analysis
- Documents (.pdf, .docx) - limited support

### File Limits

- **Maximum file size:** 10MB
- **Concurrent uploads:** Up to 5 files

### Access Uploaded Files

Files are stored in the session and can be accessed by the agent:

```
User: Analyze the image I uploaded
Assistant: [AI uses vision tools to analyze the image]
```

---

## Custom Commands

The web interface supports custom slash commands just like the terminal.

### Use Commands

Type commands in the input field:

```bash
/review authentication
/deploy production
```

### List Commands

Click "Commands" in the sidebar to see all available commands.

### Create Custom Commands

See [Custom Commands](06-custom-commands.md) for details.

---

## Agent Integration

### Launch Subagent

Use the `agents` tool in the chat:

```
Use agent "code-reviewer" to analyze this file
```

### Available Agents

Click "Agents" in the sidebar to see all available agents.

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

- Full-width layout
- Sidebar navigation
- Multiple panels (sessions, commands, agents)
- Maximum width: 1200px

### Tablet (≥768px, <1200px)

- Adjusted layout with drawer navigation
- Collapsible sidebar
- Single panel view

### Mobile (<768px)

- Touch-optimized interface
- Mobile drawer navigation
- Bottom action bar
- Single panel view
- Swipe gestures for navigation

---

## Sidebar Navigation

The sidebar provides quick access to:

- **Sessions**: View and manage conversation sessions
- **Commands**: List available custom commands
- **Agents**: View available agents
- **Tools**: Browse available tools
- **Settings**: Configure interface options

### Toggle Sidebar

Click the hamburger menu (☰) to toggle the sidebar.

### Mobile Drawer

On mobile devices, the sidebar becomes a drawer:
- Swipe from left to open
- Click outside or swipe right to close
- Touch-optimized navigation

---

## Settings

### Access Settings

Click "Settings" in the sidebar to configure:

- **Theme**: Light/Dark mode
- **Font Size**: Small, Medium, Large
- **Thinking Display**: Show/hide AI reasoning
- **Streaming**: Enable/disable real-time streaming
- **Auto-Scroll**: Scroll to new messages automatically

### Theme Options

- **Light Mode**: Light background with dark text
- **Dark Mode**: Dark background with light text (default)

### Font Sizes

| Size | Description |
|------|-------------|
| Small | 14px text |
| Medium | 16px text (default) |
| Large | 18px text |

---

## WebSocket Connection

The web interface communicates with the daemon via WebSocket:
- **Port:** 8787 (default)
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
lsof -i:8787
```

---

## Smart Scroll

The web interface features smart scrolling:
- Auto-scroll to new messages
- Pause scroll when reading history
- Resume scroll when new content arrives
- Visual indicator for new content

### Scroll Indicators

When there's new content below your current view:
- A "↓ New messages" indicator appears
- Click to scroll to latest messages
- Indicator disappears when at bottom

---

## Export and Sharing

### Export Chat

Export the current conversation:
1. Click "Export" in the top navigation
2. Choose format (JSON, Markdown, Plain Text)
3. Download the file

### Share Link

Generate a shareable link to the session:
1. Click "Share" in the top navigation
2. Copy the generated link
3. Note: Links are local to your machine

---

## Troubleshooting

### Blank Page

```bash
# Verify frontend is built
ls -la src/web/client/dist/

# Rebuild web frontend
npm run build:web

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
lsof -i:8787
```

### File Upload Failed

```bash
# Check file size (max 10MB)
ls -lh your-file.txt

# Check file type (supported formats)
file your-file.txt

# Check browser console for errors
# (F12 or Cmd+Option+I)
```

### Display Issues

- Clear browser cache
- Try a different browser
- Check browser compatibility (Chrome, Firefox, Safari, Edge)
- Disable browser extensions that might interfere

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

## Security Considerations

### Local Access Only

The web interface binds to `localhost` by default. To access from other devices, configure:

```bash
# Allow remote access
export FF_WEB_HOST=0.0.0.0
ff-terminal web
```

**Warning:** This exposes the interface to your local network. Use with caution.

### HTTPS

For production deployments, use HTTPS:
- Reverse proxy with nginx or Apache
- Use Let's Encrypt for SSL certificates
- Configure secure WebSocket (wss://)

---

## Best Practices

### For Daily Use

- Use the web interface for visual workflows
- Use drag-and-drop for file uploads
- Export important conversations regularly
- Use keyboard shortcuts for efficiency

### For Development

- Use the terminal interface for faster workflows
- Use the web interface for visual debugging
- Monitor WebSocket connection status
- Check browser console for errors

### For Collaboration

- Export sessions as Markdown for sharing
- Use screen sharing for demonstrations
- Document important workflows
- Use session naming for organization

---

## Next Steps

1. **[FieldView Interface Guide](04-fieldview-interface.md)** - Discover the classic terminal UI
2. **[Personas & Agents](05-personas-agents.md)** - Set up specialized agents
3. **[Custom Commands](06-custom-commands.md)** - Create your own commands

---

**Built with technical precision and agentic intelligence**
