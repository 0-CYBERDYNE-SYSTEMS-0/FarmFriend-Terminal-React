# Missing Wizards Analysis

**Date:** 2025-12-17
**Requested Features:** Wizards for creating commands, agents, and skills

---

## Summary

The user requested wizards for creating:
1. **Custom commands** (slash commands)
2. **Agents** (subagent configurations)
3. **Skills** (modular tools)

### Current Status

| Feature | Tool Support | CLI Wizard | Status |
|---------|-------------|------------|--------|
| **Skills** | ✅ Yes (`skill_draft`, `skill_apply`) | ❌ No | Tools exist, wizard missing |
| **Commands** | ❌ No | ❌ No | Not implemented (Python TUI only) |
| **Agents** | ⚠️ Partial (model selection only) | ⚠️ Partial | Can set model, not create agent types |

---

## Detailed Analysis

### 1. Skills Creation ⚠️ Tools Exist, No Wizard

**What EXISTS:**
- ✅ `skill_draft` tool - Draft a skill with SKILL.md manifest
- ✅ `skill_apply` tool - Apply draft to create actual skill
- ✅ `skill_documentation` tool - Generate docs for skills
- ✅ `skill_import` tool - Import skills from URL/Git/file
- ✅ `skill_loader` tool - Load skill instructions
- ✅ `skill_sequencer` tool - Execute multi-skill workflows

**Location:** `src/runtime/tools/implementations/skillsWorkflow.ts`

**How to Use Skills (Current Workflow):**
```
1. Ask LLM to use skill_draft tool with:
   - skill_slug (e.g., "my-custom-skill")
   - name (display name)
   - summary (one-line description)
   - instructions (detailed instructions for LLM)
   - Optional: triggers, tags, assets, recommended_tools

2. LLM creates draft in: ff-terminal-workspace/skills/_drafts/{slug}.json

3. Ask LLM to use skill_apply tool with:
   - draft_id (the slug)
   - Optional: force_overwrite, cleanup_draft

4. Skill created in: ff-terminal-workspace/skills/{slug}/SKILL.md

5. Skill automatically available for loading via skill_loader
```

**What's MISSING:**
- ❌ Interactive CLI wizard for skill creation
- ❌ `/wizard skills` or `/skills` command
- ❌ UI for browsing/editing existing skills
- ❌ Skill template picker

**Recommendation:**
Create a **Skills Wizard** in the CLI that:
- Lists existing skills
- Allows creating new skills interactively
- Provides templates for common skill types
- Allows editing skill metadata
- Shows skill usage statistics

---

### 2. Custom Commands ❌ Not Implemented

**What EXISTS:**
- ❌ Nothing - feature not implemented in TypeScript Ink UI

**Evidence:**
From `src/cli/app.tsx` lines 1207-1213:
```typescript
if (command === "command") {
  pushLines({
    kind: "system",
    text: "Custom command management is not implemented in the TS Ink UI yet (Python TUI supports /command create/list/edit/delete/show)."
  });
  setInputValue("");
  return;
}
```

**Python TUI Reference:**
The message explicitly states that the **Python TUI** supports:
- `/command create` - Create custom command
- `/command list` - List commands
- `/command edit` - Edit command
- `/command delete` - Delete command
- `/command show` - Show command details

**What's MISSING:**
- ❌ Command storage/persistence mechanism
- ❌ Command execution system
- ❌ Command templates
- ❌ Any UI/wizard for commands

**Background:**
Custom commands allow users to define reusable slash commands that execute predefined prompts or workflows. For example:
- `/deploy` → "Deploy the current project to production following our standard process"
- `/review` → "Review the git diff and provide detailed code review comments"
- `/test` → "Run all tests and analyze any failures"

**Recommendation:**
Port the **Python TUI command system** to TypeScript:
1. Create command storage in `~/.ff-terminal-commands.json` or workspace
2. Implement command parser in CLI
3. Add `/command` management wizard with:
   - Create command (name, description, prompt template)
   - List all commands
   - Edit existing commands
   - Delete commands
   - Show command details
4. Add `/wizard commands` to main wizard menu
5. Support command variables (e.g., `/deploy {environment}`)

---

### 3. Agent/Subagent Creation ⚠️ Partial (Model Selection Only)

**What EXISTS:**
- ✅ Profile system with model overrides (`src/runtime/profiles/types.ts`)
- ✅ Models wizard (`/models`) to set subagent model
- ✅ `subagent_tool` for LAUNCHING subagents
- ⚠️ Can only configure which MODEL to use, not agent behavior

**Profile Structure (from `types.ts`):**
```typescript
export type Profile = {
  name: string;
  provider: ProviderKind;
  baseUrl?: string;
  model?: string; // Main model

  // Per-purpose model overrides
  subagentModel?: string;
  toolModel?: string;
  webModel?: string;
  imageModel?: string;
  videoModel?: string;
};
```

**Current Capability:**
- ✅ Can set `subagentModel` to choose which LLM model subagents use
- ✅ Can set other purpose-specific models (tool, web, image, video)
- ⚠️ All configuration is MODEL selection only, not agent BEHAVIOR

**What's MISSING:**
- ❌ Agent behavior configuration (system prompts, tools, capabilities)
- ❌ Custom agent role definitions
- ❌ Agent template library
- ❌ Wizard for creating agent configurations
- ❌ UI for browsing/managing agent types

**What Users Might Expect:**
Users likely want to create **specialized agent types** with:
- Custom system prompts/instructions
- Restricted tool access (e.g., read-only agent)
- Specific knowledge domains
- Pre-configured workflows
- Reusable agent templates

**Example Use Cases:**
```
1. Code Review Agent
   - System prompt: "You are a senior code reviewer..."
   - Tools: read_file, grep, search_code (no write access)
   - Focus: Security, performance, best practices

2. Documentation Agent
   - System prompt: "You are a technical writer..."
   - Tools: read_file, write_file, grep
   - Focus: Clear, comprehensive docs

3. Testing Agent
   - System prompt: "You are a QA engineer..."
   - Tools: run_command, read_file, write_file
   - Focus: Test coverage, edge cases
```

**Recommendation:**
Create an **Agent Configuration System**:

1. **Agent Config Storage:**
   ```
   ~/.ff-terminal-agents.json or workspace/agents/
   ```

2. **Agent Definition Schema:**
   ```typescript
   type AgentConfig = {
     id: string;
     name: string;
     description: string;
     systemPrompt: string;
     allowedTools?: string[]; // Whitelist
     deniedTools?: string[]; // Blacklist
     model?: string; // Override model
     maxTurns?: number;
     mode?: "auto" | "read_only" | "planning";
     tags?: string[];
   }
   ```

3. **CLI Wizard (`/wizard agents` or `/agents`):**
   - List existing agent configurations
   - Create new agent config
   - Edit agent config
   - Delete agent config
   - Test agent with sample prompt
   - Import/export agent configs

4. **Integration with subagent_tool:**
   - Extend `subagent_tool` to accept agent config ID
   - Load agent config and apply restrictions
   - Use configured system prompt and tool access

5. **Agent Templates:**
   - Provide built-in templates (reviewer, tester, writer, etc.)
   - Allow users to share agent configs
   - Community agent library

---

## Implementation Priority

### High Priority (Should Implement First)

**1. Skills Wizard** (Easiest - tools already exist)
- Difficulty: Low
- Impact: High (skills are powerful)
- Effort: 2-3 hours
- Requirements:
  - Add wizard mode to `src/cli/app.tsx`
  - Create UI for skill_draft parameters
  - Show preview before applying
  - List existing skills

**2. Custom Commands** (Medium difficulty)
- Difficulty: Medium
- Impact: High (highly requested feature)
- Effort: 4-6 hours
- Requirements:
  - Create command storage system
  - Add command parser to CLI input handler
  - Create `/command` wizard
  - Support command variables
  - Port Python TUI logic

### Medium Priority

**3. Agent Configuration** (Hardest - requires new architecture)
- Difficulty: High
- Impact: Medium-High (power users)
- Effort: 8-12 hours
- Requirements:
  - Design agent config schema
  - Create agent storage system
  - Modify subagent_tool to use configs
  - Create agent wizard
  - Implement tool restrictions
  - Add system prompt override

---

## Recommended Next Steps

1. **Immediate:** Create Skills Wizard
   - Leverage existing `skill_draft` and `skill_apply` tools
   - Add to main wizard menu
   - Provide interactive form for skill creation

2. **Short-term:** Implement Custom Commands
   - Port Python TUI command system
   - Add command storage
   - Create command wizard
   - Enable reusable workflows

3. **Long-term:** Build Agent Configuration
   - Design comprehensive agent config system
   - Create agent templates
   - Build agent wizard
   - Enable advanced use cases

---

## Example Wizard Mockups

### Skills Wizard UI

```
╔═══════════════════════════════════════╗
║           Skills Manager              ║
╚═══════════════════════════════════════╝

Esc: back • ↑/↓: select • Enter: action • n: new skill

Existing Skills (12):

› canvas-design                    (ready)
  component_library                (ready)
  frontend-design                  (ready)
  hf_dataset_creator              (ready)
  responsive_web_design           (ready)
  skill-creator                    (ready)
  website_design                   (ready)

Actions:
  [n] New Skill
  [e] Edit Selected
  [d] Delete Selected
  [i] Import Skill
```

### Command Creation Wizard

```
╔═══════════════════════════════════════╗
║        Create Custom Command          ║
╚═══════════════════════════════════════╝

Command Name: /review
Description: Perform code review on current changes
Prompt Template:

Review the current git diff and provide:
1. Security issues
2. Performance concerns
3. Best practice violations
4. Suggestions for improvement

Variables: (optional)
  {scope} - Optional scope (e.g., "security only")

Tags: code-review, git

[Enter] Save • [Esc] Cancel
```

### Agent Configuration Wizard

```
╔═══════════════════════════════════════╗
║       Agent Configuration             ║
╚═══════════════════════════════════════╝

Agent Name: Code Reviewer
ID: code-reviewer
Description: Senior code reviewer for security and performance

System Prompt:
You are an experienced senior software engineer
specializing in code review...

Model: (inherit main)
Mode: read_only
Max Turns: 5

Allowed Tools (optional - leave blank for all):
  read_file, grep, search_code, semantic_search

Denied Tools:
  write_file, run_command, edit_file

[Enter] Save • [Esc] Cancel • [t] Test Agent
```

---

## Files to Modify

### For Skills Wizard:
1. `src/cli/app.tsx` - Add skills wizard mode
2. Add to WIZARD_ROWS in app.tsx
3. Create skill creation UI panel
4. Wire up to existing `skill_draft` and `skill_apply` tools

### For Custom Commands:
1. `src/cli/app.tsx` - Add command wizard and parser
2. `src/runtime/commands/` (new) - Command storage/execution
3. `src/runtime/commands/storage.ts` - Command persistence
4. `src/runtime/commands/parser.ts` - Command variable substitution

### For Agent Configuration:
1. `src/cli/app.tsx` - Add agent wizard mode
2. `src/runtime/agents/` (new) - Agent config system
3. `src/runtime/agents/types.ts` - Agent config schema
4. `src/runtime/agents/storage.ts` - Agent persistence
5. `src/runtime/tools/implementations/subagentTool.ts` - Use agent configs
6. `src/runtime/agentLoop.ts` - Apply tool restrictions

---

## Conclusion

**Current State:**
- ✅ Skills have full tool support, missing wizard
- ❌ Commands not implemented at all
- ⚠️ Agents only support model selection, not behavior config

**Recommended Implementation Order:**
1. Skills Wizard (quick win, tools exist)
2. Custom Commands (high impact, medium effort)
3. Agent Configuration (advanced feature, high effort)

**User Impact:**
- Skills wizard: Immediate productivity boost
- Custom commands: Significant workflow improvement
- Agent configs: Advanced customization for power users

All three features would significantly enhance the CLI user experience.
