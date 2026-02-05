# Internal Tools Skills

> **Meta-operations on FF Terminal itself**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Internal tools skills enable meta-operations on FF Terminal. These skills help you understand usage patterns, manage sessions, create new skills, and debug the terminal itself.

### Skills in This Category

| Skill | Purpose | Primary Tool |
|-------|---------|--------------|
| `session-logs` | Search and analyze session logs | jq, ripgrep |
| `model-usage` | Track AI model usage and costs | CodexBar |
| `run-other-cli-agents` | Execute other CLI agents | Shell integration |

---

## session-logs

### Purpose
Search and analyze your own session logs (older/parent conversations) using jq. Retrieve context from past sessions, extract patterns, and learn from history.

### Installation

```bash
brew install jq ripgrep
```

### Usage

```bash
# List recent sessions
session-logs list

# Search sessions
session-logs search "deployment"
session-logs search --from "2024-01-01" "GitHub"

# View specific session
session-logs show session-id

# Extract statistics
session-logs stats --days 30

# Find patterns
session-logs patterns --skill coding-agent
```

### Search Commands

**Basic search:**
```bash
# Find all sessions containing "GitHub"
session-logs search "GitHub"

# Find sessions with specific skill usage
session-logs search --skill "github"
session-logs search --skill "coding-agent"

# Search with date range
session-logs search --from "2024-01-01" --to "2024-01-31" "deployment"
```

**Search with jq:**
```bash
# Find failed commands
session-logs search "error" | jq '.[] | select(.has_error == true)'

# Find sessions with specific tool usage
session-logs search "whisper" | jq '.[] | {timestamp, command}'

# Extract all code generation sessions
session-logs search "codex" | jq '.[] | select(.agent == "codex")'
```

### Statistics and Patterns

**Session statistics:**
```bash
# Last 30 days
session-logs stats --days 30

# Per skill
session-logs stats --skill coding-agent

# Time distribution
session-logs stats --by-hour
session-logs stats --by-day
```

**Pattern extraction:**
```bash
# Most used skills
session-logs patterns --most-used

# Failed commands
session-logs patterns --errors

# Long-running sessions
session-logs patterns --long-sessions
```

### Use Cases

**Resume work:**
```bash
# Find what I was working on
session-logs show $(session-logs list | tail -1 | jq -r '.id')

# Find open tasks
session-logs search "TODO" | jq '.[] | select(.contains("TODO"))'
```

**Learn from patterns:**
```bash
# What skills do I use most?
session-logs stats --days 90 | jq '.'

# Where do I spend time?
session-logs patterns --time-spent
```

**Debug issues:**
```bash
# Find error patterns
session-logs patterns --errors | jq '.'

# Find failed coding sessions
session-logs search "error" | jq '.[] | select(.type == "coding")'
```

### Export and Analysis

```bash
# Export sessions to JSON
session-logs export --from "2024-01-01" > sessions.json

# Analyze with external tools
cat sessions.json | jq '.[] | select(.skill == "coding-agent")' > coding-sessions.json

# Find all prompts for a skill
session-logs search --skill "github" | jq '.[] | {prompt, timestamp}' > github-prompts.json
```

### Best Practices

1. **Regularly review** - Understand your workflows
2. **Export periodically** - Backup for analysis
3. **Learn patterns** - Identify time sinks
4. **Find failures** - Debug recurring issues
5. **Resume context** - Pick up where you left off

---

## model-usage

### Purpose
Track and summarize AI model usage and costs using CodexBar CLI. Get per-model breakdown, current model usage, and scriptable summaries from cost JSON.

### Installation

```bash
brew install steipete/tap/codexbar
```

### Usage

```bash
# Summary of current month
model-usage summary

# Per-model breakdown
model-usage breakdown

# Full model analysis
model-usage full

# Export to JSON
model-usage export --format json

# Compare periods
model-usage compare --last-month
```

### Commands

**Summary:**
```bash
# Current month summary
model-usage summary
# Output:
# Total cost: $12.34
# Codex: $8.50 (68%)
# Claude: $3.84 (31%)
# Gemini: $0.01 (1%)

# Last 30 days
model-usage summary --days 30

# Specific period
model-usage summary --from "2024-01-01" --to "2024-01-31"
```

**Per-model breakdown:**
```bash
# Current month
model-usage breakdown

# Detailed per-model
model-usage breakdown --detailed

# Top models by usage
model-usage breakdown --top 5
```

**Full report:**
```bash
# Complete analysis
model-usage full

# With projections
model-usage full --project
```

**Export:**
```bash
# JSON for scripts
model-usage export --format json > usage.json

# CSV for spreadsheets
model-usage export --format csv > usage.csv

# Time range
model-usage export --from "2024-01-01" --to "2024-01-31" > jan-usage.json
```

### Script Integration

**Budget alerts:**
```bash
#!/bin/bash
# check-budget.sh

COST=$(model-usage summary --json | jq '.total_cost')
LIMIT=50

if (( $(echo "$COST > $LIMIT" | bc -l) )); then
  reminders add "Review AI costs" --list "Finance" --due "today" \
    --notes "Current cost: \$$COCT, limit: \$$LIMIT"
fi
```

**Weekly report:**
```bash
#!/bin/bash
# weekly-usage.sh

echo "=== Weekly AI Model Usage ==="
model-usage summary --days 7

echo -e "\n=== Per Model ==="
model-usage breakdown --days 7

echo -e "\n=== Top Skills ==="
model-usage stats --days 7 | jq '.skills'
```

**Cost optimization:**
```bash
# Find expensive sessions
model-usage breakdown --detailed | jq '.[] | select(.cost > 1.0)'

# Find model mix
model-usage breakdown | jq '.[] | {model, percentage}'
```

### Best Practices

1. **Check weekly** - Stay aware of costs
2. **Set budgets** - Alerts for overspending
3. **Optimize usage** - Use cheaper models for simple tasks
4. **Export regularly** - Track trends over time
5. **Compare periods** - Identify unusual spending

---

## run-other-cli-agents

### Purpose
Execute other CLI agents from within FF Terminal. Enables chaining, orchestration, and composition of multiple AI tools.

### Usage

```bash
# Run single agent
run-other-cli-agents codex "Build a REST API"
run-other-cli-agents claude "Review this code"
run-other-cli-agents gemini "Summarize research"

# Run with parameters
run-other-cli-agents codex --model gpt-5.2-codex --full-auto "Implement feature"

# Parallel execution
run-other-cli-agents codex "Task A" &
run-other-cli-agents claude "Task B" &
wait
```

### Integration with Other Skills

**Combined with coding-agent:**
```bash
# Use Codex for generation, Claude for review
run-other-cli-agents codex "Build authentication module"
run-other-cli-agents claude "Review auth module for security"
```

**Sequential workflows:**
```bash
#!/bin/bash
# complex-task.sh

# Step 1: Research
run-other-cli-agents oracle "Research caching strategies" > research.md

# Step 2: Generate
run-other-cli-agents codex "Implement caching based on research.md"

# Step 3: Review
run-other-cli-agents claude "Review caching implementation for edge cases"
```

**Parallel execution:**
```bash
#!/bin/bash
# parallel.sh

# Run multiple agents simultaneously
run-other-cli-agents codex "Fix issue #78" --output /tmp/issue-78.json &
run-other-cli-agents claude "Fix issue #79" --output /tmp/issue-79.json &
run-other-cli-agents pi "Fix issue #80" --output /tmp/issue-80.json &

# Wait for all
wait

# Aggregate results
echo "=== Issue Fix Results ==="
cat /tmp/issue-*.json
```

### Configuration

```yaml
# config/run-agents.yaml
agents:
  codex:
    path: /usr/local/bin/codex
    default_flags: [--full-auto]
  claude:
    path: /usr/local/bin/claude
    timeout: 300
  gemini:
    path: /usr/local/bin/gemini
  pi:
    path: /usr/local/bin/pi
    provider: openai

defaults:
  timeout: 180
  output_format: json
```

### Best Practices

1. **Use appropriate agent** - Match task to agent strengths
2. **Set timeouts** - Prevent hanging processes
3. **Collect outputs** - Aggregate results for analysis
4. **Parallelize** - Independent tasks run simultaneously
5. **Chain workflows** - Research → Generate → Review

---

## Workflow Examples

### Complete Usage Analysis System

```bash
#!/bin/bash
# monthly-report.sh

echo "=== Model Usage Report ==="
model-usage summary --days 30

echo -e "\n=== Skills Breakdown ==="
model-usage stats --days 30

echo -e "\n=== Session Insights ==="
session-logs stats --days 30

echo -e "\n=== Top Skills Used ==="
session-logs patterns --most-used --days 30

echo -e "\n=== Recommendations ==="
# Simple analysis
if model-usage summary --json | jq '.total_cost' | grep -q "[5-9][0-9]"; then
  echo "💡 Consider using smaller models for simple tasks"
fi
```

### Learning from Session History

```bash
#!/bin/bash
# learn.sh - Analyze patterns in coding sessions

echo "=== Coding Session Patterns ==="
session-logs search --skill coding-agent | jq '.[] | {timestamp, agent, task}'

echo -e "\n=== Most Common Tasks ==="
session-logs patterns --skill coding-agent | jq '.tasks | split("\n") | .[]' | sort | uniq -c | sort -rn | head -10

echo -e "\n=== Failed Sessions ==="
session-logs patterns --errors --skill coding-agent | jq '.'
```

### Multi-Agent Orchestration

```bash
#!/bin/bash
# orchestrate.sh - Complex multi-agent workflow

# Phase 1: Research
echo "Phase 1: Researching..."
RESEARCH=$(run-other-cli-agents oracle "Research event-driven architecture patterns")
echo "$RESEARCH" > phase-1-research.md

# Phase 2: Design (parallel)
echo "Phase 2: Designing (parallel)..."
run-other-cli-agents codex "Design event schema based on research.md" --output phase-2a-design.json &
run-other-cli-agents claude "Design API contracts based on research.md" --output phase-2b-contracts.json &
wait

# Phase 3: Implementation
echo "Phase 3: Implementing..."
run-other-cli-agents codex "Implement event system based on designs" --output phase-3-impl.ts

# Phase 4: Review
echo "Phase 4: Reviewing..."
run-other-cli-agents claude "Review implementation for consistency" --output phase-4-review.md

echo -e "\n=== Complete ==="
ls phase-*.md phase-*.json phase-*.ts 2>/dev/null
```

### Cost-Conscious Development

```bash
#!/bin/bash
# smart-dev.sh - Use models intelligently

TASK=$1
COMPLEXITY=$(echo "$TASK" | wc -w)

if [ $COMPLEXITY -lt 5 ]; then
  # Simple task - use fast/cheap model
  echo "Using Gemini (fast/cheap)..."
  run-other-cli-agents gemini "$TASK"
elif [ $COMPLEXITY -lt 20 ]; then
  # Medium task - use balanced model
  echo "Using Codex (balanced)..."
  run-other-cli-agents codex "$TASK"
else
  # Complex task - use best model
  echo "Using Claude (powerful)..."
  run-other-cli-agents claude "$TASK"
fi

# Track cost
model-usage summary
```

---

## Internal Tools Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Find past session | `session-logs` | `session-logs show` |
| Analyze patterns | `session-logs` | `session-logs patterns` |
| Export sessions | `session-logs` | `session-logs export` |
| Check costs | `model-usage` | `model-usage summary` |
| Per-model breakdown | `model-usage` | `model-usage breakdown` |
| Budget alerts | `model-usage` | Script integration |
| Run Codex | `run-other-cli-agents` | `run-other-cli-agents codex` |
| Run Claude | `run-other-cli-agents` | `run-other-cli-agents claude` |
| Multi-agent workflow | `run-other-cli-agents` | Sequential or parallel |
| Cost optimization | `model-usage` + `session-logs` | Combined analysis |

---

## Best Practices Summary

### Session Logs
- Export periodically for backup
- Analyze weekly to understand workflows
- Find patterns in failures
- Use to resume work quickly

### Model Usage
- Check budget weekly
- Export for trend analysis
- Use cheaper models for simple tasks
- Set up alerts for overspending

### Run Other Agents
- Match agent to task complexity
- Use parallel for independent tasks
- Chain for complex workflows
- Collect and aggregate outputs

---

## Next Steps

- **Master session analysis** - Deep dive into patterns
- **Set up cost tracking** - Budgets, alerts, reports
- **Build orchestration pipelines** - Multi-agent workflows
- **Optimize model selection** - Cost-aware development
- **Create custom reports** - Tailored to your needs

---

**For complete internal tools skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
