/** ForgeOS AI Runtime RC6 — provider factory (all adapters decoupled). */

import type { RuntimeProviderId } from "../types";
import { AnthropicProvider } from "./anthropic-provider";
import { AwsBedrockProvider } from "./aws-bedrock-provider";
import { GeminiProvider } from "./gemini-provider";
import { McpProvider } from "./mcp-provider";
import {
  buildAzureOpenAiProvider,
  buildDeepSeekProvider,
  buildLlamaProvider,
  buildLmStudioProvider,
  buildMistralProvider,
  buildOllamaProvider,
  buildOpenAiProvider,
  buildOpenRouterProvider,
} from "./openai-compatible-base";
import type { IProviderAdapter } from "./provider-interface";
import { buildVertexAiProvider } from "./vertex-ai-provider";

let _providers: Map<RuntimeProviderId, IProviderAdapter> | null = null;

export function getAllProviders(): Map<RuntimeProviderId, IProviderAdapter> {
  if (_providers) return _providers;

  const list: IProviderAdapter[] = [
    buildOpenAiProvider(),
    new AnthropicProvider(),
    new GeminiProvider(),
    buildOpenRouterProvider(),
    buildDeepSeekProvider(),
    buildMistralProvider(),
    buildLlamaProvider(),
    buildAzureOpenAiProvider(),
    new AwsBedrockProvider(),
    buildVertexAiProvider(),
    buildOllamaProvider(),
    buildLmStudioProvider(),
    new McpProvider(),
  ];

  _providers = new Map(list.map((p) => [p.id, p]));
  return _providers;
}

export function getProvider(id: RuntimeProviderId): IProviderAdapter | undefined {
  return getAllProviders().get(id);
}

export function listProviderAdapters(): IProviderAdapter[] {
  return [...getAllProviders().values()];
}

export function getConfiguredProviders(): RuntimeProviderId[] {
  return listProviderAdapters()
    .filter((p) => p.isConfigured())
    .map((p) => p.id);
}

/** Reset for tests */
export function resetProviderFactory(): void {
  _providers = null;
}
