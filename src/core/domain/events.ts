/**
 * PROGRAM 6010/6030/6040 — Domain events compatibility barrel.
 * Note: this file shadows `events/` for `from ".../domain/events"` resolution.
 * Re-exports folder contracts and provides operational createDomainEvent used by Orchestration (6030).
 */

export type {
  DomainEventActor,
  DomainEventBase,
  CreateDomainEventInput,
} from "./events/types";

export {
  serializeDomainEvent,
  createDomainEvent as createCanonicalDomainEvent,
} from "./events/types";

import { asEventId, asWorkspaceId } from "./shared/ids";
import { nowTimestamp } from "./shared/value-objects";

/** PascalCase (6010) + SCREAMING_SNAKE operational (6030) */
export type DomainEventType =
  | "WorkspaceCreated"
  | "WorkspaceUpdated"
  | "VentureCreated"
  | "VentureStatusChanged"
  | "MissionCreated"
  | "MissionStatusChanged"
  | "MissionIntentUpdated"
  | "MissionPlanApproved"
  | "MissionPaused"
  | "MissionResumed"
  | "MissionCancelled"
  | "DecisionRequested"
  | "DecisionProposed"
  | "DecisionResolved"
  | "ArtifactCreated"
  | "ProductCreated"
  | "OutputPlanned"
  | "OutputCreated"
  | "OutputGenerated"
  | "OutputChangeRequested"
  | "OutputApproved"
  | "OutputStatusChanged"
  | "CodebaseGenerated"
  | "CodebaseCreated"
  | "CodeChangeRequested"
  | "CodebaseApproved"
  | "BuildStarted"
  | "BuildStopped"
  | "BuildRetried"
  | "BuildRequested"
  | "BuildCompleted"
  | "PreviewCreated"
  | "PreviewStopped"
  | "ReleaseCreated"
  | "ReleaseApproved"
  | "ReleasePrepared"
  | "ReleasePublished"
  | "DeploymentRequested"
  | "DeploymentApproved"
  | "DeploymentCompleted"
  | "DeploymentRolledBack"
  | "OperationRecorded"
  | "EvolutionProposed"
  | "MISSION_CREATED"
  | "MISSION_STARTED"
  | "MISSION_PAUSED"
  | "MISSION_RESUMED"
  | "MISSION_CANCELLED"
  | "MISSION_COMPLETED"
  | "MISSION_FAILED"
  | "PLAN_CREATED"
  | "PLAN_APPROVED"
  | "PLAN_REPAIRED"
  | "NODE_READY"
  | "NODE_STARTED"
  | "NODE_COMPLETED"
  | "NODE_FAILED"
  | "NODE_SKIPPED"
  | "NODE_BLOCKED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_DENIED"
  | "OUTPUT_SELECTION_PROPOSED"
  | "OUTPUT_SELECTION_APPROVED"
  | "RECOVERY_APPLIED"
  | "SNAPSHOT_TAKEN";

/**
 * Dual-shape event for 6010 (eventId/eventType) and 6030 (id/type/missionId/source).
 * Optional fields keep existing partial literals compiling during transition.
 */
export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId?: string;
  id?: string;
  type?: DomainEventType;
  eventType?: DomainEventType;
  version?: 1;
  eventVersion?: number;
  occurredAt?: string;
  timestamp?: string;
  aggregateId?: string;
  aggregateType?: string;
  workspaceId?: string;
  missionId?: string;
  correlationId?: string;
  causationId?: string;
  source?: string;
  actor?: { type: "founder" | "system" | "service"; id: string };
  payload: TPayload;
}

/** Operational factory used by PROGRAM 6030 Orchestration Kernel */
export function createDomainEvent(
  type: DomainEventType,
  missionId: string,
  payload: Record<string, unknown>,
  source = "orchestration-kernel"
): DomainEvent {
  const id = `de_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const occurredAt = nowTimestamp();
  return {
    eventId: String(asEventId(id)),
    id,
    type,
    eventType: type,
    version: 1,
    eventVersion: 1,
    occurredAt,
    timestamp: occurredAt,
    aggregateId: missionId,
    aggregateType: "Mission",
    workspaceId: String(asWorkspaceId("workspace:default")),
    missionId,
    correlationId: id,
    causationId: id,
    source,
    actor: { type: "system", id: source },
    payload,
  };
}

/** PROGRAM 6040 — envelope bridge */
export type { DomainEventEnvelope } from "../events/envelope";
export { envelopeFromLegacyDomainEvent, createDomainEventEnvelope } from "../events/envelope";
