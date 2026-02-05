# Custom Commands

**Create reusable slash commands with variable substitution**

---

## Overview

Custom commands are reusable slash commands defined as Markdown files. They allow you to create your own commands with custom prompts, variable substitution, tool restrictions, and model selection.

---

## Command Structure

Commands are Markdown files with YAML frontmatter:

```markdown
---
description: "Brief description of the command"
allowed-tools: ["tool1", "tool2"]
denied-tools: ["tool3", "tool4"]
model: "main"
mode: "auto"
---

Your command prompt here with $1, $2, $ARGUMENTS substitution.
```

---

## Command Directory

Commands are stored in:
```
ff-terminal-workspace/commands/
```

### Create a Command

```bash
cd ff-terminal-workspace/commands
nano review.md
```

### Example Command

Create `ff-terminal-workspace/commands/review.md`:

```markdown
---
description: "Review code changes and provide feedback"
allowed-tools: ["read_file", "grep", "ast_grep"]
denied-tools: ["write_file", "run_command"]
model: "main"
mode: "read_only"
---

Review the code changes and provide:
1. Security analysis
2. Performance considerations
3. Best practice recommendations

Focus area: $1
```

---

## Command Properties

### YAML Frontmatter

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `description` | string | Brief description of the command | Yes |
| `allowed-tools` | string[] | List of allowed tools | No |
| `denied-tools` | string[] | List of denied tools | No |
| `model` | string | Model to use for execution | No |
| `mode` | string | Execution mode (auto/confirm/read_only/planning) | No |

### Model Options

| Value | Description |
|-------|-------------|
| `main` | Primary conversation model (default) |
| `subagent` | Subagent execution model |
| `tool` | Tool calling model |

### Mode Options

| Value | Description |
|-------|-------------|
| `auto` | Automatically approve all tool calls |
| `confirm` | Prompt before each tool call |
| `read_only` | No tool execution, analysis only |
| `planning` | Extract and execute plans step-by-step |

---

## Variable Substitution

Commands support variable substitution for dynamic content:

| Variable | Description |
|----------|-------------|
| `$1` | First argument |
| `$2` | Second argument |
| `$3` | Third argument |
| `$ARGUMENTS` | All arguments |
| `$SESSION_ID` | Current session ID |
| `$WORKSPACE` | Workspace directory path |

### Examples

**Single argument:**
```markdown
Focus area: $1

# Usage: /review authentication
# Result: Focus area: authentication
```

**Multiple arguments:**
```markdown
Analyze the following:
Language: $1
Framework: $2
Focus: $3

# Usage: /analyze python django security
# Result: 
# Language: python
# Framework: django
# Focus: security
```

**All arguments:**
```markdown
Research topic: $ARGUMENTS

# Usage: /research machine learning transformers attention
# Result: Research topic: machine learning transformers attention
```

---

## Tool Restrictions

Commands can restrict tool access:

### Allowed Tools

```markdown
---
allowed-tools: ["read_file", "grep"]
---
```

Agent can only use these tools.

### Denied Tools

```markdown
---
denied-tools: ["write_file", "delete_file"]
---
```

Agent cannot use these tools.

### Example: Read-Only Review Command

```markdown
---
description: "Perform a security audit"
allowed-tools: ["read_file", "grep", "search_code"]
denied-tools: ["write_file", "run_command", "delete_file"]
mode: "read_only"
---

Perform a security audit of the codebase focusing on:
1. Authentication vulnerabilities
2. Input validation issues
3. Data exposure risks

Provide a detailed report with severity levels.
```

---

## Nested Commands

Commands can call other commands:

### Command Namespaces

Commands can be organized in subdirectories:

```
ff-terminal-workspace/commands/
├── review.md
├── deploy.md
└── git/
    ├── commit.md
    ├── status.md
    └── push.md
```

### Usage

```bash
/review authentication
/git/commit "Fix login bug"
/git/status
/git/push origin main
```

---

## Command Templates

Commands support template variables for common patterns:

### Prompt Templates

```markdown
---
description: "Generate code for a component"
---

Generate a $1 component with:
- TypeScript interfaces
- Error handling
- Unit tests
- Documentation

Component type: $2
```

### Conditional Logic

Commands can include conditional prompts:

```markdown
---
description: "Analyze code with optional focus"
---

$CONDITIONAL(
  "$FOCUS" != "",
  "Focus analysis on: $FOCUS",
  "Perform a general code review"
)
```

---

## Command List

### View Available Commands

```bash
/commands
```

Output:
```
Available Commands:
• review              Review code changes and provide feedback
• deploy              Deploy application to production
• git:commit          Create a git commit
• git:status          Show git status
• git:push            Push to remote
```

### Command Details

View detailed information about a command:

```bash
/review --help
```

---

## Command Examples

### Code Review Command

```markdown
---
description: "Review code changes"
allowed-tools: ["read_file", "grep", "ast_grep"]
denied-tools: ["write_file", "run_command"]
mode: "read_only"
---

Review the code changes in the following files:
$ARGUMENTS

Provide:
1. Code quality score (1-10)
2. Security concerns
3. Performance recommendations
4. Best practice violations
5. Suggested improvements
```

**Usage:** `/review src/auth/*.ts`

### Deployment Command

```markdown
---
description: "Deploy application"
allowed-tools: ["run_command", "read_file"]
denied-tools: ["delete_file"]
mode: "confirm"
---

Deploy the application to $1 environment.

Steps:
1. Run tests
2. Build application
3. Deploy to $1
4. Verify deployment

Environment: $1 (staging/production)
```

**Usage:** `/deploy production`

### Git Commit Command

```markdown
---
description: "Create a git commit"
allowed-tools: ["run_command", "read_file"]
denied-tools: ["delete_file"]
mode: "confirm"
---

Create a git commit with the following message:
$ARGUMENTS

Steps:
1. Show git status
2. Stage changes
3. Create commit
4. Show commit details
```

**Usage:** `/git/commit "Fix authentication bug"`

---

## Command Management

### Create Command

```bash
# Create new command file
touch ff-terminal-workspace/commands/my-command.md

# Edit with your command
nano ff-terminal-workspace/commands/my-command.md
```

### Edit Command

```bash
nano ff-terminal-workspace/commands/review.md
```

### Delete Command

```bash
rm ff-terminal-workspace/commands/review.md
```

### Reload Commands

Commands are reloaded automatically. No manual reload needed.

---

## Advanced Features

### Multi-Line Arguments

```markdown
---
description: "Generate documentation"
---

Generate documentation for the following code:
$ARGUMENTS

Include:
- Function descriptions
- Parameter documentation
- Return value documentation
- Usage examples
```

**Usage:**
```
/docgen """typescript
function add(a: number, b: number): number {
  return a + b;
}
"""
```

### Command Chaining

Commands can chain multiple operations:

```markdown
---
description: "Full code review workflow"
---

$ARGUMENTS

After review, if issues are found:
1. Create a TODO list
2. Prioritize issues by severity
3. Suggest fix approaches
```

---

## Troubleshooting

### Command Not Found

```bash
# Check command file exists
ls -la ff-terminal-workspace/commands/

# Verify command file syntax
cat ff-terminal-workspace/commands/review.md | head -5
```

### Variable Not Substituted

- Ensure variables are in uppercase with `$` prefix
- Check spelling of variable names
- Verify variable is available for the context

### Tool Not Allowed

```bash
# Check tool restrictions in command
cat ff-terminal-workspace/commands/review.md | grep -A5 "allowed-tools"

# Verify tool name matches registry
/tools
```

---

## Best Practices

### Naming Conventions

- Use lowercase with hyphens: `code-review.md`
- Use descriptive names: `security-audit.md`
- Group related commands in subdirectories

### Documentation

- Always include a description
- Document variables in comments
- Provide usage examples

### Tool Restrictions

- Use `read_only` mode for analysis commands
- Use `confirm` mode for destructive operations
- Deny dangerous tools in sensitive commands

---

## Command Reference

### Built-in Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help message |
| `/mode` | Switch execution mode |
| `/tools` | List available tools |
| `/agents` | List available agents |
| `/skills` | List available skills |
| `/clear` | Clear screen |
| `/quit` | Exit application |

### Custom Commands

Custom commands are loaded from:
```
ff-terminal-workspace/commands/
```

---

## Next Steps

1. **[Planning & Execution](07-planning-execution.md)** - Learn about plan extraction
2. **[Autonomy Loop](08-autonomy-loop.md)** - Set up long-running agents
3. **[Task Scheduling](09-task-scheduling.md)** - Schedule recurring tasks

---

**Built with technical precision and agentic intelligence**
