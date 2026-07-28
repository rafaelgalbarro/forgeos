/** PROGRAM 6040 — Codebase state machine */

import { defineMachine } from "./definition";

export const CodebaseStateMachine = defineMachine(
  "Codebase",
  "EMPTY",
  [
    { state: "EMPTY", label: "Empty", terminal: false, recoverable: true },
    { state: "SCAFFOLDED", label: "Scaffolded", terminal: false, recoverable: true },
    { state: "GENERATING", label: "Generating", terminal: false, recoverable: true },
    { state: "READY", label: "Ready", terminal: false, recoverable: true },
    { state: "STALE", label: "Stale", terminal: false, recoverable: true },
    { state: "ARCHIVED", label: "Archived", terminal: true, recoverable: false },
    { state: "FAILED", label: "Failed", terminal: true, recoverable: true },
  ],
  [
    { from: "EMPTY", to: "SCAFFOLDED", event: "CODEBASE_SCAFFOLDED" },
    { from: "SCAFFOLDED", to: "GENERATING", event: "CODEBASE_GENERATION_STARTED" },
    { from: "GENERATING", to: "READY", event: "CODEBASE_READY" },
    { from: "GENERATING", to: "FAILED", event: "CODEBASE_FAILED" },
    { from: "READY", to: "STALE", event: "CODEBASE_MARKED_STALE" },
    { from: "STALE", to: "GENERATING", event: "CODEBASE_REGENERATION_STARTED" },
    { from: "FAILED", to: "GENERATING", event: "CODEBASE_RETRY" },
    { from: "READY", to: "ARCHIVED", event: "CODEBASE_ARCHIVED" },
    { from: "STALE", to: "ARCHIVED", event: "CODEBASE_ARCHIVED" },
  ],
  [
    "CODEBASE_SCAFFOLDED",
    "CODEBASE_GENERATION_STARTED",
    "CODEBASE_READY",
    "CODEBASE_FAILED",
    "CODEBASE_MARKED_STALE",
    "CODEBASE_REGENERATION_STARTED",
    "CODEBASE_RETRY",
    "CODEBASE_ARCHIVED",
  ]
);
