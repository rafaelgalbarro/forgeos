/** ForgeOS Runtime Event Bus — public API (Epic 4.0). */

export type {
  RuntimeEventCategory,
  RuntimeEventType,
  RuntimeEventPayloadMap,
  RuntimeEvent,
  RuntimeEventHandler,
  PublishInput,
  RuntimeEventBus,
  RuntimeEventDefinition,
  Unsubscribe,
} from "./types";

export {
  listEventDefinitions,
  getEventDefinition,
  isRegisteredEventType,
  getEventCategory,
  listEventTypesByCategory,
} from "./registry";

export {
  createRuntimeEventBus,
  getSharedRuntimeEventBus,
  resetSharedRuntimeEventBus,
} from "./event-bus";

export {
  validatePublishInput,
  assertValidPublishInput,
  validateRegistryCoverage,
} from "./validator";

export type { ValidationResult } from "./validator";
