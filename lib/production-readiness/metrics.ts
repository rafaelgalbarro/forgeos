/** Program 6500 — Metrics collector stub */

import { isMetricsCollectionEnabled } from "./config";

export interface MetricPoint {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  labels?: Record<string, string>;
}

const COUNTERS = new Map<string, number>();

export function incrementCounter(name: string, delta = 1): void {
  if (!isMetricsCollectionEnabled()) return;
  COUNTERS.set(name, (COUNTERS.get(name) ?? 0) + delta);
}

export function getCounter(name: string): number {
  return COUNTERS.get(name) ?? 0;
}

export function collectMetrics(): MetricPoint[] {
  const ts = new Date().toISOString();
  const points: MetricPoint[] = [
    {
      name: "production.health_checks_total",
      value: getCounter("health_checks"),
      unit: "count",
      timestamp: ts,
    },
    {
      name: "production.alerts_active",
      value: getCounter("alerts_active"),
      unit: "count",
      timestamp: ts,
    },
  ];

  if (!isMetricsCollectionEnabled()) {
    return points.map((p) => ({ ...p, value: 0, labels: { stub: "true" } }));
  }

  return points;
}
