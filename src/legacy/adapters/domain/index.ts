/** Legacy → canonical domain adapters — PROGRAM 6010 */

export {
  legacyMissionToCanonical,
  legacyMissionSessionToCanonical,
  canonicalMissionToLegacy,
} from "./legacyMissionToCanonical";
export type {
  LegacyMissionLike,
  LegacyMissionSessionLike,
  LegacyMissionMappingGaps,
  LegacyMissionExport,
} from "./legacyMissionToCanonical";

export { legacyArtifactToCanonical } from "./legacyArtifactToCanonical";
export type { LegacyArtifactLike, ArtifactMappingGaps } from "./legacyArtifactToCanonical";

export { legacyOutputToCanonical } from "./legacyOutputToCanonical";
export type { LegacyOutputLike, OutputMappingGaps } from "./legacyOutputToCanonical";

export { legacyBuildToCanonical } from "./legacyBuildToCanonical";
export type { LegacyCodeProjectLike, BuildMappingGaps } from "./legacyBuildToCanonical";
