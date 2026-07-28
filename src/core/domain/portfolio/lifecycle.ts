/**
 * Venture lifecycle state machine — PROGRAM 6110
 */

import type { VentureLifecycle } from "./types";

const TRANSITIONS: Record<VentureLifecycle, readonly VentureLifecycle[]> = {
  IDEA: ["DISCOVERING", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  DISCOVERING: ["VALIDATING", "IDEA", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  VALIDATING: ["PLANNING", "DISCOVERING", "AT_RISK", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  PLANNING: ["BUILDING", "VALIDATING", "AT_RISK", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  BUILDING: [
    "READY_TO_LAUNCH",
    "PLANNING",
    "AT_RISK",
    "PAUSED",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  READY_TO_LAUNCH: [
    "LAUNCHED",
    "BUILDING",
    "AT_RISK",
    "PAUSED",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  LAUNCHED: ["OPERATING", "AT_RISK", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  OPERATING: [
    "GENERATING_TRACTION",
    "AT_RISK",
    "PAUSED",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  GENERATING_TRACTION: [
    "GENERATING_REVENUE",
    "OPERATING",
    "AT_RISK",
    "PAUSED",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  GENERATING_REVENUE: [
    "PROFITABLE",
    "GENERATING_TRACTION",
    "AT_RISK",
    "PAUSED",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  PROFITABLE: ["SCALING", "AT_RISK", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  SCALING: ["PROFITABLE", "AT_RISK", "PAUSED", "ARCHIVED", "CLOSED", "FAILED"],
  AT_RISK: [
    "VALIDATING",
    "PLANNING",
    "BUILDING",
    "OPERATING",
    "PAUSED",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  PAUSED: [
    "IDEA",
    "DISCOVERING",
    "VALIDATING",
    "PLANNING",
    "BUILDING",
    "READY_TO_LAUNCH",
    "LAUNCHED",
    "OPERATING",
    "GENERATING_TRACTION",
    "GENERATING_REVENUE",
    "PROFITABLE",
    "SCALING",
    "AT_RISK",
    "ARCHIVED",
    "CLOSED",
    "FAILED",
  ],
  ARCHIVED: ["CLOSED"],
  CLOSED: [],
  FAILED: ["IDEA", "ARCHIVED", "CLOSED"],
};

export function canTransitionLifecycle(
  from: VentureLifecycle,
  to: VentureLifecycle,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function isTerminalLifecycle(state: VentureLifecycle): boolean {
  return state === "CLOSED" || state === "FAILED";
}

export function isActiveLifecycle(state: VentureLifecycle): boolean {
  return !isTerminalLifecycle(state) && state !== "ARCHIVED" && state !== "PAUSED";
}

export const ALL_LIFECYCLE_STATES: readonly VentureLifecycle[] = Object.keys(
  TRANSITIONS,
) as VentureLifecycle[];
