# Configuration Guide

**Complete reference for FF Terminal configuration**

---

## Overview

FF Terminal uses a layered configuration system with multiple sources. Configuration values can be set in configuration files, environment variables, or command-line arguments.

---

## Configuration Hierarchy

Configuration values are resolved in this order (later sources override earlier):

1. **Embedded Defaults** - `packet/default_config.json`
2. **Platform Config** - `~/Library/Application Support/ff-terminal/config.json` (macOS) or `~/.config/ff-terminal/config.json` (Linux)
3. **Environment Variables** - `FF_*` prefixed variables
4. **Runtime Overrides** - Command-line flags
5. **Profile Settings** - Provider and model selections

---

## Configuration Files

### Platform Configuration

**macOS:**
```
~/Library/Application Support/ff-terminal/config.json
```

**Linux:**
```
~/.config/ff-terminal/config.json
```

**Windows:**
```
%APPDATA%/ff-terminal/config.json
```

### Profile Configuration

```
~/.ff-terminal-profiles.json
```

### Scheduler Configuration

```
~/.config/ff-terminal/scheduler.json
```

### Hooks Configuration

```
~/.config/ff-terminal/hooks.json
```

---

## Core Configuration

### Basic Settings

```json
{
  "core": {
    "workspaceDir": "~/ff-terminal-workspace",
    "terminalPort": 28888,
    "webPort": 8787,
    "fieldviewPort": 8788
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `workspaceDir` | Workspace directory path | `~/ff-terminal-workspace` |
| `terminalPort` | Daemon WebSocket port | `28888` |
| `webPort` | Web UI port | `8787` |
| `fieldviewPort` | FieldView port | `8788` |

### Environment Variables

```bash
export FF_WORKSPACE_DIR="/custom/path"
export FF_TERMINAL_PORT=28888
export FF_WEB_PORT=8787
export FF_FIELDVIEW_PORT=8788
```

---

## Model Configuration

### Per-Purpose Models

Configure different models for different purposes:

```json
{
  "models": {
    "main": "anthropic/claude-3-5-sonnet-20241022",
    "subagent": "openai/gpt-4o-mini",
    "tool": "anthropic/claude-3-haiku-20240307",
    "web": "anthropic/claude-3-5-sonnet-20241022",
    "image": "openai/dall-e-3",
    "video": "stability-ai/stable-video-diffusion"
  }
}
```

### Environment Variables

```bash
export FF_MODEL="anthropic/claude-3-5-sonnet-20241022"
export FF_SUBAGENT_MODEL="openai/gpt-4o-mini"
export FF_TOOL_MODEL="anthropic/claude-3-haiku-20240307"
export FF_WEB_MODEL="anthropic/claude-3-5-sonnet-20241022"
export FF_IMAGE_MODEL="openai/dall-e-3"
export FF_VIDEO_MODEL="stability-ai/stable-video-diffusion"
```

---

## AI Provider Configuration

### Supported Providers

| Provider | ID | Description |
|----------|-----|-------------|
| OpenRouter | `openrouter` | OpenAI-compatible with many models |
| Anthropic | `anthropic` | Direct Claude API |
| Z.ai | `z.ai` | High-performance Anthropic |
| MiniMax | `minimax` | Advanced multimodal |
| LM Studio | `lmstudio` | Local model hosting |
| OpenAI | `openai` | Direct OpenAI API |
| Factory AI | `factory` | Direct Factory integration |

### Provider Configuration

```json
{
  "profiles": [
    {
      "name": "production",
      "provider": "openrouter",
      "apiKey": "${OPENROUTER_API_KEY}",
      "model": "anthropic/claude-3-5-sonnet-20241022"
    },
    {
      "name": "local",
      "provider": "lmstudio",
      "apiKey": "not-needed",
      "baseUrl": "http://localhost:1234/v1",
      "model": "mistralai/ministral-3-3b"
    }
  ]
}
```

### Provider-Specific Settings

**OpenRouter:**
```json
{
  "provider": "openrouter",
  "apiKey": "${OPENROUTER_API_KEY}",
  "baseUrl": "https://openrouter.ai/api/v1"
}
```

**Anthropic:**
```json
{
  "provider": "anthropic",
  "apiKey": "${ANTHROPIC_API_KEY}",
  "baseUrl": "https://api.anthropic.com"
}
```

**LM Studio (Local):**
```json
{
  "provider": "lmstudio",
  "apiKey": "not-needed",
  "baseUrl": "http://localhost:1234/v1"
}
```

---

## Feature Flags

### Core Features

```json
{
  "features": {
    "browserAutomation": false,
    "macosControl": false,
    "ttsEnabled": false,
    "autonomyEnabled": true,
    "schedulingEnabled": true
  }
}
```

### Environment Variables

```bash
export FF_ALLOW_BROWSER_USE=1
export FF_ALLOW_MACOS_CONTROL=1
export FF_TTS_ENABLED=1
export FF_AUTONOMY_ENABLED=1
export FF_SCHEDULING_ENABLED=1
```

---

## TTS Configuration

```json
{
  "tts": {
    "enabled": true,
    "voice": "am_adam",
    "rate": 1.0,
    "pitch": 1.0,
    "volume": 1.0
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable text-to-speech | `false` |
| `voice` | Voice ID | System default |
| `rate` | Speech rate (0.5-2.0) | `1.0` |
| `pitch` | Voice pitch (0.5-2.0) | `1.0` |
| `volume` | Volume level (0.0-1.0) | `1.0` |

### Environment Variables

```bash
export FF_TTS_ENABLED=1
export FF_TTS_VOICE=am_adam
export FF_TTS_RATE=1.0
```

---

## Autonomy Configuration

```json
{
  "autonomy": {
    "maxLoops": 10,
    "stallLimit": 3,
    "oracleMode": "on_stall",
    "sessionStrategy": "reuse",
    "highRiskKeywords": ["delete", "destroy", "rm -rf", "drop"],
    "sleepMs": 1000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `maxLoops` | Maximum autonomy loops | `10` |
| `stallLimit` | Stalls before Oracle | `3` |
| `oracleMode` | Oracle intervention mode | `"on_stall"` |
| `sessionStrategy` | Session reuse strategy | `"reuse"` |
| `highRiskKeywords` | Keywords triggering Oracle | `[]` |
| `sleepMs` | Sleep between loops | `1000` |

### Environment Variables

```bash
export FF_AUTONOMY_MAX_LOOPS=10
export FF_AUTONOMY_STALL_LIMIT=3
export FF_AUTONOMY_ORACLE_MODE=on_stall
export FF_AUTONOMY_SESSION_STRATEGY=reuse
```

---

## Scheduling Configuration

```json
{
  "scheduler": {
    "pollIntervalMs": 60000,
    "timezone": "America/Chicago",
    "lockTtlMs": 300000,
    "runStaleMs": 21600000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `pollIntervalMs` | Poll interval for tasks | `60000` |
| `timezone` | Default timezone | System default |
| `lockTtlMs` | Lock file TTL | `300000` |
| `runStaleMs` | Run stale timeout | `21600000` |

### Environment Variables

```bash
export FF_SCHEDULE_POLL_INTERVAL=60000
export FF_SCHEDULE_TIMEZONE=America/Chicago
export FF_SCHEDULE_LOCK_TTL=300000
```

---

## Hooks Configuration

```json
{
  "hooks": {
    "enabled": true,
    "path": "./ff-terminal-workspace/hooks",
    "planValidation": {
      "enabled": true,
      "retry": 3
    },
    "todoEnforcement": {
      "enabled": true,
      "requireComplex": false
    },
    "skillRestrictions": {
      "enabled": false,
      "blocked": [],
      "allowed": []
    }
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable hooks system | `true` |
| `path` | Custom hooks directory | `"./hooks"` |
| `planValidation` | Enable plan validation | `true` |
| `todoEnforcement` | Enable todo enforcement | `true` |
| `skillRestrictions` | Enable skill restrictions | `false` |

### Environment Variables

```bash
export FF_HOOKS_ENABLED=true
export FF_HOOKS_PATH="./ff-terminal-workspace/hooks"
export FF_HOOK_PLAN_VALIDATION=true
export FF_HOOK_TODO_ENFORCEMENT=true
```

---

## WhatsApp Configuration

```json
{
  "whatsapp": {
    "enabled": false,
    "allowFrom": [],
    "groups": [],
    "dmPolicy": "pairing",
    "autoReconnect": true,
    "qrTimeout": 60000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable WhatsApp integration | `false` |
| `allowFrom` | Allowed phone numbers | `[]` |
| `groups` | Allowed group IDs | `[]` |
| `dmPolicy` | Direct message policy | `"pairing"` |
| `autoReconnect` | Auto-reconnect | `true` |
| `qrTimeout` | QR code timeout (ms) | `60000` |

---

## Debug Configuration

```json
{
  "debug": {
    "enabled": false,
    "daemonLog": false,
    "logHooksJsonl": false,
    "logPath": "./logs"
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable debug mode | `false` |
| `daemonLog` | Log daemon output | `false` |
| `logHooksJsonl` | Log hooks to JSONL | `false` |
| `logPath` | Log directory path | `"./logs"` |

### Environment Variables

```bash
export FF_DEBUG=true
export FF_DAEMON_LOG=1
export FF_LOG_HOOKS_JSONL=true
export FF_LOG_PATH="./logs"
```

---

## Limits Configuration

```json
{
  "limits": {
    "readFileMaxBytes": 1048576,
    "maxParallelCalls": 10,
    "maxTurns": 500,
    "agentToolTimeout": 30000
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `readFileMaxBytes` | Max file read size | `1048576` (1MB) |
| `maxParallelCalls` | Max parallel tool calls | `10` |
| `maxTurns` | Max agent turns per session | `500` |
| `agentToolTimeout` | Tool execution timeout | `30000` |

### Environment Variables

```bash
export FF_READ_FILE_MAX_BYTES=1048576
export FF_MAX_PARALLEL_CALLS=10
export FF_MAX_TURNS=500
export FF_AGENT_TOOL_TIMEOUT=30000
```

---

## Logging Configuration

```json
{
  "logging": {
    "level": "info",
    "format": "json",
    "console": true,
    "file": true,
    "path": "./logs",
    "rotation": {
      "maxSize": "10m",
      "maxFiles": 5
    }
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `level` | Log level (debug/info/warn/error) | `"info"` |
| `format` | Log format (json/text) | `"json"` |
| `console` | Log to console | `true` |
| `file` | Log to file | `true` |
| `path` | Log directory path | `"./logs"` |
| `rotation.maxSize` | Max log file size | `"10m"` |
| `rotation.maxFiles` | Number of rotated files | `5` |

---

## Credential Storage

FF Terminal supports multiple credential storage backends:

### OS Keychain (Recommended)

| Platform | Backend |
|----------|---------|
| macOS | Keychain |
| Linux | Secret Service (libsecret) |
| Windows | Credential Manager |

### Fallback Storage

If OS keychain is unavailable, credentials are stored in:

```
<workspace>/.credentials/
```

### Configure Storage

```json
{
  "credentials": {
    "storage": "keychain",  // or "file"
    "fallbackAllowed": true
  }
}
```

---

## Workspace Configuration

```json
{
  "workspace": {
    "dir": "~/ff-terminal-workspace",
    "global": false,
    "autoCreate": true
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `dir` | Workspace directory | `~/ff-terminal-workspace` |
| `global` | Use global workspace | `false` |
| `autoCreate` | Auto-create workspace | `true` |

### Environment Variable

```bash
export FF_WORKSPACE_DIR="/custom/path"
```

---

## Profile Management

### Create Profile

```bash
ff-terminal profile setup
```

### List Profiles

```bash
ff-terminal profile list
```

### Edit Profile

Edit `~/.ff-terminal-profiles.json` directly:

```json
{
  "profiles": [
    {
      "name": "production",
      "provider": "openrouter",
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "subagentModel": "openai/gpt-4o-mini"
    },
    {
      "name": "development",
      "provider": "lmstudio",
      "model": "mistralai/ministral-3-3b",
      "baseUrl": "http://localhost:1234/v1"
    }
  ],
  "default": "production"
}
```

### Set Default Profile

```bash
ff-terminal profile default production
```

---

## Command-Line Flags

### Start Command

```bash
ff-terminal start [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `--profile <name>` | Use specific profile |
| `--mode <mode>` | Set execution mode |
| `--tts` | Enable text-to-speech |
| `--voice <voice>` | Set TTS voice |
| `--workspace <path>` | Set workspace directory |
| `--display-mode <mode>` | Set display mode (clean/verbose) |

### Run Command

```bash
ff-terminal run [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `--prompt <text>` | Execute prompt |
| `--headless` | Run without UI |
| `--profile <name>` | Use specific profile |
| `--session <id>` | Reuse session |
| `--autonomy-auto` | Enable autonomy |

### Daemon Command

```bash
ff-terminal daemon [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `--foreground` | Run in foreground |
| `--port <port>` | Set WebSocket port |

---

## Environment Variable Reference

### Core Variables

| Variable | Description |
|----------|-------------|
| `FF_WORKSPACE_DIR` | Workspace directory |
| `FF_TERMINAL_PORT` | Daemon port |
| `FF_WEB_PORT` | Web UI port |
| `FF_FIELDVIEW_PORT` | FieldView port |

### Model Variables

| Variable | Description |
|----------|-------------|
| `FF_MODEL` | Main model |
| `FF_SUBAGENT_MODEL` | Subagent model |
| `FF_TOOL_MODEL` | Tool calling model |
| `FF_WEB_MODEL` | Web interface model |
| `FF_IMAGE_MODEL` | Image generation model |
| `FF_VIDEO_MODEL` | Video generation model |

### Feature Variables

| Variable | Description |
|----------|-------------|
| `FF_ALLOW_BROWSER_USE` | Enable browser automation |
| `FF_ALLOW_MACOS_CONTROL` | Enable macOS automation |
| `FF_TTS_ENABLED` | Enable text-to-speech |
| `FF_TTS_VOICE` | TTS voice |

### Debug Variables

| Variable | Description |
|----------|-------------|
| `FF_DEBUG` | Enable debug mode |
| `FF_DAEMON_LOG` | Log daemon output |
| `FF_LOG_HOOKS_JSONL` | Log hooks to JSONL |

---

## Troubleshooting Configuration

### View Current Configuration

```bash
ff-terminal config show
```

### Reset Configuration

```bash
# Reset platform config
rm ~/.config/ff-terminal/config.json

# Reset profiles
rm ~/.ff-terminal-profiles.json

# Reset to defaults
ff-terminal config reset
```

### Validate Configuration

```bash
ff-terminal config validate
```

---

## Best Practices

### Security

- Store API keys in environment variables or OS keychain
- Use `"dmPolicy": "pairing"` for WhatsApp
- Regularly review allowlists
- Enable `FF_DEBUG` only for debugging

### Performance

- Set `maxParallelCalls` based on your system
- Use `maxTurns` limits for safety
- Configure log rotation
- Monitor disk space for logs

### Development

- Use LM Studio for local testing
- Set `FF_DEBUG=true` for debugging
- Use `FF_DAEMON_LOG=1` to see daemon output
- Keep config files in version control

---

## Next Steps

1. **[Getting Started](01-getting-started.md)** - Installation and first launch
2. **[Architecture Overview](../architecture/01-file-structure.md)** - System architecture
3. **[API Reference](../api/01-tools-complete-reference.md)** - Complete tool reference

---

**Built with technical precision and agentic intelligence**
