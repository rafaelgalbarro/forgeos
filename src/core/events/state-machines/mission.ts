/**
 * PROGRAM 6040 — Mission state machine
 * Aligns with PROGRAM 6010 mission/transitions.ts and re-exports domain helpers.
 */

import { defineMachine, requireBlockResolved } from "./definition";
import {
  MISSION_STATUSES,
  canTransitionMission,
  allowedMissionTransitions,
  type MissionStatusName,
} from "../../domain/mission/transitions";

export { MISSION_STATUSES, canTransitionMission, allowedMissionTransitions };
export type { MissionStatusName };

const missionTransitions = MISSION_STATUSES.flatMap((from) =>
  allowedMissionTransitions(from).map((to) => {
    const event = `MISSION_${from}_TO_${to}`;
    if (from === "BLOCKED") {
      return {
        from,
        to,
        event,
        guard: requireBlockResolved(),
      };
    }
    return { from, to, event };
  })
);

export const MissionStateMachine = defineMachine(
  "Mission",
  "DRAFT",
  MISSION_STATUSES.map((state) => ({
    state,
    label: state,
    terminal: state === "COMPLETED" || state === "FAILED",
    recoverable: state !== "COMPLETED",
  })),
  [
    ...missionTransitions,
    // Operational aliases used by Live Mission / adapters
    { from: "DRAFT", to: "UNDERSTANDING", event: "MISSION_STARTED" },
    { from: "BUILDING", to: "PAUSED", event: "MISSION_PAUSED" },
    { from: "PAUSED", to: "BUILDING", event: "MISSION_RESUMED" },
    { from: "OPERATING", to: "COMPLETED", event: "MISSION_COMPLETED" },
    { from: "BUILDING", to: "FAILED", event: "MISSION_FAILED" },
    { from: "BLOCKED", to: "BUILDING", event: "MISSION_UNBLOCKED", guard: requireBlockResolved() },
  ],
  [
    "MISSION_STARTED",
    "MISSION_PAUSED",
    "MISSION_RESUMED",
    "MISSION_COMPLETED",
    "MISSION_FAILED",
    "MISSION_UNBLOCKED",
    "MISSION_STATE_CHANGED",
    ...missionTransitions.map((t) => t.event),
  ]
);
