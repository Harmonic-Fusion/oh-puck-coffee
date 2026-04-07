import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { config } from "@/shared/config";

/**
 * Returns a language model for shot suggestions, or `null` when no API key is configured.
 */
export function createSuggestionLanguageModel(): LanguageModel | null {
  if (!config.openaiApiKey) return null;

  const provider = createOpenAI({
    apiKey: config.openaiApiKey,
    ...(config.openaiBaseUrl ? { baseURL: config.openaiBaseUrl } : {}),
    ...(config.openaiOrganization ? { organization: config.openaiOrganization } : {}),
  });

  return provider(config.openaiModel);
}
