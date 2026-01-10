# ClawdBot -> FF-Terminal Adoption Plan (Agriculture-First)

Planning-only document. No code changes. Focus: agriculture-first UX, continuous sessions, and a ClawdBot-style workspace contract.

## Strategic Thesis
- Continuity creates trust: a single long-lived workspace + stable session ID.
- Explicit, human-readable workspace files make the system inspectable.
- Gateway-first runtime stabilizes multi-channel messaging and ops.

## Agriculture-First UX Goals
- Zero-config start (WhatsApp-first), immediate practical value.
- Plain language and “magic wand” defaults; avoid tool jargon.
- Daily check-ins, reminders, and safety confirmations.

## Session Model Shift
- Current FF-Terminal: workspace -> per-session ID -> artifacts per project.
- ClawdBot model: single agent workspace -> long-lived “main” session.
- Target state: canonical workspace + stable session ID across projects.

## Gateway Model Shift
- Current: daemon + embedded WhatsApp.
- ClawdBot: single Gateway owns all channels + WS API.
- Target: Gateway abstraction for WhatsApp-first onboarding.

## Workspace Contract Mapping
| ClawdBot File | Meaning | FF-Terminal Equivalent | Plan |
|---|---|---|---|
| AGENTS.md | Operating instructions + memory policy | System prompt + profile | Adopt: primary persona source |
| SOUL.md | Persona, tone, boundaries | Prompt tone guidance | Adopt: editable by operator |
| TOOLS.md | Tool notes (not enforcement) | Allowed-tools hook | Modify: use as pre-session manifest |
| USER.md / IDENTITY.md | User profile + agent identity | Profile config + UI name | Adopt: new workspace files |
| MEMORY.md + memory/YYYY-MM-DD.md | Long-term + daily memory | memory_core/session_summary.md | Modify: replace summary with MEMORY.md + daily logs |
| PLAN.md / TASKS.md / LOG.md | Plan, tasks, audit trail | plan store / todos / logs | Adopt: generate readable summaries |

## Adopt / Modify / Omit
| Area | Adopt | Modify | Omit / Defer |
|---|---|---|---|
| Runtime | Gateway-first channel ownership | Session routing to “main” for direct chats | Multi-channel expansion before gateway is stable |
| Workspace | Bootstrap + contract files | Daily memory logs + long-term memory split | Parallel memory stores without sync |
| UX | WhatsApp-first onboarding | Plain language prompts + confirmations | Advanced config in first-run |
| Safety | Tool manifest guidance file | Enforce allowed tools from manifest + skills | Unbounded tool access in low-trust contexts |

## Phased Implementation (Planning Only)
1. Define canonical workspace + stable session ID policy.
2. Add workspace contract files and bootstrap templates.
3. Introduce Gateway abstraction for WhatsApp-first onboarding.
4. Add daily memory logs and readable summaries.
5. Add tool manifest enforcement + skill metadata gates.
6. Migrate existing workspaces + UX polish for agriculture.

## Risks & Mitigations
- Duplicate memory stores -> single source of truth in MEMORY.md.
- Session fragmentation -> canonical workspace + stable session ID.
- Ops complexity -> Gateway UI + health surface.

## Acceptance Criteria
- WhatsApp-first start works without local config.
- Direct chats map to a single “main” session by default.
- AGENTS/SOUL/TOOLS/USER/IDENTITY/MEMORY/PLAN/TASKS/LOG exist in workspace.
- All memory and task views are readable and consistent.

## References (ClawdBot Docs)
- docs.clawd.bot/concepts/agent
- docs.clawd.bot/concepts/agent-workspace
- docs.clawd.bot/architecture
- clawdbot.com/webchat.html
- docs.clawd.bot/reference/AGENTS.default
- docs.clawd.bot/reference/templates/AGENTS
