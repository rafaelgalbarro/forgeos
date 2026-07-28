/**
 * PROGRAM 6100 — Per-venture performance telemetry.
 */

export interface VentureTelemetry {
  ventureId: string;
  executions: number;
  queueWaitMs: number;
  avgDurationMs: number;
  tokensUsed: number;
  estimatedCost: number;
  errors: number;
  retries: number;
  avgBuildTimeMs: number;
  previewUptimeMs: number;
  queryLatencyMs: number;
  cacheHitRate: number;
  memoryMb: number;
  activeResources: number;
}

export interface PerformanceTelemetrySnapshot {
  generatedAt: string;
  ventures: VentureTelemetry[];
  global: {
    activeExecutions: number;
    queueDepth: number;
    cacheEntries: number;
    cacheStale: number;
    activePreviews: number;
  };
}

const ventureMetrics = new Map<string, VentureTelemetry>();

export function recordQueryLatency(ventureId: string, latencyMs: number, cacheHit: boolean): void {
  const metrics = getOrCreate(ventureId);
  metrics.queryLatencyMs = (metrics.queryLatencyMs + latencyMs) / 2;
  if (cacheHit) {
    metrics.cacheHitRate = Math.min(1, metrics.cacheHitRate + 0.05);
  } else {
    metrics.cacheHitRate = Math.max(0, metrics.cacheHitRate - 0.02);
  }
}

export function recordExecution(ventureId: string, durationMs: number, error?: boolean): void {
  const metrics = getOrCreate(ventureId);
  metrics.executions += 1;
  metrics.avgDurationMs = (metrics.avgDurationMs + durationMs) / 2;
  if (error) metrics.errors += 1;
}

export function recordQueueWait(ventureId: string, waitMs: number): void {
  const metrics = getOrCreate(ventureId);
  metrics.queueWaitMs = (metrics.queueWaitMs + waitMs) / 2;
}

export function getVentureTelemetry(ventureId: string): VentureTelemetry {
  return { ...getOrCreate(ventureId) };
}

export function getAllTelemetry(): VentureTelemetry[] {
  return [...ventureMetrics.values()].map((m) => ({ ...m }));
}

export function resetTelemetry(): void {
  ventureMetrics.clear();
}

function getOrCreate(ventureId: string): VentureTelemetry {
  let metrics = ventureMetrics.get(ventureId);
  if (!metrics) {
    metrics = {
      ventureId,
      executions: 0,
      queueWaitMs: 0,
      avgDurationMs: 0,
      tokensUsed: 0,
      estimatedCost: 0,
      errors: 0,
      retries: 0,
      avgBuildTimeMs: 0,
      previewUptimeMs: 0,
      queryLatencyMs: 0,
      cacheHitRate: 0,
      memoryMb: 0,
      activeResources: 0,
    };
    ventureMetrics.set(ventureId, metrics);
  }
  return metrics;
}
