# Tool Quick Reference

**Complete reference for all 35+ built-in tools in FF Terminal**

---

## File Operations

### readFile

Read file contents with optional offset/limit for large files.

**Parameters:**
- `path` (required) - File path to read
- `offset` (optional) - Line number to start from (1-indexed)
- `limit` (optional) - Maximum lines to read

**Examples:**
```
Read file: /path/to/file.txt

Read file: /path/to/large.log
Offset: 100
Limit: 50

Read file: package.json
```

**Notes:** Truncates at 2000 lines or 50KB. Use offset/limit for large files.

---

### writeFile

Write content to a file. Creates parent directories if needed.

**Parameters:**
- `path` (required) - File path to write
- `content` (required) - Content to write

**Examples:**
```
Write file: /path/to/file.txt
Content: Hello, World!

Write file: src/app.ts
Content:
export const greet = () => {
  return "Hello!";
};
```

**Notes:** Overwrites existing file. Creates parent directories automatically.

---

### editFile

Edit a file by finding and replacing exact text.

**Parameters:**
- `path` (required) - File path to edit
- `oldText` (required) - Exact text to find
- `newText` (required) - Replacement text

**Examples:**
```
Edit file: src/app.ts
Old text: console.log("old")
New text: console.log("new")
```

**Notes:** oldText must match exactly (including whitespace).

---

### multiEditFile

Apply multiple edits to a file in a single operation.

**Parameters:**
- `path` (required) - File path to edit
- `edits` (required) - Array of {oldText, newText} pairs

**Examples:**
```
Multi edit file: src/app.ts
Edits:
1. Old: "v1"
   New: "v2"
2. Old: "beta"
   New: "stable"
```

**Notes:** All edits applied atomically. Fails if any edit doesn't match.

---

## Search Operations

### grep

Search for patterns in files using grep.

**Parameters:**
- `pattern` (required) - Regex pattern to search
- `path` (required) - Directory path to search
- `options` (optional) - Grep flags (e.g., -i for case-insensitive)

**Examples:**
```
Grep: "function_name" src/
Grep: "TODO" . --include="*.ts"
Grep: "error" logs/ -i
```

**Notes:** Uses grep command-line tool. Supports all grep options.

---

### searchCode

Search code using AST-based analysis.

**Parameters:**
- `query` (required) - Code pattern to search
- `path` (optional) - Directory to search (default: current)

**Examples:**
```
Search code: "function greet()"
Search code: "import React"
Search code: "class Component"
```

**Notes:** Uses AST for accurate code structure matching.

---

### glob

Find files matching glob patterns.

**Parameters:**
- `pattern` (required) - Glob pattern
- `path` (optional) - Directory to search (default: current)

**Examples:**
```
Glob: "**/*.ts"
Glob: "src/**/*.test.ts"
Glob: "*.md"
```

**Notes:** Supports standard glob patterns (**, *, ?, etc.).

---

## Command Execution

### runCommand

Execute shell commands with optional background continuation.

**Parameters:**
- `command` (required) - Shell command to execute
- `workdir` (optional) - Working directory
- `background` (optional) - Run in background
- `timeout` (optional) - Timeout in seconds

**Examples:**
```
Run command: npm install

Run command: npm run build
Background: true
Workdir: /path/to/project

Run command: python script.py
Timeout: 30
```

**Notes:** Use `background: true` for long-running tasks.

---

## Web & Research

### browseWeb

Browse web pages and extract readable content.

**Parameters:**
- `url` (required) - URL to fetch
- `extractMode` (optional) - "markdown" or "text" (default: markdown)
- `maxChars` (optional) - Max characters to return

**Examples:**
```
Browse web: https://example.com
Extract mode: markdown

Browse web: https://docs.python.org
Max chars: 10000
```

**Notes:** Converts HTML to readable text/markdown automatically.

---

### tavilySearch

Search the web using Tavily Search API.

**Parameters:**
- `query` (required) - Search query
- `count` (optional) - Number of results (1-10)
- `search_depth` (optional) - "basic" or "advanced"

**Examples:**
```
Search: latest AI news
Count: 5

Search: TypeScript best practices
Search depth: advanced
```

**Notes:** Real-time web search with AI-powered results.

---

### perplexitySearch

Search using Perplexity AI for AI-powered research.

**Parameters:**
- `query` (required) - Search query
- `options` (optional) - Search options

**Examples:**
```
Perplexity search: climate change data
Perplexity search: Rust vs Go performance
```

**Notes:** Good for complex, multi-faceted queries.

---

### tavilyAdvanced

Advanced web search with filtering and customization.

**Parameters:**
- `query` (required) - Search query
- `topic` (optional) - "general", "news", etc.
- `days` (optional) - Time filter (e.g., 7 for last 7 days)
- `max_results` (optional) - Max results (default: 10)

**Examples:**
```
Tavily advanced: quantum computing news
Topic: news
Days: 3
Max results: 5
```

**Notes:** Supports time-based and topic-based filtering.

---

## Agent Workflow

### subagentTool

Launch a subagent with controlled tool access.

**Parameters:**
- `prompt` (required) - Task description
- `agent` (optional) - Agent configuration ID
- `allowedTools` (optional) - List of allowed tools
- `deniedTools` (optional) - List of denied tools
- `maxTurns` (optional) - Max conversation turns

**Examples:**
```
Subagent: Review this code for security issues
Agent: security-auditor
Allowed tools: ["readFile", "grep", "searchCode"]

Subagent: Write documentation
Max turns: 10
```

**Notes:** Creates isolated agent context with tool restrictions.

---

### agentsWorkflow

Execute agent workflows with multiple subagents.

**Parameters:**
- `workflow` (required) - Workflow configuration
- `context` (optional) - Context data

**Examples:**
```
Agent workflow:
  - agent: code-reviewer
    task: Review changes
  - agent: qa-specialist
    task: Test functionality
```

**Notes:** Orchestrates multiple agents in sequence.

---

### commandsWorkflow

Execute custom slash command workflows.

**Parameters:**
- `command` (required) - Command name
- `args` (optional) - Command arguments

**Examples:**
```
Commands workflow: review
Args: authentication

Commands workflow: deploy
Args: production
```

**Notes:** Commands defined in `ff-terminal-workspace/commands/`.

---

### skillsWorkflow

Execute skill-based workflows.

**Parameters:**
- `skill` (required) - Skill name
- `task` (required) - Task description
- `options` (optional) - Skill-specific options

**Examples:**
```
Skills workflow: remotion-expert
Task: Create demo video
Options:
  duration: 30s
  format: mp4
```

**Notes:** Skills loaded from `skills/` directory.

---

## Task Management

### manageTask

Create, update, and manage tasks.

**Parameters:**
- `action` (required) - "create", "update", "delete", "list", "status"
- `taskId` (optional) - Task ID (for update/delete/status)
- `title` (optional) - Task title
- `description` (optional) - Task description
- `status` (optional) - Task status

**Examples:**
```
Manage task:
  Action: create
  Title: Implement feature
  Description: Add user authentication

Manage task:
  Action: update
  Task ID: task-123
  Status: in-progress

Manage task:
  Action: list
```

**Notes:** Tasks stored in workspace memory.

---

### askOracle

Query the Oracle for guidance and decisions.

**Parameters:**
- `question` (required) - Question to ask
- `context` (optional) - Additional context
- `urgency` (optional) - "low", "medium", "high"

**Examples:**
```
Ask Oracle:
  Question: Should we proceed with this deployment?
  Context: Production environment
  Urgency: high
```

**Notes:** Oracle provides guidance for critical decisions.

---

## Data Analysis

### analyzeData

Analyze data and generate insights.

**Parameters:**
- `data` (required) - Data to analyze (array/object)
- `analysis_type` (optional) - "summary", "trends", "correlations"

**Examples:**
```
Analyze data:
  Data: [1, 2, 3, 4, 5]
  Analysis type: summary

Analyze data:
  Data: {...sales data...}
  Analysis type: trends
```

**Notes:** Supports JSON data, arrays, and structured data.

---

## Session Management

### sessionSummary

Generate session summary.

**Parameters:**
- `sessionId` (optional) - Session ID (default: current session)

**Examples:**
```
Session summary:
  Session ID: abc-123

Session summary:
```

**Notes:** Summarizes conversation and key takeaways.

---

## Planning & Templates

### think

Think through a problem with structured reasoning.

**Parameters:**
- `prompt` (required) - Problem to think through
- `depth` (optional) - "shallow", "medium", "deep"

**Examples:**
```
Think:
  Prompt: How should we architect this system?
  Depth: deep
```

**Notes:** Use for complex decision-making and reasoning.

---

### templates

Use predefined templates.

**Parameters:**
- `template` (required) - Template name
- `variables` (optional) - Template variables

**Examples:**
```
Template:
  Template: react-component
  Variables:
    name: Button
    props: onClick, label
```

**Notes:** Templates defined in runtime configuration.

---

## Skills & Customization

### skills

Load and manage skills.

**Parameters:**
- `action` (required) - "list", "load", "unload", "reload"
- `skill` (optional) - Skill name (for load/unload/reload)

**Examples:**
```
Skills:
  Action: list

Skills:
  Action: load
  Skill: remotion-expert

Skills:
  Action: reload
  Skill: shopify_ops
```

**Notes:** Skills provide specialized capabilities.

---

## Automation

### workflowAutomation

Automate workflows with triggers and actions.

**Parameters:**
- `workflow` (required) - Workflow definition
- `trigger` (optional) - Trigger event

**Examples:**
```
Workflow automation:
  Trigger: file_change
  Actions:
    - run_tests
    - build
```

**Notes:** Define automated workflows in configuration.

---

### quickUpdate

Quick update operation for common tasks.

**Parameters:**
- `type` (required) - Update type
- `target` (required) - Update target
- `value` (required) - New value

**Examples:**
```
Quick update:
  Type: config
  Target: timeout
  Value: 30
```

**Notes:** Shortcut for common configuration updates.

---

## Media & Content

### mediaTools

Work with media files (images, videos, audio).

**Parameters:**
- `action` (required) - "convert", "resize", "crop", "extract"
- `input` (required) - Input file
- `output` (optional) - Output file
- `options` (optional) - Action-specific options

**Examples:**
```
Media tools:
  Action: resize
  Input: image.jpg
  Options:
    width: 800
    height: 600
```

**Notes:** Supports common media operations.

---

### openaiImage

Generate images using OpenAI DALL-E.

**Parameters:**
- `prompt` (required) - Image description
- `size` (optional) - "256x256", "512x512", "1024x1024"
- `model` (optional) - "dall-e-2", "dall-e-3"

**Examples:**
```
OpenAI image:
  Prompt: A futuristic city at sunset
  Size: 1024x1024
  Model: dall-e-3
```

**Notes:** Requires OpenAI API key and model configuration.

---

## Code Analysis

### astGrep

Search and analyze code using AST grep.

**Parameters:**
- `pattern` (required) - AST pattern
- `path` (optional) - Path to search
- `language` (optional) - Language (auto-detected)

**Examples:**
```
AST grep:
  Pattern: "function $NAME($$$ARGS) { $$$BODY }"
  Path: src/

AST grep:
  Pattern: "import $MODULE from $SOURCE"
  Language: typescript
```

**Notes:** Powerful code structure matching and transformation.

---

## Notebook Operations

### notebookEdit

Edit Jupyter notebooks programmatically.

**Parameters:**
- `path` (required) - Notebook path
- `cell` (optional) - Cell index
- `action` (required) - "add", "edit", "delete", "move"
- `content` (optional) - Cell content

**Examples:**
```
Notebook edit:
  Path: analysis.ipynb
  Action: add
  Content: print("Hello, World!")
```

**Notes:** Manipulates `.ipynb` files directly.

---

## macOS Control (if enabled)

### macosControl

Control macOS via AppleScript and system commands.

**Parameters:**
- `action` (required) - Action type
- `app` (optional) - Application name
- `options` (optional) - Action-specific options

**Examples:**
```
macOS control:
  Action: click
  App: Safari
  Options:
    x: 100
    y: 200

macOS control:
  Action: type
  Text: Hello, World!
```

**Notes:** Requires `FF_ALLOW_MACOS_CONTROL=1`. Restricted tool.

---

## Browser Control (if enabled)

### browseWeb (Advanced)

Advanced browser automation with Playwright integration.

**Parameters:**
- `action` (required) - "navigate", "click", "type", "screenshot", etc.
- `url` (optional) - URL for navigate
- `selector` (optional) - CSS selector
- `text` (optional) - Text to type

**Examples:**
```
Browse web:
  Action: navigate
  Url: https://example.com

Browse web:
  Action: type
  Selector: #search-input
  Text: FF Terminal
```

**Notes:** Requires `FF_ALLOW_BROWSER_USE=1`. Restricted tool.

---

## Tool Categories

### File & Text
- readFile
- writeFile
- editFile
- multiEditFile

### Search & Analysis
- grep
- searchCode
- glob
- astGrep
- analyzeData

### Execution
- runCommand

### Web & Research
- browseWeb
- tavilySearch
- perplexitySearch
- tavilyAdvanced

### Agent & Workflow
- subagentTool
- agentsWorkflow
- commandsWorkflow
- skillsWorkflow

### Task Management
- manageTask
- askOracle

### Session
- sessionSummary

### Planning
- think
- templates

### Skills
- skills

### Automation
- workflowAutomation
- quickUpdate

### Media
- mediaTools
- openaiImage

### Notebook
- notebookEdit

### Restricted (Requires Enablement)
- macosControl
- browseWeb (advanced)

---

## Tool Guards

### Restriction Levels

**Safe Tools** (always available):
- readFile, grep, searchCode, glob
- sessionSummary, think, templates
- skills (list action)

**Destructive Tools** (require confirmation in confirm mode):
- writeFile, editFile, multiEditFile
- runCommand
- manageTask (create/update/delete)

**Restricted Tools** (require feature flag):
- macosControl (FF_ALLOW_MACOS_CONTROL)
- browseWeb advanced actions (FF_ALLOW_BROWSER_USE)

### Tool Denylists

Tools can be denied per agent:
```json
{
  "deniedTools": ["writeFile", "runCommand"]
}
```

### Tool Allowlists

Tools can be allowed per agent:
```json
{
  "allowedTools": ["readFile", "grep", "searchCode"]
}
```

---

## Tool Schema Validation

All tools validate input against OpenAI-style schemas:

```typescript
interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, PropertySchema>;
    required?: string[];
  };
}
```

**Built-in schemas:** See `packet/tool_schemas.openai.json`

---

## Tips

1. **Use offset/limit** for large files with readFile
2. **Glob is faster** than grep for file discovery
3. **AST grep** for accurate code structure matching
4. **Multi-edit** for batch file updates (atomic)
5. **Background** for long-running commands
6. **Subagents** for isolated, specialized tasks
7. **Skills** for domain-specific workflows
8. **Oracle** for critical decision guidance
9. **Session summary** for conversation continuity
10. **Think tool** for complex reasoning

---

**Last Updated:** February 2, 2026
