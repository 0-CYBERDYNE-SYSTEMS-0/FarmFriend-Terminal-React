# Skill Architecture

## Overview

Skills are modular, reusable units of capability that extend the agent's abilities. They are discovered at runtime from external directories, loaded on demand, and can provide custom tools, prompts, and workflows.

## Skill Structure

### Directory Layout

```
skills/
└── skill-name/
    ├── SKILL.md              # Required: Skill metadata & documentation
    ├── tools.ts              # Optional: Custom tool implementations
    ├── agents.ts             # Optional: Agent configurations
    ├── prompts.ts            # Optional: Specialized prompts
    └── assets/               # Optional: Supporting files
        └── ...
```

### SKILL.md Format

```markdown
---
name: Skill Display Name
summary: Brief one-line description
description: |
  Detailed multi-line description of what this skill does.
  Explains use cases and capabilities.
tags: [tag1, tag2, tag3]
priority: high  # Optional: high, medium, low, or number
triggers: [keyword1, keyword2]
source: skill  # Optional: skill, agent, command
kind: workflow  # Optional: tool, workflow, knowledge
---

# Skill Documentation

## Overview

Detailed documentation on how to use this skill...

## Usage

```bash
# Example usage
ff-terminal run --prompt "Use skill-name to..."
```

## Examples

Example 1...
Example 2...
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `summary` | string | Yes* | One-line summary |
| `description` | string | Yes* | Detailed description |
| `tags` | string[] | No | Categorization tags |
| `priority` | string\|number | No | Load priority |
| `triggers` | string[] | No | Keyword triggers |
| `source` | string | No | Origin (skill/agent/command) |
| `kind` | string | No | Type (tool/workflow/knowledge) |

## Skill Discovery

### Discovery Sources

```typescript
type DiscoveredSkill = {
  type: "skill";
  path: string;           // Directory path
  slug: string;           // Directory name
  name?: string;
  valid: boolean;
  issues: string[];
  source: string;         // Discovery source label
};

async function discoverSkills(
  workspaceDir: string,
  repoRoot?: string
): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = [];
  const locations = getSearchLocations(workspaceDir, repoRoot);

  for (const { basePath, label } of locations) {
    const skillsDir = path.join(basePath, "skills");

    if (!fs.existsSync(skillsDir)) continue;

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;

      const skillPath = path.join(skillsDir, entry.name);
      const skill = validateSkill(skillPath, `${label}/skills`);
      skills.push(skill);
    }
  }

  return skills;
}
```

### Validation

```typescript
function validateSkill(dirPath: string, source: string): DiscoveredSkill {
  const slug = path.basename(dirPath);
  const skillMdPath = path.join(dirPath, "SKILL.md");
  const issues: string[] = [];

  // Check SKILL.md exists
  if (!fs.existsSync(skillMdPath)) {
    return {
      type: "skill",
      path: dirPath,
      slug,
      valid: false,
      issues: ["Missing SKILL.md file"],
      source
    };
  }

  // Parse frontmatter
  try {
    const content = fs.readFileSync(skillMdPath, "utf8");
    const { frontmatter } = parseFrontmatter(content);

    if (!frontmatter.name) {
      issues.push("Missing required field: name");
    }

    if (!frontmatter.summary && !frontmatter.description) {
      issues.push("Missing required field: summary or description");
    }
  } catch (err) {
    issues.push(`Failed to parse SKILL.md: ${err}`);
  }

  return {
    type: "skill",
    path: dirPath,
    slug,
    name: frontmatter.name,
    valid: issues.length === 0,
    issues,
    source
  };
}
```

## Skill Loading

### Skill Loader Tool

```typescript
async function skillLoaderTool(args: {
  skill_slug: string;
}): Promise<string> {
  const { skill_slug } = args;

  // Find skill
  const skill = findSkillBySlug(skill_slug);
  if (!skill) {
    return JSON.stringify({ ok: false, error: `Skill not found: ${skill_slug}` });
  }

  // Load skill metadata
  const skillMdPath = path.join(skill.path, "SKILL.md");
  const content = fs.readFileSync(skillMdPath, "utf8");

  // Load custom tools if present
  const toolsPath = path.join(skill.path, "tools.ts");
  if (fs.existsSync(toolsPath)) {
    await loadSkillTools(toolsPath);
  }

  return JSON.stringify({
    ok: true,
    skill: {
      slug: skill.slug,
      name: skill.name,
      description: extractDescription(content),
      triggers: extractTriggers(content),
      priority: extractPriority(content)
    }
  });
}
```

### Skill Context in Prompt

```typescript
function buildSkillSections(
  workspaceDir: string,
  repoRoot: string,
  userInput: string
): string {
  const stubs = listSkillStubs({ workspaceDir, repoRoot });
  if (!stubs.length) return "";

  // Score skills by relevance to input
  const tokens = tokenizeInput(userInput);

  const ranked = stubs
    .map(s => ({ skill: s, score: calculateScore(s, tokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);  // Top 8 relevant skills

  if (!ranked.length) return "";

  return `
## Relevant Skills
If helpful, call \`skill_loader\` with \`skill_slug\` to load one of these skills:
${ranked.map(({ skill }) =>
  `- \`${skill.slug}\` - ${skill.summary || skill.description} _(source: ${skill.source})_`
).join("\n")}
`;
}
```

## Skill Types

### 1. Workflow Skills

Provide multi-step workflows for complex tasks.

```typescript
// skills/workflow-skill/tools.ts
import { ToolHandler } from "../../runtime/tools/registry.js";

export const workflowExecute: ToolHandler = async (args, signal) => {
  const { task, steps } = args;

  for (const step of steps) {
    const result = await executeStep(step, signal);
    if (!result.ok) {
      return JSON.stringify({ ok: false, step, error: result.error });
    }
  }

  return JSON.stringify({
    ok: true,
    completed_steps: steps.length,
    results: []
  });
};
```

### 2. Tool Skills

Add new capabilities via custom tools.

```typescript
// skills/custom-tool/tools.ts
import { ToolHandler } from "../../runtime/tools/registry.js";

export const customOperation: ToolHandler = async (args, signal) => {
  const { param1, param2 } = args;

  // Custom implementation
  const result = await performOperation(param1, param2);

  return JSON.stringify({ ok: true, result });
};
```

### 3. Knowledge Skills

Provide domain-specific knowledge.

```typescript
// skills/domain-knowledge/prompts.ts
export const domainSystemPrompt = `
You have access to specialized knowledge about ${domain}.

Key concepts:
- ${concept1}: ${description1}
- ${concept2}: ${description2}

Use this knowledge when answering questions about ${domain}.
`;
```

## Skill Integration Points

### 1. Pre-Tool Hook

```typescript
// skills/skill/hooks.ts
export function createSkillAllowedToolsHook(skillName: string): Hook {
  return {
    name: `skill_${skillName}_allowed_tools`,
    async preTool({ call, sessionId, workspaceDir }) {
      const allowedTools = await getAllowedToolsForSkill(skillName, sessionId);

      if (!allowedTools.includes(call.name)) {
        return {
          action: "block",
          reason: `Tool ${call.name} not allowed in skill ${skillName}`
        };
      }

      return { action: "allow" };
    }
  };
}
```

### 2. Post-Tool Hook

```typescript
export function createSkillProgressHook(skillName: string): Hook {
  return {
    name: `skill_${skillName}_progress`,
    async postTool({ call, ok, output, sessionId }) {
      if (call.name.startsWith("skill_")) {
        await updateSkillProgress(skillName, sessionId, call.name, ok);
      }
    }
  };
}
```

### 3. Agent Stop Hook

```typescript
export function createSkillCompletionHook(skillName: string): Hook {
  return {
    name: `skill_${skillName}_completion`,
    async runAgentStop({ sessionId, assistantContent }) {
      const progress = await getSkillProgress(skillName, sessionId);
      const isComplete = checkSkillCompletion(skillName, progress);

      if (isComplete) {
        return {
          action: "allow",
          statusMessage: `${skillName} completed!`
        };
      }

      return { action: "allow" };
    }
  };
}
```

## Skill Registry

### Global Skill List

```typescript
type SkillStub = {
  slug: string;
  name?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  triggers?: string[];
  priority?: string;
  source: string;
  kind: string;
};

export function listSkillStubs(params: {
  workspaceDir: string;
  repoRoot: string;
}): SkillStub[] {
  const discoveries = await discoverExternalResources(
    params.workspaceDir,
    params.repoRoot
  );

  return discoveries.skills
    .filter(s => s.valid)
    .map(s => ({
      slug: s.slug,
      name: s.name,
      source: s.source,
      kind: "skill"
    }));
}
```

### Skill Search

```typescript
function searchSkills(query: string): SkillStub[] {
  const stubs = listSkillStubs({ workspaceDir, repoRoot });

  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(queryLower);

  return stubs
    .map(s => ({
      skill: s,
      score: calculateRelevanceScore(s, queryTokens)
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}
```

## Skill Lifecycle

### 1. Discovery Phase

```
Runtime Start
    │
    ├─→ discoverExternalResources()
    │       │
    │       ├─→ Scan ~/.ff-terminal/skills
    │       ├─→ Scan ~/.claude/skills (if mounted)
    │       ├─→ Scan <repo>/.ff-terminal/skills
    │       └─→ Scan extra directories
    │
    └─→ Build skill stubs list
```

### 2. Loading Phase

```
User mentions skill in input
    │
    ├─→ Search skills by relevance
    ├─→ user calls skill_loader tool
    │       │
    │       ├─→ Read SKILL.md
    │       ├─→ Load custom tools (tools.ts)
    │       ├─→ Register tools in registry
    │       └─→ Add to session context
    │
    └─→ Skill ready for use
```

### 3. Execution Phase

```
Agent calls skill tool
    │
    ├─→ Execute skill logic
    ├─→ Run pre/post hooks
    ├─→ Update progress
    └─→ Return results
```

### 4. Cleanup Phase

```
Session ends
    │
    ├─→ Save skill progress to todos
    ├─→ Run cleanup hooks
    └─→ Unload custom tools (optional)
```

## Skill Examples

### Example: AppleScript Automation

```
skills/applescript_automation/
├── SKILL.md
│   ---
│   name: AppleScript Automation
│   summary: Execute AppleScript commands on macOS
│   description: |
│     Provides tools for automating macOS applications
│     using AppleScript. Useful for UI automation,
│     file operations, and system tasks.
│   tags: [automation, macos, applescript]
│   priority: high
│   triggers: [script, automate, macos, ui]
│   ---
│
├── tools.ts
│   export const applescript_execute: ToolHandler = ...
│   export const applescript_list_apps: ToolHandler = ...
│
└── assets/
    └── script-templates/
```

### Example: Algorithmic Art

```
skills/algorithmic-art/
├── SKILL.md
│   ---
│   name: Algorithmic Art Generator
│   summary: Generate procedural art and graphics
│   description: |
│     Create visual art using algorithms.
│     Supports canvas operations, gradients,
│     patterns, and animations.
│   tags: [art, graphics, creative, visualization]
│   ---
│
├── tools.ts
│   export const generate_pattern: ToolHandler = ...
│   export const create_gradient: ToolHandler = ...
│
└── prompts.ts
│   export const artSystemPrompt = `...`
```

## Related Documentation

- [07-workspace-system.md](./07-workspace-system.md) - Resource discovery
- [09-tool-registry.md](./09-tool-registry.md) - Tool registration
- [10-async-context.md](./10-async-context.md) - Skill context
