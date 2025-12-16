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

# Build the project
npm run build

# Start the daemon (background service)
npm run start:daemon

# Launch the terminal interface (in another terminal)
npm run start:cli
```

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
| `npm run dev:web` | Start web interface |
| `npm run dev:run` | Headless execution |
| `npm run build` | Build for production |
| `npm start:cli` | Production CLI |
| `npm start:daemon` | Production daemon |

### **Development Workflow**

1. **Start the daemon** (background service)
2. **Launch terminal UI** (interactive development)
3. **Make changes** to source code
4. **Test immediately** with hot reloading
5. **Build and deploy** when ready

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
