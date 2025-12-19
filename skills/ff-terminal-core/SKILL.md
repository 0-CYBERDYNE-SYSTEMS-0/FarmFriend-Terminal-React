---
name: FF-Terminal Core
slug: ff-terminal-core
summary: How to use profiles, tools, and skills in the TS/Ink port.
version: 0.1.0
tags:
  - ff-terminal
  - cli
  - skills
triggers:
  - "How do I configure ff-terminal?"
  - "How do I add skills?"
recommended_tools:
  - skill_documentation
  - skill_loader
  - skill_import
---

# FF-Terminal Core

## Profiles

- Create/edit profiles: `ff-terminal profile setup`
- Start (daemon + Ink UI): `ff-terminal start [profileName]`
- Credentials are stored in keychain when available, otherwise in `~/.ff-terminal-profiles.json`.

## Tool Keys

Tool API keys can be provided via `.env`/`.env.local` or stored per profile and injected at startup:

- `TAVILY_API_KEY` (for `tavily_search`, `tavily_extract`, `tavily_map`, `tavily_crawl`)
- `PERPLEXITY_API_KEY` (for `perplexity_search`)

## Skills

FF-Terminal loads skills from multiple roots (first match wins):

1) `ff-terminal-workspace/skills/` (your local workspace skills)
2) `skills/` (bundled skills shipped with this repo)
3) `FF_SKILLS_PATHS` (path-delimited list of additional skills roots)

List skills: call `skill_documentation` (or run `/models` in the UI for model routing).

Import a skill folder into the workspace:

- Call `skill_import` with `source_path` pointing at a folder that contains `SKILL.md`.
