/**
 * Ollama Provider for LLM Judge
 * Supports local models via OpenAI-compatible API
 * https://ollama.com
 * Default: http://localhost:11434/v1
 */

export interface OllamaConfig {
  apiKey: string;  // Not used for local, but kept for interface consistency
  model: string;
  baseUrl: string;
}

export class OllamaProvider {
  config: OllamaConfig;

  constructor(config: OllamaConfig) {
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
      throw new Error(`Ollama API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * List available models from Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      // Ollama's /models endpoint is different, use /api/tags
      const response = await fetch(`${this.config.baseUrl}/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Ollama models error: ${response.status}`);
      }

      const data = await response.json();
      return data.models.map((m: any) => m.model);
    } catch (error: any) {
      console.warn("Failed to list Ollama models:", error.message);
      return [];  // Return empty if Ollama is not running
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelId: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/api/show`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: modelId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model info for ${modelId}`);
    }

    return await response.json();
  }

  /**
   * Test connection to Ollama
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/tags`, {
        method: "GET"
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if model is available
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.includes(modelId);
    } catch {
      return false;
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelId: string, onProgress?: (progress: any) => void): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: modelId,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to pull model ${modelId}: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (onProgress) {
              onProgress(data);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}

export default OllamaProvider;
