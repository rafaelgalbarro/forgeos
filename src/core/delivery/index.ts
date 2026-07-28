/** PROGRAM 6050 — Delivery model public API (zero React). */

export const DELIVERY_MODEL_VERSION = "PROGRAM 6050 — ARTIFACT OUTPUT CODEBASE UNIFICATION" as const;

export type * from "./types";
export {
  DELIVERY_PIPELINE,
} from "./types";

export {
  PIPELINE_TRANSITIONS,
  nextStage,
  assertTransition,
  transitionVia,
} from "./pipeline";

export { deliveryId, resetDeliveryIdSeqForTests } from "./ids";

export {
  createArtifactRepository,
  ArtifactQueryService,
  ArtifactDependencyResolver,
  ArtifactVersionService,
  createArtifact,
} from "./artifact/registry";

export {
  createOutputRepository,
  OutputQueryService,
  createCanonicalOutput,
} from "./output/registry";

export {
  adaptCreationOutput,
  adaptCreationOutputs,
  adaptVentureOutput,
  adaptWebsiteOutput,
  adaptWebApplicationOutput,
  adaptMobileApplicationOutput,
  adaptBackendOutput,
  adaptDeploymentOutput,
  KIND_ADAPTER_FNS,
  OUTPUT_KIND_ADAPTERS,
} from "./output/adapters";

export {
  createCodebaseRepository,
  createCanonicalCodebase,
  isCodebaseReady,
} from "./codebase/registry";

export { adaptCodeProject, adaptCodeProjects, shouldReuseCodebase } from "./codebase/adapters";

export {
  createBuildRegistry,
  startBuild,
  isSuccessfulBuild,
  BuildImmutabilityError,
} from "./build/registry";

export {
  createPreviewRegistry,
  createPreview,
  assertPreviewBuildRelation,
  PreviewBuildRelationError,
} from "./preview/registry";

export { adaptPreviewSandbox, adaptSandboxBuildToCanonical } from "./preview/adapters";

export {
  createReleaseRegistry,
  createReleaseDraft,
  ReleaseImmutabilityError,
} from "./release/registry";

export {
  createDeploymentRegistry,
  createDeployment,
  assertDeploymentReleaseRelation,
  describeDeploymentOutcome,
  DeploymentRelationError,
} from "./deployment/registry";

export { adaptPreviewDeployment } from "./deployment/adapters";

export {
  buildVersionLineage,
  answerLineageQuestions,
  findPath,
} from "./lineage/version-graph";

export { analyzeArtifactChange } from "./lineage/change-impact";

export { migrateDeliveryModel, formatMigrationReport } from "./migration/migrator";

export { createDeliveryKernel } from "./kernel";
export type { DeliveryKernel, DeliveryMissionSnapshot } from "./kernel";

export {
  runDeliveryPipelineE2E,
  DELIVERY_E2E_MISSION_ID,
} from "./fixtures/e2e-pipeline";
export type { DeliveryE2EResult } from "./fixtures/e2e-pipeline";
