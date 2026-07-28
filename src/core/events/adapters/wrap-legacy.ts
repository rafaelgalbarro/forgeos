/**
 * PROGRAM 6040 — Adapt legacy events into DomainEventEnvelope
 * WITHOUT losing originals (originalPayload / sourceEventRef).
 */

import {
  createDomainEventEnvelope,
  type DomainEventEnvelope,
  type JsonValue,
} from "../envelope";

export function wrapLegacyEvent(input: {
  integrationType: string;
  source: string;
  sourceEventId: string;
  occurredAt?: string;
  workspaceId?: string;
  missionId?: string;
  aggregateType?: DomainEventEnvelope["aggregateType"];
  aggregateId?: string;
  actorKind?: DomainEventEnvelope["actor"]["kind"];
  actorId?: string;
  payload: Record<string, unknown>;
  mappedDomainType?: string;
  catalogKind?: DomainEventEnvelope["catalogKind"];
}): DomainEventEnvelope {
  const originalPayload = input.payload as JsonValue;
  return createDomainEventEnvelope({
    eventType: input.mappedDomainType ?? input.integrationType,
    catalogKind: input.catalogKind ?? (input.mappedDomainType ? "domain" : "integration"),
    aggregateType: input.aggregateType ?? "System",
    aggregateId: input.aggregateId ?? input.sourceEventId,
    workspaceId: input.workspaceId ?? "workspace:default",
    missionId: input.missionId,
    actor: {
      kind: input.actorKind ?? "runtime",
      id: input.actorId ?? input.source,
    },
    occurredAt: input.occurredAt,
    payload: {
      source: input.source,
      ...(input.payload as Record<string, JsonValue>),
    },
    metadata: {
      adaptedFrom: input.source,
      integrationType: input.integrationType,
    },
    originalPayload,
    sourceEventRef: `${input.source}:${input.sourceEventId}`,
  });
}
