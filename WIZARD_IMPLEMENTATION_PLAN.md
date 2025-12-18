# Wizard Implementation Plan - Simplified Approach

**Date:** 2025-12-17
**Approach:** Natural language → Simple file-based configs

---

## Overview

Based on research of [Claude Code slash commands](https://code.claude.com/docs/en/slash-commands) and similar CLI agents, we'll implement three wizards using a **simple file-based approach**:

1. **Skills Wizard** → Uses existing `skill_draft` tool with natural language input
2. **Commands Wizard** → Creates markdown files in `ff-terminal-workspace/commands/`
3. **Agents Wizard** → Creates config files in `ff-terminal-workspace/agents/`

---

## 1. Commands Wizard - Markdown Files in Folder

### How It Works (Claude Code Pattern)

Commands are **just markdown files** in a commands folder:
- `ff-terminal-workspace/commands/review.md` → `/review` command
- File content = prompt to inject when command is typed
- Optional YAML frontmatter for metadata

### File Structure

```markdown
---
description: "Review git changes and provide feedback"
allowed-tools: ["read_file", "grep", "run_command"]
model: "main"  # or "subagent", "tool", etc.
argument-hint: "[scope]"
---

Review the current git diff and provide detailed feedback on:
1. Security issues
2. Performance concerns
3. Best practices violations
4. Code quality improvements

Focus area: $1
```

### Supported Variables

- `$1`, `$2`, `$3` - Positional arguments
- `$ARGUMENTS` - All arguments as string
- Standard bash-style variable substitution

### Directory Structure

```
ff-terminal-workspace/
  commands/
    review.md           → /review
    deploy.md           → /deploy
    test.md             → /test
    git/
      commit.md         → /git:commit
      status.md         → /git:status
```

### Commands Wizard UI Flow

```
╔═══════════════════════════════════════╗
║        Commands Manager               ║
╚═══════════════════════════════════════╝

Esc: back • ↑/↓: select • Enter: action • n: new

Existing Commands (5):
› review - Review git changes
  deploy - Deploy to production
  test - Run all tests
  git:commit - Create detailed commit
  git:status - Analyze git status

[n] New Command
[e] Edit Selected
[d] Delete Selected
[v] View Command File
```

**When creating new command:**

```
╔═══════════════════════════════════════╗
║        Create Command                 ║
╚═══════════════════════════════════════╝

Command name: review
Description: Review git changes and provide feedback

Prompt (type freely, use $1, $2, or $ARGUMENTS for args):

› Review the current git diff and provide:
  1. Security issues
  2. Performance concerns
  3. Best practices

Advanced (optional):
  Allowed tools: (leave blank for all)
  Model: (inherit main)
  Argument hint: [focus-area]

[Enter] Save • [Esc] Cancel
```

### Implementation Requirements

**Files to create:**
1. Command loader in runtime: `src/runtime/commands/loader.ts`
2. Command parser: `src/runtime/commands/parser.ts`
3. Command wizard in CLI: Add to `src/cli/app.tsx`

**Command Loader (`loader.ts`):**
```typescript
// Load commands from workspace/commands/
export function loadCommands(workspaceDir: string): Map<string, Command> {
  const commandsDir = path.join(workspaceDir, "commands");
  if (!fs.existsSync(commandsDir)) return new Map();

  const commands = new Map<string, Command>();

  // Recursively find all .md files
  const files = glob.sync("**/*.md", { cwd: commandsDir });

  for (const file of files) {
    const slug = file.replace(/\.md$/, "").replace(/\//g, ":");
    const content = fs.readFileSync(path.join(commandsDir, file), "utf8");

    // Parse frontmatter if present
    const { frontmatter, body } = parseFrontmatter(content);

    commands.set(slug, {
      slug,
      filePath: file,
      description: frontmatter.description || "",
      allowedTools: frontmatter["allowed-tools"],
      model: frontmatter.model,
      argumentHint: frontmatter["argument-hint"],
      template: body.trim()
    });
  }

  return commands;
}
```

**Command Parser (`parser.ts`):**
```typescript
// Substitute variables in command template
export function parseCommand(template: string, args: string[]): string {
  let result = template;

  // Replace $ARGUMENTS with all args joined
  result = result.replace(/\$ARGUMENTS/g, args.join(" "));

  // Replace positional args $1, $2, etc.
  for (let i = 0; i < args.length; i++) {
    const regex = new RegExp(`\\$${i + 1}`, "g");
    result = result.replace(regex, args[i] || "");
  }

  return result;
}
```

**CLI Integration (`app.tsx`):**
```typescript
// In useInput handler, after checking built-in commands:
if (trimmed.startsWith("/")) {
  // ... existing built-in command checks ...

  // Check custom commands
  const customCommands = loadCommands(workspaceDir);
  const [cmdRaw, ...argsRaw] = trimmed.slice(1).split(/\s+/).filter(Boolean);
  const command = cmdRaw.toLowerCase();

  if (customCommands.has(command)) {
    const cmd = customCommands.get(command)!;
    const prompt = parseCommand(cmd.template, argsRaw);

    pushLines({ kind: "system", text: `Executing /${command}...` });
    sendTurn(prompt);
    setInputValue("");
    return;
  }
}
```

---

## 2. Skills Wizard - Natural Language → skill_draft Tool

### How It Works

The wizard collects natural language input from the user and calls the existing `skill_draft` tool with those parameters.

### Skills Wizard UI Flow

```
╔═══════════════════════════════════════╗
║        Skills Manager                 ║
╚═══════════════════════════════════════╝

Esc: back • ↑/↓: select • Enter: action • n: new

Existing Skills (12):
› canvas-design - Create canvas-based visual designs
  component_library - Component design library
  frontend-design - Frontend interface design
  [... more skills ...]

Drafts (2):
  my-new-skill (draft)
  api-tester (draft)

[n] New Skill
[e] Edit Selected
[d] Delete Selected
[a] Apply Draft (converts to full skill)
```

**When creating new skill:**

```
╔═══════════════════════════════════════╗
║        Create Skill                   ║
╚═══════════════════════════════════════╝

Step 1/4: Basic Info

Skill slug: api-tester
Name: API Testing Expert
Summary: Test and debug API endpoints

[Enter] Next • [Esc] Cancel

---

Step 2/4: Instructions

Instructions (describe what this skill should do):

› You are an API testing expert. When activated:
  1. Analyze the API endpoint provided
  2. Generate test cases for common scenarios
  3. Test for edge cases and error handling
  4. Provide detailed testing report

[Enter] Next • [Backspace] Previous

---

Step 3/4: Configuration (optional)

Triggers (one per line, blank to skip):
  › api test
    test api
    endpoint test

Recommended tools (comma separated):
  › run_command, read_file, write_file

Tags:
  › testing, api, debugging

[Enter] Next • [Backspace] Previous

---

Step 4/4: Review

Skill: API Testing Expert (api-tester)
Summary: Test and debug API endpoints

Instructions:
  You are an API testing expert...

Triggers: api test, test api, endpoint test
Tools: run_command, read_file, write_file
Tags: testing, api, debugging

[Enter] Save Draft • [Backspace] Edit • [Esc] Cancel
```

### Implementation

**Wizard state machine:**
```typescript
type SkillWizardStep =
  | "list"      // Browse existing skills
  | "basic"     // slug, name, summary
  | "instructions" // main instructions
  | "config"    // triggers, tools, tags
  | "review";   // preview before save

interface SkillDraft {
  slug: string;
  name: string;
  summary: string;
  instructions: string;
  triggers?: string[];
  tags?: string[];
  recommendedTools?: string[];
  assets?: Record<string, string>;
}
```

**On final save, call existing tool:**
```typescript
async function saveskillDraft(draft: SkillDraft) {
  // Call existing skill_draft tool
  const result = await skillDraftTool({
    skill_slug: draft.slug,
    name: draft.name,
    summary: draft.summary,
    instructions: draft.instructions,
    triggers: draft.triggers,
    tags: draft.tags,
    recommended_tools: draft.recommendedTools,
    assets: draft.assets
  });

  pushLines({ kind: "system", text: `✓ Skill draft saved: ${draft.slug}` });
  pushLines({ kind: "system", text: `Use /wizard skills → Apply Draft to activate` });
}
```

**To apply draft:**
```typescript
async function applySkillDraft(draftId: string) {
  const result = await skillApplyTool({
    draft_id: draftId,
    force_overwrite: false,
    cleanup_draft: true
  });

  pushLines({ kind: "system", text: `✓ Skill activated: ${draftId}` });
  pushLines({ kind: "system", text: `Available via skill_loader tool` });
}
```

---

## 3. Agents Wizard - System Message Configs

### How It Works

Agent configs are **simple JSON files** that modify the system prompt and behavior when a specific agent is invoked.

### File Structure

```json
{
  "id": "code-reviewer",
  "name": "Code Reviewer",
  "description": "Senior code reviewer for security and performance",
  "systemPromptAddition": "\n\nYou are an experienced senior software engineer specializing in code review. Focus on:\n- Security vulnerabilities\n- Performance bottlenecks\n- Best practices violations\n- Code quality improvements\n\nProvide actionable, specific feedback.",
  "allowedTools": ["read_file", "grep", "search_code", "semantic_search"],
  "deniedTools": ["write_file", "edit_file", "run_command"],
  "mode": "read_only",
  "model": "inherit",
  "maxTurns": 5,
  "tags": ["review", "security", "quality"]
}
```

### Directory Structure

```
ff-terminal-workspace/
  agents/
    code-reviewer.json
    tester.json
    writer.json
    templates/
      reviewer.template.json
      analyzer.template.json
```

### Agents Wizard UI Flow

```
╔═══════════════════════════════════════╗
║        Agents Manager                 ║
╚═══════════════════════════════════════╝

Esc: back • ↑/↓: select • Enter: action • n: new

Configured Agents (3):
› code-reviewer - Code review specialist
  tester - QA and testing expert
  writer - Documentation specialist

Templates (5):
  reviewer, analyzer, debugger, refactor, security

[n] New Agent
[t] New from Template
[e] Edit Selected
[d] Delete Selected
[test] Test Agent
```

**When creating new agent:**

```
╔═══════════════════════════════════════╗
║        Create Agent                   ║
╚═══════════════════════════════════════╝

Step 1/3: Identity

Agent ID: code-reviewer
Name: Code Reviewer
Description: Senior code reviewer for security and performance

[Enter] Next • [Esc] Cancel

---

Step 2/3: Behavior

System Prompt Addition (describe agent's role and focus):

› You are an experienced senior software engineer
  specializing in code review. Focus on:
  - Security vulnerabilities
  - Performance bottlenecks
  - Best practices violations

  Provide actionable, specific feedback.

Operation Mode:
  ( ) auto
  (•) read_only
  ( ) planning

Model: (• inherit) ( specific: _________ )

[Enter] Next • [Backspace] Previous

---

Step 3/3: Tool Access

Tool Access:
  (•) Restrict to specific tools (recommended for specialized agents)
  ( ) Allow all tools
  ( ) Deny specific tools

Allowed Tools (leave blank for all):
  › read_file, grep, search_code, semantic_search

Max Turns: 5

Tags: review, security, quality

[Enter] Save • [Backspace] Previous • [Esc] Cancel
```

### Integration with subagent_tool

**Modify `subagentTool.ts` to load agent configs:**

```typescript
import { loadAgentConfig } from "../agents/loader.js";

export async function subagentTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as {
    instructions?: string;
    agent?: string;  // NEW: optional agent ID
    // ... other args
  };

  let systemPrompt = baseSystemPrompt;
  let allowedTools: string[] | undefined;
  let mode: OperationMode = "auto";

  // If agent specified, load config
  if (args.agent) {
    const config = loadAgentConfig(args.agent, workspaceDir);
    if (config) {
      systemPrompt += config.systemPromptAddition;
      allowedTools = config.allowedTools;
      mode = config.mode || "auto";

      pushLines({
        kind: "system",
        text: `🤖 Launching ${config.name} agent...`
      });
    }
  }

  // Filter tools if restricted
  const availableTools = allowedTools
    ? allTools.filter(t => allowedTools.includes(t.name))
    : allTools;

  // Launch subagent with configured behavior
  // ...
}
```

**User invocation:**

```
User: "Use the code-reviewer agent to review this file"

LLM: *calls subagent_tool with agent="code-reviewer"*
→ Loads code-reviewer.json config
→ Adds system prompt addition
→ Restricts to allowed tools
→ Sets read_only mode
→ Launches subagent with these constraints
```

---

## Implementation Checklist

### Phase 1: Commands Wizard (Highest Priority)

**Backend (Runtime):**
- [ ] Create `src/runtime/commands/types.ts` - Type definitions
- [ ] Create `src/runtime/commands/loader.ts` - Load commands from folder
- [ ] Create `src/runtime/commands/parser.ts` - Variable substitution
- [ ] Create `src/runtime/commands/storage.ts` - Save/delete commands
- [ ] Add command scanning to startup (cache commands list)

**Frontend (CLI):**
- [ ] Add `commands` mode to app.tsx
- [ ] Create commands list UI (like mounts/models)
- [ ] Create command creation wizard (multi-step form)
- [ ] Add command edit mode
- [ ] Add to main `/wizard` menu
- [ ] Integrate command execution into input handler

**Testing:**
- [ ] Create sample commands in workspace
- [ ] Test command loading
- [ ] Test variable substitution
- [ ] Test subdirectory namespacing

### Phase 2: Skills Wizard

**Frontend (CLI):**
- [ ] Add `skills` mode to app.tsx
- [ ] Create skills list UI (show existing + drafts)
- [ ] Create skill creation wizard (4-step form)
- [ ] Add skill edit mode (edit drafts)
- [ ] Add apply draft action (calls skill_apply tool)
- [ ] Add to main `/wizard` menu

**Integration:**
- [ ] Wire up to existing `skill_draft` tool
- [ ] Wire up to existing `skill_apply` tool
- [ ] Display skill loading status
- [ ] Show skill documentation option

**Testing:**
- [ ] Create test skill via wizard
- [ ] Apply draft and verify SKILL.md created
- [ ] Test skill_loader with new skill

### Phase 3: Agents Wizard

**Backend (Runtime):**
- [ ] Create `src/runtime/agents/types.ts` - Type definitions
- [ ] Create `src/runtime/agents/loader.ts` - Load agent configs
- [ ] Create `src/runtime/agents/storage.ts` - Save/delete agents
- [ ] Create `src/runtime/agents/templates.ts` - Built-in templates
- [ ] Modify `subagentTool.ts` to use agent configs

**Frontend (CLI):**
- [ ] Add `agents` mode to app.tsx
- [ ] Create agents list UI (show configs + templates)
- [ ] Create agent creation wizard (3-step form)
- [ ] Add agent edit mode
- [ ] Add template instantiation
- [ ] Add test agent functionality
- [ ] Add to main `/wizard` menu

**Testing:**
- [ ] Create test agent config
- [ ] Test agent via subagent_tool
- [ ] Verify tool restrictions work
- [ ] Verify system prompt addition works

---

## Questions & Clarifications Needed

### 1. Commands

**Q:** Should commands support bash execution like Claude Code's `!command` prefix?
- If yes, need to add allowed-tools permission check
- If no, simpler - just prompt injection

**Q:** Should we support command aliases?
- E.g., `/r` → `/review`, `/d` → `/deploy`
- Could add `aliases: ["r", "rev"]` to frontmatter

**Q:** Argument validation?
- Required vs optional args
- Argument type hints
- Or just let LLM handle it?

### 2. Skills

**Q:** Should wizard support adding skill assets (files)?
- Current: Can specify assets in skill_draft
- Wizard could have file picker/text input
- Or skip for simplicity?

**Q:** Should we auto-trigger skill loading when certain keywords detected?
- E.g., "api test" → suggest loading api-tester skill
- Or only manual via skill_loader tool?

### 3. Agents

**Q:** How should tool restrictions be enforced?
- Option A: Filter tools before passing to subagent (recommended)
- Option B: Add to system prompt (trust LLM not to use)
- Option C: Both (defense in depth)

**Q:** Should agents have priority over default subagent?
- When user says "review this", does it:
  - A: Automatically use code-reviewer agent if available
  - B: Only use if explicitly requested
  - C: Ask user which agent to use

**Q:** Agent inheritance/composition?
- E.g., "code-reviewer-strict" extends "code-reviewer" + extra rules
- Or keep configs flat and simple?

### 4. General

**Q:** Workspace location for these folders?
- Commands: `ff-terminal-workspace/commands/`
- Skills: `ff-terminal-workspace/skills/` (already exists)
- Agents: `ff-terminal-workspace/agents/`
- Correct?

**Q:** Should wizards support import/export?
- Share commands/agents with team
- Import from URL or file
- Or manual copy-paste of files?

**Q:** Keyboard shortcuts in wizards?
- `c` for create, `e` for edit, `d` for delete?
- Or rely on arrow keys + Enter?

---

## Estimated Effort

**Commands Wizard:** 4-6 hours
- Backend: 2-3 hours (loader, parser, storage)
- Frontend: 2-3 hours (wizard UI, integration)

**Skills Wizard:** 3-4 hours
- Frontend only (tools exist): 3-4 hours

**Agents Wizard:** 5-7 hours
- Backend: 3-4 hours (loader, storage, subagent integration)
- Frontend: 2-3 hours (wizard UI)

**Total:** 12-17 hours for all three wizards

---

## Next Steps

1. **Answer questions above** to finalize design
2. **Prioritize implementation order** (recommend: Commands → Skills → Agents)
3. **Start with Commands wizard** (most immediately useful)
4. **Test each wizard thoroughly** before moving to next
5. **Document usage** in CLAUDE.md

Ready to start implementing once we clarify the questions above!

---

## Sources

- [Claude Code Slash Commands Documentation](https://code.claude.com/docs/en/slash-commands)
- [Claude Code Tips & Tricks: Custom Slash Commands](https://cloudartisan.com/posts/2025-04-14-claude-code-tips-slash-commands/)
- [How to Create Custom Slash Commands in Claude Code](https://en.bioerrorlog.work/entry/claude-code-custom-slash-command)
- [GitHub: awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [GitHub: wshobson/commands](https://github.com/wshobson/commands)
