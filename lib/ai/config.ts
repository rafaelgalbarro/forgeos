import type { AIConfig, AIProviderName } from "./types";

export const aiConfig: AIConfig = {
  provider: (process.env.NEXT_PUBLIC_AI_PROVIDER as AIProviderName) ?? "stub",
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
  },
};

export function isProviderConfigured(name: AIProviderName): boolean {
  if (name === "stub") return true;
  if (name === "openai") return Boolean(aiConfig.openai.apiKey);
  if (name === "anthropic") return Boolean(aiConfig.anthropic.apiKey);
  return false;
}
