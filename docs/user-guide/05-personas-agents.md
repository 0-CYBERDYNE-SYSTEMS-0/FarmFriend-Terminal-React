# Personas & Agents

**Specialized agent configurations with tool restrictions**

---

## Overview

FF Terminal supports specialized personas and agents—custom agent configurations with restricted tool access, custom system prompts, and specialized behaviors. Agents allow you to create role-specific AI assistants tailored to your workflow.

---

## What Are Agents?

Agents are predefined configurations that:
- Have specific tool restrictions (allowed/denied)
- Include custom system prompts for specialized behavior
- Operate in specific modes (auto, confirm, read_only, planning)
- Have limited execution turns (for safety)
- Can be launched as subagents from the main conversation

---

## Built-in Agents

FF Terminal includes several built-in agents:

### Code Reviewer

**ID:** `code-reviewer`

Specializes in code review with focus on:
- Code quality and best practices
- Security vulnerabilities
- Performance optimizations
- Testing coverage

**Tool Restrictions:**
- **Allowed:** `read_file`, `grep`, `ast_grep`, `search_code`
- **Denied:** `write_file`, `run_command`

**Mode:** `read_only`

### QA Specialist

**ID:** `qa-specialist`

Specializes in quality assurance testing:
- Test case generation
- Bug identification
- Test coverage analysis
- Automated testing strategies

**Tool Restrictions:**
- **Allowed:** All testing tools
- **Denied:** `write_file`, `delete_file`

**Mode:** `auto`

### Technical Writer

**ID:** `technical-writer`

Specializes in technical documentation:
- API documentation
- README files
- Inline code comments
- User guides

**Tool Restrictions:**
- **Allowed:** `read_file`, `grep`, `write_file`
- **Denied:** `run_command`, testing tools

**Mode:** `auto`

### Security Auditor

**ID:** `security-auditor`

Specializes in security vulnerability analysis:
- OWASP Top 10 vulnerabilities
- Dependency security
- Authentication/authorization issues
- Secure coding practices

**Tool Restrictions:**
- **Allowed:** `read_file`, `grep`, `search_code`
- **Denied:** `write_file`, `run_command`

**Mode:** `read_only`

---

## Launching Agents

### From Terminal Interface

```
Use agent "code-reviewer" to analyze this file
```

### From Web Interface

```
Use agent "qa-specialist" to test this component
```

### From FieldView Classic

```
$ use agent "security-auditor" to review this module
```

### Agent Progress Tracking

When an agent is launched, you'll see progress updates:

```
Subagent started: code-reviewer
Task: Analyze authentication module
[Progress: 3/10 tools executed, 1240 tokens]
Subagent complete: code-reviewer (done)
```

---

## Agent Configuration

Agents are defined as JSON files in:
```
<workspace>/agents/<agent-id>.json
```

### Agent Schema

```json
{
  "id": "agent-id",
  "name": "Agent Name",
  "description": "Brief description of what the agent does",
  "systemPromptAddition": "\n\nAdditional system instructions...",
  "allowedTools": ["tool1", "tool2"],
  "deniedTools": ["tool3", "tool4"],
  "mode": "auto",
  "maxTurns": 10
}
```

### Agent Properties

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `id` | string | Unique identifier for the agent | Yes |
| `name` | string | Human-readable name | Yes |
| `description` | string | Brief description | Yes |
| `systemPromptAddition` | string | Additional system instructions | No |
| `allowedTools` | string[] | List of allowed tools | No |
| `deniedTools` | string[] | List of denied tools | No |
| `mode` | string | Execution mode | No |
| `maxTurns` | number | Maximum number of turns | No |

### Execution Modes

| Mode | Description |
|------|-------------|
| `auto` | Automatically approve all tool calls |
| `confirm` | Prompt before each tool call |
| `read_only` | No tool execution, analysis only |
| `planning` | Extract and execute plans step-by-step |

---

## Creating Custom Agents

### Step 1: Create Agent File

Create a new JSON file in `ff-terminal-workspace/agents/`:

```bash
cd ff-terminal-workspace/agents
nano my-agent.json
```

### Step 2: Define Agent Configuration

```json
{
  "id": "api-docs-writer",
  "name": "API Docs Writer",
  "description": "Specializes in writing API documentation",
  "systemPromptAddition": "\n\nYou are an API documentation specialist. Focus on:\n- Clear endpoint descriptions\n- Accurate request/response examples\n- Error handling documentation\n- Authentication details\n\nUse OpenAPI/Swagger format where appropriate.",
  "allowedTools": [
    "read_file",
    "grep",
    "ast_grep",
    "write_file",
    "multi_edit_file"
  ],
  "deniedTools": [
    "run_command",
    "delete_file"
  ],
  "mode": "auto",
  "maxTurns": 15
}
```

### Step 3: Test the Agent

Launch the agent from FF Terminal:

```
Use agent "api-docs-writer" to document this API endpoint
```

### Step 4: Refine as Needed

Adjust the configuration based on results:
- Add/remove tools
- Modify system prompt
- Adjust max turns
- Change execution mode

---

## Tool Restrictions

### Allowed Tools

Agents can only use tools explicitly allowed:

```json
{
  "allowedTools": [
    "read_file",
    "grep",
    "search_code"
  ]
}
```

**Behavior:** Agent can only use these tools. Any attempt to use other tools will be blocked.

### Denied Tools

Agents are explicitly denied certain tools:

```json
{
  "deniedTools": [
    "write_file",
    "run_command",
    "delete_file"
  ]
}
```

**Behavior:** Agent cannot use these tools, even if they're otherwise available.

### No Restrictions

If neither `allowedTools` nor `deniedTools` are specified, the agent has access to all available tools.

---

## System Prompt Additions

The `systemPromptAddition` field allows you to extend the agent's behavior:

```json
{
  "systemPromptAddition": "\n\nYou are a security specialist. Focus on:\n- OWASP Top 10 vulnerabilities\n- SQL injection risks\n- XSS vulnerabilities\n- Authentication/authorization issues\n\nAlways provide:\n1. Risk severity (Critical/High/Medium/Low)\n2. Remediation steps\n3. Code examples of fixes"
}
```

### Best Practices for System Prompts

- **Be specific:** Clearly define the agent's role
- **Provide examples:** Show what good output looks like
- **Set boundaries:** Define what the agent should not do
- **Format requirements:** Specify output format (Markdown, JSON, etc.)

---

## Agent Templates

FF Terminal supports agent templates for common patterns:

### Code Review Template

```json
{
  "id": "code-reviewer",
  "template": "code-review",
  "description": "Code review specialist"
}
```

### QA Specialist Template

```json
{
  "id": "qa-specialist",
  "template": "qa-specialist",
  "description": "Quality assurance specialist"
}
```

### Documentation Template

```json
{
  "id": "technical-writer",
  "template": "documentation",
  "description": "Technical documentation specialist"
}
```

---

## Agent Sessions

### Independent Sessions

Each agent runs in its own session:
- Separate conversation history
- Independent context
- No interference with main session

### Session Storage

Agent sessions are stored in:
```
<workspace>/sessions/agent-<agent-id>-<subagent-id>.jsonl
```

### Subagent Progress

Monitor subagent progress in real-time:

```
Subagent started: code-reviewer
Task: Analyze authentication module
[Progress: 1/10 tools executed, 200 tokens]
[Progress: 3/10 tools executed, 1240 tokens]
Subagent complete: code-reviewer (done)
```

---

## Agent Use Cases

### Code Review

```
Use agent "code-reviewer" to review the authentication module
```

**Best agent:** `code-reviewer` (read-only, code analysis)

### Testing

```
Use agent "qa-specialist" to test this component
```

**Best agent:** `qa-specialist` (auto, testing tools)

### Documentation

```
Use agent "technical-writer" to document this API
```

**Best agent:** `technical-writer` (auto, write tools)

### Security Audit

```
Use agent "security-auditor" to review this codebase
```

**Best agent:** `security-auditor` (read-only, security focus)

---

## Advanced Agent Features

### Nested Agents

Agents can launch other agents:

```
Use agent "code-reviewer" to review this code, then use agent "qa-specialist" to test it
```

### Agent Chains

Create workflows with multiple agents:

```
1. Use agent "security-auditor" to review the code
2. Use agent "code-reviewer" to check for best practices
3. Use agent "technical-writer" to document the changes
```

### Agent Collaboration

Agents can share context:

```
Use agent "security-auditor" to review this code. Take the results and use agent "code-reviewer" to address the findings.
```

---

## Agent Limitations

### Tool Execution Time

Agents have a default timeout for tool execution. Adjust via:

```bash
export FF_AGENT_TOOL_TIMEOUT=30000  # 30 seconds
```

### Max Turns

Agents have a limited number of turns by default. Override in agent config:

```json
{
  "maxTurns": 20
}
```

### Token Limits

Agents are subject to model token limits. Monitor usage:

```
Subagent complete: code-reviewer (done, 5240 tokens)
```

---

## Listing Available Agents

### From Terminal

```bash
/agents
```

### From Web Interface

Click "Agents" in the sidebar.

### From FieldView Classic

Click "Agents" in the navigation.

### Output Format

```
Available Agents:
• code-reviewer         Code review specialist (read-only)
• qa-specialist         QA testing specialist (auto)
• technical-writer      Documentation specialist (auto)
• security-auditor     Security analysis specialist (read-only)
```

---

## Agent Configuration Management

### View Agent Config

```bash
cat ff-terminal-workspace/agents/code-reviewer.json
```

### Edit Agent Config

```bash
nano ff-terminal-workspace/agents/code-reviewer.json
```

### Delete Agent

```bash
rm ff-terminal-workspace/agents/code-reviewer.json
```

### Reload Agents

Agents are reloaded automatically on file change. No manual reload needed.

---

## Troubleshooting

### Agent Not Found

```bash
# Check agent file exists
ls -la ff-terminal-workspace/agents/

# Verify JSON syntax
cat ff-terminal-workspace/agents/my-agent.json | jq .
```

### Agent Not Using Tools

```bash
# Check tool names are correct
# (Must match tool registry names)

# Verify tool is available
/tools
```

### Agent Timing Out

```bash
# Increase timeout
export FF_AGENT_TOOL_TIMEOUT=60000  # 60 seconds
```

### Agent Not Following System Prompt

- Review `systemPromptAddition` for clarity
- Add more specific instructions
- Provide examples in the prompt

---

## Best Practices

### For Security

- Use `read_only` mode for untrusted code
- Deny dangerous tools (`run_command`, `delete_file`)
- Set reasonable `maxTurns` limits
- Review agent configurations regularly

### For Performance

- Use specific tool restrictions to reduce tool selection overhead
- Set appropriate `maxTurns` to limit token usage
- Use `auto` mode for trusted environments
- Monitor token usage and adjust as needed

### For Collaboration

- Create agents for specific team roles (QA, DevOps, Security)
- Share agent configurations across team members
- Document agent purpose and use cases
- Version control agent configurations in Git

---

## Next Steps

1. **[Custom Commands](06-custom-commands.md)** - Create reusable commands
2. **[Planning & Execution](07-planning-execution.md)** - Learn about plan extraction
3. **[Autonomy Loop](08-autonomy-loop.md)** - Set up long-running agents

---

**Built with technical precision and agentic intelligence**
