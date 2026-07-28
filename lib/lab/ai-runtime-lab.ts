/** ForgeOS AI Runtime — lab data (RC6). */

import { isRealAiEnabled, isStreamingEnabled, getRealAiActivationStatus } from "@/lib/ai-runtime/config";
import { buildModelRegistrySnapshot } from "@/lib/ai-runtime/model-registry";
import { PROVIDER_CATALOG } from "@/lib/ai-runtime/router/provider-catalog";
import { getConfiguredRuntimeProviders } from "@/lib/ai-runtime/providers";
import { routeModelV2 } from "@/lib/ai-runtime/router/v2";
import { getExtendedTelemetry, getTelemetrySummary } from "@/lib/ai-runtime/telemetry/v2";
import { getAIRuntimeTelemetry } from "@/lib/ai-runtime/telemetry";
import type { AITask } from "@/lib/ai-gateway/types";

export const AI_RUNTIME_DEMO_TASKS: AITask[] = [
  "research",
  "product",
  "ceo",
  "code",
  "classification",
];

export function buildAiRuntimeLabSnapshot() {
  const configured = new Set(getConfiguredRuntimeProviders());
  const providers = PROVIDER_CATALOG.map((p) => ({
    ...p,
    configured: configured.has(p.id),
  }));

  const routingSamples = AI_RUNTIME_DEMO_TASKS.map((task) =>
    routeModelV2({ task, optimizer: "balanced" })
  );

  const registry = buildModelRegistrySnapshot();
  const telemetry = getTelemetrySummary();
  const recentTelemetry = getAIRuntimeTelemetry().slice(0, 5);
  const extendedTelemetry = getExtendedTelemetry().slice(0, 5);

  return {
    pipeline: [
      "Executive Mesh",
      "AI Runtime",
      "Prompt Compiler v2",
      "Context Engine v2",
      "Model Router v2",
      "Provider Adapter",
      "Telemetry",
      "Memory",
      "Decision Graph",
      "Executive Response",
    ],
    providers,
    configuredCount: configured.size,
    routingSamples,
    optimizers: ["cost", "latency", "quality", "balanced"] as const,
    realAiEnabled: isRealAiEnabled(),
    activation: getRealAiActivationStatus(),
    modelRegistry: registry,
    telemetry,
    recentTelemetry,
    extendedTelemetry,
    streaming: isStreamingEnabled(),
  };
}
