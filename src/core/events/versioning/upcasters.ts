/**
 * PROGRAM 6040 — Event versioning, upcasters, compatibility, deprecated mapping
 */

import type { DomainEventEnvelope, JsonValue } from "../envelope";
import { createDomainEventEnvelope } from "../envelope";

export type Upcaster = (event: DomainEventEnvelope) => DomainEventEnvelope;

export interface DeprecatedEventMapping {
  readonly deprecatedType: string;
  readonly deprecatedVersion: number;
  readonly canonicalType: string;
  readonly canonicalVersion: number;
}

export const DEPRECATED_EVENT_MAPPINGS: readonly DeprecatedEventMapping[] = [
  {
    deprecatedType: "VENTURE_STATE_CHANGED",
    deprecatedVersion: 1,
    canonicalType: "MISSION_STATE_CHANGED",
    canonicalVersion: 1,
  },
  {
    deprecatedType: "BUILD_COMPLETED",
    deprecatedVersion: 1,
    canonicalType: "BUILD_STATE_CHANGED",
    canonicalVersion: 1,
  },
  {
    deprecatedType: "TASK_COMPLETED",
    deprecatedVersion: 1,
    canonicalType: "EXECUTION_NODE_STATE_CHANGED",
    canonicalVersion: 1,
  },
];

export function findDeprecatedMapping(
  eventType: string,
  version: number
): DeprecatedEventMapping | undefined {
  return DEPRECATED_EVENT_MAPPINGS.find(
    (m) => m.deprecatedType === eventType && m.deprecatedVersion === version
  );
}

/** Compatibility: same type, version N can read versions <= N when upcasters exist or versions equal */
export function isCompatibleVersion(
  eventVersion: number,
  readerVersion: number,
  hasUpcaster: boolean
): boolean {
  if (eventVersion === readerVersion) return true;
  if (eventVersion < readerVersion && hasUpcaster) return true;
  return false;
}

export function upcastDeprecatedEvent(event: DomainEventEnvelope): DomainEventEnvelope {
  const mapping = findDeprecatedMapping(event.eventType, event.eventVersion);
  if (!mapping) return event;
  return createDomainEventEnvelope({
    eventId: String(event.eventId),
    eventType: mapping.canonicalType,
    eventVersion: mapping.canonicalVersion,
    catalogKind: "domain",
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    workspaceId: String(event.workspaceId),
    missionId: event.missionId ? String(event.missionId) : undefined,
    correlationId: event.correlationId,
    causationId: event.causationId,
    actor: event.actor,
    occurredAt: String(event.occurredAt),
    payload: {
      ...(typeof event.payload === "object" && event.payload && !Array.isArray(event.payload)
        ? (event.payload as Record<string, JsonValue>)
        : { value: event.payload }),
      upcastFrom: event.eventType,
      upcastFromVersion: event.eventVersion,
    },
    metadata: { ...event.metadata, upcast: true },
    originalPayload: event.originalPayload ?? event.payload,
    sourceEventRef: event.sourceEventRef ?? `deprecated:${event.eventType}:${event.eventId}`,
  });
}

/** Example payload shape evolution: v1 { status } → v2 { from, to, status } */
export function upcastMissionStateChangedV1toV2(event: DomainEventEnvelope): DomainEventEnvelope {
  if (event.eventType !== "MISSION_STATE_CHANGED" || event.eventVersion !== 1) return event;
  const payload = (event.payload ?? {}) as Record<string, JsonValue>;
  if ("from" in payload && "to" in payload) {
    return createDomainEventEnvelope({
      ...toCreateInput(event),
      eventVersion: 2,
      payload: { ...payload },
    });
  }
  const status = String(payload.status ?? payload.to ?? "UNKNOWN");
  return createDomainEventEnvelope({
    ...toCreateInput(event),
    eventVersion: 2,
    payload: {
      from: payload.from ?? "UNKNOWN",
      to: status,
      status,
    },
    originalPayload: event.payload,
  });
}

function toCreateInput(event: DomainEventEnvelope) {
  return {
    eventId: String(event.eventId),
    eventType: event.eventType,
    catalogKind: event.catalogKind,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    workspaceId: String(event.workspaceId),
    missionId: event.missionId ? String(event.missionId) : undefined,
    correlationId: event.correlationId,
    causationId: event.causationId,
    actor: event.actor,
    occurredAt: String(event.occurredAt),
    payload: event.payload,
    metadata: event.metadata,
    originalPayload: event.originalPayload,
    sourceEventRef: event.sourceEventRef,
  };
}

export function createUpcasterPipeline(upcasters: readonly Upcaster[]): Upcaster {
  return (event) => upcasters.reduce((acc, fn) => fn(acc), event);
}

export const defaultUpcasterPipeline = createUpcasterPipeline([
  upcastDeprecatedEvent,
  upcastMissionStateChangedV1toV2,
]);
