/** ForgeOS Platform — shared module exports. */

export type {
  PlatformId,
  VentureId,
  ModuleId,
  PillarId,
  PillarStatus,
  PlatformContext,
  PillarHealthCheck,
  PillarEngine,
  PillarCapability,
  PillarDescriptor,
  AdapterDescriptor,
} from "./types";

export {
  PLATFORM_VERSION,
  PLATFORM_NAME,
  PILLAR_NAMES,
  PILLAR_VERSIONS,
  PILLAR_DESCRIPTIONS,
} from "./constants";

export { PlatformError, PillarNotReadyError, PillarNotFoundError } from "./errors";
export { createPlatformId, createVentureId, isVentureId } from "./ids";
export { nowIso, isScaffold, emptyArray, stubAsync } from "./helpers";
export {
  type PlatformEventType,
  type PlatformEvent,
  type PlatformEventHandler,
  type PlatformEventBus,
  createPlatformEventBus,
} from "./events";
export {
  registerPillar,
  getPillar,
  listPillars,
  clearPillarRegistry,
} from "./registry";
