# Keyboard Shortcuts

**Complete reference for all keyboard shortcuts in FF Terminal**

---

## Terminal UI (Ink)

### Global Shortcuts

| Key | Action | Mode |
|-----|--------|------|
| `Esc` | Exit wizard, cancel editing, return to chat | All |
| `Shift+Tab` | Cycle operation modes (auto → confirm → read_only → planning) | Chat |
| `Tab` | Context-dependent toggle | Context |
| `t` | Show thinking (when available) | Chat |

### Chat Mode

| Key | Action |
|-----|--------|
| Type | Input text |
| `Enter` | Send message |
| `/` | Command prefix (type `/` for commands) |
| `//` | Escape for literal text |
| `Shift+Tab` | Cycle operation modes |

### Wizard Menu

| Key | Action |
|-----|--------|
| `↑` | Move up (wraps around) |
| `↓` | Move down (wraps around) |
| `Enter` | Open selected wizard |
| `Esc` | Return to chat mode |

### Models Wizard

| Key | Action |
|-----|--------|
| `↑` | Navigate model list up (wraps) |
| `↓` | Navigate model list down (wraps) |
| `Enter` | Start editing selected model |
| `Esc` | Exit to chat / cancel edit |
| `Enter` (edit mode) | Save and persist |
| `Backspace` (edit mode) | Remove character |
| `Delete` (edit mode) | Remove character |
| Type character (edit mode) | Append to model name |
| `q` | Quit to chat (NOT when editing) |

**Model Types:**
- `model` - Primary conversation model
- `subagentModel` - Subagent execution model
- `toolModel` - Tool calling model
- `webModel` - Web interface model
- `imageModel` - Image generation model
- `videoModel` - Video generation model

### Mounts Wizard

| Key | Action |
|-----|--------|
| `↑` | Navigate mount list up (wraps) |
| `↓` | Navigate mount list down (wraps) |
| `Space` | Toggle mount (enabled/disabled) |
| `Enter` | Toggle mount (enabled/disabled) |
| `Esc` | Return to chat mode |
| `q` | Quit to chat |

**Available Mounts:**
- `claude` - Claude API integration
- `factory` - Factory AI integration

### Init Project Wizard

| Key | Action |
|-----|--------|
| `↑` | Move up in project list (no wrap) |
| `↓` | Move down in project list (no wrap) |
| `Enter` | Load selected project |
| `Esc` | Return to chat mode |
| Type characters | Filter project list |
| `Backspace` | Remove character from filter |
| `Delete` | Remove character from filter |

**Project Status:**
- `ready` - FF_PROJECT.md or PROJECT.md found
- `needs_setup` - No project files found

**Window Size:** 20 items displayed, centered on selection

---

## Web Client

### General Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between inputs and buttons |
| `Shift+Tab` | Navigate backwards |
| `Enter` | Submit form / confirm action |
| `Esc` | Close modal / cancel action |

### Chat Interface

| Key | Action |
|-----|--------|
| Type in input field | Enter message |
| `Enter` (input field) | Send message |
| `Shift+Enter` (input field) | New line in message |

### Session Management

| Key | Action |
|-----|--------|
| `Tab` | Switch between sessions |
| `Shift+Tab` | Switch backwards |

### File Upload

| Key | Action |
|-----|--------|
| `Tab` | Navigate to upload button |
| `Enter` | Open file picker |

---

## FieldView Classic

### General Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate interface |
| `Shift+Tab` | Navigate backwards |
| `Enter` | Activate selected element |
| `Esc` | Close modal / return |

### Terminal-Style Interface

| Key | Action |
|-----|--------|
| Type in command input | Enter command |
| `Enter` | Submit command |
| `↑` | Navigate command history up |
| `↓` | Navigate command history down |

---

## Editing Shortcuts

### Text Input Fields

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + X` | Cut |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + Left Arrow` | Move to previous word |
| `Ctrl/Cmd + Right Arrow` | Move to next word |
| `Ctrl/Cmd + Backspace` | Delete previous word |
| `Ctrl/Cmd + Delete` | Delete next word |
| `Home` | Move to start of line |
| `End` | Move to end of line |
| `Shift + Arrow` | Select character |
| `Ctrl/Cmd + Shift + Arrow` | Select word |

### Code Editors (if applicable)

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + F` | Find |
| `Ctrl/Cmd + H` | Replace |
| `Ctrl/Cmd + G` | Go to line |
| `Ctrl/Cmd + /` | Toggle comment |
| `Ctrl/Cmd + D` | Select word |

---

## Daemon Shortcuts

### Process Control

| Signal | Action | Command |
|--------|--------|---------|
| `SIGTERM` | Graceful shutdown | `kill -SIGTERM <pid>` |
| `SIGINT` | Interrupt (Ctrl+C) | `kill -SIGINT <pid>` |
| `SIGKILL` | Force kill (use carefully) | `kill -9 <pid>` |

---

## Browser Automation (if enabled)

### Navigation

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + L` | Focus address bar |
| `Ctrl/Cmd + T` | New tab |
| `Ctrl/Cmd + W` | Close tab |
| `Ctrl/Cmd + R` | Reload |
| `Ctrl/Cmd + F` | Find in page |

---

## macOS Control (if enabled)

### System Control

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + Space` | Spotlight search |
| `Ctrl/Cmd + Tab` | Switch apps |
| `Ctrl/Cmd + Shift + Tab` | Switch apps backwards |

---

## Screen Reader Compatibility

### Terminal UI

| Key | Action |
|-----|--------|
| VoiceOver `VO + Left/Right` | Navigate by elements |
| VoiceOver `VO + Space` | Activate element |

---

## Accessibility Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Focus next element |
| `Shift+Tab` | Focus previous element |
| `Enter` | Activate focused element |
| `Space` | Activate button / toggle checkbox |
| `Esc` | Close modal / cancel |

---

## Keyboard Shortcuts by Category

### Navigation

| Shortcut | Context |
|----------|---------|
| `↑/↓` | Wizards, lists |
| `Tab/Shift+Tab` | General navigation |
| `Home/End` | Line navigation |

### Editing

| Shortcut | Context |
|----------|---------|
| `Backspace/Delete` | Delete characters |
| `Ctrl/Cmd + Backspace` | Delete word |
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + C/V/X` | Copy/Paste/Cut |

### Actions

| Shortcut | Context |
|----------|---------|
| `Enter` | Submit, confirm, select |
| `Space` | Toggle checkbox |
| `Esc` | Cancel, exit, close |

### Mode Control

| Shortcut | Context |
|----------|---------|
| `Shift+Tab` | Cycle operation modes |
| `/mode` | Change mode via command |

---

## Tips

1. **Wizard navigation** - Use `Esc` to exit any wizard and return to chat
2. **Model editing** - Type model name carefully, no validation until save
3. **Project filtering** - Filter is case-sensitive, type partial names
4. **Session switching** - Use `Tab` to cycle between active sessions (web UI)
5. **History navigation** - Use `↑/↓` to browse command history (FieldView)
6. **Quick exit** - `Ctrl+C` sends SIGINT to gracefully stop the daemon
7. **Force quit** - Use `kill -9 <pid>` only as last resort
8. **Mode cycling** - `Shift+Tab` cycles: auto → confirm → read_only → planning
9. **Escape commands** - Use `//` prefix to send literal text without command parsing
10. **Thinking visibility** - Press `t` to show/hide thinking when available

---

**Last Updated:** February 2, 2026
