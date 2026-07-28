/**
 * PROGRAM 6100 — CompanyHealthProjection.
 */

import type { ProjectionMeta } from "./types";

export interface CompanyHealthProjection extends ProjectionMeta {
  ventureId: string;
  overallHealth: "HEALTHY" | "AT_RISK" | "BLOCKED";
  readinessPercent: number;
  blockers: string[];
  activeBuilds: number;
  livePreviews: number;
  pendingApprovals: number;
}

export function buildCompanyHealthProjection(input: {
  ventureId: string;
  blockers?: string[];
  activeBuilds?: number;
  livePreviews?: number;
  pendingApprovals?: number;
  readinessPercent?: number;
}): CompanyHealthProjection {
  const blockers = input.blockers || [];
  const overallHealth =
    blockers.length > 2 ? "BLOCKED" : blockers.length > 0 ? "AT_RISK" : "HEALTHY";
  return {
    ventureId: input.ventureId,
    overallHealth,
    readinessPercent: input.readinessPercent ?? (blockers.length === 0 ? 80 : 40),
    blockers,
    activeBuilds: input.activeBuilds ?? 0,
    livePreviews: input.livePreviews ?? 0,
    pendingApprovals: input.pendingApprovals ?? 0,
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: ["CompanyHealthChanged"],
  };
}
