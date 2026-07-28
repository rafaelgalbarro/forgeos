/**
 * PROGRAM 6100 — VentureCardProjection (light card for portfolio lists).
 */

import type { ProjectionMeta } from "./types";

export type ValueReadiness =
  | "UNKNOWN"
  | "NOT_MEASURED"
  | "INSUFFICIENT_EVIDENCE"
  | "ESTIMATED"
  | "VALIDATED";

export interface VentureCardProjection extends ProjectionMeta {
  ventureId: string;
  workspaceId: string;
  name: string;
  lifecycle: string;
  health: "HEALTHY" | "AT_RISK" | "BLOCKED" | "UNKNOWN";
  missionCount: number;
  activeMissions: number;
  lastActivityAt: string;
  /** Value-ready fields (no invented data). */
  opportunityScore: ValueReadiness;
  validationStatus: ValueReadiness;
  expectedValue: ValueReadiness;
  riskLevel: ValueReadiness;
}

export function buildVentureCardProjection(input: {
  ventureId: string;
  workspaceId: string;
  name: string;
  lifecycle: string;
  health?: VentureCardProjection["health"];
  missionCount?: number;
  activeMissions?: number;
  lastActivityAt?: string;
  sourceEvents?: string[];
}): VentureCardProjection {
  return {
    ventureId: input.ventureId,
    workspaceId: input.workspaceId,
    name: input.name,
    lifecycle: input.lifecycle,
    health: input.health ?? "UNKNOWN",
    missionCount: input.missionCount ?? 0,
    activeMissions: input.activeMissions ?? 0,
    lastActivityAt: input.lastActivityAt || new Date().toISOString(),
    opportunityScore: "NOT_MEASURED",
    validationStatus: "INSUFFICIENT_EVIDENCE",
    expectedValue: "UNKNOWN",
    riskLevel: "NOT_MEASURED",
    version: 1,
    updatedAt: new Date().toISOString(),
    freshness: "LIVE",
    sourceEvents: input.sourceEvents || ["VentureCardChanged"],
  };
}
