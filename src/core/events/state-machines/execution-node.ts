/** PROGRAM 6040 — ExecutionNode state machine */

import { defineMachine, requireBlockResolved } from "./definition";

export const ExecutionNodeStateMachine = defineMachine(
  "ExecutionNode",
  "PENDING",
  [
    { state: "PENDING", label: "Pending", terminal: false, recoverable: true },
    { state: "READY", label: "Ready", terminal: false, recoverable: true },
    { state: "RUNNING", label: "Running", terminal: false, recoverable: true },
    { state: "BLOCKED", label: "Blocked", terminal: false, recoverable: true },
    { state: "COMPLETED", label: "Completed", terminal: true, recoverable: false },
    { state: "FAILED", label: "Failed", terminal: true, recoverable: true },
    { state: "SKIPPED", label: "Skipped", terminal: true, recoverable: false },
  ],
  [
    { from: "PENDING", to: "READY", event: "NODE_READY" },
    { from: "READY", to: "RUNNING", event: "NODE_STARTED" },
    { from: "READY", to: "SKIPPED", event: "NODE_SKIPPED" },
    { from: "RUNNING", to: "COMPLETED", event: "NODE_COMPLETED" },
    { from: "RUNNING", to: "FAILED", event: "NODE_FAILED" },
    { from: "RUNNING", to: "BLOCKED", event: "NODE_BLOCKED" },
    { from: "BLOCKED", to: "READY", event: "NODE_UNBLOCKED", guard: requireBlockResolved() },
    { from: "BLOCKED", to: "SKIPPED", event: "NODE_SKIPPED" },
    { from: "BLOCKED", to: "FAILED", event: "NODE_FAILED" },
    { from: "FAILED", to: "READY", event: "NODE_RETRY" },
    { from: "PENDING", to: "SKIPPED", event: "NODE_SKIPPED" },
  ],
  [
    "NODE_READY",
    "NODE_STARTED",
    "NODE_SKIPPED",
    "NODE_COMPLETED",
    "NODE_FAILED",
    "NODE_BLOCKED",
    "NODE_UNBLOCKED",
    "NODE_RETRY",
  ]
);
