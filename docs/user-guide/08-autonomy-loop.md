# Autonomy Loop

**Long-running autonomous agents with Oracle escalation**

---

## Overview

The autonomy loop enables long-running autonomous agents that can operate independently with configurable Oracle escalation. This is designed for tasks that require extended execution time, such as research, monitoring, or complex development workflows.

---

## Autonomy Modes

### Oracle Modes

| Mode | Description |
|------|-------------|
| `off` | No Oracle intervention |
| `critical` | Oracle only on critical errors |
| `on_complete` | Oracle on task completion |
| `on_stall` | Oracle when task stalls |
| `on_high_risk` | Oracle on high-risk operations |
| `always` | Oracle always active |

### Session Strategies

| Strategy | Description |
|----------|-------------|
| `reuse` | Reuse the same session for all loops |
| `new` | Create a new session for each loop |

---

## Starting Autonomy

### Interactive Setup

Launch the autonomy wizard:

```bash
ff-terminal autonomy --wizard
```

This interactive wizard guides you through:
1. Selecting or creating a prompt file
2. Configuring task file (optional)
3. Setting Oracle mode
4. Configuring stall detection
5. Setting maximum loops

### Command Line Options

```bash
ff-terminal autonomy --prompt-file research.txt --max-loops 10
```

### Options Reference

| Option | Description | Default |
|--------|-------------|---------|
| `--prompt-file` | File containing the autonomy prompt | Required |
| `--tasks-file` | File containing task list | Optional |
| `--max-loops` | Maximum number of loops | 10 |
| `--stall-limit` | Number of stalls before Oracle | 3 |
| `--oracle-mode` | Oracle intervention mode | `on_stall` |
| `--session-strategy` | Session reuse strategy | `reuse` |
| `--headless` | Run without UI | False |

---

## Autonomy Configuration

### Prompt File

Create a prompt file describing the task:

```markdown
# Research Task

Research the latest developments in quantum computing.

Focus on:
1. Recent breakthroughs
2. Major companies involved
3. Potential applications
4. Timeline predictions

Output format:
- Summary (500 words)
- Key findings
- Sources cited
```

### Tasks File

Create a tasks file for structured tasks:

```yaml
tasks:
  - name: Research quantum computing
    query: "Latest quantum computing breakthroughs 2024"
  - name: Analyze companies
    query: "Major players in quantum computing"
  - name: Compile report
    type: synthesis
```

### High Risk Keywords

Configure keywords that trigger Oracle intervention:

```bash
ff-terminal autonomy \
  --prompt-file research.txt \
  --oracle-mode on_high_risk \
  --high-risk-keywords "delete,destroy,rm -rf,drop table"
```

---

## Stall Detection

Stall detection identifies when an agent is stuck:

### Stall Indicators

- No progress for N tool calls
- Repeated tool calls with same arguments
- No output for extended period
- Circular reasoning patterns

### Configure Stall Detection

```bash
ff-terminal autonomy \
  --prompt-file research.txt \
  --stall-limit 5 \
  --oracle-mode on_stall
```

### Stall Actions

When a stall is detected:
1. Log the stall event
2. Notify Oracle (if configured)
3. Continue or abort based on Oracle mode

---

## Oracle System

The Oracle is a human-in-the-loop escalation system:

### Oracle Triggers

| Trigger | Description |
|---------|-------------|
| Error | Tool execution error |
| Stall | No progress detected |
| Completion | Task reports completion |
| High Risk | Dangerous operation detected |
| Max Loops | Reached maximum loops |

### Oracle Actions

| Action | Description |
|--------|-------------|
| `allow` | Allow operation to continue |
| `block` | Block the operation |
| `need_user` | Require user confirmation |
| `modify` | Suggest modification |

### Oracle Configuration

```json
{
  "oracle": {
    "mode": "on_stall",
    "highRiskKeywords": ["delete", "destroy", "drop"],
    "stallLimit": 3,
    "notification": "both"  // terminal, email, slack
  }
}
```

---

## Autonomy Loop Lifecycle

### Loop States

```
┌─────────────────────────────────────────────────────────┐
│ Autonomy Loop States                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │ START   │──►│ IN_PROGRESS │──►│ COMPLETE        │   │
│  └─────────┘   │             │   └─────────────────┘   │
│                │    ┌────────┴────────┐                │
│                │    │                 │                │
│                │    ▼                 ▼                │
│                │  ┌─────────┐   ┌─────────────┐        │
│                └──│  STALL  │──►│   ORACLE    │        │
│                   └─────────┘   │             │        │
│                                  └──────┬──────┘        │
│                                         │               │
│                                         ▼               │
│                                  ┌─────────────┐        │
│                                  │   RESUME    │        │
│                                  │    ABORT    │        │
│                                  └─────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Loop Execution

Each loop iteration:
1. Execute agent turn
2. Check for completion
3. Check for stalls
4. Check for errors
5. Repeat or exit

---

## Monitoring Autonomy

### Real-Time Status

```
┌─────────────────────────────────────────────────────────┐
│ Autonomy Status                                         │
├─────────────────────────────────────────────────────────┤
│ Prompt: research.txt                                    │
│ Loops: 3/10 (30%)                                       │
│ Current: Research major companies                       │
│ Status: In Progress                                     │
│ Oracle: on_stall                                        │
│ Stall Count: 0                                          │
├─────────────────────────────────────────────────────────┤
│ Progress:                                               │
│ ✓ Research quantum breakthroughs                       │
│ ✓ Analyze major companies                              │
│ ○ Compile final report    ← Current                     │
└─────────────────────────────────────────────────────────┘
```

### Progress Tracking

- **Loop counter:** Current / maximum loops
- **Step progress:** Current task in the task list
- **Tool calls:** Number of tool executions
- **Tokens:** Total tokens used
- **Duration:** Elapsed time

---

## Autonomy Logs

Logs are stored in:

```
<workspace>/logs/autonomy/
├── <session-id>/
│   ├── loop-01.jsonl
│   ├── loop-02.jsonl
│   └── summary.json
```

### Log Format

```json
{
  "timestamp": "2026-02-02T18:00:00Z",
  "loop": 1,
  "status": "in_progress",
  "tokens": 5420,
  "toolCalls": 15,
  "progress": {
    "completed": 2,
    "total": 5
  },
  "oracleEvents": []
}
```

---

## Configuration Reference

### Environment Variables

```bash
# Maximum loops
export FF_AUTONOMY_MAX_LOOPS=10

# Stall detection
export FF_AUTONOMY_STALL_LIMIT=3

# Oracle mode
export FF_AUTONOMY_ORACLE_MODE=on_stall

# Session strategy
export FF_AUTONOMY_SESSION_STRATEGY=reuse

# High risk keywords
export FF_AUTONOMY_HIGH_RISK_KEYWORDS="delete,destroy,drop"
```

### Profile Configuration

```json
{
  "autonomy": {
    "maxLoops": 10,
    "stallLimit": 3,
    "oracleMode": "on_stall",
    "sessionStrategy": "reuse",
    "highRiskKeywords": ["delete", "destroy", "rm -rf"]
  }
}
```

---

## Use Cases

### Research Tasks

```bash
ff-terminal autonomy \
  --prompt-file research.txt \
  --max-loops 5 \
  --oracle-mode on_complete
```

**Use case:** Automated research with Oracle review on completion.

### Development Tasks

```bash
ff-terminal autonomy \
  --prompt-file implement-feature.txt \
  --max-loops 20 \
  --stall-limit 5 \
  --oracle-mode on_stall
```

**Use case:** Long-running development with stall detection.

### Monitoring Tasks

```bash
ff-terminal autonomy \
  --prompt-file monitor.txt \
  --max-loops 100 \
  --oracle-mode critical
```

**Use case:** Continuous monitoring with critical error escalation.

---

## Troubleshooting

### Agent Not Making Progress

```bash
# Check stall detection
ff-terminal autonomy status

# Review logs
cat <workspace>/logs/autonomy/<session>/loop-*.jsonl

# Force Oracle intervention
ff-terminal autonomy oracle --force
```

### Too Many Loops

```bash
# Set lower max-loops
ff-terminal autonomy --prompt-file task.txt --max-loops 5

# Review loop efficiency
ff-terminal autonomy analyze
```

### Oracle Not Triggering

```bash
# Verify Oracle mode
ff-terminal autonomy status | grep Oracle

# Test with high-risk operation
ff-terminal autonomy --oracle-mode always
```

---

## Best Practices

### For Research

- Use `on_complete` Oracle mode
- Set reasonable max loops (5-10)
- Create detailed prompt files
- Review completion before accepting

### For Development

- Use `on_stall` Oracle mode
- Set stall limit based on complexity
- Use `reuse` session strategy
- Monitor progress regularly

### For Safety

- Always use some Oracle mode
- Set high-risk keywords
- Use `new` session strategy for isolation
- Review logs after completion

---

## Autonomy API

### Programmatic Execution

```typescript
import { runAutonomyLoop } from './runtime/autonomy/index.js';

const result = await runAutonomyLoop({
  promptFile: 'research.txt',
  maxLoops: 10,
  stallLimit: 3,
  oracleMode: 'on_stall'
});

console.log(result.summary);
```

### Event Listeners

```typescript
import { onAutonomyEvent } from './runtime/autonomy/index.js';

onAutonomyEvent('stall', (event) => {
  console.log('Agent stalled:', event);
});

onAutonomyEvent('oracle', (event) => {
  console.log('Oracle intervention:', event);
});
```

---

## Examples

### Example 1: Simple Research

```bash
ff-terminal autonomy --prompt-file quantum-research.txt --max-loops 5
```

**Output:**
```
Loops: 1/5 - Researching breakthroughs
Loops: 2/5 - Analyzing companies
Loops: 3/5 - Compiling findings
Loops: 4/5 - Writing report
Loops: 5/5 - Complete
```

### Example 2: Development with Stall Detection

```bash
ff-terminal autonomy \
  --prompt-file implement-api.txt \
  --max-loops 15 \
  --stall-limit 3 \
  --oracle-mode on_stall
```

**Output:**
```
Loops: 1/15 - Creating models
Loops: 2/15 - Setting up routes
[Stall detected at loop 3]
Oracle notified: Agent stalled on database schema
Oracle decision: RESUME with modified approach
Loops: 3/15 - Creating simplified schema
```

---

## Next Steps

1. **[Task Scheduling](09-task-scheduling.md)** - Schedule recurring tasks
2. **[Hooks System](10-hooks-system.md)** - Configure validation hooks
3. **[WhatsApp Integration](11-whatsapp-integration.md)** - Access via WhatsApp

---

**Built with technical precision and agentic intelligence**
