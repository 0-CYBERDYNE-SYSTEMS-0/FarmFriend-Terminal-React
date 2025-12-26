import { resolveConfig } from "../config/loadConfig.js";
import { Provider } from "./types.js";
import { openRouterProvider } from "./openrouter.js";
import { zaiProvider, zaiAnthropicProvider } from "./zai.js";
import { minimaxProvider } from "./minimax.js";
import { lmStudioProvider } from "./lmstudio.js";
import { anthropicProvider } from "./anthropic.js";
import { openAICompatProvider } from "./openaiCompat.js";

function isEnabled(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(s)) return true;
    if (["0", "false", "no", "n", "off"].includes(s)) return false;
  }
  return Boolean(v);
}

export function createProvider(params?: { repoRoot?: string; modelOverride?: string }): { provider: Provider; model: string } {
  const cfg: any = resolveConfig({ repoRoot: params?.repoRoot });

  const model = String(params?.modelOverride || process.env.FF_MODEL || cfg.main_model || "openai/gpt-4o-mini");

  const override = String(process.env.FF_PROVIDER || "").trim().toLowerCase();
  if (override) {
    if (override === "anthropic") {
      const apiKey = String(process.env.ANTHROPIC_API_KEY || cfg.anthropic_api_key || "");
      if (!apiKey) throw new Error("FF_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set");
      const baseUrl = String(process.env.ANTHROPIC_BASE_URL || cfg.anthropic_base_url || "https://api.anthropic.com");
      const anthropicVersion = String(process.env.ANTHROPIC_VERSION || cfg.anthropic_version || "2023-06-01");
      return { provider: anthropicProvider({ apiKey, baseUrl, anthropicVersion }), model };
    }
    if (override === "openrouter") {
      const apiKey = String(process.env.OPENROUTER_API_KEY || cfg.openrouter_api_key || "");
      if (!apiKey) throw new Error("FF_PROVIDER=openrouter but OPENROUTER_API_KEY is not set");
      return { provider: openRouterProvider({ apiKey }), model };
    }
    if (override === "zai") {
      const apiKey = String(process.env.ANTHROPIC_AUTH_TOKEN || cfg.zai_api_key || "");
      if (!apiKey) throw new Error("FF_PROVIDER=zai but ANTHROPIC_AUTH_TOKEN is not set");
      const baseUrl = String(process.env.ANTHROPIC_BASE_URL || cfg.anthropic_base_url || "https://api.z.ai/api/anthropic");
      // Use Anthropic-compatible provider for /api/anthropic endpoint, OpenAI-compatible for others
      const useAnthropicFormat = baseUrl.includes("/api/anthropic");
      const provider = useAnthropicFormat
        ? zaiAnthropicProvider({ apiKey, baseUrl })
        : zaiProvider({ apiKey, baseUrl });
      return { provider, model };
    }
    if (override === "minimax") {
      const apiKey = String(process.env.MINIMAX_API_KEY || cfg.minimax_api_key || "");
      if (!apiKey) throw new Error("FF_PROVIDER=minimax but MINIMAX_API_KEY is not set");
      const baseUrl = String(process.env.MINIMAX_BASE_URL || cfg.minimax_base_url || "https://api.minimax.io/anthropic");
      const anthropicVersion = String(process.env.MINIMAX_ANTHROPIC_VERSION || cfg.minimax_anthropic_version || "2023-06-01");
      return { provider: minimaxProvider({ apiKey, baseUrl, anthropicVersion }), model };
    }
    if (override === "lmstudio" || override === "lm_studio") {
      const baseUrl = String(process.env.LM_STUDIO_BASE_URL || cfg.lm_studio_base_url || "http://localhost:1234");
      const apiKey = typeof cfg.lm_studio_api_key === "string" ? cfg.lm_studio_api_key : undefined;
      return { provider: lmStudioProvider({ baseUrl, apiKey }), model };
    }
    if (override === "openai-compatible") {
      const apiKey = String(process.env.API_KEY || process.env.OPENAI_API_KEY || cfg.api_key || "");
      if (!apiKey) throw new Error("FF_PROVIDER=openai-compatible but API_KEY is not set");
      const baseUrl = String(process.env.OPENAI_BASE_URL || cfg.openai_base_url || "");
      if (!baseUrl) throw new Error("FF_PROVIDER=openai-compatible requires a base URL (set OPENAI_BASE_URL)");
      return { provider: openAICompatProvider({ name: "openai-compatible", baseUrl, apiKey }), model };
    }
    if (override === "anthropic-compatible") {
      const apiKey = String(process.env.API_KEY || process.env.ANTHROPIC_API_KEY || cfg.api_key || "");
      if (!apiKey) throw new Error("FF_PROVIDER=anthropic-compatible but API_KEY is not set");
      const baseUrl = String(process.env.ANTHROPIC_BASE_URL || cfg.anthropic_base_url || "");
      if (!baseUrl) throw new Error("FF_PROVIDER=anthropic-compatible requires a base URL (set ANTHROPIC_BASE_URL)");
      const anthropicVersion = String(process.env.ANTHROPIC_VERSION || cfg.anthropic_version || "2023-06-01");
      return { provider: anthropicProvider({ apiKey, baseUrl, anthropicVersion }), model };
    }
    throw new Error(`Unknown FF_PROVIDER: ${override}`);
  }

  // Priority matches your "must work first" list + Python toggles.
  if (isEnabled(cfg.use_openrouter)) {
    const apiKey = String(process.env.OPENROUTER_API_KEY || cfg.openrouter_api_key || "");
    if (!apiKey) throw new Error("OpenRouter enabled but openrouter_api_key is missing (or OPENROUTER_API_KEY not set)");
    return { provider: openRouterProvider({ apiKey }), model };
  }

  if (isEnabled(cfg.use_zai)) {
    const apiKey = String(process.env.ANTHROPIC_AUTH_TOKEN || cfg.zai_api_key || cfg.anthropic_auth_token || "");
    if (!apiKey) throw new Error("Z.ai enabled but zai_api_key is missing (or ANTHROPIC_AUTH_TOKEN not set)");
    const baseUrl = String(process.env.ANTHROPIC_BASE_URL || cfg.anthropic_base_url || cfg.anthropic_api_base || "https://api.z.ai/api/anthropic");
    // Use Anthropic-compatible provider for /api/anthropic endpoint, OpenAI-compatible for others
    const useAnthropicFormat = baseUrl.includes("/api/anthropic");
    const provider = useAnthropicFormat
      ? zaiAnthropicProvider({ apiKey, baseUrl })
      : zaiProvider({ apiKey, baseUrl });
    return { provider, model };
  }

  if (isEnabled(cfg.use_minimax)) {
    const apiKey = String(process.env.MINIMAX_API_KEY || cfg.minimax_api_key || "");
    if (!apiKey) throw new Error("MiniMax enabled but minimax_api_key is missing (or MINIMAX_API_KEY not set)");
    const baseUrl = String(process.env.MINIMAX_BASE_URL || cfg.minimax_base_url || "https://api.minimax.io/anthropic");
    const anthropicVersion = String(process.env.MINIMAX_ANTHROPIC_VERSION || cfg.minimax_anthropic_version || "2023-06-01");
    return { provider: minimaxProvider({ apiKey, baseUrl, anthropicVersion }), model };
  }

  if (isEnabled(cfg.use_lm_studio)) {
    const baseUrl = String(process.env.LM_STUDIO_BASE_URL || cfg.lm_studio_base_url || "http://localhost:1234");
    const apiKey = typeof cfg.lm_studio_api_key === "string" ? cfg.lm_studio_api_key : undefined;
    return { provider: lmStudioProvider({ baseUrl, apiKey }), model };
  }

  if (isEnabled(cfg.use_anthropic_direct) || isEnabled(cfg.use_anthropic)) {
    const apiKey = String(process.env.ANTHROPIC_API_KEY || cfg.anthropic_api_key || "");
    if (!apiKey) throw new Error("Anthropic enabled but anthropic_api_key is missing (or ANTHROPIC_API_KEY not set)");
    const baseUrl = String(process.env.ANTHROPIC_BASE_URL || cfg.anthropic_base_url || "https://api.anthropic.com");
    const anthropicVersion = String(process.env.ANTHROPIC_VERSION || cfg.anthropic_version || "2023-06-01");
    return { provider: anthropicProvider({ apiKey, baseUrl, anthropicVersion }), model };
  }

  throw new Error("No provider enabled. Set one of: use_openrouter/use_zai/use_minimax/use_lm_studio/use_anthropic_direct in config.");
}
