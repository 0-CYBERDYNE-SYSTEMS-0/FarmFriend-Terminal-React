import type { GatewayMethodHandler } from "../server-shared.js";

export const providersStatusHandler: GatewayMethodHandler = async (_params, ctx) => {
  const cfg: any = ctx.cfg || {};
  const providers = [
    {
      name: "openrouter",
      configured: Boolean(cfg.openrouter_api_key || process.env.OPENROUTER_API_KEY)
    },
    {
      name: "anthropic",
      configured: Boolean(cfg.anthropic_api_key || process.env.ANTHROPIC_API_KEY)
    },
    {
      name: "openai",
      configured: Boolean(cfg.openai_api_key || process.env.OPENAI_API_KEY)
    },
    {
      name: "minimax",
      configured: Boolean(cfg.minimax_api_key || process.env.MINIMAX_API_KEY)
    },
    {
      name: "zai",
      configured: Boolean(cfg.zai_api_key || process.env.ANTHROPIC_AUTH_TOKEN)
    },
    {
      name: "lmstudio",
      configured: Boolean(cfg.lm_studio_base_url || process.env.LM_STUDIO_BASE_URL)
    },
    {
      name: "ollama",
      configured: Boolean(cfg.ollama_base_url || process.env.OLLAMA_BASE_URL)
    }
  ];

  return { ok: true, payload: { providers } };
};
