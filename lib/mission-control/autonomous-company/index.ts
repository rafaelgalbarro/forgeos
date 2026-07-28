/** PROGRAM 5600 — Autonomous Company public API. */

export { AUTONOMOUS_COMPANY_VERSION } from "./types";
export type * from "./types";

export { COMPANY_WORKSPACES, getWorkspaceById, listWorkspaceIds } from "./company-workspaces";
export {
  shouldShowCompanyWorkspaces,
  isPostDeployPhase,
  isDeployComplete,
} from "./operate-phase-shared";
export { activateOperatePhase, isOperatePhase, operatePhaseLabel, getOperatePhaseHints } from "./operate-phase";
export { activateEvolvePhase, isEvolvePhase, evolvePhaseLabel, getEvolvePhaseHooks } from "./evolve-phase";
export { buildCompanyWorkspacesSeed, buildCompanyWorkspacesSnapshot } from "./workspace-snapshots";
export {
  emitCompanyFeedbackUpdate,
  emitCompanyIncidentUpdate,
  emitCompanyKpiUpdate,
} from "./company-events";
export {
  readMissionBacklog,
  writeMissionBacklog,
  readMissionRoadmap,
  writeMissionRoadmap,
  seedDemoBacklog,
  seedDemoRoadmap,
} from "./mission-local-storage";
