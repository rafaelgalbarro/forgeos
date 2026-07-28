/** ForgeOS AI Runtime — provider registry. */

import { getConfiguredProviders } from "@/lib/ai-gateway/provider";
import { PROVIDER_CATALOG } from "../router/provider-catalog";
import type { ProviderAdapterMeta, RuntimeProviderId } from "../types";
import { isRuntimeProviderConfigured } from "./adapters";

export function listAllProviderAdapters(): ProviderAdapterMeta[] {
  return PROVIDER_CATALOG.map((meta) => ({
    ...meta,
    status: isRuntimeProviderConfigured(meta.id)
      ? meta.id === "mcp"
        ? "mcp-pending"
        : meta.status === "stub"
          ? "stub"
          : "configured"
      : meta.id === "mock"
        ? "live"
        : meta.status,
  }));
}

export function getConfiguredRuntimeProviders(): RuntimeProviderId[] {
  const gateway = getConfiguredProviders() as RuntimeProviderId[];
  const extended = PROVIDER_CATALOG.map((p) => p.id).filter(
    (id) => !gateway.includes(id) && isRuntimeProviderConfigured(id)
  );
  return [...new Set([...gateway, ...extended])];
}
