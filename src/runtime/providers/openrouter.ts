import { openAICompatProvider } from "./openaiCompat.js";
import { Provider } from "./types.js";

export function openRouterProvider(params: { apiKey: string }): Provider {
  return openAICompatProvider({
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: params.apiKey,
    extraHeaders: {
      "HTTP-Referer": "https://github.com/anthropics/ff-terminal",
      "X-Title": "FF-Terminal"
    }
  });
}

