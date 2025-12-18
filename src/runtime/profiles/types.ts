export type ProviderKind = "openrouter" | "zai" | "minimax" | "lmstudio" | "anthropic" | "openai-compatible" | "anthropic-compatible";

// Modeled after `ai-claude-start`: profile = connection details (non-secret),
// credential stored separately (keychain if available, else local file fallback).
export type Profile = {
  name: string;
  provider: ProviderKind;
  baseUrl?: string; // Optional override for provider base URL
  model?: string; // Primary model string used by the runtime (main model)

  // Optional per-purpose model overrides (mirrors default_config.json fields).
  subagentModel?: string;
  toolModel?: string;
  webModel?: string;
  imageModel?: string;
  videoModel?: string;
};

export type Config = {
  profiles: Profile[];
  defaultProfile?: string;
};
