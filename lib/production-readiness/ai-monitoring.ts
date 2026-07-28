/** Program 6500 — AI monitoring (read-only via ai-control / ai-runtime telemetry) */

import { buildControlPanelSnapshot } from "@/lib/ai-control";
import type { AiMonitoringSnapshot, HealthStatus } from "./types";

function deriveStatus(healthy: number, total: number, realAi: boolean): HealthStatus {
  if (total === 0) return "unknown";
  const ratio = healthy / total;
  if (ratio >= 0.75) return realAi ? "healthy" : "degraded";
  if (ratio >= 0.5) return "degraded";
  return "critical";
}

export async function buildAiMonitoringSnapshot(): Promise<AiMonitoringSnapshot> {
  const panel = await buildControlPanelSnapshot();
  const providersHealthy = panel.providers.filter((p) => p.healthy || p.configured).length;
  const providersTotal = panel.providers.length;

  return {
    status: deriveStatus(
      panel.providers.filter((p) => p.healthy).length,
      providersTotal,
      panel.activation.active
    ),
    realAiActive: panel.activation.active,
    providersHealthy,
    providersTotal,
    monthlyBudgetUsd: panel.monthlyBudgetUsd,
    telemetryRequests: panel.telemetry.requestCount,
    timestamp: new Date().toISOString(),
  };
}
