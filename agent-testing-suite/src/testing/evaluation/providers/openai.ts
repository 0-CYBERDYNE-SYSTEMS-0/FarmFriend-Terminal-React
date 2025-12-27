/**
 * OpenAI Provider for LLM Judge
 * Supports GPT-4, GPT-3.5-Turbo via OpenAI API
 * https://platform.openai.com
 */

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export class OpenAIProvider {
  config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async call(prompt: string, settings: any): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`
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
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * List available models from OpenAI
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
      throw new Error(`OpenAI models error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.data
      .filter((m: any) => m.object === "chat.completion")
      .map((m: any) => m.id);
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
      object: "model",
      owned_by: "openai"
    };
  }

  /**
   * Test connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
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

  /**
   * Get usage statistics
   */
  async getUsage(startDate?: Date, endDate?: Date): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate.toISOString());
    if (endDate) params.append("end_date", endDate.toISOString());

    const response = await fetch(`${this.config.baseUrl}/usage?${params.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch usage data");
    }

    return await response.json();
  }
}

export default OpenAIProvider;
