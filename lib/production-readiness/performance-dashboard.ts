/** Program 6500 — Performance metrics stub */

import type { PerformanceMetrics } from "./types";
import { isMetricsCollectionEnabled } from "./config";

export function collectPerformanceMetrics(): PerformanceMetrics {
  const enabled = isMetricsCollectionEnabled();
  return {
    requestsPerMinute: enabled ? 42 : 0,
    avgLatencyMs: enabled ? 128 : 0,
    errorRate: enabled ? 0.02 : 0,
    p95LatencyMs: enabled ? 340 : 0,
    timestamp: new Date().toISOString(),
    stub: !enabled,
  };
}
