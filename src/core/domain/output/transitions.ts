/** Output status transitions — PROGRAM 6010 */

export const OUTPUT_STATUSES = [
  "DRAFT",
  "GENERATING",
  "PREVIEW_READY",
  "VALIDATING",
  "CHANGES_REQUESTED",
  "APPROVED",
  "EXPORT_READY",
  "DEPLOYMENT_READY",
  "FAILED",
] as const;

export type OutputStatusName = (typeof OUTPUT_STATUSES)[number];

const TRANSITIONS: Record<OutputStatusName, readonly OutputStatusName[]> = {
  DRAFT: ["GENERATING", "FAILED"],
  GENERATING: ["PREVIEW_READY", "FAILED"],
  PREVIEW_READY: ["VALIDATING", "CHANGES_REQUESTED", "FAILED"],
  VALIDATING: ["APPROVED", "CHANGES_REQUESTED", "FAILED"],
  CHANGES_REQUESTED: ["GENERATING", "FAILED"],
  APPROVED: ["EXPORT_READY", "DEPLOYMENT_READY"],
  EXPORT_READY: ["DEPLOYMENT_READY"],
  DEPLOYMENT_READY: [],
  FAILED: ["DRAFT"],
};

export function canTransitionOutput(from: OutputStatusName, to: OutputStatusName): boolean {
  return TRANSITIONS[from].includes(to);
}
