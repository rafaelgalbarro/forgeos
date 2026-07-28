/** ForgeOS Venture State Machine — allowed transitions map (Epic 4.2). */

import { isActiveState, LINEAR_PIPELINE } from "./states";
import type { VentureState } from "./types";

/** Linear next state in the official pipeline, or null at EXIT. */
export function getLinearNext(state: VentureState): VentureState | null {
  if (!isActiveState(state)) return null;
  const index = LINEAR_PIPELINE.indexOf(state);
  if (index < 0 || index >= LINEAR_PIPELINE.length - 1) return null;
  return LINEAR_PIPELINE[index + 1] ?? null;
}

/** Linear previous state in the official pipeline, or null at IDEA. */
export function getLinearPrevious(state: VentureState): VentureState | null {
  if (!isActiveState(state)) return null;
  const index = LINEAR_PIPELINE.indexOf(state);
  if (index <= 0) return null;
  return LINEAR_PIPELINE[index - 1] ?? null;
}

const SPECIAL_TARGETS: VentureState[] = ["PAUSED", "BLOCKED", "ARCHIVED"];

/**
 * Returns all structurally allowed target states from `from`.
 * Guards may still block individual targets.
 */
export function getAllowedTargets(from: VentureState): VentureState[] {
  if (from === "ARCHIVED") {
    return [];
  }

  if (from === "PAUSED" || from === "BLOCKED") {
    return ["ARCHIVED"];
  }

  const targets = new Set<VentureState>();

  const linearNext = getLinearNext(from);
  if (linearNext) {
    targets.add(linearNext);
  }

  for (const special of SPECIAL_TARGETS) {
    targets.add(special);
  }

  return [...targets];
}

/** Whether `to` is structurally allowed from `from` (ignoring guards). */
export function isStructurallyAllowed(
  from: VentureState,
  to: VentureState,
  resumeState: VentureState | null = null,
  blockResolved?: boolean,
): boolean {
  if (from === to) return false;

  if (from === "ARCHIVED") return false;

  if (from === "PAUSED") {
    if (to === "ARCHIVED") return true;
    return resumeState !== null && to === resumeState;
  }

  if (from === "BLOCKED") {
    if (to === "ARCHIVED") return true;
    return blockResolved === true && resumeState !== null && to === resumeState;
  }

  if (SPECIAL_TARGETS.includes(to)) {
    return isActiveState(from) || from === "EXIT";
  }

  return getLinearNext(from) === to;
}

/**
 * Resume target when leaving PAUSED or BLOCKED.
 * Caller must supply the stored resume state.
 */
export function getResumeTarget(
  from: "PAUSED" | "BLOCKED",
  resumeState: VentureState | null,
  blockResolved?: boolean,
): VentureState | null {
  if (!resumeState || !isActiveState(resumeState)) return null;
  if (from === "BLOCKED" && !blockResolved) return null;
  return resumeState;
}

/** Expand allowed targets including resume for PAUSED/BLOCKED. */
export function getExpandedAllowedTargets(
  from: VentureState,
  resumeState: VentureState | null,
  blockResolved?: boolean,
): VentureState[] {
  const base = getAllowedTargets(from);

  if (from === "PAUSED") {
    const resume = getResumeTarget("PAUSED", resumeState);
    if (resume) return [resume, ...base];
  }

  if (from === "BLOCKED") {
    const resume = getResumeTarget("BLOCKED", resumeState, blockResolved);
    if (resume) return [resume, ...base];
  }

  return base;
}
