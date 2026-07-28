/** Program 2035 — Performance analysis heuristics. */

import type { AffectedArea } from "./types";

export interface PerformanceIssue {
  id: string;
  title: string;
  area: AffectedArea;
  metric: string;
  current: number;
  threshold: number;
  unit: string;
  severity: "warning" | "critical";
}

const PERF_ISSUES: PerformanceIssue[] = [
  {
    id: "perf-build-slow",
    title: "Build duration excede umbral",
    area: "build",
    metric: "buildDurationSec",
    current: 47,
    threshold: 30,
    unit: "s",
    severity: "warning",
  },
  {
    id: "perf-mesh-latency",
    title: "Mesh p95 latency alta",
    area: "mesh",
    metric: "p95LatencyMs",
    current: 820,
    threshold: 500,
    unit: "ms",
    severity: "warning",
  },
  {
    id: "perf-ai-tokens",
    title: "Consumo tokens AI elevado",
    area: "ai-runtime",
    metric: "tokensPerRequest",
    current: 4200,
    threshold: 3000,
    unit: "tokens",
    severity: "warning",
  },
  {
    id: "perf-bundle-size",
    title: "Bundle JS principal > 500KB",
    area: "factory",
    metric: "bundleSizeKb",
    current: 612,
    threshold: 500,
    unit: "KB",
    severity: "warning",
  },
];

export function analyzePerformance(): PerformanceIssue[] {
  return [...PERF_ISSUES];
}

export function getPerformanceScore(issues: PerformanceIssue[]): number {
  if (issues.length === 0) return 100;
  const penalty = issues.reduce(
    (sum, i) => sum + (i.severity === "critical" ? 20 : 10),
    0
  );
  return Math.max(0, 100 - penalty);
}
