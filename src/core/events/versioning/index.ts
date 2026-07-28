/** PROGRAM 6040 — Versioning public API */

export {
  DEPRECATED_EVENT_MAPPINGS,
  findDeprecatedMapping,
  isCompatibleVersion,
  upcastDeprecatedEvent,
  upcastMissionStateChangedV1toV2,
  createUpcasterPipeline,
  defaultUpcasterPipeline,
  type Upcaster,
  type DeprecatedEventMapping,
} from "./upcasters";
