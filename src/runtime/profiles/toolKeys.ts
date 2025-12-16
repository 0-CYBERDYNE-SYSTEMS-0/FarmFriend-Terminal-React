export const OPTIONAL_TOOL_ENV_KEYS = [
  "TAVILY_API_KEY",
  "PERPLEXITY_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "OPENWEATHER_API_KEY"
] as const;

export type OptionalToolEnvKey = (typeof OPTIONAL_TOOL_ENV_KEYS)[number];

// Reserved pseudo-profile for cross-profile defaults (so users don't have to re-enter tool keys
// for every provider profile).
export const GLOBAL_TOOL_CRED_PROFILE = "__ff_terminal_global__";

