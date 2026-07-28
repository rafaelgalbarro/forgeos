/** Program 3000 Sprint 4 — AI Control Center snapshot builder. */

import type { AITask } from "@/lib/ai-gateway/types";
import {
  getMonthlyBudgetUsd,
  isCostOptimizerEnabled,
  isMultiProviderRoutingEnabled,
  isStreamingEnabled,
} from "@/lib/ai-runtime/config";
import { routeModelV2 } from "@/lib/ai-runtime/router/v2";
import { getExtendedTelemetry, getTelemetrySummary } from "@/lib/ai-runtime/telemetry/v2";
import { getActivationStatus } from "./design-partner-gate";
import { checkPrimaryProvidersHealth } from "./provider-health";
import type { AiControlPanelSnapshot } from "./types";

const DEMO_TASKS: AITask[] = ["research", "product", "ceo", "code"];

export async function buildControlPanelSnapshot(): Promise<AiControlPanelSnapshot> {
  const activation = getActivationStatus();
  const providers = await checkPrimaryProvidersHealth();
  const telemetry = getTelemetrySummary();
  const recentFallbackEvents = getExtendedTelemetry()
    .filter((r) => r.fallbackUsed)
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      task: r.task,
      provider: r.provider,
      model: r.model,
      latencyMs: r.latencyMs,
    }));

  const fallbackChains = DEMO_TASKS.map((task) => {
    const routing = routeModelV2({ task, optimizer: "balanced" });
    return {
      task,
      chain: routing.providerChain,
      selectedProvider: routing.selectedProvider,
      selectedModel: routing.selectedModel,
      rationale: routing.rationale,
    };
  });

  const mockModeWarning = activation.active
    ? null
    : activation.flagEnabled && !activation.designPartner && !activation.hasProviderKeys
      ? "ENABLE_REAL_AI=true pero faltan design partner o API keys — modo simulación activo."
      : "Modo simulación activo (ENABLE_REAL_AI=false). Sin llamadas reales a proveedores.";

  return {
    activation,
    streamingEnabled: isStreamingEnabled(),
    multiProviderRouting: isMultiProviderRoutingEnabled(),
    costOptimizer: isCostOptimizerEnabled(),
    monthlyBudgetUsd: getMonthlyBudgetUsd(),
    mockModeWarning,
    providers,
    fallbackChains,
    telemetry,
    recentFallbackEvents,
  };
}
