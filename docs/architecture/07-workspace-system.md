# Workspace System

## Overview

The workspace system manages the persistent working directory for FF Terminal. It handles file operations, resource discovery, configuration loading, and workspace-specific settings.

## Workspace Directory Structure

```
ff-terminal-workspace/
├── sessions/              # Session JSON files
│   └── session_*.json
├── logs/                  # Structured logs
│   ├── sessions/         # Per-session logs (JSONL)
│   │   └── session_*.jsonl
│   ├── hooks/            # Hook execution logs
│   │   └── tools_*.jsonl
│   └── runs/             # Run logs
│       └── session_*.jsonl
├── todos/                # Todo state
│   └── sessions/
│       └── session_*.json
├── memory_core/          # Long-term memory
│   └── session_summary.md
├── skills/               # Workspace-local skills
│   └── skill-name/
│       └── SKILL.md
├── commands/             # Workspace-local commands
│   └── command-name.md
├── agents/               # Workspace-local agents
│   └── agent-name.json
├── projects/             # Project templates
│   └── project-name/
└── .daemon-port          # Daemon port file (local mode)
```

## Workspace Resolution

### Priority Order

```typescript
export function resolveWorkspaceDir(
  workspaceDir?: string,
  opts?: { repoRoot?: string }
): string {
  // 1. Explicit environment variable
  if (process.env.FF_WORKSPACE_DIR) {
    return process.env.FF_WORKSPACE_DIR;
  }

  // 2. Config file setting
  const runtimeCfg = resolveConfig({ repoRoot: opts?.repoRoot });
  if ((runtimeCfg as any).workspace_dir) {
    return (runtimeCfg as any).workspace_dir;
  }

  // 3. Local workspace (cwd/ff-terminal-workspace)
  const localWorkspace = path.join(process.cwd(), "ff-terminal-workspace");
  if (fs.existsSync(localWorkspace)) {
    return localWorkspace;
  }

  // 4. Default location
  return path.join(os.homedir(), ".ff-terminal", "workspace");
}
```

### Local Workspace Mode

```bash
# Create workspace in current directory
ff-terminal local

# Sets: FF_WORKSPACE_DIR=$(pwd)/ff-terminal-workspace
# Generates: workspace-specific daemon port (28889-38888)
```

### Daemon Port in Local Mode

```typescript
function generatePortFromPath(workspacePath: string): number {
  // Deterministic port from workspace path
  // Range: 28889-38888 (avoids 28888 global default)
  let hash = 0;
  for (let i = 0; i < workspacePath.length; i++) {
    hash = ((hash << 5) - hash) + workspacePath.charCodeAt(i);
    hash = hash & hash;
  }
  const port = 28889 + (Math.abs(hash) % 10000);
  return port;
}

// Store port in workspace
const portFile = path.join(workspaceDir, ".daemon-port");
fs.writeFileSync(portFile, String(port), "utf8");
```

## Configuration Loading

### Config File Resolution

```typescript
export function resolveConfig(opts?: {
  repoRoot?: string;
}): Record<string, unknown> {
  const repoRoot = opts?.repoRoot ?? findRepoRoot();

  // 1. Project config: <repo>/.ff-terminal/config.json
  const projectConfigPath = path.join(repoRoot, ".ff-terminal", "config.json");
  if (fs.existsSync(projectConfigPath)) {
    return parseConfigFile(projectConfigPath);
  }

  // 2. User config: ~/.ff-terminal/config.json
  const userConfigPath = path.join(os.homedir(), ".ff-terminal", "config.json");
  if (fs.existsSync(userConfigPath)) {
    return parseConfigFile(userConfigPath);
  }

  // 3. Default config
  return getDefaultConfig();
}
```

### Config File Format

```json
{
  "version": 1,
  "workspace_dir": "/path/to/workspace",
  "main_model": "openai/gpt-4o-mini",
  "use_openrouter": false,
  "use_anthropic_direct": true,
  "temperature": 0.7,
  "max_tokens": 12000,
  "max_iterations": 500,
  "parallel_mode": true,
  "hooks_enabled": true,
  "hooks_tool_logging": true,
  "plan_validation_enabled": false,
  "log_level": "info",
  "log_max_bytes": 5242880,
  "log_retention": 3
}
```

### Environment Override

```typescript
// Environment variables override config file
const model = String(
  process.env.FF_MODEL ||
  config.main_model ||
  "openai/gpt-4o-mini"
);

const provider = String(
  process.env.FF_PROVIDER || ""
).trim().toLowerCase();

if (provider) {
  // Use provider from environment
}
```

## Mount Configuration

### External Resource Mounts

```typescript
type MountsConfig = {
  mounts: {
    claude?: boolean;
    factory?: boolean;
  };
  extra_skill_dirs?: string[];
  extra_command_dirs?: string[];
  extra_agent_dirs?: string[];
};

export function readMountsConfig(): MountsConfig {
  const userMountsPath = path.join(
    os.homedir(),
    ".ff-terminal",
    "mounts.json"
  );

  if (fs.existsSync(userMountsPath)) {
    return JSON.parse(fs.readFileSync(userMountsPath, "utf8"));
  }

  return { mounts: {}, extra_skill_dirs: [] };
}
```

### Mounts File Example

```json
{
  "mounts": {
    "claude": true,
    "factory": false
  },
  "extra_skill_dirs": [
    "/Users/dev/skills",
    "/Users/dev/shared-skills"
  ],
  "extra_command_dirs": [
    "/Users/dev/commands"
  ],
  "extra_agent_dirs": [
    "/Users/dev/agents"
  ]
}
```

## Resource Discovery

### Discovery Locations

```typescript
function getSearchLocations(
  workspaceDir: string,
  repoRoot?: string
): SearchLocation[] {
  const home = os.homedir();
  const locations: SearchLocation[] = [];

  // App's own directories (always included)
  locations.push({ basePath: path.join(home, ".ff-terminal"), label: "~/.ff-terminal" });
  locations.push({ basePath: path.join(home, ".config", "ff-terminal"), label: "~/.config/ff-terminal" });

  // External mounts (require opt-in)
  const mountsConfig = readMountsConfig();

  if (mountsConfig.mounts.claude) {
    locations.push({ basePath: path.join(home, ".claude"), label: "~/.claude" });
  }

  if (mountsConfig.mounts.factory) {
    locations.push({ basePath: path.join(home, ".factory"), label: "~/.factory" });
  }

  // Project-local directories
  if (repoRoot) {
    locations.push({ basePath: path.join(repoRoot, ".claude"), label: "<repo>/.claude" });
    locations.push({ basePath: path.join(repoRoot, ".ff-terminal"), label: "<repo>/.ff-terminal" });
  }

  // Extra directories
  for (const dir of mountsConfig.extra_skill_dirs || []) {
    if (fs.existsSync(dir)) {
      locations.push({ basePath: dir, label: `extra: ${dir}` });
    }
  }

  return locations;
}
```

### Discovery Scan

```typescript
export async function discoverExternalResources(
  workspaceDir: string,
  repoRoot?: string
): Promise<DiscoveryResult> {
  const skills: DiscoveredResource[] = [];
  const commands: DiscoveredResource[] = [];
  const agents: DiscoveredResource[] = [];

  const locations = getSearchLocations(workspaceDir, repoRoot);

  for (const { basePath, label } of locations) {
    // Scan skills
    const skillsDir = path.join(basePath, "skills");
    if (fs.existsSync(skillsDir)) {
      const discovered = scanSkillsDir(skillsDir, `${label}/skills`);
      skills.push(...discovered);
    }

    // Scan commands
    const commandsDir = path.join(basePath, "commands");
    if (fs.existsSync(commandsDir)) {
      const discovered = scanCommandsDir(commandsDir, `${label}/commands`);
      commands.push(...discovered);
    }

    // Scan agents
    const agentsDir = path.join(basePath, "agents");
    if (fs.existsSync(agentsDir)) {
      const discovered = scanAgentsDir(agentsDir, `${label}/agents`);
      agents.push(...discovered);
    }
  }

  return { skills, commands, agents, scannedLocations: locations.map(l => l.label) };
}
```

### Discovery Report

```
External Resources Discovered:
─────────────────────────────
~/.ff-terminal/skills: 12 (all valid)
  ✓ algorithmic-art (Algorithmic Art Generator)
  ✓ applescript_automation (AppleScript Automation)
  ✓ award_winning_designer (Award-Winning Designer)

~/.claude/skills: 5 (4 valid, 1 invalid)
  ✓ code_assistant (Code Assistant)
  ✓ document_writer (Document Writer)
  ✗ invalid_skill (Missing required field: summary)

<repo>/.ff-terminal/commands: 3 (all valid)
  ✓ setup_project (Setup new project)
  ✓ run_tests (Run test suite)
```

## Workspace Health

### Health Check

```typescript
export async function quickHealthCheck(
  workspaceDir: string
): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];

  // Check directory exists
  if (!fs.existsSync(workspaceDir)) {
    issues.push({
      type: "missing_directory",
      message: `Workspace directory does not exist: ${workspaceDir}`
    });
    return issues;
  }

  // Check sessions directory
  const sessionsDir = path.join(workspaceDir, "sessions");
  if (!fs.existsSync(sessionsDir)) {
    try {
      fs.mkdirSync(sessionsDir, { recursive: true });
    } catch (err) {
      issues.push({
        type: "permission_error",
        message: `Cannot create sessions directory: ${err}`
      });
    }
  }

  // Check logs directory
  const logsDir = path.join(workspaceDir, "logs");
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (err) {
      issues.push({
        type: "permission_error",
        message: `Cannot create logs directory: ${err}`
      });
    }
  }

  return issues;
}
```

### Doctor Command

```bash
# Run workspace health check
ff-terminal doctor

# Output:
# ⚠️  Workspace health issues detected. Run '/doctor' to fix.
#    - Missing sessions directory
#    - Creating sessions directory...
#    - ✓ Workspace health check passed
```

## Path Utilities

### Repo Root Finding

```typescript
export function findRepoRoot(): string {
  const cwd = process.cwd();
  const home = os.homedir();

  let dir = cwd;
  while (dir !== home) {
    // Check for git repo
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }

    // Check for package.json
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }

    // Check for .claude folder
    if (fs.existsSync(path.join(dir, ".claude"))) {
      return dir;
    }

    dir = path.dirname(dir);
  }

  return cwd;
}
```

### FF Home Directory

```typescript
export function getFfHome(): string {
  if (process.env.FF_HOME) {
    return process.env.FF_HOME;
  }

  // Prefer XDG_CONFIG_HOME
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, "ff-terminal");
  }

  return path.join(os.homedir(), ".ff-terminal");
}
```

## Environment Variables

### Workspace Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FF_WORKSPACE_DIR` | Workspace directory | `~/.ff-terminal/workspace` |
| `FF_HOME` | FF Terminal config dir | `~/.ff-terminal` |
| `FF_CONFIG_PATH` | Config file path | `~/.ff-terminal/config.json` |

### Daemon Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FF_TERMINAL_PORT` | WebSocket port | 28888 |
| `FF_WEB_PORT` | Web UI port | 8787 |
| `FF_FIELDVIEW_PORT` | FieldView port | 8788 |

### Logging Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FF_LOG_LEVEL` | Log level | info |
| `FF_DAEMON_LOG` | Daemon logging | off |

## Related Documentation

- [01-file-structure.md](./01-file-structure.md) - Directory layout
- [08-skill-architecture.md](./08-skill-architecture.md) - Skill discovery
- [09-tool-registry.md](./09-tool-registry.md) - Tool system
