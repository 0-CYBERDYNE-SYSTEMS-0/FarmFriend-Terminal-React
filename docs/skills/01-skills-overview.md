# Skills Overview

> **Production-ready skill modules for FF Terminal**  
> Version: 1.0 | Last Updated: February 2026

---

## What Are Skills?

Skills are modular, self-contained capabilities that extend FF Terminal's functionality. Each skill is a directory containing:

- **SKILL.md** - Core documentation and usage patterns
- **Tools** - Executable scripts and binaries
- **Configuration** - Metadata, dependencies, and integration points

Skills can be:
- **CLI tools** (wrappers around existing commands)
- **API integrations** (Slack, Discord, GitHub)
- **AI agents** (Codex, Claude, Gemini)
- **System utilities** (automation, file operations)
- **Media processors** (audio, video, images)

## Architecture

### Skill Structure

```
/skill-name/
├── SKILL.md              # Documentation
├── README.md             # Quick reference (optional)
├── scripts/              # Tool scripts
│   ├── tool1.py
│   └── tool2.sh
├── tools/                # Additional utilities
├── config/               # Configuration files
└── tests/                # Test suites (optional)
```

### Skill Discovery

FF Terminal discovers skills via:
1. **Directory scanning** - `/Users/scrimwiggins/clawdbot/skills/`
2. **ClawdHub registry** - `clawdhub search`, `clawdhub install`
3. **Metadata parsing** - Frontmatter in SKILL.md files

### Skill Execution

When a skill is invoked:
1. Parse SKILL.md for dependencies
2. Validate required tools/bins/environment
3. Load configuration from metadata
4. Execute appropriate tool or script
5. Return output in structured format

## Key Concepts

### Dependencies

Skills declare dependencies in SKILL.md frontmatter:

```yaml
metadata:
  clawdbot:
    requires:
      bins: ["gh", "python3"]      # Required binaries
      env: ["OPENAI_API_KEY"]      # Environment variables
      config: ["channels.slack"]   # Config keys
      os: ["darwin"]               # OS constraints
    install:                       # Installation instructions
      - id: brew
        kind: brew
        formula: gh
```

### Tool Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **CLI Wrappers** | Terminal tools with enhanced context | `github`, `himalaya`, `whisper` |
| **API Clients** | Service integrations via REST/webhooks | `slack`, `discord`, `telegram-bot-creator` |
| **AI Agents** | LLM-powered coding and reasoning | `coding-agent`, `oracle`, `gemini` |
| **Media Tools** | Audio/video/image processing | `openai-image-gen`, `remotion`, `video-frames` |
| **System Automation** | macOS/Linux automation | `applescript_automation`, `peekaboo` |
| **Internal Utilities** | Meta-operations on FF Terminal | `session-logs`, `model-usage`, `skill-creator` |

### Skill Patterns

**Pattern 1: Single-Command Wrapper**
```bash
# Simple CLI wrapper
gh pr checks 55 --repo owner/repo
```

**Pattern 2: Python Script with Args**
```bash
python3 {baseDir}/scripts/gen.py --count 16 --model gpt-image-1
```

**Pattern 3: Interactive Agent (PTY Required)**
```bash
bash pty:true workdir:~/project command:"codex exec 'Build X'"
```

**Pattern 4: Background Process**
```bash
bash pty:true workdir:~/project background:true command:"codex --yolo 'Task'"
```

## Installation & Management

### Using ClawdHub

```bash
# Search for skills
clawdhub search "video"

# Install a skill
clawdhub install remotion-expert

# Update all skills
clawdhub sync

# List installed skills
clawdhub list
```

### Manual Installation

```bash
# Clone skill repository
cd /Users/scrimwiggins/clawdbot/skills
git clone https://github.com/user/skill-name.git

# Or create skill directory
mkdir skill-name && cd skill-name
# Add SKILL.md and tools
```

## Skill Categories

This documentation organizes 40+ production-ready skills into functional categories:

| Category | File | Skills Count |
|----------|------|--------------|
| **Design Skills** | `02-design-skills.md` | 6 |
| **Development Skills** | `03-development-skills.md` | 5 |
| **Testing & Quality** | `04-testing-quality-skills.md` | 3 |
| **Research & Intelligence** | `05-research-intelligence-skills.md` | 3 |
| **Media & Content** | `06-media-content-skills.md` | 3 |
| **Automation & Deployment** | `07-automation-deployment-skills.md` | 4 |
| **Specialized Domain** | `08-specialized-domain-skills.md` | 4 |
| **Internal Tools** | `09-internal-tools-skills.md` | 3 |
| **Custom Skills** | `10-creating-custom-skills.md` | Guide |
| **Complete Reference** | `11-skill-reference-complete.md` | All 40+ |

## Best Practices

### Using Skills

1. **Read SKILL.md first** - Understand patterns and requirements
2. **Check dependencies** - Ensure required tools are installed
3. **Use appropriate execution mode** - PTY for interactive tools, background for long tasks
4. **Monitor background processes** - Use `process` tool for tracking
5. **Handle errors gracefully** - Many skills have retry logic or fallbacks

### Creating Skills

1. **Start with SKILL.md** - Document before implementing
2. **Declare dependencies clearly** - Use frontmatter metadata
3. **Provide examples** - Show common usage patterns
4. **Include tests** - Verify functionality works as expected
5. **Publish to ClawdHub** - Share with the community

## Quick Reference

### Essential Skills (Must-Have)

| Skill | Purpose | Usage Frequency |
|-------|---------|-----------------|
| `coding-agent` | AI-powered coding | Daily |
| `github` | GitHub operations | Daily |
| `slack` | Slack integration | Multiple/day |
| `whisper` | Audio transcription | Weekly |
| `remotion` | Video production | Weekly |
| `webapp-testing` | Testing web apps | Weekly |

### Pro Tips

- **PTY Mode**: Always use `pty:true` for interactive CLIs (Codex, Claude, Pi)
- **Background Mode**: Use `background:true` for long-running tasks with `process` monitoring
- **Workdir**: Specify `workdir` to keep agents focused on target projects
- **Parallel Execution**: Multiple background sessions work well for batch operations
- **Auto-Notify**: Append wake triggers to long tasks for immediate notification

## Troubleshooting

### Skill Not Found
```bash
# Check if skill exists
ls -la /Users/scrimwiggins/clawdbot/skills/

# Sync with ClawdHub
clawdhub sync
```

### Dependencies Missing
```bash
# Read SKILL.md for install instructions
cat /path/to/skill/SKILL.md

# Install missing tools
brew install gh
npm install -g @steipete/oracle
```

### PTY Required Errors
```bash
# Wrong (will fail or hang)
bash command:"codex exec 'Task'"

# Correct (allocates pseudo-terminal)
bash pty:true command:"codex exec 'Task'"
```

### Background Session Issues
```bash
# List running sessions
process action:list

# Check session logs
process action:log sessionId:XXX

# Kill stuck session
process action:kill sessionId:XXX
```

## Next Steps

1. **Browse by category** - Explore skills in your domain of interest
2. **Deep dive into specific skills** - Read detailed documentation
3. **Try the examples** - Hands-on learning
4. **Create custom skills** - Extend FF Terminal for your needs
5. **Contribute to ClawdHub** - Share your skills with the community

---

**For complete skill listings**, see [11 - Skill Reference Complete](11-skill-reference-complete.md)
