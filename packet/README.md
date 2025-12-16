# FF-Terminal Port Packet (TS + Ink)

Generated: 20251214T002715Z

This folder packages the “essence” required to recreate the FF-Terminal agent runtime:

- System prompt templates (Variant A/B + local) extracted from source.
- The exact `[AWAITING_INPUT]` stop-protocol text.
- Tool schemas in OpenAI function format (what the model sees).
- Default global config values (providers, limits, flags).
- schedule_task tool spec (params + description).
- Provider/env-var support matrix and stream protocol.
- schedule_task narrative (Launchd integration notes).

Notes:
- Prompt templates include placeholders like `{env_context}` and other runtime-injected blocks.
  The TS port should reconstruct these using its own environment/context builder.
- Tool schemas are sourced from the registered `tool_registry` after importing
  `ff_terminal/simple_tools/integration.py`.

Primary human-readable architecture spec: `docs/FF_TERMINAL_PORT_SPEC_TS_INK.md`.
