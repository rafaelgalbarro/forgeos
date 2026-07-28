/** Program 9000 — Anonymized metrics only. */

import type { AnonymizedMetric, NetworkContext } from "@/lib/network/types";
import { buildAnonymousMetrics } from "./anonymization";

export function collectAnonymousMetrics(ctx: NetworkContext): AnonymizedMetric[] {
  return buildAnonymousMetrics(ctx);
}

export function summarizeAnonymousMetrics(metrics: AnonymizedMetric[]): string {
  if (metrics.length === 0) return "Sin métricas anonimizadas disponibles.";
  const top = metrics[0];
  return `${top.label}: ${top.value} ${top.unit} (n=${top.sampleSize}, sector ${top.sector})`;
}
