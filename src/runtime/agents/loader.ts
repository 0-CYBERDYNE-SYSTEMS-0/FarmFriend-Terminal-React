import fs from "node:fs";
import path from "node:path";
import type { AgentConfig, AgentTemplate } from "./types.js";
import { getBuiltInTemplates } from "./templates.js";
import { readMountsConfig } from "../config/mounts.js";

/**
 * Load agents from a single directory
 */
function loadAgentsFromDir(agentsDir: string, agents: Map<string, AgentConfig>): void {
  if (!fs.existsSync(agentsDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(agentsDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const filePath = path.join(agentsDir, file);
        const content = fs.readFileSync(filePath, "utf8");
        const config = JSON.parse(content) as AgentConfig;

        // Skip if already loaded (workspace takes priority)
        if (config.id && !agents.has(config.id)) {
          agents.set(config.id, config);
        }
      } catch (err) {
        // Skip invalid agents silently
      }
    }
  } catch (err) {
    // Skip unreadable directories silently
  }
}

/**
 * Load all agent configs from workspace and external directories
 */
export function loadAgentConfigs(workspaceDir: string): Map<string, AgentConfig> {
  const agents = new Map<string, AgentConfig>();

  // 1. Load from workspace (highest priority)
  const workspaceAgentsDir = path.join(workspaceDir, "agents");
  loadAgentsFromDir(workspaceAgentsDir, agents);

  // 2. Load from extra_agent_dirs in mount config
  const config = readMountsConfig();
  for (const dir of config.extra_agent_dirs ?? []) {
    loadAgentsFromDir(dir, agents);
  }

  return agents;
}

/**
 * Get agent config by ID
 */
export function getAgentConfig(
  agents: Map<string, AgentConfig>,
  id: string
): AgentConfig | undefined {
  return agents.get(id.toLowerCase());
}

/**
 * List all agent configs sorted by name
 */
export function listAgentConfigs(agents: Map<string, AgentConfig>): AgentConfig[] {
  return Array.from(agents.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all available templates (built-in + custom)
 */
export function getAllTemplates(workspaceDir: string): Map<string, AgentTemplate> {
  const templates = new Map<string, AgentTemplate>();

  // Add built-in templates
  for (const template of getBuiltInTemplates()) {
    templates.set(template.id, template);
  }

  // Could add custom templates from workspaceDir if needed

  return templates;
}

/**
 * Save agent config to file
 */
export function saveAgentConfig(
  workspaceDir: string,
  config: AgentConfig
): { success: boolean; path: string; error?: string } {
  const agentsDir = path.join(workspaceDir, "agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  try {
    const filePath = path.join(agentsDir, config.id.toLowerCase() + ".json");

    const now = new Date().toISOString();
    const toSave = {
      ...config,
      updatedAt: now,
      createdAt: config.createdAt || now
    };

    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2) + "\n", "utf8");

    return { success: true, path: filePath };
  } catch (err) {
    return {
      success: false,
      path: "",
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Delete agent config
 */
export function deleteAgentConfig(
  workspaceDir: string,
  id: string
): { success: boolean; error?: string } {
  const agentsDir = path.join(workspaceDir, "agents");
  const filePath = path.join(agentsDir, id.toLowerCase() + ".json");

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
