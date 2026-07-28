/**
 * ISOLATED — not imported by /dashboard (Release 0.2.5 rollback).
 */
import type { VentureProject } from "@/lib/domain/venture";
import { runFos } from "@/lib/fos/kernel";

export type FosKernelStatus = "ok" | "degraded" | "offline";

export interface FosDashboardSnapshot {
  portfolioHealth: number;
  dailyFocus: string;
  topPriority: string;
  attentionScore: number;
  eventCount: number;
  kernelStatus: FosKernelStatus;
  computedAt: string;
}

const FALLBACK_SNAPSHOT: FosDashboardSnapshot = {
  portfolioHealth: 0,
  dailyFocus: "Revisar portfolio y cerrar Discovery pendiente",
  topPriority: "Crear primera empresa",
  attentionScore: 0,
  eventCount: 0,
  kernelStatus: "offline",
  computedAt: new Date().toISOString(),
};

export function getFosDashboardSnapshot(ventures: VentureProject[]): FosDashboardSnapshot {
  try {
    const result = runFos(ventures);
    const topCtx = result.ventureContexts.find(
      (c) => c.ventureId === result.topPriorityVentureId
    );

    return {
      portfolioHealth: result.metrics.portfolioHealth,
      dailyFocus: result.metrics.dailyFocus,
      topPriority: topCtx?.ventureName ?? "Crear primera empresa",
      attentionScore: result.metrics.attentionScore,
      eventCount: result.events.length,
      kernelStatus: "ok",
      computedAt: result.computedAt,
    };
  } catch (error) {
    console.error("[fos-dashboard-adapter] FOS failed:", error);
    return {
      ...FALLBACK_SNAPSHOT,
      kernelStatus: "degraded",
      computedAt: new Date().toISOString(),
    };
  }
}
