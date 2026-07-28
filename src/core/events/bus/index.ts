/** PROGRAM 6040 — Canonical bus public API (wraps existing buses; not a replacement) */

export {
  createCanonicalEventBus,
  getSharedCanonicalEventBus,
  resetSharedCanonicalEventBus,
  createStateChangedEnvelope,
  type CanonicalEventBus,
  type CanonicalEventHandler,
  type CanonicalEventBusOptions,
  type Unsubscribe,
} from "./canonical-bus";
