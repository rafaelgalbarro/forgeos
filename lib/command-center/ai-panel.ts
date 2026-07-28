/** Program 4500 — AI providers panel. */

import { buildControlPanelSnapshot } from "@/lib/ai-control/control-panel";
import type { AiPanelData } from "./types";

export async function buildAiPanel(): Promise<AiPanelData> {
  const snap = await buildControlPanelSnapshot();

  return {
    mode: snap.activation.mode,
    mockWarning: snap.mockModeWarning,
    providers: snap.providers.map((p) => ({
      id: p.id,
      label: p.label,
      healthy: p.healthy,
      latencyMs: p.latencyMs,
      costPer1k: p.estimatedCostPer1k,
      streaming: p.streamingSupported,
      fallbacks: p.telemetry.fallbacks,
      model: p.models[0] ?? snap.fallbackChains[0]?.selectedModel ?? "—",
    })),
    avgLatencyMs: snap.telemetry.avgLatencyMs,
    totalCost: snap.telemetry.totalCost,
    streamingEnabled: snap.streamingEnabled,
    href: "/ai",
  };
}

export function buildAiPanelFallback(): AiPanelData {
  return {
    mode: "mock",
    mockWarning: "Panel AI no disponible — modo simulación.",
    providers: [],
    avgLatencyMs: 0,
    totalCost: 0,
    streamingEnabled: false,
    href: "/ai",
  };
}
