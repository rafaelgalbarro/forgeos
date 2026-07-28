/** Overall mission progress % by phase. */

import type { MissionPhase } from "../types";
import { MISSION_PHASE_ORDER } from "../mission-flow";

export function phaseProgressPercent(phase: MissionPhase): number {
  const idx = MISSION_PHASE_ORDER.indexOf(phase);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / MISSION_PHASE_ORDER.length) * 100);
}

export function combinedProgress(
  phase: MissionPhase,
  snapshotProgress: number[],
  executionPercent: number
): number {
  const phasePct = phaseProgressPercent(phase);
  const snapAvg =
    snapshotProgress.length > 0
      ? snapshotProgress.reduce((a, b) => a + b, 0) / snapshotProgress.length
      : 0;
  const execWeight = executionPercent > 0 ? executionPercent * 0.3 : 0;
  return Math.min(100, Math.round(phasePct * 0.4 + snapAvg * 0.3 + execWeight));
}
