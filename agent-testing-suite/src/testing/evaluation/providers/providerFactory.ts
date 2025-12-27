import config from "../../../config/env.js";
import { OpenRouterProvider } from "./openRouter.js";
import { LMStudioProvider } from "./lmStudio.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import { OllamaProvider } from "./ollama.js";

/**
 * Base provider interface
 */
export interface LLMProvider {
  call(prompt: string, settings: any): Promise<string>;
  listModels?(): Promise<string[]>;
  testConnection?(): Promise<boolean>;
}

/**
 * Provider Factory
 * Creates provider instances based on configuration
 */
export class ProviderFactory {
  /**
   * Create provider instance based on current configuration
   */
  static createProvider(): LLMProvider {
    const providerType = config.llmJudge.provider;
    const providerConfig = (config.llmJudge as any)[providerType];

    if (!providerConfig) {
      throw new Error(`Configuration not found for provider: ${providerType}`);
    }

    console.log(`🔧 Creating provider: ${providerType}`);

    switch (providerType) {
      case "openai":
        return new OpenAIProvider(providerConfig);

      case "anthropic":
        return new AnthropicProvider(providerConfig);

      case "openrouter":
        return new OpenRouterProvider(providerConfig);

      case "lmstudio":
        return new LMStudioProvider(providerConfig);

      case "ollama":
        return new OllamaProvider(providerConfig);

      default:
        // Support for custom OpenAI-compatible endpoints
        return new OpenAIProvider({
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
          baseUrl: providerConfig.baseUrl
        });
    }
  }

  /**
   * Create provider for specific type (not current config)
   */
  static createProviderForType(providerType: string, providerConfig: any): LLMProvider {
    switch (providerType) {
      case "openai":
        return new OpenAIProvider(providerConfig);

      case "anthropic":
        return new AnthropicProvider(providerConfig);

      case "openrouter":
        return new OpenRouterProvider(providerConfig);

      case "lmstudio":
        return new LMStudioProvider(providerConfig);

      case "ollama":
        return new OllamaProvider(providerConfig);

      default:
        return new OpenAIProvider(providerConfig);
    }
  }

  /**
   * List available models for provider
   */
  static async listAvailableModels(providerType?: string): Promise<string[]> {
    const type = providerType || config.llmJudge.provider;
    const providerConfig = (config.llmJudge as any)[type];

    console.log(`📋 Listing models for provider: ${type}`);

    const provider = ProviderFactory.createProviderForType(type, providerConfig);

    if (provider.listModels) {
      try {
        const models = await provider.listModels();
        console.log(`   Found ${models.length} models`);
        return models;
      } catch (error: any) {
        console.error(`   Failed to list models: ${error.message}`);
        return [];
      }
    } else {
      console.log(`   Provider ${type} does not support model listing`);
      return [];
    }
  }

  /**
   * Test connection to provider
   */
  static async testConnection(providerType?: string): Promise<boolean> {
    const type = providerType || config.llmJudge.provider;
    const providerConfig = (config.llmJudge as any)[type];

    console.log(`🔌 Testing connection to provider: ${type}`);

    const provider = ProviderFactory.createProviderForType(type, providerConfig);

    if (provider.testConnection) {
      try {
        const connected = await provider.testConnection();

        if (connected) {
          console.log(`   ✅ Connected successfully`);
        } else {
          console.log(`   ❌ Connection failed`);
        }

        return connected;
      } catch (error: any) {
        console.error(`   ❌ Connection error: ${error.message}`);
        return false;
      }
    } else {
      console.log(`   Provider ${type} does not support connection testing`);
      return true;  // Assume connected if can't test
    }
  }

  /**
   * Get provider information
   */
  static getProviderInfo(providerType?: string) {
    const type = providerType || config.llmJudge.provider;
    const providerConfig = (config.llmJudge as any)[type];

    const providers = {
      openai: {
        name: "OpenAI",
        description: "GPT-4, GPT-3.5-Turbo",
        requiresApiKey: true,
        baseUrl: providerConfig.baseUrl,
        defaultModel: providerConfig.model
      },
      anthropic: {
        name: "Anthropic",
        description: "Claude-3 Opus, Sonnet, Haiku",
        requiresApiKey: true,
        baseUrl: providerConfig.baseUrl,
        defaultModel: providerConfig.model
      },
      openrouter: {
        name: "OpenRouter",
        description: "100+ models via unified API",
        requiresApiKey: true,
        baseUrl: providerConfig.baseUrl,
        defaultModel: providerConfig.model,
        website: "https://openrouter.ai"
      },
      lmstudio: {
        name: "LM Studio",
        description: "Local models via HTTP API",
        requiresApiKey: false,
        baseUrl: providerConfig.baseUrl,
        defaultModel: providerConfig.model,
        website: "https://lmstudio.ai"
      },
      ollama: {
        name: "Ollama",
        description: "Local models via HTTP API",
        requiresApiKey: false,
        baseUrl: providerConfig.baseUrl,
        defaultModel: providerConfig.model,
        website: "https://ollama.com"
      }
    };

    return providers[type as keyof typeof providers] || null;
  }

  /**
   * List all supported providers
   */
  static getSupportedProviders() {
    return [
      {
        id: "openai",
        name: "OpenAI",
        description: "GPT-4, GPT-3.5-Turbo",
        requiresApiKey: true
      },
      {
        id: "anthropic",
        name: "Anthropic",
        description: "Claude-3 Opus, Sonnet, Haiku",
        requiresApiKey: true
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        description: "100+ models via unified API",
        requiresApiKey: true
      },
      {
        id: "lmstudio",
        name: "LM Studio",
        description: "Local models (privacy, offline)",
        requiresApiKey: false
      },
      {
        id: "ollama",
        name: "Ollama",
        description: "Local models (privacy, offline)",
        requiresApiKey: false
      }
    ];
  }
}

export default ProviderFactory;
