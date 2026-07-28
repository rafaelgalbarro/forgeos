/** PROGRAM 6040 — Build state machine (aligned with domain BuildStatus) */

import { defineMachine } from "./definition";

export const BuildStateMachine = defineMachine(
  "Build",
  "QUEUED",
  [
    { state: "QUEUED", label: "Queued", terminal: false, recoverable: true },
    { state: "RUNNING", label: "Running", terminal: false, recoverable: true },
    { state: "SUCCEEDED", label: "Succeeded", terminal: true, recoverable: false },
    { state: "FAILED", label: "Failed", terminal: true, recoverable: true },
    { state: "CANCELLED", label: "Cancelled", terminal: true, recoverable: false },
  ],
  [
    { from: "QUEUED", to: "RUNNING", event: "BUILD_STARTED" },
    { from: "RUNNING", to: "SUCCEEDED", event: "BUILD_SUCCEEDED" },
    { from: "RUNNING", to: "FAILED", event: "BUILD_FAILED" },
    { from: "RUNNING", to: "CANCELLED", event: "BUILD_CANCELLED" },
    { from: "QUEUED", to: "CANCELLED", event: "BUILD_CANCELLED" },
    { from: "FAILED", to: "QUEUED", event: "BUILD_RETRY" },
  ],
  [
    "BUILD_QUEUED",
    "BUILD_STARTED",
    "BUILD_SUCCEEDED",
    "BUILD_FAILED",
    "BUILD_CANCELLED",
    "BUILD_RETRY",
  ]
);
