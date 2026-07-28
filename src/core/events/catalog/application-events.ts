/** PROGRAM 6040 — Application event catalog (use-case / orchestration signals). */

import type { CatalogEntry } from "./domain-events";

export type ApplicationCatalogEventType =
  | "COMMAND_ACCEPTED"
  | "COMMAND_REJECTED"
  | "COMMAND_COMPLETED"
  | "COMMAND_FAILED"
  | "ORCHESTRATION_STEP_STARTED"
  | "ORCHESTRATION_STEP_COMPLETED"
  | "ORCHESTRATION_STEP_FAILED"
  | "PROJECTION_REBUILT"
  | "TRANSITION_APPLIED"
  | "TRANSITION_REJECTED";

export const APPLICATION_EVENT_CATALOG: readonly CatalogEntry[] = [
  { type: "COMMAND_ACCEPTED", version: 1, label: "Command accepted", description: "Application command accepted" },
  { type: "COMMAND_REJECTED", version: 1, label: "Command rejected", description: "Application command rejected" },
  { type: "COMMAND_COMPLETED", version: 1, label: "Command completed", description: "Application command completed" },
  { type: "COMMAND_FAILED", version: 1, label: "Command failed", description: "Application command failed" },
  { type: "ORCHESTRATION_STEP_STARTED", version: 1, label: "Orchestration step started", description: "Orchestration step started" },
  { type: "ORCHESTRATION_STEP_COMPLETED", version: 1, label: "Orchestration step completed", description: "Orchestration step completed" },
  { type: "ORCHESTRATION_STEP_FAILED", version: 1, label: "Orchestration step failed", description: "Orchestration step failed" },
  { type: "PROJECTION_REBUILT", version: 1, label: "Projection rebuilt", description: "Projection rebuilt from event log" },
  { type: "TRANSITION_APPLIED", version: 1, label: "Transition applied", description: "State transition applied via transition service" },
  { type: "TRANSITION_REJECTED", version: 1, label: "Transition rejected", description: "State transition rejected by guards" },
] as const;

export function isApplicationCatalogEvent(type: string): boolean {
  return APPLICATION_EVENT_CATALOG.some((e) => e.type === type);
}
