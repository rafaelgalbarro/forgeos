/** ForgeOS Capability Layer — metrics (RC4.9). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { CapabilityMetric } from "./types";
import { getCapabilityTelemetry } from "./capability-telemetry";

function readMetrics(): CapabilityMetric[] {
  return readStorage<CapabilityMetric[]>(STORAGE_KEYS.capabilityMetrics, []);
}

function writeMetrics(metrics: CapabilityMetric[]): void {
  writeStorage(STORAGE_KEYS.capabilityMetrics, metrics);
}

export function updateCapabilityMetrics(capabilityId: string): CapabilityMetric {
  const telemetry = getCapabilityTelemetry().filter((t) => t.capabilityId === capabilityId);
  const totalCalls = telemetry.length;
  const successes = telemetry.filter((t) => t.success).length;
  const avgLatencyMs =
    totalCalls > 0
      ? telemetry.reduce((sum, t) => sum + t.latencyMs, 0) / totalCalls
      : 0;
  const avgCost =
    totalCalls > 0
      ? telemetry.reduce((sum, t) => sum + t.costEstimate, 0) / totalCalls
      : 0;

  const metric: CapabilityMetric = {
    capabilityId,
    totalCalls,
    successRate: totalCalls > 0 ? successes / totalCalls : 0,
    avgLatencyMs,
    avgCost,
    lastExecutedAt: telemetry[0]?.timestamp,
  };

  const metrics = readMetrics();
  const idx = metrics.findIndex((m) => m.capabilityId === capabilityId);
  if (idx >= 0) {
    metrics[idx] = metric;
  } else {
    metrics.push(metric);
  }
  writeMetrics(metrics);
  return metric;
}

export function getCapabilityMetrics(): CapabilityMetric[] {
  return readMetrics();
}

export function getCapabilityMetric(capabilityId: string): CapabilityMetric | undefined {
  return readMetrics().find((m) => m.capabilityId === capabilityId);
}
