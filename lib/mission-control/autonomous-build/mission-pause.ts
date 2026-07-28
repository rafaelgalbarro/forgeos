/** Pause autonomous loop — user or system. */

import type { AutonomousState } from "./types";
import type { Mission } from "../types";
import { emitAutonomousMissionEvent } from "../live-mission/event-emitter";

export function pauseAutonomous(
  mission: Mission,
  state: AutonomousState,
  byUser = false
): { mission: Mission; state: AutonomousState } {
  const updated: AutonomousState = {
    ...state,
    status: "paused",
    pausedByUser: byUser || state.pausedByUser,
    updatedAt: new Date().toISOString(),
  };
  const m = emitAutonomousMissionEvent(
    mission,
    "autonomous_paused",
    byUser ? "Pausado por usuario" : "Pausado por sistema"
  );
  return { mission: m, state: updated };
}

export function isAutonomousPaused(state: AutonomousState): boolean {
  return state.status === "paused" || state.status === "awaiting_approval";
}

export function canAutonomousRun(state: AutonomousState): boolean {
  return state.enabled && !state.pausedByUser && state.status === "running";
}
