# 🚜 FarmFriend Terminal React

<div align="center">

```
███████╗ █████╗ ██████╗ ███╗   ███╗    ██████╗ ███████╗ ██████╗████████╗███████╗██████╗ ███╗   ███╗
██╔════╝██╔══██╗██╔══██╗████╗ ████║    ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
█████╗  ███████║██████╔╝██╔████╔██║    ██║  ██║█████╗  ██║        ██║   █████╗  ██████╔╝██╔████╔██║
██╔══╝  ██╔══██║██╔══██╗██║╚██╔╝██║    ██║  ██║██╔══╝  ██║        ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
██║     ██║  ██║██║  ██║██║ ╚═╝ ██║    ██████╔╝███████╗╚██████╗   ██║   ███████╗██║  ██║██║ ╚═╝ ██║
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝    ╚═════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
```

**Next-Generation AI-Powered Terminal Interface**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Ink](https://img.shields.io/badge/Ink-FF6B6B?style=flat&logo=react&logoColor=white)](https://github.com/vadimdemedes/ink)

</div>

---

## 🌟 Features

### 🚀 **Interactive Terminal UI**
- Beautiful, responsive terminal interface built with **Ink** and **React**
- Real-time WebSocket communication with AI daemon
- Multi-provider AI support with seamless switching
- Intuitive slash commands and keyboard shortcuts

### 🤖 **Multi-Provider AI Integration**
- **OpenRouter** - OpenAI-compatible API with streaming support
- **Z.ai** - High-performance Anthropic-compatible API
- **MiniMax** - Advanced AI model access
- **LM Studio** - Local AI model support

### 🛠️ **Extensible Skill System**
- 30+ pre-built skills covering diverse use cases:
  - **Development** - Code assistance, testing, deployment
  - **Design** - UI/UX, branding, responsive design
  - **Research** - Data analysis, web scraping, documentation
  - **Automation** - Scripting, workflow optimization
  - **Specialized** - Domain-specific tools and integrations

### 🎯 **Smart Features**
- **Profile Management** - Multiple AI provider configurations
- **Workspace Integration** - Seamless project context awareness
- **Scheduling System** - Background task execution
- **Tool Ecosystem** - Tavily search, Perplexity, web browsing
- **Secure Credential Storage** - Keychain integration

---

## 📦 Installation

### Prerequisites
- **Node.js** >= 20.0.0
- **npm** or **yarn**
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/FarmFriend-Terminal-React.git
cd FarmFriend-Terminal-React

# Install dependencies
npm install

# Build the project (includes web frontend)
npm run build

# Note: The build process automatically builds the web frontend.
# If you encounter issues with the web UI, manually rebuild it:
cd src/web/client
npm install && npm run build
cd ../..

# Start the daemon (background service)
npm run start:daemon

# Launch the terminal interface (in another terminal)
npm run start:cli
```

### Install the CLI launcher

1. Run `npm run build` (again if you already built once).
2. Install the launcher into `~/.local/bin`:
   ```bash
   ./scripts/install-cli.sh
   ```
3. Ensure the install directory is on your shell `PATH`:
   ```bash
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
   source ~/.zprofile
   ```
4. Verify the binary and its help text:
   ```bash
   command -v ff-terminal
   ff-terminal --help
   ```

With the launcher installed you can run the CLI directly (no longer needing `npm run dev -- ...` for everyday use).
Start the UI with `ff-terminal start` (and pass a profile name or `--display-mode` flags as needed).

---

## 🚀 Getting Started

### 1. **Launch the Application**
```bash
# Interactive launcher with provider selection
npm run dev -- start

# Or direct development mode
npm run dev:cli
```

### 2. **Configure AI Provider**

#### Option A: Profile Setup (Recommended)
```bash
# Create a new profile
# Run the profile wizard with the CLI (after installing it) or continue using the dev runner:
ff-terminal profile setup

# If you still prefer the `npm run dev` flow:
npm run dev -- profile setup

# List available profiles
npm run dev -- profile list

# Set default profile
npm run dev -- profile default my-profile

# Launch with specific profile
npm run dev -- start my-profile
```

#### Option B: Environment Configuration
Create a `.env` file in the project root:

```env
# OpenRouter (Recommended for development)
OPENROUTER_API_KEY=your_openrouter_key_here
use_openrouter=true
main_model=openai/gpt-4o-mini

# Z.ai Configuration
ANTHROPIC_AUTH_TOKEN=your_zai_token_here
use_zai=true

# LM Studio (Local)
use_lm_studio=true
lm_studio_base_url=http://localhost:1234
```

### 3. **Start Chatting**
```
🌾 FarmFriend Terminal React v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> Hello! I'm FarmFriend. How can I help you today?

Type /help for commands or just start chatting!
> ```

---

## 🎮 Usage Examples

### **Basic Interaction**
```bash
# Ask questions directly
> What's the best way to optimize React performance?

# Use slash commands
/help
/mode
/init
/quit
```

### **Skill Utilization**
```bash
# Code assistance
> Help me refactor this component for better performance

# Design consultation  
> Create a modern dashboard layout for e-commerce

# Research tasks
> Analyze the latest trends in web development

# Automation
> Set up a deployment pipeline for this project
```

### **Advanced Features**
```bash
# Headless execution
npm run dev -- run --prompt "Analyze this codebase and suggest improvements"

# Scheduled tasks
npm run dev -- run --scheduled-task daily-report --headless

# Web interface (alternative UI)
# Note: Run npm run build first to build the web frontend
npm run dev:web
```

---

## 🏗️ Architecture

### **System Components**

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Ink Terminal  │ ◄─────────────► │  AI Daemon      │
│   (React UI)    │                 │  (Node.js)      │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   ▼
         ▼                           ┌─────────────────┐
┌─────────────────┐                 │  AI Providers   │
│  Skill System   │                 │  • OpenRouter   │
│  (30+ Skills)   │                 │  • Z.ai         │
└─────────────────┘                 │  • MiniMax      │
                                     │  • LM Studio    │
                                     └─────────────────┘
```

### **Key Components**

- **🖥️ Terminal UI (`/src/cli/`)** - Ink-based React interface
- **⚡ AI Daemon (`/src/daemon/`)** - Background processing service  
- **🔧 Runtime (`/src/runtime/`)** - Core logic and provider management
- **🛠️ Tools (`/src/tools/`)** - Skill system and tool integrations
- **📡 Web Server (`/src/web/`)** - Alternative web-based interface

### **Communication Protocol**
- **WebSocket** for real-time bidirectional communication
- **Structured messages** with content, thinking, and tool events
- **Streaming responses** for optimal user experience

---

## 🛠️ Development

### **Available Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run dev:cli` | Launch terminal interface |
| `npm run dev:daemon` | Start AI daemon |
| `npm run dev:web` | Start web interface (requires web frontend built) |
| `npm run dev:run` | Headless execution |
| `npm run build` | Build for production (includes web frontend) |
| `npm run build:web` | Build only the web frontend |
| `npm start:cli` | Production CLI |
| `npm start:daemon` | Production daemon |
| `npm start:web` | Production web server |

### **Development Workflow**

1. **Start the daemon** (background service)
2. **Launch terminal UI** (interactive development)
3. **Make changes** to source code
4. **Test immediately** with hot reloading
5. **Build and deploy** when ready

### **Web Frontend Development**

The web UI is a separate Vite project located in `src/web/client/`:

```bash
# Build the web frontend (included in main build)
npm run build:web

# Or develop the web frontend with hot reload
cd src/web/client
npm install
npm run dev  # Starts Vite dev server on port 5173
```

**Web UI surfaces**
- **FieldView** (default): agriculture-first dashboard + embedded chat.
- **Control Barn** (admin): deep configuration and operations panel.

**Open Control Barn**
1. Start the web server (`ff-terminal start --web` or `npm run dev:web`).
2. Open `http://127.0.0.1:8787/?admin=1` once to unlock it locally.
3. Use the **Control Barn** button in the UI header.

**Secure Control Barn** (recommended for remote access)
```bash
export FF_CONTROL_BARN_TOKEN="your-secret-token"
```
The UI will prompt for a token before admin write actions.

**Important:** If the web UI shows a blank page, it usually means the frontend hasn't been built:
```bash
cd src/web/client
npm install && npm run build
cd ../..
```

### **Troubleshooting Web UI Issues**

If you encounter a blank white page when using `--web` flag:

1. **Check if web frontend is built:**
   ```bash
   ls -la src/web/client/dist/
   ```
   If this directory is empty or missing, the web UI will not load.

2. **Rebuild the web frontend:**
   ```bash
   npm run build:web
   ```

3. **Verify the build:**
   ```bash
   ls -la src/web/client/dist/index.html
   ls -la src/web/client/dist/assets/
   ```

4. **Restart the web server:**
   ```bash
   npm run dev:web
   ```

### **Project Structure**

```
src/
├── bin/              # CLI entry points
├── cli/              # Terminal UI (Ink/React)
├── daemon/           # AI daemon service
├── runtime/          # Core logic
│   ├── config/       # Configuration management
│   ├── profiles/     # Provider profiles
│   └── tools/        # Skill system
├── web/              # Web interface
└── types/            # TypeScript definitions
```

---

## 🔧 Configuration

### **Profile Configuration**
Profiles are stored in `~/.ff-terminal-profiles.json` with secure credential storage via Keychain (when available).

### **Provider Settings**
Each provider supports custom configuration:
- Base URLs and endpoints
- Model selection and parameters
- Authentication tokens and API keys
- Rate limiting and timeout settings

### **Workspace Directory Configuration**
The workspace directory stores sessions, logs, and project data. It defaults to `~/ff-terminal-workspace` but can be customized:

**Default Behavior:**
- Global mode: Uses `~/ff-terminal-workspace` for continuity across projects
- Local mode: Creates isolated workspace in current directory with `ff-terminal local`

**Override the Workspace Path:**
1. **Environment Variable** (highest priority):
   ```bash
   export FF_WORKSPACE_DIR="/custom/path/to/workspace"
   ff-terminal start
   ```

2. **Configuration File** (platform-specific):
   - macOS: `~/Library/Application Support/ff-terminal/config.json`
   - Linux: `~/.config/ff-terminal/config.json`
   - Windows: `%APPDATA%\ff-terminal\config.json`

   Add to your config file:
   ```json
   {
     "workspace_dir": "/Users/yourusername/ff-terminal-workspace"
   }
   ```

3. **Code Resolution** (automatic fallback):
   The system automatically uses the current user's home directory with dynamic path resolution. No hardcoded paths are used.

**Workspace Contract Files:**
- `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `USER.md`, `IDENTITY.md`, `MEMORY.md`, `PLAN.md`, `TASKS.md`, `LOG.md`

**Session Continuity:**
- Default session mode is `main` (persistent).
- CLI flags: `--session-mode <main|last|new>`, `--session-id <id>`, `--new-session` (start/local).
- Env overrides: `FF_SESSION_MODE`, `FF_MAIN_SESSION_ID`.
- Config options:
  ```json
  {
    "session_mode": "main",
    "main_session_id": "main",
    "session": {
      "scope": "main",
      "idleMinutes": 0,
      "autoSummarize": true,
      "maxHistoryTokens": 100000,
      "contextPruning": {
        "enabled": false,
        "mode": "adaptive"
      }
    }
  }
  ```
- CLI helpers: `/session [info|list|mode|reset|model]`, `/compact`, `/status` inside the Ink UI.
- Per-session overrides are stored in `session.meta.overrides` (e.g., `/session model gpt-5-mini`).
- More detail: `docs/session-management.md`.

**First-run onboarding:**
- A `BOOTSTRAP.md` file is created in the workspace on first run.
- If present, the agent uses it to ask one question at a time and fill `IDENTITY.md`, `USER.md`, and `SOUL.md`, then clears `BOOTSTRAP.md`.

**Send policy (optional):**
```json
{
  "session": {
    "sendPolicy": {
      "default": "allow",
      "rules": [
        { "action": "deny", "match": { "provider": "whatsapp", "chatType": "group" } }
      ]
    }
  }
}
```

**Gateway Status:**
- CLI: `ff-terminal gateway status`
- Web: `GET /api/gateway/status` (served by `ff-terminal web`)
- Control APIs: `GET /api/control/overview`, `/api/control/health`, `/api/control/scheduler/tasks`

**Note:** The workspace directory must be writable by the current user. The application automatically creates required subdirectories and contract files if missing.

### **Skill Configuration**
Individual skills can be enabled/disabled and customized:
```json
{
  "skills": {
    "enabled": ["code_first_responder", "webapp-testing"],
    "config": {
      "webapp-testing": {
        "baseUrl": "http://localhost:3000"
      }
    }
  }
}
```

### **iMessage Gateway (macOS)**
Use Messages as a fallback channel when WhatsApp is not available:
```json
{
  "imessage": {
    "enabled": true,
    "watch_chats": ["Alex", "Farm Crew"],
    "auto_reply": false,
    "poll_interval_ms": 8000
  }
}
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Setup**
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build and verify
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Ink** team for the amazing terminal UI framework
- **React** team for the powerful UI library
- **OpenAI** and other AI providers for API access
- The open-source community for inspiration and tools

---

## 📞 Support

- **Documentation**: Check the `/docs` directory for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join our community discussions
- **Wiki**: Additional resources and examples

---

<div align="center">

**Built with ❤️ by the FarmFriend Team**

[![Star on GitHub](https://img.shields.io/github/stars/0-CYBERDYNE-SYSTEMS-0/FarmFriend-Terminal-React?style=social)](https://github.com/0-CYBERDYNE-SYSTEMS-0/FarmFriend-Terminal-React)
[![Follow on GitHub](https://img.shields.io/github/followers/0-CYBERDYNE-SYSTEMS-0?style=social)](https://github.com/0-CYBERDYNE-SYSTEMS-0)

</div>
