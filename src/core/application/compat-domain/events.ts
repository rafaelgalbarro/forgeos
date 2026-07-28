/**
 * Compat re-export of domain events for Program 6020 stubs.
 */

export type {
  DomainEvent,
  DomainEventType,
  DomainEventActor,
  DomainEventBase,
  CreateDomainEventInput,
} from "../../domain/events/types";

export {
  createDomainEvent,
  createCanonicalDomainEvent,
  asDomainEvent,
  serializeDomainEvent,
} from "../../domain/events/types";

export type { DomainEventEnvelope } from "../../events/envelope";
export { envelopeFromLegacyDomainEvent, createDomainEventEnvelope } from "../../events/envelope";
