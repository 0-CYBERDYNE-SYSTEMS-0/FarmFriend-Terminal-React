# FF-Terminal Web UI Implementation Plan

## Executive Summary

Based on my analysis of the OpenCode repository (sst/opencode), I've designed a plan to create a comprehensive web UI for ff-terminal. OpenCode is an open-source AI coding agent with a sophisticated web/desktop UI built on **SolidJS + Kobalte + Vite + TailwindCSS**.

**Key Finding**: OpenCode's frontend tech stack is **incompatible** with ff-terminal's existing React/Ink architecture. Direct code reuse would require a complete rewrite of ff-terminal's frontend to SolidJS.

**Recommended Approach**: Learn from OpenCode's **design patterns and architecture**, then **reimplement** in ff-terminal's React ecosystem.

---

## Part 1: OpenCode Architecture Analysis

### Technology Stack Comparison

| Aspect | OpenCode | FF-Terminal (Current) | Compatibility |
|--------|----------|----------------------|---------------|
| Framework | SolidJS 1.9 | React + Ink | ❌ Incompatible |
| UI Library | Kobalte (headless) | Ink (terminal) | ❌ Incompatible |
| Build Tool | Vite 7 | tsx (dev) | ⚠️ Different |
| Styling | TailwindCSS 4 | Inline styles | ✅ Can adopt |
| Syntax Highlighting | Shiki | None currently | ✅ Can adopt |
| State Management | SolidJS Context | React hooks | ✅ Similar patterns |
| Package Manager | Bun | npm/pnpm | ✅ Compatible |
| Backend Protocol | HTTP REST + TUI queue | WebSocket (daemon) | ✅ Can align |

### OpenCode Package Structure

```
packages/
├── ui/              # 40+ reusable SolidJS components
├── desktop/         # Tauri desktop app (uses UI library)
├── web/             # Astro-based web app
├── console/         # TUI app + core backend
│   └── core/        # REST API server (Hono)
├── sdk/js/          # Client-server SDK
└── opencode/        # Main CLI entry point
```

### Reusable UI Components (40+)

**Core Components**:
- `markdown` - Markdown rendering with Shiki syntax highlighting
- `code` - Code display with language detection
- `diff-changes` - Unified/split diff view
- `file-icons` - File type icons (50+ file types)
- `provider-icons` - LLM provider icons

**Layout Components**:
- `accordion`, `card`, `collapsible`, `tabs`
- `list`, `dialog`, `popover`, `dropdown-menu`
- `resize-handle`, `sticky-accordion-header`

**Interactive Components**:
- `button`, `text-field`, `checkbox`, `switch`, `select`
- `spinner`, `progress-circle`, `toast`, `tooltip`
- `typewriter` - Streaming text effect

**Session Components**:
- `session-message-rail` - Message timeline
- `session-turn` - Individual turn display
- `message-nav` - Message navigation

**Other**:
- `avatar`, `tag`, `favicon`, `logo`

### Communication Protocol

**OpenCode**:
- HTTP REST API for operations (sessions, files, providers, tools)
- Custom header: `x-opencode-directory` for project context
- TUI uses AsyncQueue for request/response (Hono framework)
- Server runs on configurable port

**FF-Terminal (Current)**:
- WebSocket server on port 28888 (daemon)
- StreamChunk protocol for real-time streaming
- `start_turn`, `cancel_turn`, `list_tools` messages

**Alignment Opportunity**: FF-terminal could add an HTTP REST API layer alongside the WebSocket daemon for web client compatibility.

---

## Part 2: Recommended Implementation Strategy

### Strategy: "Learn, Don't Copy"

Given the tech stack incompatibility, the recommended approach is:

1. **Adopt the Architecture Pattern** - Client-server separation with SDK layer
2. **Copy the Design Language** - Layout, component structure, UX patterns
3. **Reimplement Components** - Build React equivalents of key SolidJS components
4. **Align Communication** - Add HTTP API to daemon for web client support
5. **Reuse Utilities** - Syntax highlighting (Shiki), markdown parsing (marked)

### Why Not Direct Fork/Reuse?

1. **Tech Stack Mismatch**: SolidJS vs React is fundamental
2. **Existing Investment**: ff-terminal has 3155 lines of Ink UI code
3. **Daemon Protocol**: WebSocket-based streaming is already implemented
4. **Learning Curve**: Team would need to learn SolidJS ecosystem

### Why This Approach Works

1. **Preserves Existing Work**: Keep React/Ink for terminal UI
2. **Leverages Best Practices**: Learn from mature open-source project
3. **Incremental Adoption**: Can implement features gradually
4. **Clean Integration**: Web UI becomes another client of daemon

---

## Part 3: Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal**: Set up the web UI project structure and basic connectivity.

#### 1.1 Project Structure
```
src/web/
├── client/           # React web application
│   ├── components/   # Reusable React components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   ├── context/      # React context providers
│   ├── utils/        # Utilities
│   └── styles/       # Global styles
├── api/              # HTTP API handlers (new daemon endpoint)
└── server.ts         # Existing web server (enhance)
```

#### 1.2 Technology Selection
```json
{
  "framework": "React 18",
  "build": "Vite",
  "routing": "React Router",
  "styling": "TailwindCSS",
  "components": "shadcn/ui" (similar to Kobalte for React),
  "syntax": "Shiki",
  "markdown": "marked",
  "state": "Zustand or React Context"
}
```

#### 1.3 Core Features
- [ ] Initialize Vite + React project in `src/web/client/`
- [ ] Set up TailwindCSS configuration
- [ ] Install shadcn/ui components
- [ ] Configure Shiki for syntax highlighting
- [ ] Set up React Router for navigation

### Phase 2: Core UI Components (Week 2)

**Goal**: Build essential React components inspired by OpenCode's design.

#### 2.1 Component Priority

**High Priority** (Required for MVP):
```tsx
// src/web/client/components/
- Chat.tsx              // Main chat interface
- MessageList.tsx       // Message timeline
- MessageBubble.tsx     // Individual message display
- CodeBlock.tsx         // Code with syntax highlighting
- Markdown.tsx          // Markdown rendering
- ToolExecution.tsx     // Tool status display
- InputArea.tsx         // User input with send button
- ConnectionStatus.tsx  // Online/offline indicator
```

**Medium Priority** (Enhanced UX):
```tsx
- FileBrowser.tsx       // File tree navigation
- FileViewer.tsx        // File content display
- DiffViewer.tsx        // Before/after comparison
- TerminalPane.tsx      // Command output display
- SessionHistory.tsx    // Past sessions list
```

**Low Priority** (Polish):
```tsx
- Settings.tsx          // Configuration UI
- ProfileSelector.tsx   // LLM provider/model selection
- ThemeToggle.tsx       // Dark/light mode
- KeyboardShortcuts.tsx // Help dialog
```

#### 2.2 Component Specifications

**Chat.tsx** - Main container
- Split pane: messages (left) + file browser (right, collapsible)
- Auto-scroll to latest message
- Streaming text support (typewriter effect)
- Responsive layout (mobile: tabs, desktop: split)

**MessageBubble.tsx** - Message display
- Role indicator (user/assistant/system)
- Timestamp
- Content rendering (markdown + code blocks)
- Tool call summaries (expandable)
- Error states (red border, stack traces)

**CodeBlock.tsx** - Code display
- Language detection
- Shiki syntax highlighting
- Copy button
- Line numbers (toggle)
- Max height with scroll

**Markdown.tsx** - Rich content
- `marked` for parsing
- Shiki for code blocks
- Sanitization for security
- Link rendering (open in new tab)

### Phase 3: Backend Integration (Week 2-3)

**Goal**: Connect web UI to ff-terminal daemon with enhanced protocol.

#### 3.1 Daemon HTTP API Addition

Add REST endpoints to `src/daemon/daemon.ts` or create `src/daemon/api.ts`:

```typescript
// New HTTP routes alongside WebSocket
GET  /api/sessions           // List sessions
GET  /api/sessions/:id       // Get session details
POST /api/sessions           // Create session
GET  /api/tools              // List available tools
GET  /api/status             // Daemon status
GET  /api/config             // Current config (provider, model)
```

#### 3.2 WebSocket Protocol Enhancement

Current daemon protocol is good for streaming. Add support for:

```typescript
// New message types
type ClientMessage =
  | { type: "hello"; client: "web" }  // Add web client type
  | { type: "start_turn"; input: string; sessionId: string }
  | { type: "cancel_turn"; turnId: string }
  | { type: "get_file"; path: string }    // New: file browser
  | { type: "list_files"; dir: string };  // New: file listing

type ServerMessage =
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "file_content"; path: string; content: string }  // New
  | { type: "file_list"; dir: string; files: FileInfo[] };  // New
```

#### 3.3 File Browser Support

Add file operations to daemon:

```typescript
// src/daemon/handlers/files.ts
export async function handleFileList(dir: string): Promise<FileInfo[]> {
  // Read directory, return file info
}

export async function handleFileRead(path: string): Promise<string> {
  // Read file content, respect read_file limits
}
```

### Phase 4: Features & Polish (Week 3-4)

**Goal**: Implement the features you identified as important.

#### 4.1 Chat Interface
- [ ] Message history persistence (localStorage)
- [ ] Session switching
- [ ] Message search/filter
- [ ] Export conversation (markdown)
- [ ] Thinking toggle (show/hide extended reasoning)

#### 4.2 File Browser
- [ ] Tree view with expand/collapse
- [ ] File type icons (use existing or simple SVG icons)
- [ ] Click to preview
- [ ] Syntax highlight preview
- [ ] Breadcrumb navigation

#### 4.3 Visual Terminal Pane
- [ ] Command output display
- [ ] ANSI color support
- [ ] Scrolling history
- [ ] Copy button

#### 4.4 Artifact Previews
- [ ] HTML rendering (iframe sandbox)
- [ ] Image display
- [ ] PDF viewer
- [ ] JSON prettify

#### 4.5 Project Management
- [ ] Workspace selector
- [ ] Recent projects list
- [ ] Project settings
- [ ] Profile/model selector

#### 4.6 User Experience
- [ ] Keyboard shortcuts (Ctrl+K for command palette)
- [ ] Dark/light theme
- [ ] Responsive design (mobile support)
- [ ] Loading states
- [ ] Error boundaries
- [ ] Toast notifications

### Phase 5: Integration & Testing (Week 4)

**Goal**: Full integration with existing ff-terminal.

#### 5.1 CLI Integration
```bash
# New commands
ff-terminal web          # Start web UI + daemon
ff-terminal --web-only   # Start web UI only (daemon already running)
```

#### 5.2 Configuration
```yaml
# config.yaml
web:
  enabled: true
  port: 8787
  host: "127.0.0.1"
  open_browser: true
```

#### 5.3 Testing
- [ ] Unit tests for components
- [ ] Integration tests for WebSocket
- [ ] E2E tests with Playwright
- [ ] Manual testing checklist

---

## Part 4: OpenCode-Specific Inspirations

### Design Patterns to Adopt

1. **Session-Centric UX**
   - OpenCode's session layout is excellent
   - Split view: chat + file browser + terminal
   - Tab-based for multiple sessions

2. **Message Rail**
   - Timeline view on the left
   - Jump to specific messages
   - Turn-based grouping

3. **Diff Visualization**
   - Side-by-side or unified diff
   - Color-coded changes
   - Copy old/new buttons

4. **Streaming UI**
   - Typewriter effect for LLM responses
   - Progressive tool status updates
   - Cancellation support

5. **Keyboard Navigation**
   - Cmd+K for command palette
   - Tab to switch between agents
   - Escape to close modals

### Component Mapping: OpenCode → React

| OpenCode (SolidJS) | FF-Terminal (React) | Notes |
|-------------------|---------------------|-------|
| `<Markdown />` | `<Markdown />` | Use `marked` + Shiki |
| `<Code />` | `<CodeBlock />` | Shiki for highlighting |
| `<DiffChanges />` | `<DiffViewer />` | Use `react-diff-viewer` |
| `<FileIcon />` | `<FileIcon />` | SVG icon set |
| `<MessageNav />` | `<MessageRail />` | Similar UX |
| `<SessionTurn />` | `<TurnDisplay />` | Turn grouping |
| `<Typewriter />` | `<Typewriter />` | Same logic |
| `<Accordion />` | shadcn `<Accordion />` | Already available |
| `<Dialog />` | shadcn `<Dialog />` | Already available |
| `<TextField />` | shadcn `<Input />` | Already available |

---

## Part 5: Alternative Approaches (Not Recommended)

### Option A: Fork OpenCode Entirely
- Rewrite ff-terminal backend to match OpenCode's server protocol
- Keep OpenCode's SolidJS frontend
- **Pros**: Get full UI for "free"
- **Cons**: Massive rewrite, lose existing work, learn new stack

### Option B: Use OpenCode UI as Library
- Install `@opencode-ai/ui` as dependency
- Create SolidJS app that wraps ff-terminal daemon
- **Pros**: Reuse components directly
- **Cons**: Mixed frameworks, complex build, maintenance burden

### Option C: Desktop App Only
- Use OpenCode's desktop (Tauri) with custom backend
- **Pros**: Native app experience
- **Cons**: Not web-based, Tauri complexity

---

## Part 6: Risk Assessment

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket connection drops | High | Reconnect logic, state sync |
| Large file rendering | Medium | Virtualization, lazy loading |
| Browser compatibility | Low | Modern browsers only (ES2022+) |
| Security (XSS) | High | Sanitize markdown, sandbox iframes |

### Implementation Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | High | Phase delivery, MVP first |
| UI/UX inconsistency | Medium | Design system before coding |
| Daemon protocol changes | Medium | Version negotiation |

---

## Part 7: Success Criteria

### MVP (Minimum Viable Product)
- [x] Web UI connects to existing daemon
- [ ] Chat interface with streaming
- [ ] Markdown + code rendering
- [ ] Session persistence
- [ ] Basic file browser

### Full Feature Release
- [ ] All Phase 4 features complete
- [ ] Responsive design
- [ ] Dark/light themes
- [ ] Keyboard shortcuts
- [ ] Export/share functionality

### Stretch Goals
- [ ] Multi-user support
- [ ] Collaboration features
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)

---

## Part 8: Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Create design system** - Define colors, typography, components
3. **Set up project** - Initialize Vite + React in `src/web/client/`
4. **Build first component** - Start with `Chat.tsx`
5. **Test daemon connection** - Ensure WebSocket works

---

## Appendix: Quick Reference

### File Structure After Implementation
```
src/
├── bin/ff-terminal.ts          # CLI entry (add 'web' command)
├── cli/app.tsx                 # Existing Ink UI (unchanged)
├── daemon/
│   ├── daemon.ts               # WebSocket server (enhance)
│   ├── api.ts                  # NEW: HTTP REST API
│   └── handlers/
│       └── files.ts            # NEW: File operations
├── web/
│   ├── client/                 # NEW: React web app
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── styles/
│   └── server.ts               # Existing: enhance with new routes
└── runtime/                    # Existing: unchanged
```

### Dependencies to Add
```json
{
  "dependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "react-router-dom": "^6.20.0",
    "tailwindcss": "^3.4.0",
    "shadcn/ui": "latest",
    "shiki": "^1.0.0",
    "marked": "^12.0.0",
    "zustand": "^4.4.0"
  }
}
```

### Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 3-5 days | Project setup, basic connectivity |
| Phase 2 | 5-7 days | Core UI components |
| Phase 3 | 5-7 days | Backend integration, file browser |
| Phase 4 | 7-10 days | Features, polish, artifacts |
| Phase 5 | 3-5 days | Testing, bug fixes |
| **Total** | **4-5 weeks** | Production-ready web UI |

---

**Status**: Ready for review and approval.
