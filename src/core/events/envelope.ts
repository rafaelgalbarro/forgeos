/**
 * PROGRAM 6040 — Canonical Domain Event Envelope
 * Aligns with / extends PROGRAM 6010 domain event shapes.
 * No chain-of-thought fields. Production-safe defaults.
 */

import type { EventId, MissionId, WorkspaceId } from "../domain/shared/ids";
import { asEventId, asMissionId, asWorkspaceId } from "../domain/shared/ids";
import type { IsoTimestamp } from "../domain/shared/value-objects";
import { nowTimestamp } from "../domain/shared/value-objects";
import type { EventCatalogKind } from "./catalog/kinds";

/** Aggregate kinds that emit domain/application events */
export type AggregateType =
  | "Mission"
  | "Output"
  | "Codebase"
  | "Build"
  | "Preview"
  | "Release"
  | "Deployment"
  | "Decision"
  | "ExecutionNode"
  | "Workspace"
  | "Plan"
  | "System";

export type EventActorKind =
  | "founder"
  | "system"
  | "worker"
  | "runtime"
  | "integration"
  | "ui";

export interface EventActor {
  readonly kind: EventActorKind;
  readonly id: string;
  readonly label?: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

/** Safe metadata — no CoT / prompt / secret keys allowed at write time */
export type EventMetadata = Readonly<Record<string, JsonPrimitive>>;

export const FORBIDDEN_PAYLOAD_KEYS = [
  "chainOfThought",
  "chain_of_thought",
  "cot",
  "reasoning",
  "thoughts",
  "rawPrompt",
  "systemPrompt",
  "secret",
  "apiKey",
  "password",
  "token",
] as const;

export interface DomainEventEnvelope<TPayload extends JsonValue = JsonValue> {
  readonly eventId: EventId | string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly catalogKind: EventCatalogKind;
  readonly aggregateType: AggregateType;
  readonly aggregateId: string;
  readonly workspaceId: WorkspaceId | string;
  readonly missionId?: MissionId | string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly actor: EventActor;
  readonly occurredAt: IsoTimestamp | string;
  readonly payload: TPayload;
  readonly metadata: EventMetadata;
  /** Preserve legacy source during transition — never drop original */
  readonly originalPayload?: JsonValue;
  readonly sourceEventRef?: string;
}

export type CreateEnvelopeInput<TPayload extends JsonValue = JsonValue> = {
  eventType: string;
  catalogKind: EventCatalogKind;
  aggregateType: AggregateType;
  aggregateId: string;
  workspaceId: string;
  missionId?: string;
  correlationId?: string;
  causationId?: string;
  actor?: EventActor;
  occurredAt?: string;
  payload: TPayload;
  metadata?: EventMetadata;
  eventVersion?: number;
  eventId?: string;
  originalPayload?: JsonValue;
  sourceEventRef?: string;
};

let envelopeCounter = 0;

function nextEventId(): string {
  envelopeCounter += 1;
  return `cev_${Date.now().toString(36)}_${envelopeCounter.toString(36)}`;
}

export function assertNoSensitiveKeys(
  bag: Record<string, unknown> | null | undefined,
  label: string
): void {
  if (!bag) return;
  for (const key of Object.keys(bag)) {
    const lower = key.toLowerCase();
    for (const forbidden of FORBIDDEN_PAYLOAD_KEYS) {
      if (lower === forbidden.toLowerCase() || lower.includes("chainofthought")) {
        throw new Error(`${label} must not include sensitive/CoT key: ${key}`);
      }
    }
  }
}

export function createDomainEventEnvelope<TPayload extends JsonValue = JsonValue>(
  input: CreateEnvelopeInput<TPayload>
): DomainEventEnvelope<TPayload> {
  if (!input.eventType.trim()) {
    throw new Error("eventType is required");
  }
  if (!input.aggregateId.trim()) {
    throw new Error("aggregateId is required");
  }
  assertNoSensitiveKeys(input.payload as Record<string, unknown>, "payload");
  assertNoSensitiveKeys(input.metadata as Record<string, unknown> | undefined, "metadata");
  if (input.originalPayload && typeof input.originalPayload === "object" && !Array.isArray(input.originalPayload)) {
    assertNoSensitiveKeys(input.originalPayload as Record<string, unknown>, "originalPayload");
  }

  const eventId = input.eventId ? asEventId(input.eventId) : asEventId(nextEventId());
  const correlationId = input.correlationId?.trim() || String(eventId);

  const envelope: DomainEventEnvelope<TPayload> = {
    eventId,
    eventType: input.eventType.trim(),
    eventVersion: input.eventVersion ?? 1,
    catalogKind: input.catalogKind,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId.trim(),
    workspaceId: asWorkspaceId(input.workspaceId),
    missionId: input.missionId ? asMissionId(input.missionId) : undefined,
    correlationId,
    causationId: input.causationId?.trim() || correlationId,
    actor: input.actor ?? { kind: "system", id: "forgeos" },
    occurredAt: (input.occurredAt ?? nowTimestamp()) as IsoTimestamp,
    payload: input.payload,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
    originalPayload: input.originalPayload,
    sourceEventRef: input.sourceEventRef,
  };
  return Object.freeze(envelope);
}

/** Bridge PROGRAM 6010 DomainEventBase / legacy DomainEvent → canonical envelope. */
export function envelopeFromLegacyDomainEvent(legacy: {
  id?: string;
  eventId?: string;
  type?: string;
  eventType?: string;
  missionId?: string;
  aggregateId?: string;
  aggregateType?: string;
  timestamp?: string;
  occurredAt?: string;
  source?: string;
  payload: Record<string, unknown>;
  workspaceId?: string;
  correlationId?: string;
  causationId?: string;
  version?: number;
  eventVersion?: number;
  actor?: { type?: string; kind?: string; id: string };
}): DomainEventEnvelope {
  const eventId = legacy.eventId ?? legacy.id ?? nextEventId();
  const eventType = legacy.eventType ?? legacy.type ?? "UNKNOWN";
  const aggregateId = legacy.aggregateId ?? legacy.missionId ?? eventId;
  return createDomainEventEnvelope({
    eventId,
    eventType,
    eventVersion: legacy.version ?? legacy.eventVersion ?? 1,
    catalogKind: "domain",
    aggregateType: (legacy.aggregateType as AggregateType) || "Mission",
    aggregateId,
    workspaceId: legacy.workspaceId ?? "workspace:default",
    missionId: legacy.missionId,
    correlationId: legacy.correlationId,
    causationId: legacy.causationId,
    actor: legacy.actor
      ? {
          kind: (legacy.actor.kind as EventActorKind) ||
            (legacy.actor.type === "founder"
              ? "founder"
              : legacy.actor.type === "service"
                ? "runtime"
                : "system"),
          id: legacy.actor.id,
        }
      : { kind: "system", id: legacy.source ?? "domain" },
    occurredAt: legacy.occurredAt ?? legacy.timestamp,
    payload: legacy.payload as JsonValue,
    originalPayload: legacy.payload as JsonValue,
    sourceEventRef: `domain:${eventId}`,
    metadata: { legacySource: "program-6010" },
  });
}
