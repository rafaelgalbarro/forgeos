/**
 * Mission status transition policy — PROGRAM 6010
 * Mission does not execute factories; it only allows valid lifecycle moves.
 */

export const MISSION_STATUSES = [
  "DRAFT",
  "UNDERSTANDING",
  "PLANNING",
  "BUILDING",
  "VALIDATING",
  "READY_FOR_DEPLOY",
  "OPERATING",
  "EVOLVING",
  "PAUSED",
  "BLOCKED",
  "COMPLETED",
  "FAILED",
] as const;

export type MissionStatusName = (typeof MISSION_STATUSES)[number];

const TRANSITIONS: Record<MissionStatusName, readonly MissionStatusName[]> = {
  DRAFT: ["UNDERSTANDING", "PAUSED", "FAILED"],
  UNDERSTANDING: ["PLANNING", "PAUSED", "BLOCKED", "FAILED"],
  PLANNING: ["BUILDING", "UNDERSTANDING", "PAUSED", "BLOCKED", "FAILED"],
  BUILDING: ["VALIDATING", "PLANNING", "PAUSED", "BLOCKED", "FAILED"],
  VALIDATING: ["READY_FOR_DEPLOY", "BUILDING", "PAUSED", "BLOCKED", "FAILED"],
  READY_FOR_DEPLOY: ["OPERATING", "VALIDATING", "PAUSED", "BLOCKED", "FAILED"],
  OPERATING: ["EVOLVING", "COMPLETED", "PAUSED", "BLOCKED", "FAILED"],
  EVOLVING: ["OPERATING", "COMPLETED", "PAUSED", "BLOCKED", "FAILED"],
  PAUSED: [
    "DRAFT",
    "UNDERSTANDING",
    "PLANNING",
    "BUILDING",
    "VALIDATING",
    "READY_FOR_DEPLOY",
    "OPERATING",
    "EVOLVING",
    "FAILED",
  ],
  BLOCKED: [
    "UNDERSTANDING",
    "PLANNING",
    "BUILDING",
    "VALIDATING",
    "READY_FOR_DEPLOY",
    "OPERATING",
    "EVOLVING",
    "PAUSED",
    "FAILED",
  ],
  COMPLETED: [],
  FAILED: [],
};

export function canTransitionMission(from: MissionStatusName, to: MissionStatusName): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedMissionTransitions(from: MissionStatusName): readonly MissionStatusName[] {
  return TRANSITIONS[from];
}
