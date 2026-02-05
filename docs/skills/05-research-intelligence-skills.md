# Research & Intelligence Skills

> **AI reasoning, knowledge retrieval, and agent communication**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Research and intelligence skills leverage advanced AI models for reasoning, knowledge synthesis, and inter-agent communication. These skills enable complex problem-solving and coordination across multiple AI agents.

### Skills in This Category

| Skill | Purpose | Primary Tool |
|-------|---------|--------------|
| `oracle` | Best practices for prompt + file bundling | Oracle CLI |
| `gemini` | Gemini CLI for Q&A and generation | Gemini CLI |
| `inter-agent-communication` | Multi-agent coordination | Custom protocol |

---

## oracle

### Purpose
Best practices for using the Oracle CLI. Handles prompt composition, file bundling, engine selection, sessions, and file attachment patterns.

### Installation

```bash
npm install -g @steipete/oracle
```

### Usage

```bash
# Basic query
oracle "Your question here"

# With file attachment
oracle "Analyze this code" --file path/to/code.js

# With multiple files
oracle "Compare these implementations" --file file1.py --file file2.py

# Session-based conversation
oracle --session mysession "Follow-up question"
oracle --session mysession "Another question in same session"

# Specify engine
oracle "Complex reasoning task" --engine gpt-4o

# Streaming response
oracle "Generate long content" --stream
```

### Prompt Best Practices

**Clear, Specific Prompts:**
```bash
# ✅ Good - specific and clear
oracle "Explain how React useEffect cleanup works with 3 code examples"

# ❌ Vague - unclear what is needed
oracle "Tell me about React"
```

**Structured Prompts:**
```bash
oracle "
Task: Code review
File: src/auth.js
Focus: Security vulnerabilities
Output: List issues with severity (high/medium/low)
"

oracle "
Task: Summarize
Document: docs/architecture.md
Length: 5 bullet points
Audience: Technical lead
"
```

### File Bundling

```bash
# Attach single file
oracle "Review this file for bugs" --file src/utils.ts

# Attach multiple files
oracle "Compare implementations" --file src/v1.ts --file src/v2.ts

# Attach entire directory
oracle "Analyze project structure" --file ./

# Attach with pattern
oracle "Review all API handlers" --file src/api/*.ts

# Exclude files
oracle "Analyze src only" --file . --exclude "node_modules/**" --exclude "dist/**"
```

### Engine Selection

| Engine | Best For | Speed | Context |
|--------|----------|-------|---------|
| gpt-4o | Complex reasoning | Medium | 128K |
| gpt-4o-mini | Simple tasks | Fast | 128K |
| claude-3-5-sonnet | Nuanced analysis | Medium | 200K |
| gemini-1.5-pro | Large documents | Slow | 2M |

```bash
# Use specific engine
oracle "Complex architectural decision" --engine claude-3-5-sonnet
oracle "Quick question" --engine gpt-4o-mini
oracle "Analyze 500K context" --engine gemini-1.5-pro
```

### Session Management

```bash
# Create session
oracle --session project-alpha "Set up project context"

# Continue session (maintains conversation)
oracle --session project-alpha "What frameworks are we using?"

# List sessions
oracle --session list

# Delete session
oracle --session project-alpha --delete
```

### File Attachment Patterns

**Code Review:**
```bash
oracle "Review for security issues" \
  --file src/auth.ts \
  --file src/middleware.ts \
  --exclude "**/*.test.ts"
```

**Documentation Q&A:**
```bash
oracle "What is the authentication flow?" \
  --file docs/api.md \
  --file docs/auth.md \
  --file README.md
```

**Bug Analysis:**
```bash
oracle "Identify root cause" \
  --file src/crash.log \
  --file src/error-boundary.tsx
```

### Best Practices

1. **Use sessions** for multi-turn conversations
2. **Attach relevant files only** - Don't overload with irrelevant files
3. **Specify engine** based on task complexity
4. **Use structured prompts** - Clear task, file, output format
5. **Exclude unnecessary directories** - `node_modules`, `dist`, `.git`
6. **Stream for long content** - Faster perceived response

---

## gemini

### Purpose
Gemini CLI for one-shot Q&A, summaries, and content generation. Fast, capable model for general-purpose AI tasks.

### Installation

```bash
brew install gemini-cli
```

### Usage

```bash
# Basic Q&A
gemini "Explain quantum computing in simple terms"

# Summarize
gemini "Summarize this article" --file article.md

# Generate content
gemini "Write a blog post about Rust async" --length long

# Code generation
gemini "Create a Python function to parse CSV" --language python

# Creative writing
gemini "Write a haiku about programming" --style creative
```

### Options

| Option | Description |
|--------|-------------|
| `--file, -f` | Input file for context |
| `--length short/medium/long` | Response length |
| `--style creative/technical/plain` | Writing style |
| `--language` | Programming language for code |
| `--stream` | Stream response |
| `--json` | JSON output format |

### Examples

**Quick Q&A:**
```bash
gemini "What is the difference between REST and GraphQL?"
gemini "Explain Docker containers to a beginner"
gemini "Best practices for Python type hints"
```

**File-Based:**
```bash
gemini "Summarize this document" --file report.md
gemini "Extract action items" --file meeting-notes.txt --format json
gemini "Review this code" --file src/main.py
```

**Code Generation:**
```bash
gemini "Create a REST API endpoint" --language python --length medium
gemini "Write a React component" --language typescript --file existing.tsx
gemini "Generate SQL queries" --language sql --file schema.sql
```

**Creative:**
```bash
gemini "Write a short story about AI" --style creative --length long
gemini "Create product descriptions" --file products.csv --length medium
```

### Best Practices

1. **Use for general queries** - Fast and capable
2. **Attach files** for context-aware responses
3. **Specify length** to control response size
4. **Use `--json`** for structured data extraction
5. **Combine with Oracle** for complex multi-file tasks

---

## inter-agent-communication

### Purpose
Coordinate multiple AI agents for complex tasks. Enables agent-to-agent messaging, task delegation, result aggregation, and collaborative problem-solving.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│            Inter-Agent Communication                │
├─────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  Agent A  │  │  Agent B  │  │  Agent C  │       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
│        │              │              │              │
│        └──────────────┼──────────────┘              │
│                       │                             │
│              ┌────────▼────────┐                    │
│              │  Communication  │                    │
│              │    Protocol     │                    │
│              └─────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

### Usage

```bash
# Start coordination session
inter-agent-communication start --agents "codex,claude,pi"

# Delegate task to specific agent
inter-agent-communication delegate --agent codex --task "Implement feature X"

# Broadcast to all agents
inter-agent-communication broadcast --message "Review needed"

# Aggregate results
inter-agent-communication aggregate --session session-id

# Check agent status
inter-agent-communication status
```

### Task Delegation

```bash
# Delegate to Codex (code generation)
inter-agent-communication delegate \
  --agent codex \
  --task "Implement user authentication API" \
  --context "Project uses Express.js, TypeScript" \
  --output /tmp/auth-api.ts

# Delegate to Claude (reasoning)
inter-agent-communication delegate \
  --agent claude \
  --task "Design architecture for microservices" \
  --context "10K users, need horizontal scaling" \
  --format json

# Delegate to Pi (quick tasks)
inter-agent-communication delegate \
  --agent pi \
  --task "Generate test cases for auth module"
```

### Session Management

```bash
# Create session with specific agents
inter-agent-communication create-session \
  --name "feature-development" \
  --agents "codex,claude" \
  --timeout 600

# List active sessions
inter-agent-communication list-sessions

# View session output
inter-agent-communication view-session --id session-123

# Terminate session
inter-agent-communication terminate --id session-123
```

### Result Aggregation

```bash
# Aggregate from all agents in session
inter-agent-communication aggregate --session session-123

# Aggregate specific agent results
inter-agent-communication aggregate \
  --session session-123 \
  --agents "codex,claude"

# Export aggregated results
inter-agent-communication aggregate \
  --session session-123 \
  --format json \
  --output results.json
```

### Patterns

**Pattern 1: Sequential Delegation**
```bash
# Agent A does research, Agent B implements
inter-agent-communication delegate --agent claude --task "Research best practices"
RESULT_A=$(cat /tmp/research.md)
inter-agent-communication delegate --agent codex --task "Implement based on $RESULT_A"
```

**Pattern 2: Parallel Execution**
```bash
# Both agents work simultaneously
inter-agent-communication delegate --agent codex --task "Implement feature X" &
inter-agent-communication delegate --agent claude --task "Review and improve" &

# Wait and aggregate
wait
inter-agent-communication aggregate --session latest
```

**Pattern 3: Consensus Building**
```bash
# Both agents solve, compare results
inter-agent-communication delegate --agent codex --task "Design solution A"
inter-agent-communication delegate --agent claude --task "Design solution B"

# Compare approaches
inter-agent-communication compare --session latest
```

### Configuration

```yaml
# config/inter-agent.yaml
agents:
  codex:
    type: coding
    timeout: 300
    auto_approve: true
  claude:
    type: reasoning
    timeout: 600
    model: claude-3-5-sonnet
  pi:
    type: general
    timeout: 120
    provider: openai

communication:
  protocol: http
  port: 8080
  timeout: 30

defaults:
  broadcast_format: markdown
  result_format: json
```

### Best Practices

1. **Match agent to task** - Codex for code, Claude for reasoning
2. **Set timeouts** - Prevent hanging sessions
3. **Use sessions** - Track multi-step workflows
4. **Aggregate results** - Consolidate agent outputs
5. **Parallel when independent** - Speed up independent tasks

---

## Workflow Examples

### Complex Problem Solving

```bash
# 1. Use Oracle for research
oracle "Research Redis caching strategies for high-traffic APIs" \
  --file docs/architecture.md \
  --engine gemini-1.5-pro > /tmp/redis-research.md

# 2. Delegate implementation to Codex
inter-agent-communication delegate \
  --agent codex \
  --task "Implement Redis caching layer based on /tmp/redis-research.md" \
  --context "Node.js, ioredis client" \
  --output src/cache/redis.ts

# 3. Use Claude for review
inter-agent-communication delegate \
  --agent claude \
  --task "Review Redis implementation for edge cases and performance" \
  --file src/cache/redis.ts \
  --file /tmp/redis-research.md

# 4. Aggregate findings
inter-agent-communication aggregate --session latest
```

### Documentation Generation Pipeline

```bash
# 1. Research phase (Oracle + Gemini)
oracle "Analyze project structure and dependencies" --file . --exclude node_modules
gemini "Summarize recent changes from git log" --length medium

# 2. Draft documentation (Claude)
inter-agent-communication delegate \
  --agent claude \
  --task "Create comprehensive README based on project analysis" \
  --file README.md \
  --file package.json \
  --length long

# 3. Generate formal docs (docs skill)
uv run {baseDir}/scripts/generate_docs.py -p ~/project -t all --ai-design

# 4. Review and refine
inter-agent-communication delegate \
  --agent claude \
  --task "Review generated documentation for accuracy" \
  --file docs/README.md
```

### Code Review Assembly Line

```bash
# 1. Create review session
inter-agent-communication create-session \
  --name "pr-review-142" \
  --agents "codex,claude" \
  --timeout 300

# 2. Parallel review (both agents)
inter-agent-communication delegate \
  --session pr-review-142 \
  --agent codex \
  --task "Code quality and style review"

inter-agent-communication delegate \
  --session pr-review-142 \
  --agent claude \
  --task "Architecture and design review"

# 3. Aggregate all reviews
inter-agent-communication aggregate \
  --session pr-review-142 \
  --format markdown \
  --output pr-review-142.md

# 4. Post to GitHub
gh pr comment 142 --body "$(cat pr-review-142.md)"
```

---

## Research & Intelligence Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Single file analysis | `oracle` | Use --file for context |
| Multi-file comparison | `oracle` | Attach multiple files |
| Session-based conversation | `oracle --session` | Maintains context |
| General Q&A | `gemini` | Fast, capable |
| File summarization | `gemini --file` | --length controls depth |
| Code generation | `gemini --language` | Quick prototypes |
| Multi-agent coordination | `inter-agent-communication` | Delegate, aggregate |
| Parallel agent execution | `inter-agent-communication` | Background delegation |
| Consensus/comparison | `inter-agent-communication` | Compare agent outputs |
| Complex reasoning | `oracle --engine claude-3-5-sonnet` | Larger context |

---

## Best Practices Summary

### Oracle
- Use sessions for conversation continuity
- Exclude unnecessary directories
- Match engine to task complexity
- Structure prompts clearly

### Gemini
- Use for quick, general tasks
- Attach files for context
- Specify length and style
- Good for prototypes and drafts

### Inter-Agent Communication
- Match agent to task type
- Set appropriate timeouts
- Use sessions for tracking
- Aggregate for consolidated output

---

## Next Steps

- **Master Oracle patterns** - File bundling, engine selection, sessions
- **Combine Gemini + Oracle** - Quick queries + deep analysis
- **Build agent teams** - Specialize agents for different tasks
- **Automate workflows** - Multi-step pipelines with delegation
- **Scale coordination** - More agents, complex dependencies

---

**For complete research & intelligence skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
