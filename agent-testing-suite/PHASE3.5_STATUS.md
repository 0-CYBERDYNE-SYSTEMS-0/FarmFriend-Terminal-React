# Phase 3.5 Status: Environment Variables & Multi-Provider LLM Support

## Phase 3.5: ✅ COMPLETE

Completed on: December 27, 2024

### ✅ Delivered Components

#### 1. Environment Variable Configuration
- **Files**:
  - `.env.example` - Environment variable template
  - `.env` - Actual environment (gitignored)
  - `src/config/env.ts` - Environment loader and validator
- **Features**:
  - Complete configuration via environment variables
  - Configuration validation on startup
  - Sensitive value handling (API keys)
  - Development and production support
  - Automatic .env loading with dotenv

#### 2. Multi-Provider LLM Support
- **Files**:
  - `src/testing/evaluation/providers/providerFactory.ts`
  - `src/testing/evaluation/providers/openRouter.ts`
  - `src/testing/evaluation/providers/lmStudio.ts`
  - `src/testing/evaluation/providers/ollama.ts`
  - `src/testing/evaluation/providers/anthropic.ts`
  - `src/testing/evaluation/providers/openai.ts`
- **Providers Supported**:
  - ✅ **OpenAI** (gpt-4, gpt-3.5-turbo)
  - ✅ **Anthropic** (claude-3-opus, claude-3-sonnet, claude-3-haiku)
  - ✅ **OpenRouter** (100+ models)
  - ✅ **LM Studio** (local models)
  - ✅ **Ollama** (local models)
  - ✅ **Custom** (any OpenAI-compatible endpoint)

#### 3. Provider Factory
- **File**: `src/testing/evaluation/providers/providerFactory.ts`
- **Features**:
  - Dynamic provider creation based on configuration
  - Provider discovery and listing
  - Connection testing
  - Provider information retrieval
  - Support for 5+ providers

#### 4. Updated LLM Judge Plugin
- **File**: `src/testing/evaluation/plugins/llmJudge.ts` (v2.0.0)
- **Changes**:
  - Uses provider factory instead of hardcoded OpenAI
  - Loads provider from environment variables
  - Tests connection on initialization
  - Supports all 5+ providers
  - Better error handling

#### 5. API Configuration Endpoints
- **File**: `src/api/server.ts`
- **New Endpoints**:
  - `GET /api/config` - Get current configuration (sanitized)
  - `GET /api/providers` - List all supported providers
  - `GET /api/providers/models` - List available models for provider
  - `POST /api/providers/test` - Test connection to provider

#### 6. Environment Variables
- **Categories**:
  - API Server (PORT, API_HOST, NODE_ENV)
  - Workspace (WORKSPACE_DIR)
  - LLM Judge Providers (OpenAI, Anthropic, OpenRouter, LM Studio, Ollama, Custom)
  - LLM Judge Settings (temperature, max_tokens, timeout, retry)
  - Trend Tracking (storage dir, alert threshold)
  - Parallel Execution (worker count, timeout)
  - Logging (level, format, dir)
  - Database (optional, postgres, redis)

### 📁 Updated Structure

```
agent-testing-suite/
├── .env.example                         # ✅ NEW
├── .env                                 # ✅ NEW (gitignored)
├── src/
│   ├── config/
│   │   └── env.ts                      # ✅ NEW: Environment loader
│   ├── api/
│   │   └── server.ts                   # ✅ UPDATED: Config endpoints
│   └── testing/
│       ├── evaluation/
│       │   ├── plugins/
│       │   │   └── llmJudge.ts         # ✅ UPDATED: v2.0.0
│       │   └── providers/             # ✅ NEW: Provider system
│       │       ├── providerFactory.ts
│       │       ├── openRouter.ts
│       │       ├── lmStudio.ts
│       │       ├── ollama.ts
│       │       ├── anthropic.ts
│       │       └── openai.ts
└── package.json                         # ✅ UPDATED: dotenv
```

### 🚀 Usage Examples

#### Environment Configuration
```bash
# OpenAI
export LLM_JUDGE_PROVIDER=openai
export LLM_JUDGE_OPENAI_API_KEY=sk-...
export LLM_JUDGE_OPENAI_MODEL=gpt-4

# Anthropic
export LLM_JUDGE_PROVIDER=anthropic
export LLM_JUDGE_ANTHROPIC_API_KEY=sk-ant-...
export LLM_JUDGE_ANTHROPIC_MODEL=claude-3-opus-20240229

# OpenRouter
export LLM_JUDGE_PROVIDER=openrouter
export LLM_JUDGE_OPENROUTER_API_KEY=sk-or-...
export LLM_JUDGE_OPENROUTER_MODEL=anthropic/claude-3-opus

# LM Studio (Local)
export LLM_JUDGE_PROVIDER=lmstudio
export LLM_JUDGE_LMSTUDIO_BASE_URL=http://localhost:1234/v1

# Ollama (Local)
export LLM_JUDGE_PROVIDER=ollama
export LLM_JUDGE_OLLAMA_BASE_URL=http://localhost:11434/v1
```

#### Using Provider Factory
```typescript
import { ProviderFactory } from "../testing/evaluation/providers/providerFactory";

// Create provider from environment
const provider = ProviderFactory.createProvider();

// Call LLM
const response = await provider.call(prompt, config);

// List available models
const models = await ProviderFactory.listAvailableModels("openrouter");

// Test connection
const connected = await ProviderFactory.testConnection("lmstudio");
```

#### LLM Judge with Custom Provider
```typescript
import { PluginRegistry } from "../testing/evaluation/plugins/pluginRegistry";
import { llmJudgePlugin } from "../testing/evaluation/plugins/llmJudge";

// Plugin automatically uses provider from environment
const registry = new PluginRegistry();
registry.registerPlugin(llmJudgePlugin);

// Uses provider from .env
const result = await registry.evaluateAssertion(assertion, context);
```

### 🔌 Provider Details

#### OpenRouter
- **URL**: https://openrouter.ai/api/v1
- **Models**: 100+ (OpenAI, Anthropic, Google, Mistral, etc.)
- **API Key**: Required
- **Features**:
  - Unified API for multiple providers
  - Model switching
  - Competitive pricing
  - Rate limiting

#### LM Studio
- **URL**: http://localhost:1234/v1 (default)
- **Models**: Any local model (Llama, Mistral, etc.)
- **API Key**: Not required
- **Features**:
  - Privacy (local inference)
  - Offline capability
  - No rate limits
  - Model management GUI

#### Ollama
- **URL**: http://localhost:11434/v1 (default)
- **Models**: Llama, Mistral, Codellama, etc.
- **API Key**: Not required
- **Features**:
  - Privacy (local inference)
  - Offline capability
  - CLI tools
  - Automatic model downloading

#### Anthropic
- **URL**: https://api.anthropic.com/v1
- **Models**: Claude-3 Opus, Sonnet, Haiku, Claude-2
- **API Key**: Required
- **Features**:
  - State-of-the-art performance
  - Large context window (200K tokens)
  - Safety built-in
  - Multimodal support

#### OpenAI
- **URL**: https://api.openai.com/v1
- **Models**: GPT-4, GPT-3.5-Turbo
- **API Key**: Required
- **Features**:
  - Widely adopted
  - Function calling
  - GPT-4 Vision
  - Stable API

### 📊 API Endpoints

#### Get Configuration
```bash
GET /api/config

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
  }
}
```

#### List Providers
```bash
GET /api/providers

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

#### List Models
```bash
GET /api/providers/models?provider=openrouter

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

#### Test Connection
```bash
POST /api/providers/test

Body:
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

### 📝 Environment Variables

#### Complete List
```bash
# API Server
PORT=8787
API_HOST=localhost
NODE_ENV=production

# Workspace
WORKSPACE_DIR=./ff-terminal-workspace

# LLM Judge - OpenAI
LLM_JUDGE_PROVIDER=openai
LLM_JUDGE_OPENAI_API_KEY=sk-...
LLM_JUDGE_OPENAI_MODEL=gpt-4
LLM_JUDGE_OPENAI_BASE_URL=https://api.openai.com/v1

# LLM Judge - Anthropic
LLM_JUDGE_PROVIDER=anthropic
LLM_JUDGE_ANTHROPIC_API_KEY=sk-ant-...
LLM_JUDGE_ANTHROPIC_MODEL=claude-3-opus-20240229

# LLM Judge - OpenRouter
LLM_JUDGE_PROVIDER=openrouter
LLM_JUDGE_OPENROUTER_API_KEY=sk-or-...
LLM_JUDGE_OPENROUTER_MODEL=anthropic/claude-3-opus
LLM_JUDGE_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# LLM Judge - LM Studio
LLM_JUDGE_PROVIDER=lmstudio
LLM_JUDGE_LMSTUDIO_BASE_URL=http://localhost:1234/v1
LLM_JUDGE_LMSTUDIO_MODEL=Llama-2-7b-Chat-GGUF

# LLM Judge - Ollama
LLM_JUDGE_PROVIDER=ollama
LLM_JUDGE_OLLAMA_BASE_URL=http://localhost:11434/v1
LLM_JUDGE_OLLAMA_MODEL=llama2

# LLM Judge Settings
LLM_JUDGE_TEMPERATURE=0.3
LLM_JUDGE_MAX_TOKENS=1000
LLM_JUDGE_TIMEOUT_MS=30000
LLM_JUDGE_RETRY_ATTEMPTS=3
LLM_JUDGE_RETRY_DELAY_MS=1000

# Trend Tracking
TREND_STORAGE_DIR=./workspace/tests/trends
TREND_ALERT_THRESHOLD=2.5

# Parallel Execution
PARALLEL_WORKER_COUNT=4
PARALLEL_TIMEOUT_MINUTES=30

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DIR=./workspace/tests/logs
```

### 📦 Files Created/Modified

**Created**: 9 files
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

### 🎯 Success Criteria

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

### 🚀 Next Steps

**Phase 4** (Future):
- CLI config commands (ff-test config, ff-test env)
- Web UI configuration page
- Model discovery UI
- Configuration validation
- Runtime provider switching
- Documentation updates

### 📝 Commit

Commit: `XXXXXXX` - Phase 3.5: Environment Variables & Multi-Provider LLM Support

---

**Total Files**: 13 files (9 new, 4 modified)
**Lines of Code**: ~2000 lines
**Dependencies Added**: dotenv (v16.4.5)
