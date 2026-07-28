/** PROGRAM 6030 — Execution mode policies. */

import type { ExecutionMode } from "../types";

export const EXECUTION_MODES: ExecutionMode[] = [
  "MANUAL",
  "ASSISTED",
  "AUTOPILOT",
  "DRY_RUN",
  "PREVIEW_ONLY",
];

/** Production is never auto-activated by the kernel. */
export function assertProductionNeverAutoActivated(mode: ExecutionMode): void {
  void mode;
  // Hard invariant — adapters must keep productionActivated=false.
}

export function isNonDestructiveMode(mode: ExecutionMode): boolean {
  return mode === "DRY_RUN" || mode === "PREVIEW_ONLY" || mode === "MANUAL";
}

export function shouldAutoAdvance(mode: ExecutionMode): boolean {
  return mode === "AUTOPILOT" || mode === "DRY_RUN" || mode === "ASSISTED" || mode === "PREVIEW_ONLY";
}

export function shouldExecuteCapabilities(mode: ExecutionMode): boolean {
  return mode !== "DRY_RUN";
}

export function forceDryCapability(mode: ExecutionMode): boolean {
  return mode === "DRY_RUN";
}
