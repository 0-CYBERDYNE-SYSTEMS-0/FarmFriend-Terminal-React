import { config as dotenvConfig } from "dotenv";
import path from "node:path";

// Load .env file
dotenvConfig();

/**
 * Environment configuration for Agent Testing Suite
 * Loads configuration from environment variables with defaults
 */
export const config = {
  // ============================================
  // API Server Configuration
  // ============================================
  port: parseInt(process.env.PORT || "8787"),
  apiHost: process.env.API_HOST || "localhost",
  nodeEnv: process.env.NODE_ENV || "development",

  // ============================================
  // Workspace Configuration
  // ============================================
  workspaceDir: process.env.WORKSPACE_DIR || "./ff-terminal-workspace",

  // ============================================
  // LLM Judge Provider Configuration
  // ============================================
  llmJudge: {
    provider: process.env.LLM_JUDGE_PROVIDER || "openai",

    // OpenAI
    openai: {
      apiKey: process.env.LLM_JUDGE_OPENAI_API_KEY || "",
      model: process.env.LLM_JUDGE_OPENAI_MODEL || "gpt-4",
      baseUrl: process.env.LLM_JUDGE_OPENAI_BASE_URL || "https://api.openai.com/v1"
    },

    // Anthropic
    anthropic: {
      apiKey: process.env.LLM_JUDGE_ANTHROPIC_API_KEY || "",
      model: process.env.LLM_JUDGE_ANTHROPIC_MODEL || "claude-3-opus-20240229",
      baseUrl: process.env.LLM_JUDGE_ANTHROPIC_BASE_URL || "https://api.anthropic.com"
    },

    // OpenRouter
    openrouter: {
      apiKey: process.env.LLM_JUDGE_OPENROUTER_API_KEY || "",
      model: process.env.LLM_JUDGE_OPENROUTER_MODEL || "anthropic/claude-3-opus",
      baseUrl: process.env.LLM_JUDGE_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
    },

    // LM Studio
    lmstudio: {
      apiKey: "",  // No API key required for local models
      model: process.env.LLM_JUDGE_LMSTUDIO_MODEL || "Llama-2-7b-Chat-GGUF",
      baseUrl: process.env.LLM_JUDGE_LMSTUDIO_BASE_URL || "http://localhost:1234/v1"
    },

    // Ollama
    ollama: {
      apiKey: "",  // No API key required for local models
      model: process.env.LLM_JUDGE_OLLAMA_MODEL || "llama2",
      baseUrl: process.env.LLM_JUDGE_OLLAMA_BASE_URL || "http://localhost:11434/v1"
    },

    // Custom
    custom: {
      apiKey: process.env.LLM_JUDGE_CUSTOM_API_KEY || "",
      model: process.env.LLM_JUDGE_CUSTOM_MODEL || "",
      baseUrl: process.env.LLM_JUDGE_CUSTOM_BASE_URL || ""
    },

    // Common Settings
    temperature: parseFloat(process.env.LLM_JUDGE_TEMPERATURE || "0.3"),
    maxTokens: parseInt(process.env.LLM_JUDGE_MAX_TOKENS || "1000"),
    timeoutMs: parseInt(process.env.LLM_JUDGE_TIMEOUT_MS || "30000"),
    retryAttempts: parseInt(process.env.LLM_JUDGE_RETRY_ATTEMPTS || "3"),
    retryDelayMs: parseInt(process.env.LLM_JUDGE_RETRY_DELAY_MS || "1000")
  },

  // ============================================
  // Trend Tracking Configuration
  // ============================================
  trends: {
    storageDir: process.env.TREND_STORAGE_DIR || "./workspace/tests/trends",
    alertThreshold: parseFloat(process.env.TREND_ALERT_THRESHOLD || "2.5")
  },

  // ============================================
  // Parallel Execution Configuration
  // ============================================
  parallel: {
    workerCount: parseInt(process.env.PARALLEL_WORKER_COUNT || "4"),
    timeoutMinutes: parseInt(process.env.PARALLEL_TIMEOUT_MINUTES || "30")
  },

  // ============================================
  // Logging Configuration
  // ============================================
  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "json",
    dir: process.env.LOG_DIR || "./workspace/tests/logs"
  },

  // ============================================
  // Database Configuration (Optional)
  // ============================================
  database: {
    url: process.env.DATABASE_URL || "",
    redisUrl: process.env.REDIS_URL || ""
  },

  // ============================================
  // Validate Configuration
  // ============================================
  validate(): string[] {
    const errors: string[] = [];

    // Validate LLM judge provider
    const provider = this.llmJudge.provider;
    const validProviders = ["openai", "anthropic", "openrouter", "lmstudio", "ollama", "custom"];

    if (!validProviders.includes(provider)) {
      errors.push(`Unknown LLM judge provider: ${provider}. Valid options: ${validProviders.join(", ")}`);
    }

    const providerConfig = (this.llmJudge as any)[provider];

    if (!providerConfig) {
      errors.push(`Missing configuration for provider: ${provider}`);
      return errors;
    }

    // API key validation (required for cloud providers)
    const requiresApiKey = ["openai", "anthropic", "openrouter", "custom"].includes(provider);

    if (requiresApiKey && !providerConfig.apiKey) {
      errors.push(`${provider.toUpperCase()}_API_KEY is required for ${provider} provider`);
    }

    // Validate workspace path
    if (this.workspaceDir && !path.isAbsolute(this.workspaceDir)) {
      this.workspaceDir = path.resolve(this.workspaceDir);
    }

    // Validate numeric values
    if (this.llmJudge.temperature < 0 || this.llmJudge.temperature > 2) {
      errors.push(`LLM_JUDGE_TEMPERATURE must be between 0 and 2 (current: ${this.llmJudge.temperature})`);
    }

    if (this.llmJudge.maxTokens < 1 || this.llmJudge.maxTokens > 32000) {
      errors.push(`LLM_JUDGE_MAX_TOKENS must be between 1 and 32000 (current: ${this.llmJudge.maxTokens})`);
    }

    if (this.parallel.workerCount < 1) {
      errors.push(`PARALLEL_WORKER_COUNT must be at least 1 (current: ${this.parallel.workerCount})`);
    }

    return errors;
  },

  // ============================================
  // Get Model Name for Current Provider
  // ============================================
  getModelName(): string {
    const provider = this.llmJudge.provider;
    const providerConfig = (this.llmJudge as any)[provider];
    return providerConfig?.model || "unknown";
  },

  // ============================================
  // Get Provider Configuration
  // ============================================
  getProviderConfig() {
    const provider = this.llmJudge.provider;
    return {
      provider,
      config: (this.llmJudge as any)[provider],
      settings: {
        temperature: this.llmJudge.temperature,
        maxTokens: this.llmJudge.maxTokens,
        timeoutMs: this.llmJudge.timeoutMs,
        retryAttempts: this.llmJudge.retryAttempts,
        retryDelayMs: this.llmJudge.retryDelayMs
      }
    };
  }
};

// Log configuration on startup (hide sensitive values)
if (config.nodeEnv === "development") {
  console.log("📋 Agent Testing Suite Configuration:");
  console.log(`   Port: ${config.port}`);
  console.log(`   Provider: ${config.llmJudge.provider}`);
  console.log(`   Model: ${config.getModelName()}`);
  console.log(`   Workspace: ${config.workspaceDir}`);
  console.log(`   Workers: ${config.parallel.workerCount}`);
}

// Validate on startup
const errors = config.validate();
if (errors.length > 0) {
  console.error("\n❌ Configuration Errors:");
  errors.forEach(err => console.error(`   - ${err}`));
  console.error("\nPlease check your .env file and fix the errors above.");
  console.error("You can copy .env.example to .env and fill in the required values.\n");
  // Don't exit in development to allow testing without full config
  if (config.nodeEnv === "production") {
    process.exit(1);
  }
}

export default config;
