/** Build Context — public API (Epic 6.0). */

export type {
  BuildContext,
  BuildContextSection,
  BuildContextSectionId,
  BuildContextSectionStatus,
  BuildContextOrigin,
  BuildContextMeta,
  BuildContextHistoryEntry,
  BuildContextMergeResult,
  BuildContextValidationIssue,
  BuildContextSectionValidation,
} from "./types";

export {
  BUILD_CONTEXT_SECTION_ORDER,
  BUILD_CONTEXT_SECTION_LABELS,
} from "./types";

export {
  createEmptyBuildContext,
  computeCompletenessScore,
  refreshBuildContextMeta,
} from "./build-context";

export {
  buildBuildContextFromVenture,
  rebuildBuildContext,
} from "./context-builder";

export {
  validateBuildContext,
  getBuildContextBlockers,
} from "./context-validator";

export {
  mergeBuildContexts,
  mergePartialSection,
} from "./context-merger";

export {
  getBuildContext,
  setBuildContext,
  deleteBuildContext,
  listBuildContexts,
  clearBuildContextStore,
} from "./context-store";

export {
  appendBuildContextHistory,
  getBuildContextHistory,
  clearBuildContextHistory,
} from "./context-history";

export {
  ventureToAdapterInput,
  adaptAllSectionsFromVenture,
} from "./context-adapter";
