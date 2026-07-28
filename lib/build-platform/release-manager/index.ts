/** Release Manager — public API (Epic 6.8). */

export type {
  ReleasePackage,
  ReleaseStatus,
  SemanticVersion,
  ReleaseArtifacts,
  ReleaseArtifactRef,
  ReleaseArtifactType,
  ReleaseDocumentation,
  EnvironmentChecklistItem,
  QualityGateResult,
  QualityGateStatus,
  ApprovalWorkflowState,
  ApprovalStep,
  RollbackPlan,
  RollbackStep,
  RollbackRiskLevel,
  ReleaseNotes,
  DeploymentChecklistItem,
  ReleaseTimelineEvent,
  ReleaseValidationResult,
  ReleaseValidationIssue,
  BuildReleasePackageInput,
  ReleaseBuildContext,
} from "./types";

export { createReleaseManager, type ReleaseManager } from "./release-manager";
export { buildReleasePackage } from "./release-builder";
export { collectReleaseArtifacts } from "./release-artifacts";
export { evaluateQualityGates, allBlockingGatesPassed } from "./quality-gates";
export { createApprovalWorkflow, resolveInitialStatus, RELEASE_STATUS_LABELS } from "./approval-workflow";
export { buildRollbackPlan } from "./rollback-plan";
export { buildReleaseNotes } from "./release-notes";
export { buildDeploymentChecklist } from "./release-checklist";
export { buildReleaseTimeline } from "./release-timeline";
export { validateReleasePackage } from "./release-validator";
export {
  parseSemanticVersion,
  formatSemanticVersion,
  createInitialVersion,
  bumpMajor,
  bumpMinor,
  bumpPatch,
  withPrerelease,
  withBuildMetadata,
  compareSemanticVersions,
} from "./release-versioning";
