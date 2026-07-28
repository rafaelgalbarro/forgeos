/** PROGRAM 6040 — Preview state machine */

import { defineMachine } from "./definition";

export const PreviewStateMachine = defineMachine(
  "Preview",
  "IDLE",
  [
    { state: "IDLE", label: "Idle", terminal: false, recoverable: true },
    { state: "PROVISIONING", label: "Provisioning", terminal: false, recoverable: true },
    { state: "READY", label: "Ready", terminal: false, recoverable: true },
    { state: "UNHEALTHY", label: "Unhealthy", terminal: false, recoverable: true },
    { state: "STOPPED", label: "Stopped", terminal: true, recoverable: true },
    { state: "FAILED", label: "Failed", terminal: true, recoverable: true },
  ],
  [
    { from: "IDLE", to: "PROVISIONING", event: "PREVIEW_PROVISION_STARTED" },
    { from: "PROVISIONING", to: "READY", event: "PREVIEW_READY" },
    { from: "PROVISIONING", to: "FAILED", event: "PREVIEW_FAILED" },
    { from: "READY", to: "UNHEALTHY", event: "PREVIEW_UNHEALTHY" },
    { from: "UNHEALTHY", to: "READY", event: "PREVIEW_RECOVERED" },
    { from: "READY", to: "STOPPED", event: "PREVIEW_STOPPED" },
    { from: "UNHEALTHY", to: "STOPPED", event: "PREVIEW_STOPPED" },
    { from: "FAILED", to: "PROVISIONING", event: "PREVIEW_RETRY" },
    { from: "STOPPED", to: "PROVISIONING", event: "PREVIEW_RESTARTED" },
  ],
  [
    "PREVIEW_PROVISION_STARTED",
    "PREVIEW_READY",
    "PREVIEW_FAILED",
    "PREVIEW_UNHEALTHY",
    "PREVIEW_RECOVERED",
    "PREVIEW_STOPPED",
    "PREVIEW_RETRY",
    "PREVIEW_RESTARTED",
  ]
);
