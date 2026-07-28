/** PROGRAM 6040 — Release state machine */

import { defineMachine, requireApproval } from "./definition";

export const ReleaseStateMachine = defineMachine(
  "Release",
  "DRAFT",
  [
    { state: "DRAFT", label: "Draft", terminal: false, recoverable: true },
    { state: "CANDIDATE", label: "Candidate", terminal: false, recoverable: true },
    { state: "APPROVED", label: "Approved", terminal: false, recoverable: true },
    { state: "SHIPPED", label: "Shipped", terminal: true, recoverable: false },
    { state: "YANKED", label: "Yanked", terminal: true, recoverable: false },
    { state: "REJECTED", label: "Rejected", terminal: true, recoverable: false },
  ],
  [
    { from: "DRAFT", to: "CANDIDATE", event: "RELEASE_CANDIDATE" },
    { from: "CANDIDATE", to: "APPROVED", event: "RELEASE_APPROVED", guard: requireApproval() },
    { from: "CANDIDATE", to: "REJECTED", event: "RELEASE_REJECTED" },
    { from: "APPROVED", to: "SHIPPED", event: "RELEASE_SHIPPED" },
    { from: "SHIPPED", to: "YANKED", event: "RELEASE_YANKED" },
    { from: "DRAFT", to: "REJECTED", event: "RELEASE_REJECTED" },
  ],
  [
    "RELEASE_CANDIDATE",
    "RELEASE_APPROVED",
    "RELEASE_REJECTED",
    "RELEASE_SHIPPED",
    "RELEASE_YANKED",
  ]
);
