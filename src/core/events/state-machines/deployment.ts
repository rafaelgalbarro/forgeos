/** PROGRAM 6040 — Deployment state machine */

import { defineMachine, requireApproval } from "./definition";

export const DeploymentStateMachine = defineMachine(
  "Deployment",
  "DRAFT",
  [
    { state: "DRAFT", label: "Draft", terminal: false, recoverable: true },
    { state: "VALIDATING", label: "Validating", terminal: false, recoverable: true },
    { state: "AWAITING_APPROVAL", label: "Awaiting approval", terminal: false, recoverable: true },
    { state: "DEPLOYING", label: "Deploying", terminal: false, recoverable: true },
    { state: "READY", label: "Ready", terminal: false, recoverable: true },
    { state: "FAILED", label: "Failed", terminal: true, recoverable: true },
    { state: "ROLLED_BACK", label: "Rolled back", terminal: true, recoverable: false },
    { state: "CANCELLED", label: "Cancelled", terminal: true, recoverable: false },
    { state: "BLOCKED", label: "Blocked", terminal: false, recoverable: true },
  ],
  [
    { from: "DRAFT", to: "VALIDATING", event: "DEPLOYMENT_VALIDATE" },
    { from: "VALIDATING", to: "AWAITING_APPROVAL", event: "DEPLOYMENT_NEEDS_APPROVAL" },
    { from: "VALIDATING", to: "DEPLOYING", event: "DEPLOYMENT_START" },
    { from: "VALIDATING", to: "BLOCKED", event: "DEPLOYMENT_BLOCKED" },
    { from: "AWAITING_APPROVAL", to: "DEPLOYING", event: "DEPLOYMENT_APPROVED", guard: requireApproval() },
    { from: "AWAITING_APPROVAL", to: "CANCELLED", event: "DEPLOYMENT_CANCELLED" },
    { from: "DEPLOYING", to: "READY", event: "DEPLOYMENT_READY" },
    { from: "DEPLOYING", to: "FAILED", event: "DEPLOYMENT_FAILED" },
    { from: "READY", to: "ROLLED_BACK", event: "DEPLOYMENT_ROLLBACK" },
    { from: "FAILED", to: "DEPLOYING", event: "DEPLOYMENT_RETRY" },
    { from: "BLOCKED", to: "VALIDATING", event: "DEPLOYMENT_UNBLOCKED" },
    { from: "BLOCKED", to: "CANCELLED", event: "DEPLOYMENT_CANCELLED" },
  ],
  [
    "DEPLOYMENT_VALIDATE",
    "DEPLOYMENT_NEEDS_APPROVAL",
    "DEPLOYMENT_START",
    "DEPLOYMENT_BLOCKED",
    "DEPLOYMENT_APPROVED",
    "DEPLOYMENT_CANCELLED",
    "DEPLOYMENT_READY",
    "DEPLOYMENT_FAILED",
    "DEPLOYMENT_ROLLBACK",
    "DEPLOYMENT_RETRY",
    "DEPLOYMENT_UNBLOCKED",
  ]
);
