export * from "./types";

/** PROGRAM 6040 — envelope bridge (additive) */
export type { DomainEventEnvelope } from "../../events/envelope";
export { envelopeFromLegacyDomainEvent, createDomainEventEnvelope } from "../../events/envelope";
