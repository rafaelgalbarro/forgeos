/** Lightweight SSR snapshot — no heavy engine imports. */

import type { MissionSnapshot, SnapshotItem } from "./types";
import { MISSION_CONTROL_VERSION } from "./types";
import { buildCompanyWorkspacesSeed } from "./autonomous-company/workspace-snapshots";
import { GTM_PROGRAM_VERSION } from "./go-to-market/types";
import { buildInvestorModeSnapshot } from "./investor-mode/investor-snapshots";

export const DEFAULT_SNAPSHOT_ITEMS: SnapshotItem[] = [
  { id: "research", label: "Research", status: "idle", progress: 0 },
  { id: "businessModel", label: "Business Model", status: "idle", progress: 0 },
  { id: "brand", label: "Brand", status: "idle", progress: 0 },
  { id: "website", label: "Website", status: "idle", progress: 0 },
  { id: "application", label: "Application", status: "idle", progress: 0 },
  { id: "mobile", label: "Mobile", status: "idle", progress: 0 },
  { id: "prd", label: "PRD", status: "idle", progress: 0 },
  { id: "architecture", label: "Architecture", status: "idle", progress: 0 },
  { id: "marketing", label: "Marketing", status: "idle", progress: 0 },
  { id: "financials", label: "Financials", status: "idle", progress: 0 },
  { id: "investorReadiness", label: "Investor Readiness", status: "idle", progress: 0, summary: buildInvestorModeSnapshot(0).readinessLabel },
  { id: "deployment", label: "Deployment", status: "idle", progress: 0 },
  { id: "gtm", label: "Go To Market", status: "idle", progress: 0 },
];

/** Server-safe initial snapshot — AI flag stubbed false on SSR. */
export function buildMissionControlSnapshot(): MissionSnapshot {
  return {
    version: MISSION_CONTROL_VERSION,
    generatedAt: new Date().toISOString(),
    activeMissionId: null,
    missionCount: 0,
    defaultSnapshots: DEFAULT_SNAPSHOT_ITEMS,
    aiEnabled: false,
    autoPilotDefault: true,
    ceoInsightDefaults: {
      ventureUnderstanding: "El CEO co-fundador espera tu primera idea para construir contexto de venture.",
      nextAction: "Describe qué quieres construir o elige una tarjeta de intención.",
    },
    gtmEnabled: true,
    gtmProgramVersion: GTM_PROGRAM_VERSION,
    companyWorkspaces: buildCompanyWorkspacesSeed(),
    investorMode: buildInvestorModeSnapshot(0),
  };
}
