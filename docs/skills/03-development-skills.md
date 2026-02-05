# Development Skills

> **Coding, programming, and software engineering tools**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Development skills provide AI-powered coding assistance, version control, system automation, and agent-based software engineering. These skills transform FF Terminal into a comprehensive development environment.

### Skills in This Category

| Skill | Purpose | Primary Tool |
|-------|---------|--------------|
| `coding-agent` | AI coding assistant | Codex CLI, Claude Code, OpenCode, Pi |
| `github` | GitHub operations | `gh` CLI |
| `applescript_automation` | macOS automation | AppleScript, osascript |
| `skill-creator` | Skill scaffolding | Template-based generator |
| `agent-browser` | Browser automation | Playwright/Puppeteer |

---

## coding-agent

### Purpose
Run AI coding agents (Codex CLI, Claude Code, OpenCode, Pi) via background process for programmatic control. Enables automated code generation, refactoring, code review, and bug fixing.

### Supported Agents

| Agent | Provider | Best For |
|-------|----------|----------|
| **Codex CLI** | OpenAI (gpt-5.2-codex) | Code generation, refactoring |
| **Claude Code** | Anthropic | Complex reasoning, context-aware coding |
| **OpenCode** | Open-source | Flexible workflows |
| **Pi** | Local/Cloud | Lightweight tasks, configurable providers |

### Critical Rule: PTY Mode Required

**ALWAYS use `pty:true`** when running coding agents. Without a pseudo-terminal, interactive CLIs fail or hang.

```bash
# ✅ Correct - with PTY
bash pty:true command:"codex exec 'Your prompt'"

# ❌ Wrong - no PTY, agent breaks
bash command:"codex exec 'Your prompt'"
```

### Quick Start

```bash
# One-shot task with PTY
bash pty:true workdir:~/project command:"codex exec 'Add error handling to API'"

# Background mode for longer tasks
bash pty:true workdir:~/project background:true command:"codex --yolo 'Build a snake game'"

# Returns sessionId for monitoring
process action:list
process action:log sessionId:XXX
```

### Codex CLI

**Default model:** `gpt-5.2-codex`

```bash
# One-shot execution (auto-approves)
bash pty:true workdir:~/project command:"codex exec --full-auto 'Add dark mode toggle'"

# Sandboxed + auto-approve
codex exec --full-auto 'Task'

# No sandbox, no approval (fastest)
codex --yolo 'Task'

# PR Review
bash pty:true workdir:/tmp/pr-review command:"codex review --base origin/main"
```

**PR Review Safety:**
```bash
# Clone to temp directory (never review in ~/clawd/)
REVIEW_DIR=$(mktemp -d)
git clone https://github.com/user/repo.git $REVIEW_DIR
cd $REVIEW_DIR && gh pr checkout 130
bash pty:true workdir:$REVIEW_DIR command:"codex review --base origin/main"
```

### Claude Code

```bash
# Interactive coding session
bash pty:true workdir:~/project command:"claude 'Your task'"

# Background mode
bash pty:true workdir:~/project background:true command:"claude 'Build REST API'"
```

### OpenCode

```bash
bash pty:true workdir:~/project command:"opencode run 'Your task'"
```

### Pi Coding Agent

```bash
# Basic usage
bash pty:true workdir:~/project command:"pi 'Your task'"

# Non-interactive
bash pty:true command:"pi -p 'Summarize src/'"

# Different provider
bash pty:true command:"pi --provider openai --model gpt-4o-mini -p 'Task'"
```

### Process Management

| Action | Description |
|--------|-------------|
| `list` | List all running sessions |
| `poll` | Check if session is running |
| `log` | Get output (offset/limit available) |
| `write` | Send raw data to stdin |
| `submit` | Send data + Enter (like typing) |
| `send-keys` | Send key tokens or hex |
| `paste` | Paste text with bracketed mode |
| `kill` | Terminate session |

### Parallel Issue Fixing

```bash
# Create worktrees for parallel fixes
git worktree add -b fix/issue-78 /tmp/issue-78 main
git worktree add -b fix/issue-99 /tmp/issue-99 main

# Launch Codex in each (all with PTY!)
bash pty:true workdir:/tmp/issue-78 background:true command:"codex --yolo 'Fix issue #78'"
bash pty:true workdir:/tmp/issue-99 background:true command:"codex --yolo 'Fix issue #99'"

# Monitor
process action:list

# Create PRs after completion
cd /tmp/issue-78 && git push -u origin fix/issue-78
gh pr create --repo user/repo --head fix/issue-78 --title "fix: ..."

# Cleanup
git worktree remove /tmp/issue-78
git worktree remove /tmp/issue-99
```

### Auto-Notify on Completion

Append wake trigger for immediate notification:

```bash
bash pty:true workdir:~/project background:true command:"codex --yolo exec 'Build API.

When completely finished, run: clawdbot gateway wake --text \"Done: Built REST API with CRUD\" --mode now'"
```

### Best Practices

1. **Always use PTY** - Non-negotiable for interactive CLIs
2. **Specify workdir** - Keeps agent focused on target project
3. **Use --full-auto for building** - Auto-approves changes
4. **Use vanilla for reviewing** - No special flags needed
5. **Never run in ~/clawd/** - Prevents reading soul docs
6. **Monitor progress** - Check logs without interfering
7. **Parallel is OK** - Run multiple agents for batch work

---

## github

### Purpose
Interact with GitHub using the `gh` CLI. Manage issues, PRs, CI runs, API queries, and repository operations.

### Installation

```bash
brew install gh
# or
apt install gh
```

### Pull Requests

```bash
# Check CI status on PR
gh pr checks 55 --repo owner/repo

# List recent workflow runs
gh run list --repo owner/repo --limit 10

# View run details
gh run view <run-id> --repo owner/repo

# View failed step logs only
gh run view <run-id> --repo owner/repo --log-failed
```

### Issues

```bash
# List issues
gh issue list --repo owner/repo --json number,title

# View issue
gh issue view 42 --repo owner/repo

# Create issue
gh issue create --repo owner/repo --title "Bug: X" --body "Description"

# Close issue
gh issue close 42 --repo owner/repo
```

### API for Advanced Queries

```bash
# Get PR with specific fields
gh api repos/owner/repo/pulls/55 --jq '.title, .state, .user.login'

# List all repos
gh api user/repos --jq '.[].name'

# Search issues
gh api search/issues?q=repo:owner/repo+is:issue+state:open
```

### JSON Output with jq

```bash
# Format issue list
gh issue list --repo owner/repo --json number,title,state --jq '.[] | "\(.number): \(.title) [\(.state)]"'

# PR summary
gh pr list --repo owner/repo --json number,title,author --jq '.[] | "#\(.number) \(.title) by @\(.author.login)"'
```

### Best Practices

- **Always specify `--repo`** when not in a git directory
- **Use `--jq`** for filtered, readable output
- **Use `--json`** for structured data suitable for scripting
- **Use URLs directly** for cross-repository operations

---

## applescript_automation

### Purpose
Advanced macOS automation with AppleScript. Multi-screen management, URL schemes, deep linking, and complex workflow orchestration.

### Capabilities

| Capability | Description |
|------------|-------------|
| **UI Automation** | Control macOS applications via GUI scripting |
| **Multi-Screen** | Window management across displays |
| **URL Schemes** | Deep linking into apps |
| **Workflow Orchestration** | Complex multi-step automation |
| **File Operations** | Finder, Spotlight, System Events |
| **Application Control** | Launch, quit, interact with apps |

### Usage

```bash
# Run AppleScript from file
osascript automation.scpt

# Run inline AppleScript
osascript -e 'tell application "Safari" to activate'

# Run with arguments
osascript script.scpt arg1 arg2
```

### Common Patterns

**Application Control**:
```applescript
tell application "Safari"
    activate
    open location "https://example.com"
    close every tab whose name = "Untitled"
end tell
```

**Window Management**:
```applescript
tell application "System Events"
    tell process "Safari"
        set frontmost to true
        keystroke "n" using {command down}
    end tell
end tell
```

**File Operations**:
```applescript
tell application "Finder"
    duplicate file "path/to/file" to folder "path/to/dest"
    delete file "path/to/trash"
    empty trash
end tell
```

**URL Schemes**:
```applescript
open location "bear://x-callback-url/create?id=note123&title=Title&text=Content"
```

### Integration with FF Terminal

```bash
# Execute automation script
exec command:"osascript automation.scpt"

# Run with bash and capture output
bash command:"osascript -e 'tell app \"System Events\" to name of every process'"
```

### Best Practices

1. **Test scripts in Script Editor** before running via automation
2. **Enable accessibility access** for UI scripting
3. **Use try/catch** for error handling
4. **Keep scripts idempotent** - safe to run multiple times
5. **Document parameters** - How to use the script

---

## skill-creator

### Purpose
Scaffold new skills with standardized structure and templates. Ensures all skills follow FF Terminal conventions for consistency and maintainability.

### Usage

```bash
# Create basic skill structure
skill-creator create --name my-new-skill --description "What it does"

# Create with specific template
skill-creator create --name api-wrapper --template api-client

# Generate skill from existing CLI tool
skill-creator from-cli --name newtool --bin newtool --description "Wrapper for newtool CLI"

# Interactive mode
skill-creator init
```

### Generated Structure

```
my-new-skill/
├── SKILL.md              # Required documentation
├── README.md             # Quick reference
├── scripts/
│   ├── main.py           # Primary tool
│   └── utils.py          # Helpers
├── config/
│   └── config.yaml       # Configuration
└── tests/
    └── test_main.py      # Test suite
```

### Templates

| Template | Use Case |
|----------|----------|
| `basic` | Simple CLI wrapper |
| `api-client` | REST API integration |
| `agent` | AI agent wrapper |
| `media` | Audio/video processing |
| `system` | System-level automation |

### Configuration

```yaml
# config.yaml
name: my-new-skill
version: 1.0.0
description: "What this skill does"

dependencies:
  bins:
    - required-binary
  env:
    - API_KEY
  python:
    - requests

metadata:
  author: Your Name
  license: MIT
  tags: [tag1, tag2, tag3]
```

### Publishing

```bash
# Validate skill structure
skill-creator validate

# Package for ClawdHub
skill-creator package

# Publish to ClawdHub
clawdhub publish
```

---

## agent-browser

### Purpose
Browser automation using Playwright/Puppeteer. Automate web interactions, scrape content, fill forms, and test web applications.

### Installation

```bash
npm install playwright
npx playwright install chromium
```

### Basic Usage

```bash
# Navigate and capture
agent-browser navigate --url https://example.com --screenshot out.png

# Fill form
agent-browser fill --url https://example.com/form --field email --value "test@example.com"

# Click element
agent-browser click --selector "#submit-button"

# Extract data
agent-browser extract --url https://example.com --selector ".content"
```

### Python Playwright Integration

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    
    # Interact
    page.fill('#search', 'query')
    page.click('#submit')
    
    # Extract
    content = page.locator('.results').inner_text()
    
    browser.close()
```

### Common Patterns

**Form Automation**:
```python
page.goto('https://form.example.com')
page.fill('input[name="email"]', 'user@example.com')
page.select_option('select[name="option"]', 'value2')
page.click('button[type="submit"]')
page.wait_for_url('**/success')
```

**Data Extraction**:
```python
# Extract all links
links = page.locator('a').all_attribute('href')

# Extract table data
rows = page.locator('table tr').all()
for row in rows:
    cells = row.locator('td, th').all_text_contents()
```

**Screenshot**:
```python
page.screenshot(path='screenshot.png', full_page=True)
```

### Best Practices

1. **Always wait for networkidle** on dynamic pages
2. **Use specific selectors** - Avoid brittle XPaths
3. **Close browsers** - Prevent resource leaks
4. **Handle popups** - Use `page.context.wait_for_event('popup')`
5. **Use headless for automation** - Faster and less distracting

---

## Workflow Examples

### Complete Code Review Pipeline

```bash
# 1. Clone repository to temp directory
REVIEW_DIR=$(mktemp -d)
git clone https://github.com/user/repo.git $REVIEW_DIR
cd $REVIEW_DIR && gh pr checkout 130

# 2. Run Codex review in target directory (with PTY!)
bash pty:true workdir:$REVIEW_DIR command:"codex review --base origin/main"

# 3. Monitor progress
process action:log sessionId:XXX

# 4. Post review to GitHub
gh pr comment 130 --body "$(cat /tmp/review.md)"

# 5. Cleanup
trash $REVIEW_DIR
```

### Automated Feature Development

```bash
# 1. Create feature branch worktree
git worktree add -b feature/new-api /tmp/new-api main

# 2. Launch Codex (full-auto for building)
bash pty:true workdir:/tmp/new-api background:true command:"codex --yolo exec 'Add REST API endpoints for user management. Include CRUD operations, validation, and error handling. Use Express.js pattern.'"

# 3. When complete, push and create PR
cd /tmp/new-api && git add -A && git commit -m "feat: add user management API"
git push -u origin feature/new-api
gh pr create --title "feat: user management API" --body "Auto-generated by Codex"

# 4. Cleanup worktree
git worktree remove /tmp/new-api
```

### macOS Workflow Automation

```bash
# Launch app and set up workspace
osascript -e '
tell application "Safari"
    activate
    open location "https://github.com"
end tell
tell application "Terminal"
    activate
    do script "cd ~/Projects/main && npm run dev"
end tell
'

# Wait for setup, then continue
sleep 5

# Run development tasks
bash pty:true workdir:~/Projects/main command:"codex --yolo exec 'Add authentication middleware'"
```

---

## Development Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Code generation | `coding-agent` | Use Codex for code, Claude for reasoning |
| PR review | `coding-agent` | Clone to temp, use `codex review` |
| Git operations | `github` | `gh` CLI for all GitHub interactions |
| CI/CD monitoring | `github` | `gh run list`, `gh run view` |
| macOS automation | `applescript_automation` | UI, files, deep linking |
| New skill creation | `skill-creator` | Use templates for consistency |
| Web automation | `agent-browser` | Playwright for complex flows |
| API integration | `skill-creator --template api-client` | REST API wrappers |

---

## Next Steps

- **Master coding agents** - PTY mode, background processing, monitoring
- **Learn gh CLI shortcuts** - Speed up daily Git operations
- **Explore AppleScript patterns** - Automate your macOS workflow
- **Build custom skills** - Extend FF Terminal for your projects
- **Integrate browser automation** - Automate web testing and scraping

---

**For complete development skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
