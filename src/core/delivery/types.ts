/**
 * PROGRAM 6050 — Canonical delivery model contracts.
 * Artifact ≠ Output ≠ Codebase ≠ Build ≠ Preview ≠ Release ≠ Deployment
 * Zero React. No merging of distinct pipeline stages.
 */

export const DELIVERY_MODEL_VERSION =
  "PROGRAM 6050 — ARTIFACT OUTPUT CODEBASE UNIFICATION" as const;

export const DELIVERY_PIPELINE = [
  "Artifact",
  "Output",
  "Codebase",
  "Build",
  "Preview",
  "Release",
  "Deployment",
] as const;

export type DeliveryStage = (typeof DELIVERY_PIPELINE)[number];

export type ArtifactKind =
  | "DOCUMENT"
  | "KNOWLEDGE"
  | "PRODUCT_SPEC"
  | "DESIGN"
  | "DECISION"
  | "TEMPLATE"
  | "OTHER";

export type ArtifactStatus =
  | "DRAFT"
  | "READY"
  | "SUPERSEDED"
  | "ARCHIVED"
  | "INVALID";

export type OutputKind =
  | "VENTURE_OUTPUT"
  | "WEBSITE_OUTPUT"
  | "WEB_APPLICATION_OUTPUT"
  | "MOBILE_APPLICATION_OUTPUT"
  | "BACKEND_OUTPUT"
  | "DEPLOYMENT_OUTPUT";

export type OutputStatus =
  | "DRAFT"
  | "GENERATING"
  | "PREVIEW_READY"
  | "VALIDATING"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "EXPORT_READY"
  | "DEPLOYMENT_READY"
  | "FAILED";

export type CodebaseStatus =
  | "DRAFT"
  | "GENERATING"
  | "GENERATED"
  | "VALIDATING"
  | "INVALID"
  | "READY_FOR_PREVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "FAILED";

export type BuildResult =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "CANCELLED";

export type PreviewType = "VISUAL" | "LOCAL_SANDBOX" | "REMOTE_PREVIEW";

export type PreviewStatus =
  | "PENDING"
  | "READY"
  | "DEGRADED"
  | "FAILED"
  | "STOPPED"
  | "EXPIRED";

export type ReleaseStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "ROLLED_BACK";

export type DeploymentEnvironment =
  | "LOCAL"
  | "SANDBOX"
  | "PREVIEW"
  | "STAGING"
  | "PRODUCTION";

export type DeploymentStatus =
  | "DRAFT"
  | "PLANNED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "READY"
  | "FAILED"
  | "ROLLED_BACK"
  | "CANCELLED";

export type MigrationDisposition =
  | "migrated"
  | "compatible"
  | "incomplete"
  | "conflict"
  | "orphaned"
  | "manual_review";

export interface DeliveryRef {
  id: string;
  stage: DeliveryStage;
  version?: string;
  label?: string;
}

export interface ValidationSummary {
  passed: boolean;
  score?: number;
  checks: { id: string; label: string; status: "pass" | "fail" | "warn" | "skip"; detail?: string }[];
  validatedAt?: string;
}

export interface ApprovalRecord {
  id: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  approvedBy?: string;
  note?: string;
}

export interface CanonicalArtifact {
  artifactId: string;
  missionId: string;
  ventureId?: string;
  kind: ArtifactKind;
  title: string;
  status: ArtifactStatus;
  version: string;
  contentRef?: string;
  dependencyIds: string[];
  sourceKnowledgeIds: string[];
  checksum?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  legacySource?: { system: string; id: string };
  previousVersionId?: string;
}

export interface CanonicalOutput {
  outputId: string;
  missionId: string;
  ventureId?: string;
  kind: OutputKind;
  title: string;
  status: OutputStatus;
  version: string;
  sourceArtifactIds: string[];
  previewMode?: string;
  previewUrl?: string;
  validation?: ValidationSummary;
  approvals: ApprovalRecord[];
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  legacySource?: { system: "creation-output"; id: string; type: OutputKind };
  previousVersionId?: string;
}

export interface CodebaseFile {
  path: string;
  language: string;
  content: string;
  purpose: string;
  checksum: string;
  sourceArtifactIds: string[];
  sizeBytes?: number;
}

export interface CanonicalCodebase {
  codebaseId: string;
  missionId: string;
  ventureId?: string;
  outputId?: string;
  name: string;
  slug: string;
  version: string;
  status: CodebaseStatus;
  framework: string;
  language: string;
  packageManager: "npm" | "pnpm" | "yarn";
  templateId?: string;
  files: CodebaseFile[];
  directories: { path: string; purpose?: string }[];
  dependencies: { name: string; version: string; dev?: boolean }[];
  scripts: { name: string; command: string; purpose?: string }[];
  environmentVariables: {
    key: string;
    description: string;
    example: string;
    required: boolean;
    secret?: boolean;
  }[];
  sourceArtifactIds: string[];
  validation?: ValidationSummary;
  checksums: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  legacySource?: { system: "code-generation"; id: string };
  previousVersionId?: string;
}

export interface CanonicalBuild {
  buildId: string;
  missionId: string;
  codebaseId: string;
  codebaseVersion: string;
  environment: string;
  commands: string[];
  logsRef?: string;
  result: BuildResult;
  validation?: ValidationSummary;
  durationMs?: number;
  resourceUse?: {
    cpuPercent?: number;
    memoryMb?: number;
    diskMb?: number;
  };
  createdAt: string;
  completedAt?: string;
  /** Immutable — never overwritten after completion */
  immutable: true;
  legacySource?: { system: string; id: string };
}

export interface CanonicalPreview {
  previewId: string;
  missionId: string;
  /** Exactly one Build, unless VISUAL non-executable explicitly marked */
  buildId?: string;
  type: PreviewType;
  status: PreviewStatus;
  visualNonExecutable?: boolean;
  previewUrl?: string;
  sandboxId?: string;
  createdAt: string;
  updatedAt: string;
  legacySource?: { system: "preview-runtime"; id: string };
}

export interface CanonicalRelease {
  releaseId: string;
  missionId: string;
  version: string;
  status: ReleaseStatus;
  outputIds: string[];
  codebaseVersions: { codebaseId: string; version: string }[];
  buildIds: string[];
  approval?: ApprovalRecord;
  changelog: string[];
  validation?: ValidationSummary;
  rollbackRefs: string[];
  createdAt: string;
  publishedAt?: string;
  /** Immutable once published */
  immutable: boolean;
  legacySource?: { system: string; id: string };
}

export interface CanonicalDeployment {
  deploymentId: string;
  missionId: string;
  releaseId: string;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  dryRun: boolean;
  /** Real execution flag — dry-run must never set this true */
  realExecution: boolean;
  governed: boolean;
  approval?: ApprovalRecord;
  previewUrl?: string;
  logs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  legacySource?: { system: "preview-deployment"; id: string };
}

export interface LineageNode {
  stage: DeliveryStage;
  id: string;
  version?: string;
  label?: string;
  status?: string;
}

export interface VersionLineage {
  missionId: string;
  artifacts: LineageNode[];
  outputs: LineageNode[];
  codebases: LineageNode[];
  builds: LineageNode[];
  previews: LineageNode[];
  releases: LineageNode[];
  deployments: LineageNode[];
  edges: { from: string; to: string; relation: string }[];
}

export interface ChangePlan {
  planId: string;
  missionId: string;
  changedArtifactId: string;
  affectedOutputIds: string[];
  affectedCodebaseIds: string[];
  invalidate: boolean;
  approvalRequired: boolean;
  rationale: string[];
  createdAt: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "executed";
}

export interface MigrationItemReport {
  legacyId: string;
  legacySystem: string;
  disposition: MigrationDisposition;
  canonicalId?: string;
  notes?: string;
}

export interface MigrationReport {
  program: typeof DELIVERY_MODEL_VERSION;
  startedAt: string;
  finishedAt: string;
  counts: Record<MigrationDisposition, number>;
  items: MigrationItemReport[];
}
