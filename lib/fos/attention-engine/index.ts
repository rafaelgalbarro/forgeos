import type { VentureProject } from "@/lib/domain/venture";
import { rankVenturesByPriority } from "../priority-engine";
import type { FosMetrics } from "../types";

export interface AttentionSnapshot {
  dailyFocus: string;
  attentionScore: number;
  focusVentureId: string | null;
  distribution: { ventureId: string; ventureName: string; weight: number }[];
}

export function computeAttention(ventures: VentureProject[]): AttentionSnapshot {
  const ranked = rankVenturesByPriority(ventures);
  const focus = ranked[0] ?? null;

  const distribution = ranked.slice(0, 5).map((v, i) => ({
    ventureId: v.id,
    ventureName: v.name,
    weight: Math.max(10, 100 - i * 18),
  }));

  const attentionScore =
    ventures.length === 0
      ? 15
      : Math.min(100, 40 + distribution.reduce((s, d) => s + d.weight, 0) / distribution.length);

  return {
    dailyFocus: focus?.name ?? "Capturar primera idea",
    attentionScore: Math.round(attentionScore),
    focusVentureId: focus?.id ?? null,
    distribution,
  };
}

export function enrichMetricsWithAttention(
  metrics: FosMetrics,
  attention: AttentionSnapshot
): FosMetrics {
  return {
    ...metrics,
    dailyFocus: attention.dailyFocus,
    attentionScore: attention.attentionScore,
  };
}
