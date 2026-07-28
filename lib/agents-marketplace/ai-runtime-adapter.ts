/**
 * PROGRAM 4700 — Read-only adapter to lib/ai-runtime public APIs.
 * Does NOT modify ai-runtime internals; only consumes public exports.
 */

import type { AITask } from "@/lib/ai-gateway/types";
import {
  isRealAiEnabled,
  isCostOptimizerEnabled,
  isMultiProviderRoutingEnabled,
} from "@/lib/ai-runtime/config";
import {
  buildModelRegistrySnapshot,
  getBestModelForTask,
  getModelsForProvider,
} from "@/lib/ai-runtime/model-registry";
import { getExtendedTelemetry, getTelemetrySummary } from "@/lib/ai-runtime/telemetry/v2";
import type { RuntimeProviderId } from "@/lib/ai-runtime/types";

export interface AgentRuntimeHints {
  realAiEnabled: boolean;
  costOptimizerEnabled: boolean;
  multiProviderRouting: boolean;
  providerConfigured: boolean;
  suggestedModel?: string;
  suggestedProvider?: RuntimeProviderId;
  modelCount: number;
  healthyModelCount: number;
}

/** Read-only runtime status for marketplace agent detail panels. */
export function getAgentRuntimeHints(task: AITask, provider?: RuntimeProviderId): AgentRuntimeHints {
  const snapshot = buildModelRegistrySnapshot();
  const best = getBestModelForTask(task, { quality: true });
  const providerModels = provider ? getModelsForProvider(provider) : [];
  const configured = providerModels.some((m) => m.health === "healthy");

  return {
    realAiEnabled: isRealAiEnabled(),
    costOptimizerEnabled: isCostOptimizerEnabled(),
    multiProviderRouting: isMultiProviderRoutingEnabled(),
    providerConfigured: configured || snapshot.healthyCount > 0,
    suggestedModel: best?.id,
    suggestedProvider: best?.provider,
    modelCount: snapshot.totalCount,
    healthyModelCount: snapshot.healthyCount,
  };
}

/** Read-only telemetry summary — no execution. */
export function getMarketplaceTelemetrySummary() {
  return getTelemetrySummary();
}

/** Read-only extended telemetry — no execution. */
export function getMarketplaceExtendedTelemetry() {
  return getExtendedTelemetry();
}

/** Map agent AI task to recommended model (read-only lookup). */
export function resolveRecommendedModelForTask(task: AITask) {
  return getBestModelForTask(task);
}
