# Skill Reference: Complete

> **Complete alphabetical reference of all FF Terminal skills**  
> Version: 1.0 | Last Updated: February 2026

---

## All Skills by Category

### Design Skills (6 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `award_winning_designer` | AI design generation with DALL-E/GPT Image | DALL-E, GPT Image |
| `nano-banana-pro` | Advanced media asset processing | Custom CLI |
| `openai-image-gen` | Batch image generation via OpenAI Images API | Python + OpenAI API |
| `remotion` | React-based video production | Remotion CLI |
| `remotion-expert` | Advanced RemD, charts, captions) | Remotion techniques (3otion + Three.js |
| `video-frames` | Extract frames/clips from videos | FFmpeg |

### Development Skills (5 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `agent-browser` | Browser automation with Playwright | Playwright |
| `applescript_automation` | macOS automation with AppleScript | osascript |
| `coding-agent` | AI coding with Codex CLI, Claude Code, OpenCode, Pi | Multiple agents |
| `github` | GitHub operations via gh CLI | GitHub CLI |
| `skill-creator` | Scaffold new skills with templates | skill-creator CLI |

### Testing & Quality (3 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `docs` | Professional documentation generator | Kimi K2.5 + Gemini 3 Flash |
| `summarize` | Summarize URLs, podcasts, videos, files | summarize.sh CLI |
| `webapp-testing` | Web application testing with Playwright | Python Playwright |

### Research & Intelligence (3 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `gemini` | Gemini CLI for Q&A and generation | Gemini CLI |
| `inter-agent-communication` | Multi-agent coordination and delegation | Custom protocol |
| `oracle` | Prompt + file bundling with engine selection | Oracle CLI |

### Media & Content (3 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `openai-whisper` | Local speech-to-text transcription | Whisper CLI |
| `qwen3-tts` | Cloud text-to-speech with Qwen3 | Qwen3 TTS API |
| `sherpa-onnx-tts` | Offline text-to-speech | sherpa-onnx |

### Automation & Deployment (4 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `discord` | Discord messaging, reactions, pins | Discord Bot API |
| `discord-server` | Full Discord server integration | Discord Bot API |
| `slack` | Slack messaging, reactions, pins | Slack Bot API |
| `telegram-bot-creator` | Complete Telegram bot creation | python-telegram-bot, aiogram |

### Specialized Domain (4 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `1password` | Password and secret management | 1Password CLI |
| `apple-notes` | Bear notes integration | grizzly CLI |
| `apple-reminders` | Apple Reminders management | AppleScript |
| `himalaya` | Email management via IMAP/SMTP | Himalaya CLI |

### Internal Tools (3 skills)

| Skill | Description | Primary Tool |
|-------|-------------|--------------|
| `model-usage` | AI model usage and cost tracking | CodexBar CLI |
| `run-other-cli-agents` | Execute other CLI agents | Shell integration |
| `session-logs` | Search and analyze session logs | jq, ripgrep |

---

## Complete Alphabetical Skill List

### 1password

**Category:** Specialized Domain  
**Description:** Access and manage passwords, secrets, and 2FA codes from 1Password  
**Requires:** `1password-cli`  
**Installation:** `brew install 1password-cli`  
**Related:** `model-usage`, `session-logs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/1password/SKILL.md`

---

### agent-browser

**Category:** Development  
**Description:** Browser automation using Playwright/Puppeteer for web interactions and scraping  
**Requires:** `playwright`, `node`  
**Installation:** `npm install playwright`  
**Related:** `webapp-testing`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/agent-browser/SKILL.md`

---

### apple-notes

**Category:** Specialized Domain  
**Description:** Create, search, and manage Bear notes via grizzly CLI  
**Requires:** `grizzly` (Go)  
**Installation:** `go install github.com/tylerwince/grizzly/cmd/grizzly@latest`  
**Related:** `apple-reminders`, `himalaya`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/apple-notes/SKILL.md`

---

### apple-reminders

**Category:** Specialized Domain  
**Description:** Manage Apple Reminders via CLI for task tracking  
**Requires:** macOS, AppleScript  
**Installation:** Built into macOS  
**Related:** `apple-notes`, `session-logs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/apple-reminders/SKILL.md`

---

### applescript_automation

**Category:** Development  
**Description:** Advanced macOS automation with AppleScript, multi-screen management, URL schemes  
**Requires:** macOS, osascript  
**Installation:** Built into macOS  
**Related:** `peekaboo`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/applescript_automation/SKILL.md`

---

### award_winning_designer

**Category:** Design  
**Description:** Generate award-winning visual designs using AI image generation models  
**Requires:** OpenAI API key  
**Installation:** Set `OPENAI_API_KEY`  
**Related:** `openai-image-gen`, `remotion`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/award_winning_designer/SKILL.md`

---

### bear-notes

**Category:** Specialized Domain  
**Description:** Create, search, and manage Bear notes via grizzly CLI (alias: `apple-notes`)  
**Requires:** `grizzly`  
**Installation:** `go install github.com/tylerwince/grizzly/cmd/grizzly@latest`  
**Related:** `apple-notes`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/bear-notes/SKILL.md`

---

### bird

**Category:** Utilities  
**Description:** Twitter/X client for terminal-based social media management  
**Requires:** Twitter API credentials  
**Installation:** `brew install bird-cli`  
**Related:** `blogwatcher`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/bird/SKILL.md`

---

### blogwatcher

**Category:** Monitoring  
**Description:** Monitor blogs and RSS/Atom feeds for updates  
**Requires:** `blogwatcher`  
**Installation:** `go install github.com/Hyaxia/blogwatcher/cmd/blogwatcher@latest`  
**Related:** `blogwatcher`, `summarize`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/blogwatcher/SKILL.md`

---

### blucli

**Category:** IoT  
**Description:** Control Bluetooth devices via CLI  
**Requires:** Bluetooth adapter  
**Installation:** `brew install blucli`  
**Related:** `openhue`, `sonoscli`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/blucli/SKILL.md`

---

### bluebubbles

**Category:** Communication  
**Description:** Build or update BlueBubbles external channel plugin for Clawdbot  
**Requires:** BlueBubbles server  
**Installation:** See SKILL.md  
**Related:** `imsg`, `discord`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/bluebubbles/SKILL.md`

---

### camsnap

**Category:** Media  
**Description:** Capture images from connected cameras  
**Requires:** Camera connected  
**Installation:** `brew install camsnap`  
**Related:** `peekaboo`, `video-frames`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/camsnap/SKILL.md`

---

### canvas

**Category:** Visualization  
**Description:** Control node canvases (present/hide/navigate/eval/snapshot)  
**Requires:** Node canvas setup  
**Installation:** See SKILL.md  
**Related:** `canvas`, `remotion`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/canvas/SKILL.md`

---

### clawdhub

**Category:** Package Management  
**Description:** Search, install, update, and publish agent skills from clawdhub.com  
**Requires:** `clawdhub` npm package  
**Installation:** `npm install clawdhub`  
**Related:** `skill-creator`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/clawdhub/SKILL.md`

---

### coding-agent

**Category:** Development  
**Description:** Run AI coding agents (Codex CLI, Claude Code, OpenCode, Pi) via background process  
**Requires:** One of: `claude`, `codex`, `opencode`, `pi`  
**Installation:** `brew install claude-code` (or others)  
**Related:** `run-other-cli-agents`, `github`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/coding-agent/SKILL.md`

---

### discord

**Category:** Automation & Deployment  
**Description:** Control Discord: send messages, react, manage pins, fetch member info  
**Requires:** `config: channels.discord`  
**Installation:** Configure Discord bot token  
**Related:** `discord-server`, `slack`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/discord/SKILL.md`

---

### discord-server

**Category:** Automation & Deployment  
**Description:** Complete Discord server interaction: upload/download, channels, mentions  
**Requires:** Discord bot with server permissions  
**Installation:** Configure Discord bot token  
**Related:** `discord`, `telegram-bot-creator`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/discord-server/SKILL.md`

---

### docs

**Category:** Testing & Quality  
**Description:** Generate professional software documentation with AI research and design  
**Requires:** `uv`, optional: Kimi K2.5, Gemini 3 Flash  
**Installation:** `brew install uv`  
**Related:** `summarize`, `skill-creator`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/docs/SKILL.md`

---

### dreamhost-manager

**Category:** Hosting  
**Description:** Complete DreamHost website management via SFTP/SSH  
**Requires:** DreamHost account, SSH access  
**Installation:** SSH key setup  
**Related:** `shopify_ops`, `wacli`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/dreamhost-manager/SKILL.md`

---

### eightctl

**Category:** IoT  
**Description:** Control Eight Sleep pods (status, temperature, alarms, schedules)  
**Requires:** Eight Sleep account  
**Installation:** `go install github.com/steipete/eightctl/cmd/eightctl@latest`  
**Related:** `openhue`, `sonoscli`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/eightctl/SKILL.md`

---

### ff-terminal-agent

**Category:** AI Agents  
**Description:** FF Terminal agent for task completion and automation  
**Requires:** FF Terminal setup  
**Installation:** Built-in  
**Related:** `coding-agent`, `inter-agent-communication`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/ff-terminal-agent/SKILL.md`

---

### food-order

**Category:** Lifestyle  
**Description:** Food ordering integration for delivery services  
**Requires:** Food delivery app accounts  
**Installation:** See SKILL.md  
**Related:** `ordercli`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/food-order/SKILL.md`

---

### gemini

**Category:** Research & Intelligence  
**Description:** Gemini CLI for one-shot Q&A, summaries, and content generation  
**Requires:** `gemini-cli`  
**Installation:** `brew install gemini-cli`  
**Related:** `oracle`, `inter-agent-communication`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/gemini/SKILL.md`

---

### gifgrep

**Category:** Media  
**Description:** Search GIF providers with CLI/TUI, download results, extract stills  
**Requires:** `gifgrep`  
**Installation:** `brew install steipete/tap/gifgrep`  
**Related:** `openai-image-gen`, `video-frames`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/gifgrep/SKILL.md`

---

### github

**Category:** Development  
**Description:** Interact with GitHub using gh CLI: issues, PRs, CI runs, API queries  
**Requires:** `gh`  
**Installation:** `brew install gh`  
**Related:** `coding-agent`, `discord`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/github/SKILL.md`

---

### gog

**Category:** Gaming  
**Description:** GOG.com integration for game library management  
**Requires:** GOG account  
**Installation:** `brew install gog-cli`  
**Related:** `spotify-player`, `songsee`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/gog/SKILL.md`

---

### goplaces

**Category:** Productivity  
**Description:** Location-based task and reminder management  
**Requires:** Location services  
**Installation:** `brew install goplaces`  
**Related:** `local-places`, `apple-reminders`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/goplaces/SKILL.md`

---

### himalaya

**Category:** Specialized Domain  
**Description:** CLI to manage emails via IMAP/SMTP, multiple accounts, MML support  
**Requires:** `himalaya`  
**Installation:** `brew install himalaya`  
**Related:** `apple-notes`, `summarize`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/himalaya/SKILL.md`

---

### imsg

**Category:** Communication  
**Description:** iMessage integration for sending/receiving messages on macOS  
**Requires:** macOS, Messages app  
**Installation:** Built into macOS  
**Related:** `bluebubbles`, `discord`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/imsg/SKILL.md`

---

### inter-agent-communication

**Category:** Research & Intelligence  
**Description:** Coordinate multiple AI agents for complex tasks, delegation, aggregation  
**Requires:** Multiple agent tools installed  
**Installation:** See SKILL.md  
**Related:** `coding-agent`, `run-other-cli-agents`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/inter-agent-communication/SKILL.md`

---

### lm-studio-private

**Category:** AI Models  
**Description:** Private LLM and vision processing via LM Studio (local, Tailscale)  
**Requires:** LM Studio running on Mac Mini, Tailscale  
**Installation:** See TOOLS.md  
**Related:** `gemini`, `oracle`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/lm-studio-private/SKILL.md`

---

### local-places

**Category:** Productivity  
**Description:** Local place and location management  
**Requires:** Location services  
**Installation:** Built-in or `brew install`  
**Related:** `goplaces`, `weather`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/local-places/SKILL.md`

---

### mcporter

**Category:** Utilities  
**Description:** Minecraft server management and operations  
**Requires:** Minecraft server  
**Installation:** `brew install mcporter`  
**Related:** `tmux`, `sonoscli`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/mcporter/SKILL.md`

---

### model-usage

**Category:** Internal Tools  
**Description:** Track and summarize AI model usage and costs with CodexBar  
**Requires:** `codexbar`  
**Installation:** `brew install steipete/tap/codexbar`  
**Related:** `session-logs`, `coding-agent`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/model-usage/SKILL.md`

---

### nano-banana-pro

**Category:** Design  
**Description:** Advanced media asset processing for video production workflows  
**Requires:** Python, various media tools  
**Installation:** `pip install nano-banana-pro`  
**Related:** `video-frames`, `remotion`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/nano-banana-pro/SKILL.md`

---

### nano-pdf

**Category:** Utilities  
**Description:** Edit PDFs with natural-language instructions using nano-pdf CLI  
**Requires:** `nano-pdf`  
**Installation:** `uv pip install nano-pdf`  
**Related:** `summarize`, `docs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/nano-pdf/SKILL.md`

---

### notion

**Category:** Productivity  
**Description:** Notion integration for database and page management  
**Requires:** Notion API key  
**Installation:** `npm install notion-cli`  
**Related:** `obsidian`, `trello`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/notion/SKILL.md`

---

### obsidian

**Category:** Productivity  
**Description:** Obsidian vault management and note operations  
**Requires:** Obsidian vault  
**Installation:** `npm install obsidian-cli`  
**Related:** `notion`, `apple-notes`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/obsidian/SKILL.md`

---

### openai-image-gen

**Category:** Design  
**Description:** Batch-generate images via OpenAI Images API with random prompts and HTML gallery  
**Requires:** `python3`, `OPENAI_API_KEY`  
**Installation:** `pip install openai`  
**Related:** `award_winning_designer`, `gifgrep`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/openai-image-gen/SKILL.md`

---

### openai-whisper

**Category:** Media & Content  
**Description:** Local speech-to-text with Whisper CLI (no API key)  
**Requires:** `whisper`  
**Installation:** `brew install openai-whisper`  
**Related:** `sherpa-onnx-tts`, `summarize`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/openai-whisper/SKILL.md`

---

### openai-whisper-api

**Category:** Media & Content  
**Description:** Whisper via OpenAI API for cloud transcription  
**Requires:** `OPENAI_API_KEY`  
**Installation:** Set API key  
**Related:** `openai-whisper`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/openai-whisper-api/SKILL.md`

---

### openhue

**Category:** IoT  
**Description:** Control Philips Hue lights and scenes via OpenHue CLI  
**Requires:** Philips Hue bridge  
**Installation:** `brew install openhue/cli/openhue-cli`  
**Related:** `sonoscli`, `eightctl`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/openhue/SKILL.md`

---

### oracle

**Category:** Research & Intelligence  
**Description:** Best practices for Oracle CLI (prompt + file bundling, engines, sessions)  
**Requires:** `oracle` npm package  
**Installation:** `npm install -g @steipete/oracle`  
**Related:** `gemini`, `coding-agent`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/oracle/SKILL.md`

---

### ordercli

**Category:** Lifestyle  
**Description:** Foodora-only CLI for checking past orders and active order status  
**Requires:** Foodora account  
**Installation:** `brew install steipete/tap/ordercli`  
**Related:** `food-order`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/ordercli/SKILL.md`

---

### peekaboo

**Category:** Utilities  
**Description:** Capture and automate macOS UI with Peekaboo CLI  
**Requires:** macOS, `peekaboo`  
**Installation:** `brew install steipete/tap/peekaboo`  
**Related:** `applescript_automation`, `camsnap`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/peekaboo/SKILL.md`

---

### printify

**Category:** E-commerce  
**Description:** Print on Demand operations via Printify API  
**Requires:** Printify account, API key  
**Installation:** See SKILL.md  
**Related:** `shopify_ops`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/printify/SKILL.md`

---

### qwen3-tts

**Category:** Media & Content  
**Description:** Cloud text-to-speech with Qwen3 TTS API  
**Requires:** Qwen API key  
**Installation:** `npm install qwen-tts`  
**Related:** `sherpa-onnx-tts`, `openai-whisper`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/qwen3-tts/SKILL.md`

---

### ralph-wiggum

**Category:** AI Agents  
**Description:** Claude-powered agent with specific personality and capabilities  
**Requires:** Claude API access  
**Installation:** Configure Claude  
**Related:** `coding-agent`, `ff-terminal-agent`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/ralph-wiggum/SKILL.md`

---

### remotion

**Category:** Design  
**Description:** Create professional videos programmatically using React  
**Requires:** Node.js, `remotion`  
**Installation:** `npm install -g remotion`  
**Related:** `remotion-expert`, `video-frames`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/remotion/SKILL.md`

---

### remotion-expert

**Category:** Design  
**Description:** Expert Remotion techniques: 3D, animations, assets, audio, charts, captions, fonts, Lottie, text, timing, transitions, videos  
**Requires:** `remotion`, Three.js for 3D  
**Installation:** `npm install remotion @react-three/fiber`  
**Related:** `remotion`, `canvas`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/remotion-expert/SKILL.md`

---

### run-other-cli-agents

**Category:** Internal Tools  
**Description:** Execute other CLI agents from within FF Terminal  
**Requires:** Agent tools installed  
**Installation:** Configure paths in config  
**Related:** `coding-agent`, `inter-agent-communication`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/run-other-cli-agents/SKILL.md`

---

### sag

**Category:** Media  
**Description:** Voice storytelling with ElevenLabs TTS for narratives  
**Requires:** ElevenLabs API key  
**Installation:** `npm install sag`  
**Related:** `sherpa-onnx-tts`, `qwen3-tts`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/sag/SKILL.md`

---

### session-logs

**Category:** Internal Tools  
**Description:** Search and analyze session logs using jq for pattern discovery  
**Requires:** `jq`, `ripgrep`  
**Installation:** `brew install jq ripgrep`  
**Related:** `model-usage`, `run-other-cli-agents`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/session-logs/SKILL.md`

---

### sherpa-onnx-tts

**Category:** Media & Content  
**Description:** Local text-to-speech via sherpa-onnx (offline, no cloud)  
**Requires:** sherpa-onnx runtime and model  
**Installation:** See SKILL.md  
**Related:** `qwen3-tts`, `sag`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/sherpa-onnx-tts/SKILL.md`

---

### shopify_ops

**Category:** E-commerce  
**Description:** AI-driven Shopify store configuration for product management and automation  
**Requires:** Shopify store, API access  
**Installation:** See SKILL.md  
**Related:** `printify`, `dreamhost-manager`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/shopify_ops/SKILL.md`

---

### skill-creator

**Category:** Development  
**Description:** Scaffold new skills with standardized structure and templates  
**Requires:** Node.js  
**Installation:** `npm install skill-creator`  
**Related:** `clawdhub`, `docs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/skill-creator/SKILL.md`

---

### slack

**Category:** Automation & Deployment  
**Description:** Control Slack: react, manage pins, send/edit/delete messages, member info  
**Requires:** `config: channels.slack`  
**Installation:** Configure Slack bot token  
**Related:** `discord`, `telegram-bot-creator`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/slack/SKILL.md`

---

### songsee

**Category:** Entertainment  
**Description:** Song lyrics and music information lookup  
**Requires:** Music API access  
**Installation:** `brew install songsee`  
**Related:** `spotify-player`, `gog`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/songsee/SKILL.md`

---

### sonoscli

**Category:** IoT  
**Description:** Control Sonos speakers via CLI  
**Requires:** Sonos speakers on network  
**Installation:** `brew install sonoscli`  
**Related:** `openhue`, `spotify-player`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/sonoscli/SKILL.md`

---

### spotify-player

**Category:** Entertainment  
**Description:** Terminal Spotify playback and search via spogo or spotify_player  
**Requires:** Spotify account  
**Installation:** `brew install spogo` or `brew install spotify_player`  
**Related:** `sonoscli`, `songsee`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/spotify-player/SKILL.md`

---

### summarize

**Category:** Testing & Quality  
**Description:** Summarize or extract text/transcripts from URLs, podcasts, videos, files  
**Requires:** `summarize`  
**Installation:** `brew install steipete/tap/summarize`  
**Related:** `openai-whisper`, `docs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/summarize/SKILL.md`

---

### telegram-bot-creator

**Category:** Automation & Deployment  
**Description:** Complete Telegram bot creation for AI agents and pipelines  
**Requires:** Telegram Bot Token, framework choice  
**Installation:** `pip install python-telegram-bot` or `pip install aiogram`  
**Related:** `discord-server`, `slack`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/telegram-bot-creator/SKILL.md`

---

### things-mac

**Category:** Productivity  
**Description:** Things.app task management integration  
**Requires:** Things 3 app  
**Installation:** `brew install things-cli`  
**Related:** `apple-reminders`, `trello`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/things-mac/SKILL.md`

---

### tmux

**Category:** Utilities  
**Description:** Terminal multiplexer management for session persistence  
**Requires:** `tmux`  
**Installation:** `brew install tmux`  
**Related:** `mcporter`, `session-logs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/tmux/SKILL.md`

---

### trello

**Category:** Productivity  
**Description:** Trello board and card management  
**Requires:** Trello API key  
**Installation:** `npm install trello-cli`  
**Related:** `things-mac`, `notion`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/trello/SKILL.md`

---

### video-frames

**Category:** Design  
**Description:** Extract frames or short clips from videos using FFmpeg  
**Requires:** `ffmpeg`  
**Installation:** `brew install ffmpeg`  
**Related:** `remotion`, `gifgrep`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/video-frames/SKILL.md`

---

### voice-call

**Category:** Communication  
**Description:** Voice call functionality for communication platforms  
**Requires:** Platform API access  
**Installation:** See SKILL.md  
**Related:** `imsg`, `discord`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/voice-call/SKILL.md`

---

### wacli

**Category:** Hosting  
**Description:** CLI for website and web service management  
**Requires:** Web hosting account  
**Installation:** `brew install wacli`  
**Related:** `dreamhost-manager`, `shopify_ops`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/wacli/SKILL.md`

---

### weather

**Category:** Utilities  
**Description:** Weather information and forecasts via Open-Meteo  
**Requires:** None (uses Open-Meteo API)  
**Installation:** Built-in or `brew install weather`  
**Related:** `local-places`, `goplaces`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/weather/SKILL.md`

---

### webapp-testing

**Category:** Testing & Quality  
**Description:** Web application testing with Playwright for verification and debugging  
**Requires:** `playwright`, `python3`  
**Installation:** `pip install playwright`  
**Related:** `agent-browser`, `docs`  
**SKILL.md:** `/Users/scrimwiggins/clawdbot/skills/webapp-testing/SKILL.md`

---

## Skill Count Summary

| Category | Count |
|----------|-------|
| Design Skills | 6 |
| Development Skills | 5 |
| Testing & Quality | 3 |
| Research & Intelligence | 3 |
| Media & Content | 3 |
| Automation & Deployment | 4 |
| Specialized Domain | 4 |
| Internal Tools | 3 |
| **Total Production Skills** | **31+** |

---

## Quick Navigation

| Need... | Start Here |
|---------|------------|
| Create images | `openai-image-gen`, `award_winning_designer` |
| Create videos | `remotion`, `remotion-expert` |
| Code generation | `coding-agent`, `github` |
| Transcribe audio | `openai-whisper` |
| Text-to-speech | `sherpa-onnx-tts`, `qwen3-tts` |
| Send messages | `discord`, `slack`, `telegram-bot-creator` |
| Manage passwords | `1password` |
| Write notes | `apple-notes`, `himalaya` |
| Track tasks | `apple-reminders`, `things-mac` |
| Test web apps | `webapp-testing` |
| Generate docs | `docs` |
| Track costs | `model-usage` |
| Create skills | `skill-creator`, `clawdhub` |

---

## Related Documentation

- [01 - Skills Overview](01-skills-overview.md) - Introduction and architecture
- [02 - Design Skills](02-design-skills.md) - Creative media tools
- [03 - Development Skills](03-development-skills.md) - Coding and programming
- [04 - Testing & Quality](04-testing-quality-skills.md) - Testing and docs
- [05 - Research & Intelligence](05-research-intelligence-skills.md) - AI reasoning
- [06 - Media & Content](06-media-content-skills.md) - Audio and speech
- [07 - Automation & Deployment](07-automation-deployment-skills.md) - Bots and messaging
- [08 - Specialized Domain](08-specialized-domain-skills.md) - Domain-specific tools
- [09 - Internal Tools](09-internal-tools-skills.md) - Meta-operations
- [10 - Creating Custom Skills](10-creating-custom-skills.md) - Skill development guide
