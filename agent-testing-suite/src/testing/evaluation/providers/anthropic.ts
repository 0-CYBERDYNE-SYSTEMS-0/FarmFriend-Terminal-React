/**
 * Anthropic Provider for LLM Judge
 * Supports Claude-3 models via Anthropic API
 * https://www.anthropic.com
 */

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export class AnthropicProvider {
  config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    this.config = config;
  }

  async call(prompt: string, settings: any): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: settings.maxTokens || 1000,
        temperature: settings.temperature || 0.3,
        system: "You are an expert AI evaluator. Always respond in valid JSON format.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json();

    // Anthropic returns content in a different format than OpenAI
    if (data.content && data.content.length > 0) {
      return data.content[0].text;
    }

    throw new Error("No content in Anthropic response");
  }

  /**
   * Anthropic doesn't have a public model discovery endpoint
   * Return known models
   */
  async listModels(): Promise<string[]> {
    return [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
      "claude-2.1",
      "claude-2.0",
      "claude-instant-1.2"
    ];
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    const models = await this.listModels();

    if (!models.includes(modelId)) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return {
      id: modelId,
      name: modelId,
      type: modelId.includes("3") ? "claude-3" : "claude-2"
    };
  }

  /**
   * Test connection to Anthropic
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a minimal request to test auth
      const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [
            {
              role: "user",
              content: "test"
            }
          ]
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check token usage
   */
  async getUsage(startDate: Date, endDate: Date): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/v1/messages/batches`, {
      method: "GET",
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch usage data");
    }

    return await response.json();
  }
}

export default AnthropicProvider;
