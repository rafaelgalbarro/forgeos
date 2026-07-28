/** PROGRAM 6040 — Decision state machine */

import { defineMachine } from "./definition";

export const DecisionStateMachine = defineMachine(
  "Decision",
  "OPEN",
  [
    { state: "OPEN", label: "Open", terminal: false, recoverable: true },
    { state: "DELIBERATING", label: "Deliberating", terminal: false, recoverable: true },
    { state: "RESOLVED", label: "Resolved", terminal: true, recoverable: false },
    { state: "DEFERRED", label: "Deferred", terminal: false, recoverable: true },
    { state: "CANCELLED", label: "Cancelled", terminal: true, recoverable: false },
  ],
  [
    { from: "OPEN", to: "DELIBERATING", event: "DECISION_DELIBERATION_STARTED" },
    { from: "OPEN", to: "DEFERRED", event: "DECISION_DEFERRED" },
    { from: "OPEN", to: "CANCELLED", event: "DECISION_CANCELLED" },
    { from: "DELIBERATING", to: "RESOLVED", event: "DECISION_RESOLVED" },
    { from: "DELIBERATING", to: "DEFERRED", event: "DECISION_DEFERRED" },
    { from: "DELIBERATING", to: "CANCELLED", event: "DECISION_CANCELLED" },
    { from: "DEFERRED", to: "OPEN", event: "DECISION_REOPENED" },
    { from: "DEFERRED", to: "CANCELLED", event: "DECISION_CANCELLED" },
  ],
  [
    "DECISION_DELIBERATION_STARTED",
    "DECISION_DEFERRED",
    "DECISION_CANCELLED",
    "DECISION_RESOLVED",
    "DECISION_REOPENED",
  ]
);
