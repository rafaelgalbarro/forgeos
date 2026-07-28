/** Program 3000 Sprint 4 — Provider health & telemetry aggregation. */

import { getProvider } from "@/lib/ai-runtime/providers/provider-factory";
import { getProviderMeta, PROVIDER_CATALOG } from "@/lib/ai-runtime/router/provider-catalog";
import { isRuntimeProviderConfigured } from "@/lib/ai-runtime/providers/adapters";
import { getExtendedTelemetry } from "@/lib/ai-runtime/telemetry/v2";
import { canStream } from "@/lib/ai-runtime/streaming";
import type { RuntimeProviderId } from "@/lib/ai-runtime/types";
import type { ProviderHealthSnapshot } from "./types";

export const SPRINT4_PRIMARY_PROVIDERS: RuntimeProviderId[] = [
  "openai",
  "anthropic",
  "google",
  "openrouter",
];

function aggregateProviderTelemetry(providerId: RuntimeProviderId) {
  const records = getExtendedTelemetry().filter((r) => r.provider === providerId);
  const requests = records.length;
  const errors = records.filter((r) => r.error).length;
  const fallbacks = records.filter((r) => r.fallbackUsed).length;
  const totalCost = records.reduce((s, r) => s + r.costEstimate, 0);
  const avgLatencyMs =
    requests > 0 ? Math.round(records.reduce((s, r) => s + r.latencyMs, 0) / requests) : 0;

  return { requests, errors, fallbacks, totalCost, avgLatencyMs };
}

export async function checkProviderHealth(
  providerId: RuntimeProviderId
): Promise<ProviderHealthSnapshot> {
  const meta = getProviderMeta(providerId);
  const adapter = getProvider(providerId);
  const configured = isRuntimeProviderConfigured(providerId);
  const telemetryAgg = aggregateProviderTelemetry(providerId);

  let healthy = false;
  let latencyMs = meta.estimatedLatencyMs;
  let message: string | undefined;
  let models: string[] = [];

  if (adapter) {
    try {
      models = await adapter.models();
      if (configured) {
        const health = await adapter.health();
        healthy = health.ok;
        latencyMs = health.latencyMs || telemetryAgg.avgLatencyMs || meta.estimatedLatencyMs;
        message = health.message;
      } else {
        message = "API key no configurada";
      }
    } catch (err) {
      healthy = false;
      message = err instanceof Error ? err.message : "Health check failed";
    }
  } else {
    message = "Adaptador no disponible";
  }

  const adapterTelemetry = adapter?.telemetry();

  return {
    id: providerId,
    label: meta.label,
    configured,
    healthy,
    latencyMs,
    message,
    models: models.length > 0 ? models : [meta.label],
    estimatedCostPer1k: meta.estimatedCostPer1k,
    estimatedLatencyMs: meta.estimatedLatencyMs,
    streamingSupported: canStream(providerId),
    telemetry: {
      requests: adapterTelemetry?.requests ?? telemetryAgg.requests,
      errors: adapterTelemetry?.errors ?? telemetryAgg.errors,
      fallbacks: adapterTelemetry?.fallbacks ?? telemetryAgg.fallbacks,
      totalCost: adapterTelemetry?.totalCost ?? telemetryAgg.totalCost,
      avgLatencyMs: telemetryAgg.avgLatencyMs || latencyMs,
    },
  };
}

export async function checkPrimaryProvidersHealth(): Promise<ProviderHealthSnapshot[]> {
  return Promise.all(SPRINT4_PRIMARY_PROVIDERS.map((id) => checkProviderHealth(id)));
}

export async function checkAllConfiguredProvidersHealth(): Promise<ProviderHealthSnapshot[]> {
  const configured = PROVIDER_CATALOG.filter(
    (p) => p.id !== "mock" && isRuntimeProviderConfigured(p.id)
  ).map((p) => p.id);

  const ids = [...new Set([...SPRINT4_PRIMARY_PROVIDERS, ...configured])];
  return Promise.all(ids.map((id) => checkProviderHealth(id)));
}
