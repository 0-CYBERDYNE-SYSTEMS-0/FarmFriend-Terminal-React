import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseFrontmatter } from "../commands/parser.js";
import { readMountsConfig } from "../config/mounts.js";

export type DiscoveredResource = {
  type: "skill" | "command" | "agent";
  path: string;
  slug: string;
  name?: string;
  valid: boolean;
  issues: string[];
  source: string;
};

export type DiscoveryResult = {
  skills: DiscoveredResource[];
  commands: DiscoveredResource[];
  agents: DiscoveredResource[];
  scannedLocations: string[];
};

type SearchLocation = {
  basePath: string;
  label: string;
};

function getSearchLocations(workspaceDir: string, repoRoot?: string): SearchLocation[] {
  const home = os.homedir();
  const locations: SearchLocation[] = [];

  // User config directories
  const userConfigDirs = [
    { dir: path.join(home, ".claude"), label: "~/.claude" },
    { dir: path.join(home, ".droid"), label: "~/.droid" },
    { dir: path.join(home, ".factory"), label: "~/.factory" },
    { dir: path.join(home, ".ff-terminal"), label: "~/.ff-terminal" },
    { dir: path.join(home, ".config", "ff-terminal"), label: "~/.config/ff-terminal" },
  ];

  for (const { dir, label } of userConfigDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      locations.push({ basePath: dir, label });
    }
  }

  // Project-local config directories
  if (repoRoot) {
    const projectDirs = [
      { dir: path.join(repoRoot, ".claude"), label: "<repo>/.claude" },
      { dir: path.join(repoRoot, ".ff-terminal"), label: "<repo>/.ff-terminal" },
    ];

    for (const { dir, label } of projectDirs) {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        locations.push({ basePath: dir, label });
      }
    }
  }

  return locations;
}

function validateSkill(dirPath: string, source: string): DiscoveredResource {
  const slug = path.basename(dirPath);
  const skillMdPath = path.join(dirPath, "SKILL.md");
  const issues: string[] = [];
  let name: string | undefined;

  if (!fs.existsSync(skillMdPath)) {
    return {
      type: "skill",
      path: dirPath,
      slug,
      valid: false,
      issues: ["Missing SKILL.md file"],
      source,
    };
  }

  try {
    const content = fs.readFileSync(skillMdPath, "utf8");
    const { frontmatter } = parseFrontmatter(content);

    name = frontmatter.name as string | undefined;

    if (!frontmatter.name) {
      issues.push("Missing required field: name");
    }
    if (!frontmatter.summary && !frontmatter.description) {
      issues.push("Missing required field: summary or description");
    }
  } catch (err) {
    issues.push(`Failed to parse SKILL.md: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    type: "skill",
    path: dirPath,
    slug,
    name,
    valid: issues.length === 0,
    issues,
    source,
  };
}

function validateCommand(filePath: string, source: string): DiscoveredResource {
  const slug = path.basename(filePath, ".md");
  const issues: string[] = [];
  let name: string | undefined;

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);

    // FF-Terminal format: has frontmatter with description
    if (frontmatter.description) {
      name = frontmatter.description as string;
    }
    // Claude Code format: no frontmatter, just markdown
    // Extract name from first heading or first line
    else if (body.trim()) {
      const firstLine = body.trim().split("\n")[0];
      if (firstLine.startsWith("# ")) {
        name = firstLine.slice(2).trim();
      } else {
        name = firstLine.slice(0, 60) + (firstLine.length > 60 ? "..." : "");
      }
    }

    // Valid if there's any content
    if (!body.trim() && !content.trim()) {
      issues.push("Command file is empty");
    }
  } catch (err) {
    issues.push(`Failed to parse command: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    type: "command",
    path: filePath,
    slug,
    name,
    valid: issues.length === 0,
    issues,
    source,
  };
}

function validateAgent(filePath: string, source: string): DiscoveredResource {
  const slug = path.basename(filePath, ".json");
  const issues: string[] = [];
  let name: string | undefined;

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const config = JSON.parse(content) as Record<string, unknown>;

    name = config.name as string | undefined;

    if (!config.id) {
      issues.push("Missing required field: id");
    }
    if (!config.name) {
      issues.push("Missing required field: name");
    }
    if (!config.systemPromptAddition) {
      issues.push("Missing required field: systemPromptAddition");
    }
  } catch (err) {
    issues.push(`Failed to parse agent JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    type: "agent",
    path: filePath,
    slug,
    name,
    valid: issues.length === 0,
    issues,
    source,
  };
}

function scanSkillsDir(skillsDir: string, source: string): DiscoveredResource[] {
  const resources: DiscoveredResource[] = [];

  if (!fs.existsSync(skillsDir)) return resources;

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;

      const skillPath = path.join(skillsDir, entry.name);
      resources.push(validateSkill(skillPath, source));
    }
  } catch (err) {
    // Skip unreadable directories
  }

  return resources;
}

function scanCommandsDir(commandsDir: string, source: string): DiscoveredResource[] {
  const resources: DiscoveredResource[] = [];

  if (!fs.existsSync(commandsDir)) return resources;

  try {
    const entries = fs.readdirSync(commandsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".md")) continue;
      if (entry.name.startsWith(".")) continue;

      const cmdPath = path.join(commandsDir, entry.name);
      resources.push(validateCommand(cmdPath, source));
    }
  } catch (err) {
    // Skip unreadable directories
  }

  return resources;
}

function scanAgentsDir(agentsDir: string, source: string): DiscoveredResource[] {
  const resources: DiscoveredResource[] = [];

  if (!fs.existsSync(agentsDir)) return resources;

  try {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".json")) continue;
      if (entry.name.startsWith(".")) continue;

      const agentPath = path.join(agentsDir, entry.name);
      resources.push(validateAgent(agentPath, source));
    }
  } catch (err) {
    // Skip unreadable directories
  }

  return resources;
}

function isAlreadyMounted(dirPath: string, workspaceDir: string): boolean {
  const config = readMountsConfig();
  const normalizedPath = path.resolve(dirPath);
  const workspaceSkills = path.resolve(path.join(workspaceDir, "skills"));
  const workspaceCommands = path.resolve(path.join(workspaceDir, "commands"));
  const workspaceAgents = path.resolve(path.join(workspaceDir, "agents"));

  // Check if it's the workspace directory
  if (normalizedPath === workspaceSkills || normalizedPath === workspaceCommands || normalizedPath === workspaceAgents) {
    return true;
  }

  // Check if it's already in extra dirs
  const allExtraDirs = [
    ...(config.extra_skill_dirs || []),
    ...(config.extra_command_dirs || []),
    ...(config.extra_agent_dirs || []),
  ];

  return allExtraDirs.some((d) => path.resolve(d) === normalizedPath);
}

export async function discoverExternalResources(
  workspaceDir: string,
  repoRoot?: string
): Promise<DiscoveryResult> {
  const skills: DiscoveredResource[] = [];
  const commands: DiscoveredResource[] = [];
  const agents: DiscoveredResource[] = [];
  const scannedLocations: string[] = [];

  const locations = getSearchLocations(workspaceDir, repoRoot);

  for (const { basePath, label } of locations) {
    scannedLocations.push(label);

    // Scan for skills directory
    const skillsDir = path.join(basePath, "skills");
    if (fs.existsSync(skillsDir) && !isAlreadyMounted(skillsDir, workspaceDir)) {
      const discovered = scanSkillsDir(skillsDir, `${label}/skills`);
      skills.push(...discovered);
    }

    // Scan for commands directory
    const commandsDir = path.join(basePath, "commands");
    if (fs.existsSync(commandsDir) && !isAlreadyMounted(commandsDir, workspaceDir)) {
      const discovered = scanCommandsDir(commandsDir, `${label}/commands`);
      commands.push(...discovered);
    }

    // Scan for agents directory
    const agentsDir = path.join(basePath, "agents");
    if (fs.existsSync(agentsDir) && !isAlreadyMounted(agentsDir, workspaceDir)) {
      const discovered = scanAgentsDir(agentsDir, `${label}/agents`);
      agents.push(...discovered);
    }
  }

  return { skills, commands, agents, scannedLocations };
}

export function formatDiscoveryReport(discoveries: DiscoveryResult): string {
  const lines: string[] = [];
  const { skills, commands, agents } = discoveries;

  const hasAny = skills.length > 0 || commands.length > 0 || agents.length > 0;

  if (!hasAny) {
    lines.push("");
    lines.push("External Resources:");
    lines.push("  No external skills, commands, or agents discovered.");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("External Resources Discovered:");
  lines.push("─────────────────────────────");

  // Group by source
  const bySource = new Map<string, DiscoveredResource[]>();

  for (const r of [...skills, ...commands, ...agents]) {
    const existing = bySource.get(r.source) || [];
    existing.push(r);
    bySource.set(r.source, existing);
  }

  for (const [source, resources] of bySource) {
    const valid = resources.filter((r) => r.valid).length;
    const invalid = resources.length - valid;

    const statusPart = invalid > 0 ? `${valid} valid, ${invalid} invalid` : "all valid";
    lines.push(`${source}: ${resources.length} (${statusPart})`);

    for (const r of resources) {
      const icon = r.valid ? "✓" : "✗";
      const nameDisplay = r.name ? `${r.slug} (${r.name})` : r.slug;
      if (r.valid) {
        lines.push(`  ${icon} ${nameDisplay}`);
      } else {
        lines.push(`  ${icon} ${nameDisplay}`);
        for (const issue of r.issues) {
          lines.push(`    - ${issue}`);
        }
      }
    }
  }

  return lines.join("\n");
}

export function countUnintegratedResources(discoveries: DiscoveryResult): {
  total: number;
  unique: number;
  skills: number;
  commands: number;
  agents: number;
} {
  const validSkills = discoveries.skills.filter((r) => r.valid);
  const validCommands = discoveries.commands.filter((r) => r.valid);
  const validAgents = discoveries.agents.filter((r) => r.valid);

  // Count unique by slug
  const uniqueSkillSlugs = new Set(validSkills.map((r) => r.slug));
  const uniqueCommandSlugs = new Set(validCommands.map((r) => r.slug));
  const uniqueAgentSlugs = new Set(validAgents.map((r) => r.slug));

  return {
    total: validSkills.length + validCommands.length + validAgents.length,
    unique: uniqueSkillSlugs.size + uniqueCommandSlugs.size + uniqueAgentSlugs.size,
    skills: uniqueSkillSlugs.size,
    commands: uniqueCommandSlugs.size,
    agents: uniqueAgentSlugs.size,
  };
}

export function getUniqueSources(discoveries: DiscoveryResult): {
  skillDirs: string[];
  commandDirs: string[];
  agentDirs: string[];
} {
  const skillSources = new Set<string>();
  const commandSources = new Set<string>();
  const agentSources = new Set<string>();

  for (const r of discoveries.skills) {
    if (r.valid) {
      // Get parent directory of skill
      skillSources.add(path.dirname(r.path));
    }
  }

  for (const r of discoveries.commands) {
    if (r.valid) {
      commandSources.add(path.dirname(r.path));
    }
  }

  for (const r of discoveries.agents) {
    if (r.valid) {
      agentSources.add(path.dirname(r.path));
    }
  }

  return {
    skillDirs: Array.from(skillSources),
    commandDirs: Array.from(commandSources),
    agentDirs: Array.from(agentSources),
  };
}
