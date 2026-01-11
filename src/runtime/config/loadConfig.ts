import fs from "node:fs";
import path from "node:path";
import { defaultConfigPath } from "./paths.js";
import { findRepoRoot } from "./repoRoot.js";
import { portPacketDir } from "../prompts/loadTemplates.js";

export type RuntimeConfig = Record<string, unknown> & {
  main_model?: string;
  tool_limit_total?: number;
  hooks_enabled?: boolean;
  parallel_mode?: boolean;
  log_level?: string;
  log_max_bytes?: number;
  log_retention?: number;
  workspace_dir?: string;

  // Forced tool calling configuration
  // force_tool_calls: Enable/disable forced tool calling behavior
  // force_tool_calls_threshold: Minimum number of turns before forcing tool calls
  force_tool_calls?: boolean;
  force_tool_calls_threshold?: number;

  // GLM-specific thinking configuration (all GLM models: 4.5, 4.6, 4.7)
  glm_thinking_mode?: "auto" | "enabled" | "disabled";

  // Optional key locations (recommended for background runs where env vars may be missing)
  openai_api_key?: string;
  anthropic_api_key?: string;
  openrouter_api_key?: string;
  ollama_base_url?: string;
  lm_studio_base_url?: string;
};

export function loadConfig(configPath = defaultConfigPath()): RuntimeConfig {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return JSON.parse(raw) as RuntimeConfig;
  } catch {
    return {};
  }
}

export function loadDefaultConfigFromPortPacket(repoRoot = findRepoRoot()): RuntimeConfig {
  const p = path.join(portPacketDir(repoRoot), "default_config.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as RuntimeConfig;
  } catch {
    return {};
  }
}

export function resolveConfig(params?: { repoRoot?: string; userConfigPath?: string }): RuntimeConfig {
  const repoRoot = params?.repoRoot ?? findRepoRoot();
  const defaults = loadDefaultConfigFromPortPacket(repoRoot);
  const overridePath = process.env.FF_CONFIG_PATH || "";
  const user = loadConfig(params?.userConfigPath ?? (overridePath.trim() ? overridePath.trim() : defaultConfigPath()));

  // Order: defaults < user config < environment variables
  const merged: RuntimeConfig = { ...defaults, ...user };

  // Minimal env var bridging for common provider keys (Python uses env vars heavily).
  if (typeof process.env.OPENAI_API_KEY === "string" && process.env.OPENAI_API_KEY.length) {
    merged.openai_api_key = process.env.OPENAI_API_KEY;
  }
  if (typeof process.env.OPENROUTER_API_KEY === "string" && process.env.OPENROUTER_API_KEY.length) {
    merged.openrouter_api_key = process.env.OPENROUTER_API_KEY;
  }
  if (typeof process.env.ANTHROPIC_API_KEY === "string" && process.env.ANTHROPIC_API_KEY.length) {
    merged.anthropic_api_key = process.env.ANTHROPIC_API_KEY;
  }
  // Z.ai uses ANTHROPIC_AUTH_TOKEN in the Python codebase.
  if (typeof process.env.ANTHROPIC_AUTH_TOKEN === "string" && process.env.ANTHROPIC_AUTH_TOKEN.length) {
    merged.zai_api_key = process.env.ANTHROPIC_AUTH_TOKEN;
    (merged as any).anthropic_auth_token = process.env.ANTHROPIC_AUTH_TOKEN;
  }
  if (typeof process.env.ANTHROPIC_BASE_URL === "string" && process.env.ANTHROPIC_BASE_URL.length) {
    (merged as any).anthropic_base_url = process.env.ANTHROPIC_BASE_URL;
  }
  if (typeof process.env.MINIMAX_API_KEY === "string" && process.env.MINIMAX_API_KEY.length) {
    merged.minimax_api_key = process.env.MINIMAX_API_KEY;
  }
  if (typeof process.env.MINIMAX_BASE_URL === "string" && process.env.MINIMAX_BASE_URL.length) {
    (merged as any).minimax_base_url = process.env.MINIMAX_BASE_URL;
  }
  if (typeof process.env.LM_STUDIO_BASE_URL === "string" && process.env.LM_STUDIO_BASE_URL.length) {
    merged.lm_studio_base_url = process.env.LM_STUDIO_BASE_URL;
  }

  // Forced tool calling environment variables
  if (typeof process.env.FF_FORCE_TOOL_CALLS === "string") {
    merged.force_tool_calls = process.env.FF_FORCE_TOOL_CALLS.toLowerCase() === "true";
  }
  if (typeof process.env.FF_FORCE_TOOL_CALLS_THRESHOLD === "string") {
    const threshold = parseInt(process.env.FF_FORCE_TOOL_CALLS_THRESHOLD, 10);
    if (!isNaN(threshold)) {
      merged.force_tool_calls_threshold = threshold;
    }
  }

  // GLM thinking configuration (applies to all GLM models: 4.5, 4.6, 4.7)
  if (typeof process.env.GLM_THINKING_MODE === "string") {
    const mode = process.env.GLM_THINKING_MODE.toLowerCase();
    if (mode === "auto" || mode === "enabled" || mode === "disabled") {
      merged.glm_thinking_mode = mode as "auto" | "enabled" | "disabled";
    }
  }

  return merged;
}

export function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

export function writeJson(p: string, value: unknown): void {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n", "utf8");
}
