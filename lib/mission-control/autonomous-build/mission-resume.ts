/** Load checkpoint and resume autonomous queue. */

import type { AutonomousState } from "./types";
import type { Mission } from "../types";
import { getLatestCheckpoint, restoreFromCheckpoint } from "./mission-checkpoints";
import { startNextQueued } from "../live-mission/mission-queue";
import { emitAutonomousMissionEvent } from "../live-mission/event-emitter";

export function resumeAutonomous(
  mission: Mission,
  state: AutonomousState
): { mission: Mission; state: AutonomousState } {
  let updated: AutonomousState = {
    ...state,
    pausedByUser: false,
    status: state.enabled ? "running" : "idle",
    updatedAt: new Date().toISOString(),
  };

  const latest = getLatestCheckpoint(mission.id);
  if (latest && updated.tasks.length === 0) {
    updated = restoreFromCheckpoint(updated, latest);
  }

  if (updated.enabled && !updated.tasks.some((t) => t.status === "Running")) {
    const tasks = startNextQueued(updated.tasks);
    updated = {
      ...updated,
      tasks,
      currentTaskId: tasks.find((t) => t.status === "Running")?.id,
    };
  }

  const m = emitAutonomousMissionEvent(mission, "autonomous_resumed", "Ejecución autónoma reanudada");
  return { mission: m, state: updated };
}

export function resumeFromCheckpoint(
  mission: Mission,
  state: AutonomousState
): { mission: Mission; state: AutonomousState } {
  const latest = getLatestCheckpoint(mission.id);
  if (!latest) return resumeAutonomous(mission, state);
  const restored = restoreFromCheckpoint(state, latest);
  return resumeAutonomous(mission, restored);
}
