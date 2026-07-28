/**
 * Canonical domain events — PROGRAM 6010 (+ 6030 operational aliases).
 *
 * - DomainEventBase / createCanonicalDomainEvent: 6010 PascalCase envelope
 * - DomainEvent / createDomainEvent(type, missionId, payload): 6030 kernel helper
 */

import { asEventId, asWorkspaceId, type EventId, type WorkspaceId } from "../shared/ids";
import { nowTimestamp, type IsoTimestamp } from "../shared/value-objects";

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
  | "MISSION_STATE_CHANGED"
  | "PLAN_CREATED"
  | "PLAN_APPROVED"
  | "PLAN_REPAIRED"
  | "NODE_READY"
  | "NODE_STARTED"
  | "NODE_COMPLETED"
  | "NODE_FAILED"
  | "NODE_SKIPPED"
  | "NODE_BLOCKED"
  | "EXECUTION_NODE_STATE_CHANGED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_DENIED"
  | "OUTPUT_SELECTION_PROPOSED"
  | "OUTPUT_SELECTION_APPROVED"
  | "OUTPUT_STATE_CHANGED"
  | "CODEBASE_STATE_CHANGED"
  | "BUILD_STATE_CHANGED"
  | "PREVIEW_STATE_CHANGED"
  | "RELEASE_STATE_CHANGED"
  | "DEPLOYMENT_STATE_CHANGED"
  | "DECISION_STATE_CHANGED"
  | "RECOVERY_APPLIED"
  | "SNAPSHOT_TAKEN"
  | "MISSION_TIMELINE_APPENDED";

export type DomainEventActor = Readonly<{
  type: "founder" | "system" | "service";
  id: string;
}>;

export type DomainEventBase<
  TType extends DomainEventType = DomainEventType,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> = Readonly<{
  eventId: EventId;
  eventType: TType;
  version: 1;
  aggregateId: string;
  workspaceId: WorkspaceId;
  occurredAt: IsoTimestamp;
  actor: DomainEventActor;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
}>;

export type CreateDomainEventInput<TPayload extends Record<string, unknown>> = Readonly<{
  eventId: string;
  eventType: DomainEventType;
  aggregateId: string;
  workspaceId: WorkspaceId;
  actor: DomainEventActor;
  payload: TPayload;
  correlationId?: string;
  causationId?: string;
  occurredAt?: IsoTimestamp;
}>;

export function createCanonicalDomainEvent<TPayload extends Record<string, unknown>>(
  input: CreateDomainEventInput<TPayload>
): DomainEventBase<DomainEventType, TPayload> {
  return {
    eventId: asEventId(input.eventId),
    eventType: input.eventType,
    version: 1,
    aggregateId: input.aggregateId,
    workspaceId: input.workspaceId,
    occurredAt: input.occurredAt ?? nowTimestamp(),
    actor: input.actor,
    correlationId: input.correlationId,
    causationId: input.causationId,
    payload: input.payload,
  };
}

/** @deprecated Prefer createCanonicalDomainEvent for object-form 6010 events */
export const createDomainEventObject = createCanonicalDomainEvent;

/**
 * Dual-shape event used by 6020 compat stubs and 6030 kernel.
 * Optional dual fields keep stub literals assignable.
 */
export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  type: DomainEventType;
  occurredAt: string;
  aggregateId: string;
  aggregateType: string;
  payload: TPayload;
  id?: string;
  eventType?: DomainEventType;
  version?: 1;
  eventVersion?: 1;
  timestamp?: string;
  workspaceId?: string;
  missionId?: string;
  correlationId?: string;
  causationId?: string;
  source?: string;
  actor?: DomainEventActor;
}

/** Normalize a partial stub event into a dual-shape DomainEvent */
export function asDomainEvent(
  partial: {
    eventId: string;
    type: DomainEventType;
    occurredAt: string;
    aggregateId: string;
    aggregateType: string;
    workspaceId?: string;
    missionId?: string;
    payload: Record<string, unknown>;
  }
): DomainEvent {
  return {
    ...partial,
    id: partial.eventId,
    eventType: partial.type,
    version: 1,
    eventVersion: 1,
    timestamp: partial.occurredAt,
    source: "domain",
    actor: { type: "system", id: "domain" },
  };
}

/** Operational factory used by PROGRAM 6030 Orchestration Kernel */
export function createDomainEvent(
  type: DomainEventType,
  missionId: string,
  payload: Record<string, unknown> = {},
  source = "orchestration-kernel"
): DomainEvent {
  const id = `de_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const occurredAt = nowTimestamp();
  return {
    eventId: asEventId(id) as string,
    id,
    type,
    eventType: type,
    version: 1,
    eventVersion: 1,
    occurredAt,
    timestamp: occurredAt,
    aggregateId: missionId,
    aggregateType: "Mission",
    workspaceId: asWorkspaceId("workspace:default") as string,
    missionId,
    correlationId: id,
    causationId: id,
    source,
    actor: { type: "system", id: source },
    payload,
  };
}

export function serializeDomainEvent(event: DomainEventBase): DomainEventBase {
  return {
    ...event,
    actor: { ...event.actor },
    payload: { ...event.payload },
  };
}
