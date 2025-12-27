# Phase 3.5 Complete: Environment Variables & Multi-Provider LLM Support

## Overview

Phase 3.5 adds comprehensive environment variable configuration and multi-provider LLM support, making the Agent Testing Suite flexible and production-ready.

## Deliverables

### 1. Environment Variable Configuration

**Files**:
- `.env.example` - Environment variable template
- `src/config/env.ts` - Environment loader and validator
- `.gitignore` - Updated to ignore .env files

**Features**:
- Complete configuration via environment variables
- Automatic .env loading with dotenv
- Configuration validation on startup
- Sensitive value handling (API keys)
- Development and production support
- Comprehensive validation

**Configuration Categories**:
- API Server (PORT, API_HOST, NODE_ENV)
- Workspace (WORKSPACE_DIR)
- LLM Judge Providers (OpenAI, Anthropic, OpenRouter, LM Studio, Ollama, Custom)
- LLM Judge Settings (temperature, max_tokens, timeout, retry)
- Trend Tracking (storage_dir, alert_threshold)
- Parallel Execution (worker_count, timeout_minutes)
- Logging (level, format, dir)
- Database (DATABASE_URL, REDIS_URL) - optional

### 2. Multi-Provider LLM Support

**Files**:
- `src/testing/evaluation/providers/providerFactory.ts`
- `src/testing/evaluation/providers/openRouter.ts`
- `src/testing/evaluation/providers/lmStudio.ts`
- `src/testing/evaluation/providers/ollama.ts`
- `src/testing/evaluation/providers/anthropic.ts`
- `src/testing/evaluation/providers/openai.ts`

**Providers Supported**:

#### OpenAI
- Models: gpt-4, gpt-3.5-turbo
- API Key: Required
- URL: https://api.openai.com/v1
- Features:
  - Model discovery endpoint
  - Usage statistics
  - Connection testing

#### Anthropic
- Models: claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-2.1
- API Key: Required
- URL: https://api.anthropic.com/v1
- Features:
  - Claude-3 large context (200K tokens)
  - Different API format (messages vs chat/completions)
  - Usage tracking

#### OpenRouter
- Models: 100+ models (OpenAI, Anthropic, Google, Mistral, etc.)
- API Key: Required
- URL: https://openrouter.ai/api/v1
- Features:
  - Unified API for multiple providers
  - Model switching
  - Competitive pricing
  - Model discovery endpoint
  - Rate limiting
  - Custom headers (HTTP-Referer, X-Title)

#### LM Studio
- Models: Any local model (Llama, Mistral, etc.)
- API Key: Not required
- URL: http://localhost:1234/v1 (default)
- Features:
  - Privacy (local inference)
  - Offline capability
  - No rate limits
  - Model discovery endpoint
  - Connection testing
  - Model management GUI

#### Ollama
- Models: Llama, Mistral, Codellama, etc.
- API Key: Not required
- URL: http://localhost:11434/v1 (default)
- Features:
  - Privacy (local inference)
  - Offline capability
  - No rate limits
  - Model discovery (/tags endpoint)
  - Model pulling/downloading
  - Connection testing

### 3. Provider Factory

**File**: `src/testing/evaluation/providers/providerFactory.ts`

**Features**:
- Dynamic provider creation based on configuration
- Provider discovery and listing
- Connection testing
- Provider information retrieval
- Support for 5+ providers
- Custom provider support (OpenAI-compatible)

**API**:
```typescript
// Create provider from current configuration
const provider = ProviderFactory.createProvider();

// List available models for provider
const models = await ProviderFactory.listAvailableModels("openrouter");

// Test connection to provider
const connected = await ProviderFactory.testConnection("lmstudio");

// Create provider for specific type (not current config)
const provider = ProviderFactory.createProviderForType("ollama", config);

// Get provider information
const info = ProviderFactory.getProviderInfo("anthropic");

// List all supported providers
const providers = ProviderFactory.getSupportedProviders();
```

### 4. Updated LLM Judge Plugin

**File**: `src/testing/evaluation/plugins/llmJudge.ts` (v2.0.0)

**Changes**:
- Uses provider factory instead of hardcoded OpenAI
- Loads provider from environment variables
- Tests connection on initialization
- Supports all 5+ providers
- Better error handling

**Usage**:
```typescript
import { PluginRegistry } from "../testing/evaluation/plugins/pluginRegistry";
import { llmJudgePlugin } from "../testing/evaluation/plugins/llmJudge";

const registry = new PluginRegistry();
registry.registerPlugin(llmJudgePlugin);

// Plugin automatically uses provider from environment
// Set in .env: LLM_JUDGE_PROVIDER=openrouter

const result = await registry.evaluateAssertion(assertion, context);
```

### 5. API Configuration Endpoints

**File**: `src/api/server.ts`

**New Endpoints**:

#### GET /api/config
Get current configuration (sanitized - no API keys)

```bash
Response:
{
  "port": 8787,
  "llmJudge": {
    "provider": "openrouter",
    "model": "anthropic/claude-3-opus",
    "settings": {
      "temperature": 0.3,
      "maxTokens": 1000
    }
  },
  "workspaceDir": "./ff-terminal-workspace",
  "parallel": {
    "workerCount": 4,
    "timeoutMinutes": 30
  }
}
```

#### GET /api/providers
List all supported providers

```bash
Response:
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "description": "GPT-4, GPT-3.5-Turbo",
      "requiresApiKey": true
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "description": "Claude-3 Opus, Sonnet, Haiku",
      "requiresApiKey": true
    },
    {
      "id": "openrouter",
      "name": "OpenRouter",
      "description": "100+ models via unified API",
      "requiresApiKey": true
    },
    {
      "id": "lmstudio",
      "name": "LM Studio",
      "description": "Local models (privacy, offline)",
      "requiresApiKey": false
    },
    {
      "id": "ollama",
      "name": "Ollama",
      "description": "Local models (privacy, offline)",
      "requiresApiKey": false
    }
  ]
}
```

#### GET /api/providers/models
List available models for provider

```bash
Request: GET /api/providers/models?provider=openrouter

Response:
{
  "provider": "openrouter",
  "models": [
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "openai/gpt-4",
    "google/gemini-pro",
    "mistral/mistral-large"
  ]
}
```

#### POST /api/providers/test
Test connection to provider

```bash
Request:
{
  "provider": "lmstudio",
  "providerConfig": {
    "baseUrl": "http://localhost:1234/v1",
    "model": "Llama-2-7b-Chat-GGUF"
  }
}

Response:
{
  "connected": true
}
```

## File Structure

```
agent-testing-suite/
├── .env.example                                    # ✅ NEW
├── .env                                            # ✅ NEW (gitignored)
├── src/
│   ├── config/
│   │   └── env.ts                                  # ✅ NEW
│   ├── api/
│   │   └── server.ts                                # ✅ UPDATED
│   └── testing/
│       ├── evaluation/
│       │   ├── plugins/
│       │   │   └── llmJudge.ts                      # ✅ UPDATED (v2.0.0)
│       │   └── providers/                           # ✅ NEW
│       │       ├── providerFactory.ts
│       │       ├── openRouter.ts
│       │       ├── lmStudio.ts
│       │       ├── ollama.ts
│       │       ├── anthropic.ts
│       │       └── openai.ts
└── package.json                                    # ✅ UPDATED
```

## Usage Examples

### Quick Setup

#### OpenAI
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env
export LLM_JUDGE_PROVIDER=openai
export LLM_JUDGE_OPENAI_API_KEY=sk-...
export LLM_JUDGE_OPENAI_MODEL=gpt-4

# Start API server
npm run serve:dev
```

#### Anthropic
```bash
# Edit .env
export LLM_JUDGE_PROVIDER=anthropic
export LLM_JUDGE_ANTHROPIC_API_KEY=sk-ant-...
export LLM_JUDGE_ANTHROPIC_MODEL=claude-3-opus-20240229

# Start API server
npm run serve:dev
```

#### OpenRouter
```bash
# Edit .env
export LLM_JUDGE_PROVIDER=openrouter
export LLM_JUDGE_OPENROUTER_API_KEY=sk-or-...
export LLM_JUDGE_OPENROUTER_MODEL=anthropic/claude-3-opus

# Start API server
npm run serve:dev
```

#### LM Studio (Local)
```bash
# Start LM Studio (http://localhost:1234)
open -a "LM Studio"

# Edit .env
export LLM_JUDGE_PROVIDER=lmstudio
export LLM_JUDGE_LMSTUDIO_BASE_URL=http://localhost:1234/v1
export LLM_JUDGE_LMSTUDIO_MODEL=Llama-2-7b-Chat-GGUF

# Start API server
npm run serve:dev
```

#### Ollama (Local)
```bash
# Start Ollama (http://localhost:11434)
ollama serve

# Edit .env
export LLM_JUDGE_PROVIDER=ollama
export LLM_JUDGE_OLLAMA_BASE_URL=http://localhost:11434/v1
export LLM_JUDGE_OLLAMA_MODEL=llama2

# Start API server
npm run serve:dev
```

### Using Provider Factory

```typescript
import { ProviderFactory } from "../testing/evaluation/providers/providerFactory";

// Create provider from current configuration
const provider = ProviderFactory.createProvider();

// Call LLM
const response = await provider.call(
  "Evaluate this response...",
  {
    temperature: 0.3,
    maxTokens: 1000
  }
);

// List available models for provider
const models = await ProviderFactory.listAvailableModels("openrouter");
console.log(`Available models: ${models.join(", ")}`);

// Test connection to provider
const connected = await ProviderFactory.testConnection("lmstudio");
console.log(`Connected: ${connected}`);

// Get provider information
const info = ProviderFactory.getProviderInfo("anthropic");
console.log(`Provider: ${info.name} - ${info.description}`);

// List all supported providers
const providers = ProviderFactory.getSupportedProviders();
console.log(`Supported providers:`);
providers.forEach(p => {
  console.log(`  - ${p.id}: ${p.name} (${p.requiresApiKey ? "requires API key" : "free"})`);
});
```

### LLM Judge with Provider

```typescript
import { PluginRegistry } from "../testing/evaluation/plugins/pluginRegistry";
import { llmJudgePlugin } from "../testing/evaluation/plugins/llmJudge";

const registry = new PluginRegistry();
registry.registerPlugin(llmJudgePlugin);

// Plugin automatically uses provider from environment (.env)
const result = await registry.evaluateAssertion(
  {
    type: "llm_judge",
    judge_prompt: "Evaluate the response...",
    grading_rubric: "Score 0-1...",
    expected_quality: "high"
  },
  {
    output: "Agent response...",
    prompt: "User prompt..."
  }
);

console.log(`Passed: ${result.passed}`);
console.log(`Score: ${result.score}`);
console.log(`Notes: ${result.criteria_results[0].notes}`);
```

## Environment Variables

### API Server
```bash
PORT=8787                       # API server port
API_HOST=localhost                # API server host
NODE_ENV=production              # Environment (development, production)
```

### Workspace
```bash
WORKSPACE_DIR=./ff-terminal-workspace  # Workspace directory
```

### LLM Judge - OpenAI
```bash
LLM_JUDGE_PROVIDER=openai
LLM_JUDGE_OPENAI_API_KEY=sk-...
LLM_JUDGE_OPENAI_MODEL=gpt-4
LLM_JUDGE_OPENAI_BASE_URL=https://api.openai.com/v1
```

### LLM Judge - Anthropic
```bash
LLM_JUDGE_PROVIDER=anthropic
LLM_JUDGE_ANTHROPIC_API_KEY=sk-ant-...
LLM_JUDGE_ANTHROPIC_MODEL=claude-3-opus-20240229
LLM_JUDGE_ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### LLM Judge - OpenRouter
```bash
LLM_JUDGE_PROVIDER=openrouter
LLM_JUDGE_OPENROUTER_API_KEY=sk-or-...
LLM_JUDGE_OPENROUTER_MODEL=anthropic/claude-3-opus
LLM_JUDGE_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### LLM Judge - LM Studio
```bash
LLM_JUDGE_PROVIDER=lmstudio
LLM_JUDGE_LMSTUDIO_BASE_URL=http://localhost:1234/v1
LLM_JUDGE_LMSTUDIO_MODEL=Llama-2-7b-Chat-GGUF
```

### LLM Judge - Ollama
```bash
LLM_JUDGE_PROVIDER=ollama
LLM_JUDGE_OLLAMA_BASE_URL=http://localhost:11434/v1
LLM_JUDGE_OLLAMA_MODEL=llama2
```

### LLM Judge Settings
```bash
LLM_JUDGE_TEMPERATURE=0.3           # Sampling temperature (0.0-2.0)
LLM_JUDGE_MAX_TOKENS=1000           # Maximum tokens per response
LLM_JUDGE_TIMEOUT_MS=30000          # API call timeout (30 seconds)
LLM_JUDGE_RETRY_ATTEMPTS=3         # Number of retry attempts
LLM_JUDGE_RETRY_DELAY_MS=1000       # Delay between retries (1 second)
```

### Trend Tracking
```bash
TREND_STORAGE_DIR=./workspace/tests/trends  # Trend data storage
TREND_ALERT_THRESHOLD=2.5                # Anomaly detection threshold (standard deviations)
```

### Parallel Execution
```bash
PARALLEL_WORKER_COUNT=4           # Number of parallel workers
PARALLEL_TIMEOUT_MINUTES=30        # Timeout per scenario (minutes)
```

### Logging
```bash
LOG_LEVEL=info                   # Log level (debug, info, warn, error)
LOG_FORMAT=json                  # Log format (json, text)
LOG_DIR=./workspace/tests/logs  # Log directory
```

## Provider Comparison

| Provider | Models | API Key | Cost | Privacy | Offline | Discovery |
|----------|---------|----------|-------|----------|----------|------------|
| **OpenAI** | GPT-4, GPT-3.5-Turbo | Required | $0.01-0.03 per 1K tokens | No | No | Yes |
| **Anthropic** | Claude-3 Opus, Sonnet, Haiku | Required | $0.003-0.015 per 1K tokens | No | No | No |
| **OpenRouter** | 100+ models | Required | Varies by model | No | No | Yes |
| **LM Studio** | Any local model | Not required | Free | Yes | Yes | Yes |
| **Ollama** | Llama, Mistral, Codellama | Not required | Free | Yes | Yes | Yes |

## Dependencies

**Added**:
- dotenv@^16.4.5 - Load environment variables from .env file

## Success Criteria

✅ Environment variables loaded from .env file
✅ LLM judge plugin uses provider from environment
✅ OpenRouter provider working with 100+ models
✅ LM Studio provider working with local models
✅ Ollama provider working with local models
✅ Anthropic provider working with Claude-3
✅ OpenAI provider working with GPT-4
✅ API endpoints for configuration
✅ Provider factory with dynamic provider creation
✅ .env.example file created
✅ Configuration validation on startup
✅ Sensitive value handling (API keys not exposed)

## Files Summary

**Created**: 9 files, ~1800 lines
- `.env.example` - Environment variable template
- `src/config/env.ts` - Environment loader
- `src/testing/evaluation/providers/providerFactory.ts` - Provider factory
- `src/testing/evaluation/providers/openRouter.ts` - OpenRouter provider
- `src/testing/evaluation/providers/lmStudio.ts` - LM Studio provider
- `src/testing/evaluation/providers/ollama.ts` - Ollama provider
- `src/testing/evaluation/providers/anthropic.ts` - Anthropic provider
- `src/testing/evaluation/providers/openai.ts` - OpenAI provider

**Modified**: 4 files
- `src/testing/evaluation/plugins/llmJudge.ts` - v2.0.0 with provider support
- `src/api/server.ts` - Added config endpoints
- `package.json` - Added dotenv dependency
- `.gitignore` - Added .env patterns

## Next Steps

**Phase 4** (Future):
1. CLI config commands (ff-test config, ff-test env)
2. Web UI configuration page
3. Model discovery UI
4. Runtime provider switching
5. Configuration validation UI
6. Documentation updates

## Commits

- **Phase 1**: `4e031e4` - Core infrastructure
- **Phase 2**: `9c87e1d` - Evaluators, Reports, and API
- **Phase 3**: `b31d69c` - Advanced Features
- **Phase 3.5**: `2264705` - Environment Variables & Multi-Provider LLM Support

---

**Phase 3.5 Status**: ✅ COMPLETE
**Commit**: `2264705`
**Files**: 12 files (9 new, 3 modified)
**Lines**: ~1800 lines
**Dependencies**: dotenv@^16.4.5
