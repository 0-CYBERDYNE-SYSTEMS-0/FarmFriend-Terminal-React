# Provider Support Matrix (Port Target)

FF-Terminal’s Python implementation supports these provider classes:

- OpenAI direct: `OpenAIProvider` (env: `OPENAI_API_KEY`)
- OpenRouter: `OpenRouterProvider` (env: `OPENROUTER_API_KEY`)
- Groq: `GroqProvider` (env: `GROQ_API_KEY`)
- LM Studio: `LMStudioProvider` (base URL default `http://localhost:1234`)
- Local (Ollama): `OllamaProvider` (base URL default `http://localhost:11434`)
- LiteLLM: `LiteLLMProvider` (env depends on your LiteLLM setup)
- Z.ai: `ZaiProvider` (env: `ANTHROPIC_AUTH_TOKEN`, optional `ANTHROPIC_BASE_URL`)
- MiniMax: `MiniMaxProvider` (env: `MINIMAX_API_KEY`, optional `MINIMAX_BASE_URL`)

Notes for a TS port (based on product requirements):

- “Anthropic direct” is not a dedicated provider class in this Python repo.
  Anthropic models are typically used via OpenRouter, or via Anthropic-compatible gateways
  (Z.ai and MiniMax) using Anthropic-style endpoints.
- The TS/Ink rebuild MUST include *true Anthropic direct* support. Add an `AnthropicProvider`
  in TS using Anthropic’s official SDK and mirror:
  - streaming deltas
  - tool call schema mapping
  - message role conversion (system/developer differences, if any)

Source of truth: `ff_terminal/core/model_providers.py`.
