/** Shared helpers for OPERATE/EVOLVE visibility rules. */

import type { Mission, MissionPhase } from "../types";
import { MISSION_PHASE_ORDER } from "../mission-flow";

const POST_DEPLOY_PHASES: MissionPhase[] = ["OPERATE", "EVOLVE"];

export function phaseIndex(phase: MissionPhase): number {
  return MISSION_PHASE_ORDER.indexOf(phase);
}

export function isPostDeployPhase(phase: MissionPhase): boolean {
  return POST_DEPLOY_PHASES.includes(phase);
}

export function isDeployComplete(mission: Mission): boolean {
  const deploy = mission.snapshots.find((s) => s.id === "deployment");
  return deploy?.status === "completed";
}

/** Visible when phase >= OPERATE, or DEPLOY completed. */
export function shouldShowCompanyWorkspaces(mission: Mission): boolean {
  if (isPostDeployPhase(mission.phase)) return true;
  if (mission.phase === "DEPLOY" && isDeployComplete(mission)) return true;
  return phaseIndex(mission.phase) >= phaseIndex("OPERATE");
}
