/**
 * PROGRAM 6100 — Portfolio-ready contracts (no Portfolio UI).
 */

import type { ValueReadiness } from "../projections/venture-card-projection";

export interface VenturePortfolioCard {
  ventureId: string;
  workspaceId: string;
  name: string;
  lifecycle: string;
  health: "HEALTHY" | "AT_RISK" | "BLOCKED" | "UNKNOWN";
  missionCount: number;
  activeMissions: number;
  lastActivityAt: string;
  activityStatus: "ACTIVE" | "IDLE" | "PAUSED";
  valueStatus: ValueReadiness;
  opportunityScore: ValueReadiness;
  validationStatus: ValueReadiness;
  expectedValue: ValueReadiness;
  riskLevel: ValueReadiness;
}

export type { ListPortfolioVenturesParams } from "../queries/definitions";
export { listPortfolioVentures } from "../queries/handlers";
