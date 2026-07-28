/** Auto-pilot — continue automatically unless approval needed. Wired to autonomous-orchestrator (5500). */

import type { AutoPilotState, Mission } from "./types";
import { getNextPendingDecision } from "./decision-center";
import {
  createAutonomousState,
  setAutonomousEnabled,
  attachAutonomousState,
} from "./autonomous-build/autonomous-orchestrator";

export function createAutoPilotState(enabled = true): AutoPilotState {
  return { enabled, pausedForDecision: false };
}

export function setAutoPilot(mission: Mission, enabled: boolean): Mission {
  const state = mission.autonomous ?? createAutonomousState(mission, mission.autoPilot.enabled);
  const { mission: updated, state: newState } = setAutonomousEnabled(mission, state, enabled);
  return {
    ...attachAutonomousState(updated, newState),
    autoPilot: { ...mission.autoPilot, enabled, pausedForDecision: !enabled && mission.autoPilot.pausedForDecision },
    updatedAt: new Date().toISOString(),
  };
}

export function shouldPauseForDecision(mission: Mission): boolean {
  const next = getNextPendingDecision(mission);
  if (!next) return false;
  if (!mission.autoPilot.enabled) return true;
  return next.important;
}

export function autoResolveIfAllowed(mission: Mission): Mission {
  if (!mission.autoPilot.enabled) return mission;
  const next = getNextPendingDecision(mission);
  if (!next || next.important) {
    return {
      ...mission,
      autoPilot: { ...mission.autoPilot, pausedForDecision: !!next?.important },
    };
  }

  const defaultOption = next.options[0];
  const pendingDecisions = mission.pendingDecisions.map((d) =>
    d.id === next.id ? { ...d, resolved: true, selectedOption: defaultOption } : d
  );

  return {
    ...mission,
    pendingDecisions,
    autoPilot: {
      enabled: true,
      pausedForDecision: false,
      lastAutoAction: `Auto: ${next.title} → ${defaultOption}`,
    },
  };
}

export function autoPilotLabel(state: AutoPilotState): string {
  if (!state.enabled) return "Manual — pido aprobación";
  if (state.pausedForDecision) return "Pausado — decisión importante";
  return "Continuar automáticamente";
}

/** Alias for AutonomousBuildToggle — backward compatible with AutoPilotToggle. */
export const autonomousBuildLabel = autoPilotLabel;
export const setAutonomousBuild = setAutoPilot;

export function ensureAutonomousState(mission: Mission): Mission {
  if (mission.autonomous) return mission;
  const state = createAutonomousState(mission, mission.autoPilot.enabled);
  return attachAutonomousState(mission, state);
}
