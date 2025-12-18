# Wizard Implementation - Current Status

**Date:** 2025-12-17
**Status:** ✅ Core runtime complete, UI integration in progress

---

## ✅ Completed

### 1. Commands System (100% Backend Complete)

**Files Created:**
- ✅ `src/runtime/commands/types.ts` - Type definitions
- ✅ `src/runtime/commands/parser.ts` - Variable substitution ($1, $2, $ARGUMENTS)
- ✅ `src/runtime/commands/loader.ts` - Load/list/get commands
- ✅ `src/runtime/commands/storage.ts` - Save/delete commands, example commands

**Functionality:**
- ✅ Load commands from `ff-terminal-workspace/commands/*.md`
- ✅ Parse YAML frontmatter (description, allowed-tools, model, aliases)
- ✅ Parse command body with variable substitution
- ✅ Support nested commands: `commands/git/commit.md` → `/git:commit`
- ✅ Support aliases
- ✅ Save new commands
- ✅ Delete commands

**Build Status:** ✅ Compiles successfully

---

### 2. Agents System (100% Backend Complete)

**Files Created:**
- ✅ `src/runtime/agents/types.ts` - AgentConfig, AgentTemplate types
- ✅ `src/runtime/agents/loader.ts` - Load/list/get agent configs
- ✅ `src/runtime/agents/templates.ts` - 6 built-in agent templates:
  - Code Reviewer (security, performance, quality)
  - QA & Testing Specialist (test coverage, edge cases)
  - System Architect (design patterns, scalability)
  - Technical Writer (documentation, guides)
  - Bug Debugger (root cause analysis)
  - Code Refactorer (code quality, maintainability)

**Functionality:**
- ✅ Load agent configs from `ff-terminal-workspace/agents/*.json`
- ✅ List agent configs sorted by name
- ✅ Get built-in templates
- ✅ Save agent configs
- ✅ Delete agent configs

**Build Status:** ✅ Compiles successfully

---

### 3. App.tsx Integration (Partial - 50% Complete)

**Updates Made:**
- ✅ Added imports for commands and agents modules
- ✅ Updated Mode type to include: "commands", "agents", "skills"
- ✅ Updated WizardId and WIZARD_ROWS to include 3 new wizards
- ✅ Added state for commands: commandsRefresh, commandsIndex
- ✅ Added state for agents: agentsRefresh, agentsIndex
- ✅ Added memoized computations:
  - ✅ commandRows (loads and lists all commands)
  - ✅ agentRows (loads and lists all agent configs)
  - ✅ agentTemplates (loads built-in templates)

**Build Status:** ✅ Compiles successfully

---

## ⏳ Remaining Work

### UI Panels (Need to add to MainView component)

**Commands Panel:**
```tsx
const commandsPanel = mode === "commands" ? (
  <Box flexDirection="column">
    <Text>Commands Manager</Text>
    <Text dimColor>Esc: back • ↑/↓: select • Enter: view/edit • n: new</Text>
    <Box flexDirection="column" marginTop={1}>
      {commandRows.map((cmd, idx) => {
        const selected = idx === commandsIndex;
        return (
          <Text key={cmd.slug} color={selected ? "cyan" : "white"} dimColor={!selected}>
            {selected ? "› " : "  "}
            {cmd.slug} {cmd.description && `— ${cmd.description}`}
          </Text>
        );
      })}
    </Box>
    <Text dimColor>{commandRows[commandsIndex]?.description}</Text>
  </Box>
) : null;
```

**Agents Panel:**
```tsx
const agentsPanel = mode === "agents" ? (
  <Box flexDirection="column">
    <Text>Agents Manager</Text>
    <Text dimColor>Esc: back • ↑/↓: select • Enter: view/edit • t: new from template • n: new custom</Text>
    <Box flexDirection="column" marginTop={1}>
      {agentRows.map((agent, idx) => {
        const selected = idx === agentsIndex;
        return (
          <Text key={agent.id} color={selected ? "cyan" : "white"} dimColor={!selected}>
            {selected ? "› " : "  "}
            {agent.name} {agent.description && `— ${agent.description}`}
          </Text>
        );
      })}
    </Box>
    <Text dimColor>{agentRows[agentsIndex]?.description}</Text>
  </Box>
) : null;
```

**Skills Panel:**
```tsx
const skillsPanel = mode === "skills" ? (
  <Box flexDirection="column">
    <Text>Skills Manager</Text>
    <Text dimColor>Esc: back • ↑/↓: select • Enter: view • n: new skill (uses skill_draft)</Text>
    <Box flexDirection="column" marginTop={1}>
      <Text color="yellow">Skills wizard uses existing skill_draft and skill_apply tools</Text>
      <Text dimColor>No additional implementation needed - tools already exist</Text>
    </Box>
  </Box>
) : null;
```

### Keyboard Handlers (Need to add to useInput hook)

**Commands Wizard Handler:**
```typescript
if (mode === "commands") {
  if (key.escape) {
    setMode("chat");
    return;
  }
  if (key.upArrow) {
    setCommandsIndex((i) => (i - 1 + commandRows.length) % commandRows.length);
    return;
  }
  if (key.downArrow) {
    setCommandsIndex((i) => (i + 1) % commandRows.length);
    return;
  }
  if (key.return) {
    // View/edit selected command
    const cmd = commandRows[commandsIndex];
    if (cmd) {
      pushLines({
        kind: "system",
        text: `Command: /${cmd.slug}\nDescription: ${cmd.description}\nTemplate: ${cmd.template.slice(0, 100)}...`
      });
    }
    return;
  }
  if (ch === "n") {
    // TODO: New command flow - multi-step form
    pushLines({ kind: "system", text: "New command feature coming soon" });
    return;
  }
  return;
}
```

**Agents Wizard Handler:**
```typescript
if (mode === "agents") {
  if (key.escape) {
    setMode("chat");
    return;
  }
  if (key.upArrow) {
    setAgentsIndex((i) => (i - 1 + agentRows.length) % agentRows.length);
    return;
  }
  if (key.downArrow) {
    setAgentsIndex((i) => (i + 1) % agentRows.length);
    return;
  }
  if (key.return) {
    // View/edit selected agent
    const agent = agentRows[agentsIndex];
    if (agent) {
      pushLines({
        kind: "system",
        text: `Agent: ${agent.name}\nDescription: ${agent.description}\nMode: ${agent.mode || "auto"}`
      });
    }
    return;
  }
  if (ch === "n") {
    // TODO: New agent flow - multi-step form
    pushLines({ kind: "system", text: "New agent feature coming soon" });
    return;
  }
  return;
}
```

**Skills Wizard Handler:**
```typescript
if (mode === "skills") {
  if (key.escape) {
    setMode("chat");
    return;
  }
  if (ch === "n") {
    // Launch skill_draft workflow
    const initPrompt = `Create a new skill using skill_draft tool. Provide:
- skill_slug: identifier (lowercase, 2-64 chars)
- name: display name
- summary: one-line description
- instructions: detailed instructions for when this skill is activated
- Optional: triggers, tags, recommended_tools`;

    pushLines({ kind: "system", text: "Creating new skill..." });
    sendTurn(initPrompt, { echoUser: false });
    setMode("chat");
    return;
  }
  pushLines({ kind: "system", text: "Use 'n' to create new skill, Esc to go back" });
  return;
}
```

### Command Execution Integration

**In input handler, after wizard/command checks:**
```typescript
// Check for custom commands (after built-in commands)
if (trimmed.startsWith("/")) {
  const customCommands = loadCommands(workspaceDir);
  const [cmdRaw, ...argsRaw] = trimmed.slice(1).split(/\s+/).filter(Boolean);
  const command = getCommand(customCommands, cmdRaw.toLowerCase());

  if (command) {
    // Parse command with arguments
    const { substituted } = parseCommand(command.template, argsRaw);

    pushLines({ kind: "system", text: `Executing /${command.slug}...` });
    sendTurn(substituted);
    setInputValue("");
    return;
  }
}
```

**Import these functions:**
```typescript
import { loadCommands, getCommand } from "../runtime/commands/loader.js";
import { parseCommand } from "../runtime/commands/parser.js";
```

---

## Implementation Order

### Step 1: Add UI Panels (15 minutes)
1. Add `commandsPanel` to MainView (after initProjectPanel)
2. Add `agentsPanel` to MainView
3. Add `skillsPanel` to MainView
4. Render all three in the return statement

### Step 2: Add Keyboard Handlers (20 minutes)
1. Add commands wizard keyboard handler (in useInput, after init_project handler)
2. Add agents wizard keyboard handler
3. Add skills wizard keyboard handler

### Step 3: Integrate Wizard Entry Points (15 minutes)
1. In wizard mode Enter handler, add cases for commands/agents/skills
2. Wire up from main `/wizard` menu
3. Add direct commands like `/commands`, `/agents`, `/skills`

### Step 4: Integrate Command Execution (15 minutes)
1. Add command loading and execution to input handler
2. Import parseCommand function
3. Test command parsing and substitution

### Step 5: Test and Polish (30 minutes)
1. Create test commands in workspace
2. Test each wizard end-to-end
3. Test command execution with arguments
4. Test agent listing
5. Build and verify no errors

**Total Estimated Time:** 1.5 - 2 hours to complete

---

## Code Structure Summary

```
src/runtime/
├── commands/
│   ├── types.ts           ✅ Complete
│   ├── parser.ts          ✅ Complete
│   ├── loader.ts          ✅ Complete
│   └── storage.ts         ✅ Complete
├── agents/
│   ├── types.ts           ✅ Complete
│   ├── loader.ts          ✅ Complete
│   └── templates.ts       ✅ Complete

src/cli/
├── app.tsx                ⏳ 50% complete
│   ├── Types              ✅ Complete
│   ├── Imports            ✅ Complete
│   ├── State              ✅ Complete
│   ├── Memoized values    ✅ Complete
│   ├── UI Panels          ⏳ Pending
│   └── Keyboard handlers  ⏳ Pending
```

---

## Next Immediate Actions

1. **Add UI Panels to MainView** - Copy-paste the panel code above into MainView
2. **Add Keyboard Handlers** - Insert handler code into useInput hook
3. **Integrate Command Execution** - Add command loading/execution logic
4. **Build and Test** - `npm run build` then test each wizard

All backend code is complete and compiles successfully. The remaining work is frontend UI integration which is straightforward copy-paste of the code snippets provided above.

---

## Git Commit When Ready

```bash
git add -A
git commit -m "feat: Add commands, agents, and skills wizards with runtime support

Implement three new interactive wizards for advanced FF-Terminal features:
- Commands: Create and manage custom slash commands with markdown files
- Agents: Configure specialized agent personas with tool restrictions
- Skills: Create reusable skills using existing skill_draft/apply tools

Includes complete runtime support for all three features.

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```
