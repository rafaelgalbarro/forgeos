/**
 * PROGRAM 6040 — Unified Event and State Model public API
 * Zero React/Next imports in this module tree (adapters may reference lib types only).
 */

export const EVENTS_VERSION = "PROGRAM 6040 — UNIFIED EVENT AND STATE MODEL" as const;

export {
  createDomainEventEnvelope,
  envelopeFromLegacyDomainEvent,
  assertNoSensitiveKeys,
  FORBIDDEN_PAYLOAD_KEYS,
  type DomainEventEnvelope,
  type AggregateType,
  type EventActor,
  type EventActorKind,
  type EventMetadata,
  type JsonValue,
  type JsonPrimitive,
  type CreateEnvelopeInput,
} from "./envelope";

export * from "./catalog";
export * from "./state-machines";
export * from "./transition";
export * from "./store";
export * from "./projections";
export * from "./idempotency";
export * from "./versioning";
export * from "./observability";
export * from "./timeline";
export * from "./bus";
export * from "./adapters";
