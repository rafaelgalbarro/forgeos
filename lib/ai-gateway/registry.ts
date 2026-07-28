/** ForgeOS AI Gateway — provider registry. */

import { createProvider, listProviderIds } from "./provider";
import type { AIProvider, AIProviderId } from "./types";

const providers = new Map<AIProviderId, AIProvider>();

export function getProvider(id: AIProviderId): AIProvider {
  let provider = providers.get(id);
  if (!provider) {
    provider = createProvider(id);
    providers.set(id, provider);
  }
  return provider;
}

export function listProviders(): AIProvider[] {
  return listProviderIds().map((id) => getProvider(id));
}

export function listConfiguredProviders(): AIProviderId[] {
  return listProviders()
    .filter((p) => p.isConfigured())
    .map((p) => p.id);
}
