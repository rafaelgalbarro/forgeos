import {
  getAIRuntimeTelemetry,
  getExtendedTelemetry,
  getTelemetrySummary,
} from "@/lib/ai-runtime/telemetry/v2";
import type { AIRuntimeTelemetryRecord } from "@/lib/ai-runtime/types";
import type { ExtendedTelemetryRecord } from "@/lib/ai-runtime/telemetry/v2";

export interface AiUsageSummary {
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  fallbacks: number;
  errors: number;
  cacheHits: number;
}

export function getAiUsageSummary(): AiUsageSummary {
  const summary = getTelemetrySummary();
  return {
    requestCount: summary.requestCount,
    totalTokens: summary.totalTokens,
    totalCostUsd: summary.totalCost,
    avgLatencyMs: summary.avgLatencyMs,
    fallbacks: summary.fallbacks,
    errors: summary.errors,
    cacheHits: summary.cacheHits,
  };
}

export function listAiRuntimeRecords(): AIRuntimeTelemetryRecord[] {
  return getAIRuntimeTelemetry().slice(0, 50);
}

export function listExtendedAiRecords(): ExtendedTelemetryRecord[] {
  return getExtendedTelemetry().slice(0, 50);
}

export function getAiUsageByTask(): Array<{ task: string; count: number; tokens: number; cost: number }> {
  const records = getExtendedTelemetry();
  const map = new Map<string, { count: number; tokens: number; cost: number }>();

  for (const r of records) {
    const existing = map.get(r.task) ?? { count: 0, tokens: 0, cost: 0 };
    existing.count += 1;
    existing.tokens += r.promptTokens + r.completionTokens;
    existing.cost += r.costEstimate;
    map.set(r.task, existing);
  }

  return Array.from(map.entries())
    .map(([task, stats]) => ({ task, ...stats }))
    .sort((a, b) => b.count - a.count);
}

export function getAiUsageByProvider(): Array<{ provider: string; count: number; cost: number }> {
  const records = getExtendedTelemetry();
  const map = new Map<string, { count: number; cost: number }>();

  for (const r of records) {
    const existing = map.get(r.provider) ?? { count: 0, cost: 0 };
    existing.count += 1;
    existing.cost += r.costEstimate;
    map.set(r.provider, existing);
  }

  return Array.from(map.entries())
    .map(([provider, stats]) => ({ provider, ...stats }))
    .sort((a, b) => b.count - a.count);
}
