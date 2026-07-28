import { aiConfig } from "@/lib/ai/config";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { StubAIProvider } from "@/lib/ai/providers/stub";
import type { AIProvider, AIProviderName } from "@/lib/ai/types";

const providers: Record<AIProviderName, () => AIProvider> = {
  stub: () => new StubAIProvider(),
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider()
};

export function getAIProvider(name?: AIProviderName): AIProvider {
  const providerName = name ?? aiConfig.provider;
  const factory = providers[providerName];
  return factory();
}

export function getActiveProviderName(): AIProviderName {
  return aiConfig.provider;
}
