/**
 * OpenRouter Provider for LLM Judge
 * Supports 100+ models via unified API
 * https://openrouter.ai
 */

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export class OpenRouterProvider {
  config: OpenRouterConfig;

  constructor(config: OpenRouterConfig) {
    this.config = config;
  }

  async call(prompt: string, settings: any): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
        "HTTP-Referer": "https://ff-terminal.ai",
        "X-Title": "Agent Testing Suite",
        "X-Model-Identifier": this.config.model
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "system",
            content: "You are an expert AI evaluator. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: settings.temperature || 0.3,
        max_tokens: settings.maxTokens || 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * List available models from OpenRouter
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter models error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.data.map((m: any) => m.id);
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model info`);
    }

    const data = await response.json();
    const model = data.data.find((m: any) => m.id === modelId);

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return model;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/key`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default OpenRouterProvider;
