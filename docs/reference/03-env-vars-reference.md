# Environment Variables Reference

**Complete reference for all FF Terminal environment variables**

---

## Core Configuration

### Workspace & Ports

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_WORKSPACE_DIR` | path | `~/.config/ff-terminal` | Workspace directory for projects, sessions, logs |
| `FF_TERMINAL_PORT` | integer | `28888` | WebSocket daemon port |
| `FF_WEB_PORT` | integer | `8787` | Web client HTTP port |
| `FF_FIELDVIEW_PORT` | integer | `8788` | FieldView HTTP port |

**Examples:**
```bash
export FF_WORKSPACE_DIR="/custom/path/workspace"
export FF_TERMINAL_PORT=28889
export FF_WEB_PORT=8888
export FF_FIELDVIEW_PORT=8889
```

### Profile Management

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_PROFILE` | string | `default` | Default profile name to use |

**Example:**
```bash
export FF_PROFILE="production"
```

---

## Model Configuration

### Primary Model Override

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_MODEL` | string | From profile | Override main conversation model |

**Example:**
```bash
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
```

### Purpose-Specific Models

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_SUBAGENT_MODEL` | string | From profile | Model for subagent execution |
| `FF_TOOL_MODEL` | string | From profile | Model for tool calling |
| `FF_WEB_MODEL` | string | From profile | Model for web interface |
| `FF_IMAGE_MODEL` | string | From profile | Model for image generation |
| `FF_VIDEO_MODEL` | string | From profile | Model for video generation |

**Examples:**
```bash
export FF_SUBAGENT_MODEL="openai/gpt-4o-mini"
export FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"
export FF_WEB_MODEL="anthropic/claude-3-haiku-20240307"
export FF_IMAGE_MODEL="openai/dall-e-3"
export FF_VIDEO_MODEL="openai/gpt-4-vision-preview"
```

---

## Feature Flags

### Tool Restrictions

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_ALLOW_BROWSER_USE` | boolean | `0` (disabled) | Enable browser automation tools |
| `FF_ALLOW_MACOS_CONTROL` | boolean | `0` (disabled) | Enable macOS automation tools |

**Examples:**
```bash
export FF_ALLOW_BROWSER_USE=1
export FF_ALLOW_MACOS_CONTROL=1
```

### Text-to-Speech

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_TTS_ENABLED` | boolean | `0` (disabled) | Enable text-to-speech output |
| `FF_TTS_VOICE` | string | `am_adam` | TTS voice name |

**Available Voices:**
- `am_adam` - Adam (US English, male)
- `am_michael` - Michael (US English, male)
- `af_sarah` - Sarah (US English, female)
- `ef_allison` - Allison (US English, female)
- `and more` - Check TTS provider documentation

**Examples:**
```bash
export FF_TTS_ENABLED=1
export FF_TTS_VOICE="am_adam"
```

---

## Debugging & Logging

### Verbose Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_DEBUG` | boolean | `false` | Enable verbose debug logging |
| `FF_DAEMON_LOG` | boolean | `false` | Log daemon stdout/stderr |
| `FF_LOG_HOOKS_JSONL` | boolean | `false` | Log tool calls as JSONL |

**Examples:**
```bash
export FF_DEBUG=true
export FF_DAEMON_LOG=1
export FF_LOG_HOOKS_JSONL=true
```

### Debug Log Locations

- Daemon logs: `~/ff-terminal-workspace/logs/daemon/`
- Session logs: `~/ff-terminal-workspace/logs/sessions/<session-id>.jsonl`
- Hook logs: `~/ff-terminal-workspace/logs/hooks.jsonl`

---

## Limits & Thresholds

### File Operations

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_READ_FILE_MAX_BYTES` | integer | `1048576` | Max file read size in bytes (1MB default) |

**Examples:**
```bash
# 5MB limit
export FF_READ_FILE_MAX_BYTES=5242880

# 10MB limit
export FF_READ_FILE_MAX_BYTES=10485760
```

### Tool Execution

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_MAX_PARALLEL_CALLS` | integer | `10` | Max parallel tool calls |

**Examples:**
```bash
# Increase parallel calls
export FF_MAX_PARALLEL_CALLS=20

# Decrease parallel calls (conservative)
export FF_MAX_PARALLEL_CALLS=5
```

### Agent Loop

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_MAX_TURNS` | integer | `500` | Max turns per conversation |
| `FF_AUTONOMY_MAX_LOOPS` | integer | `10` | Max loops in autonomy mode |

**Examples:**
```bash
# Longer conversations
export FF_MAX_TURNS=1000

# More autonomy loops
export FF_AUTONOMY_MAX_LOOPS=20
```

---

## AI Provider Configuration

### OpenRouter

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENROUTER_API_KEY` | string | - | OpenRouter API key |
| `OPENROUTER_BASE_URL` | string | `https://openrouter.ai/api/v1` | Custom OpenRouter endpoint |

**Examples:**
```bash
export OPENROUTER_API_KEY="sk-or-..."
export OPENROUTER_BASE_URL="https://custom.openrouter.instance/api/v1"
```

### Z.ai

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ZAI_API_KEY` | string | - | Z.ai API key |
| `ZAI_BASE_URL` | string | Default endpoint | Custom Z.ai endpoint |

**Example:**
```bash
export ZAI_API_KEY="your-zai-key"
```

### Anthropic

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ANTHROPIC_API_KEY` | string | - | Anthropic API key |
| `ANTHROPIC_BASE_URL` | string | `https://api.anthropic.com` | Custom Anthropic endpoint |

**Examples:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_BASE_URL="https://custom.anthropic.endpoint"
```

### MiniMax

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MINIMAX_API_KEY` | string | - | MiniMax API key |
| `MINIMAX_GROUP_ID` | string | - | MiniMax group ID |

**Example:**
```bash
export MINIMAX_API_KEY="your-minimax-key"
export MINIMAX_GROUP_ID="your-group-id"
```

### LM Studio

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LM_STUDIO_BASE_URL` | string | `http://localhost:1234/v1` | LM Studio API endpoint |

**Example:**
```bash
export LM_STUDIO_BASE_URL="http://100.72.41.118:1234/v1"
```

### Generic OpenAI-Compatible

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENAI_API_KEY` | string | - | OpenAI API key |
| `OPENAI_BASE_URL` | string | `https://api.openai.com/v1` | Custom OpenAI-compatible endpoint |

**Examples:**
```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://custom.openai.endpoint/v1"
```

---

## Credential Storage

### OS Keychain Preference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_USE_KEYCHAIN` | boolean | `true` | Use OS keychain for credentials |

**Disable keychain (plaintext fallback):**
```bash
export FF_USE_KEYCHAIN=false
```

### Keychain Locations

- **macOS:** Login Keychain
- **Linux:** Secret Service API (gnome-keyring, kwallet)
- **Windows:** Windows Credential Manager

### Plaintext Fallback

When keychain is unavailable, credentials are stored in:
```
~/ff-terminal-workspace/credentials.json
```

---

## Web Interface

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_WEB_HOST` | string | `0.0.0.0` | Web server bind address |
| `FF_WEB_PORT` | integer | `8787` | Web server port |

**Examples:**
```bash
# Bind to localhost only
export FF_WEB_HOST="127.0.0.1"

# Custom port
export FF_WEB_PORT=9000
```

### WebSocket Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_WS_RECONNECT_DELAY` | integer | `750` | WebSocket reconnect delay (ms) |
| `FF_WS_TIMEOUT` | integer | `30000` | WebSocket timeout (ms) |

**Examples:**
```bash
# Faster reconnect
export FF_WS_RECONNECT_DELAY=500

# Longer timeout
export FF_WS_TIMEOUT=60000
```

---

## Autonomy Mode

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_AUTONOMY_MAX_LOOPS` | integer | `10` | Max autonomy loops |
| `FF_AUTONOMY_STALL_LIMIT` | integer | `5` | Stall loops before Oracle escalation |
| `FF_AUTONOMY_ORACLE_MODE` | string | `critical` | Oracle intervention mode |

**Oracle Modes:**
- `off` - No Oracle intervention
- `critical` - Ask Oracle on critical failures
- `on_complete` - Ask Oracle on task completion
- `on_stall` - Ask Oracle when stalled
- `on_high_risk` - Ask Oracle on high-risk operations
- `always` - Ask Oracle for every decision

**Examples:**
```bash
export FF_AUTONOMY_MAX_LOOPS=20
export FF_AUTONOMY_STALL_LIMIT=10
export FF_AUTONOMY_ORACLE_MODE="always"
```

---

## Task Scheduling

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_SCHEDULED_TASKS_DIR` | path | `~/ff-terminal-workspace/scheduled_tasks` | Scheduled tasks directory |

**Example:**
```bash
export FF_SCHEDULED_TASKS_DIR="/custom/scheduled_tasks"
```

---

## WhatsApp Integration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_WHATSAPP_SESSION_DIR` | path | `~/ff-terminal-workspace/whatsapp` | WhatsApp session directory |
| `FF_WHATSAPP_ENABLE` | boolean | `false` | Enable WhatsApp integration |

**Examples:**
```bash
export FF_WHATSAPP_SESSION_DIR="/custom/whatsapp"
export FF_WHATSAPP_ENABLE=1
```

---

## Node.js Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `production` | Node.js environment |
| `NODE_OPTIONS` | string | - | Additional Node.js options |

**Examples:**
```bash
# Development mode
export NODE_ENV="development"

# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

## TypeScript Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TS_NODE_PROJECT` | path | `tsconfig.json` | TypeScript project config |

**Example:**
```bash
export TS_NODE_PROJECT="tsconfig.dev.json"
```

---

## Testing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FF_TEST_WORKSPACE` | path | `/tmp/ff-terminal-test` | Test workspace directory |
| `FF_TEST_DAEMON_PORT` | integer | `28999` | Test daemon port |

**Examples:**
```bash
export FF_TEST_WORKSPACE="/tmp/ff-terminal-test"
export FF_TEST_DAEMON_PORT=28999
```

---

## Quick Reference by Category

### Essential Variables

```bash
# Quick setup
export FF_WORKSPACE_DIR="~/my-workspace"
export FF_PROFILE="production"
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
```

### Development Variables

```bash
# Debug mode
export FF_DEBUG=true
export FF_DAEMON_LOG=1
export FF_LOG_HOOKS_JSONL=true
```

### Feature Enablement

```bash
# Enable all features
export FF_ALLOW_BROWSER_USE=1
export FF_ALLOW_MACOS_CONTROL=1
export FF_TTS_ENABLED=1
```

### API Keys

```bash
# Provider keys
export OPENROUTER_API_KEY="sk-or-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
```

### Custom Ports

```bash
# Port configuration
export FF_TERMINAL_PORT=28889
export FF_WEB_PORT=9000
export FF_FIELDVIEW_PORT=9001
```

---

## Environment File

Create a `.env` file in the FF Terminal directory:

```bash
# .env
FF_WORKSPACE_DIR="~/ff-terminal-workspace"
FF_TERMINAL_PORT=28888
FF_WEB_PORT=8787
FF_FIELDVIEW_PORT=8788
FF_PROFILE="production"

# Models
FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
FF_SUBAGENT_MODEL="openai/gpt-4o-mini"
FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"

# API Keys
OPENROUTER_API_KEY="sk-or-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Features
FF_ALLOW_BROWSER_USE=1
FF_ALLOW_MACOS_CONTROL=1
FF_TTS_ENABLED=1
FF_TTS_VOICE="am_adam"

# Debug
FF_DEBUG=false
FF_DAEMON_LOG=0
FF_LOG_HOOKS_JSONL=false
```

Load the file:
```bash
source .env
```

---

## Precedence Order

Environment variables are applied in this order (later overrides earlier):

1. **Embedded defaults** (`packet/default_config.json`)
2. **Platform config** (`~/Library/Application Support/ff-terminal/config.json`)
3. **Environment variables** (`FF_*`)
4. **Runtime overrides** (command-line flags)
5. **Profile settings** (provider and model selections)

---

## Shell Configuration

### Bash (~/.bashrc or ~/.bash_profile)

```bash
# FF Terminal configuration
export FF_WORKSPACE_DIR="~/ff-terminal-workspace"
export FF_PROFILE="production"
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
export OPENROUTER_API_KEY="sk-or-..."
```

### Zsh (~/.zshrc)

```bash
# FF Terminal configuration
export FF_WORKSPACE_DIR="~/ff-terminal-workspace"
export FF_PROFILE="production"
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
export OPENROUTER_API_KEY="sk-or-..."
```

### Fish (~/.config/fish/config.fish)

```fish
# FF Terminal configuration
set -x FF_WORKSPACE_DIR "~/ff-terminal-workspace"
set -x FF_PROFILE "production"
set -x FF_MODEL "anthropic/claude-3-5-sonnet-20241022"
set -x OPENROUTER_API_KEY "sk-or-..."
```

---

## Troubleshooting

### Variables Not Taking Effect

```bash
# Check if variable is set
echo $FF_WORKSPACE_DIR

# List all FF_ variables
env | grep FF_

# Check in running process
ps aux | grep ff-terminal
```

### Port Conflicts

```bash
# Check what's using the port
lsof -i:28888

# Use custom port
export FF_TERMINAL_PORT=28889
```

### API Key Issues

```bash
# Verify key is set
echo $OPENROUTER_API_KEY

# Test connectivity
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

---

**Last Updated:** February 2, 2026
