import { openAICompatProvider } from "./openaiCompat.js";
import { Provider } from "./types.js";

export function lmStudioProvider(params: { baseUrl: string; apiKey?: string }): Provider {
  return openAICompatProvider({
    name: "lmstudio",
    baseUrl: params.baseUrl,
    apiKey: params.apiKey || "lm-studio"
  });
}

