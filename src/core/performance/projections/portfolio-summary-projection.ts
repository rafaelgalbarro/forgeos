/**
 * PROGRAM 6100 — PortfolioSummaryProjection.
 */

import type { ProjectionMeta } from "./types";
import type { VentureCardProjection } from "./venture-card-projection";

export interface PortfolioSummaryProjection extends ProjectionMeta {
  workspaceId: string;
  totalVentures: number;
  healthyCount: number;
  atRiskCount: number;
  blockedCount: number;
  activeMissions: number;
}

export function buildPortfolioSummaryProjection(
  workspaceId: string,
  cards: VentureCardProjection[],
): PortfolioSummaryProjection {
  return {
    workspaceId,
    totalVentures: cards.length,
    healthyCount: cards.filter((c) => c.health === "HEALTHY").length,
    atRiskCount: cards.filter((c) => c.health === "AT_RISK").length,
    blockedCount: cards.filter((c) => c.health === "BLOCKED").length,
    activeMissions: cards.reduce((sum, c) => sum + c.activeMissions, 0),
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: ["VentureCardChanged", "MissionSummaryChanged"],
  };
}
