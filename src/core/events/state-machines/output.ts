/**
 * PROGRAM 6040 — Output state machine
 * Aligns with PROGRAM 6010 output/transitions.ts
 */

import { defineMachine } from "./definition";
import {
  OUTPUT_STATUSES,
  canTransitionOutput,
  type OutputStatusName,
} from "../../domain/output/transitions";

export { OUTPUT_STATUSES, canTransitionOutput };
export type { OutputStatusName };

const OUTPUT_TRANSITIONS: Record<OutputStatusName, readonly OutputStatusName[]> = {
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

const edges = (Object.keys(OUTPUT_TRANSITIONS) as OutputStatusName[]).flatMap((from) =>
  OUTPUT_TRANSITIONS[from].map((to) => ({
    from,
    to,
    event: `OUTPUT_${from}_TO_${to}`,
  }))
);

export const OutputStateMachine = defineMachine(
  "Output",
  "DRAFT",
  OUTPUT_STATUSES.map((state) => ({
    state,
    label: state,
    terminal: state === "DEPLOYMENT_READY",
    recoverable: state === "FAILED" || state === "CHANGES_REQUESTED" || state === "DRAFT",
  })),
  [
    ...edges,
    { from: "DRAFT", to: "GENERATING", event: "OUTPUT_GENERATION_STARTED" },
    { from: "GENERATING", to: "PREVIEW_READY", event: "OUTPUT_READY" },
    { from: "GENERATING", to: "FAILED", event: "OUTPUT_FAILED" },
    { from: "FAILED", to: "DRAFT", event: "OUTPUT_RETRY" },
  ],
  [
    "OUTPUT_GENERATION_STARTED",
    "OUTPUT_READY",
    "OUTPUT_FAILED",
    "OUTPUT_RETRY",
    "OUTPUT_STATE_CHANGED",
    ...edges.map((e) => e.event),
  ]
);
