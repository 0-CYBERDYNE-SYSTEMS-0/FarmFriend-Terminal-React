/**
 * LM Studio Provider for LLM Judge
 * Supports local models via OpenAI-compatible API
 * https://lmstudio.ai
 * Default: http://localhost:1234/v1
 */

export interface LMStudioConfig {
  apiKey: string;  // Not used for local, but kept for interface consistency
  model: string;
  baseUrl: string;
}

export class LMStudioProvider {
  config: LMStudioConfig;

  constructor(config: LMStudioConfig) {
    this.config = config;
  }

  async call(prompt: string, settings: any): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
      throw new Error(`LM Studio API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * List available models from LM Studio
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`LM Studio models error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((m: any) => m.id);
    } catch (error: any) {
      console.warn("Failed to list LM Studio models:", error.message);
      return [];  // Return empty if LM Studio is not running
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    const models = await this.listModels();
    const model = models.find(m => m === modelId);

    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return { id: modelId };
  }

  /**
   * Test connection to LM Studio
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: "GET"
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if LM Studio is running
   */
  async isAvailable(): Promise<boolean> {
    return await this.testConnection();
  }
}

export default LMStudioProvider;
