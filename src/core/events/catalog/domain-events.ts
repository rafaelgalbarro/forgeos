/** PROGRAM 6040 — Domain event catalog (business facts).
 * Includes PROGRAM 6010 PascalCase types + operational SCREAMING_SNAKE state events.
 */

export type DomainCatalogEventType = string;

export interface CatalogEntry {
  readonly type: string;
  readonly version: number;
  readonly label: string;
  readonly description: string;
  readonly deprecated?: boolean;
  readonly replacedBy?: string;
}

/** Align with src/core/domain/events/types.ts (PROGRAM 6010) */
const DOMAIN_6010_EVENTS: readonly CatalogEntry[] = [
  { type: "WorkspaceCreated", version: 1, label: "Workspace created", description: "Workspace aggregate created" },
  { type: "WorkspaceUpdated", version: 1, label: "Workspace updated", description: "Workspace updated" },
  { type: "VentureCreated", version: 1, label: "Venture created", description: "Venture created" },
  { type: "VentureStatusChanged", version: 1, label: "Venture status changed", description: "Venture status changed" },
  { type: "MissionCreated", version: 1, label: "Mission created", description: "Mission created" },
  { type: "MissionStatusChanged", version: 1, label: "Mission status changed", description: "Mission status changed" },
  { type: "DecisionProposed", version: 1, label: "Decision proposed", description: "Decision proposed" },
  { type: "DecisionResolved", version: 1, label: "Decision resolved", description: "Decision resolved" },
  { type: "ArtifactCreated", version: 1, label: "Artifact created", description: "Artifact created" },
  { type: "ProductCreated", version: 1, label: "Product created", description: "Product created" },
  { type: "OutputCreated", version: 1, label: "Output created", description: "Output created" },
  { type: "OutputStatusChanged", version: 1, label: "Output status changed", description: "Output status changed" },
  { type: "CodebaseCreated", version: 1, label: "Codebase created", description: "Codebase created" },
  { type: "BuildRequested", version: 1, label: "Build requested", description: "Build requested" },
  { type: "BuildCompleted", version: 1, label: "Build completed", description: "Build completed" },
  { type: "PreviewCreated", version: 1, label: "Preview created", description: "Preview created" },
  { type: "ReleasePrepared", version: 1, label: "Release prepared", description: "Release prepared" },
  { type: "ReleasePublished", version: 1, label: "Release published", description: "Release published" },
  { type: "DeploymentRequested", version: 1, label: "Deployment requested", description: "Deployment requested" },
  { type: "DeploymentCompleted", version: 1, label: "Deployment completed", description: "Deployment completed" },
  { type: "OperationRecorded", version: 1, label: "Operation recorded", description: "Operation recorded" },
  { type: "EvolutionProposed", version: 1, label: "Evolution proposed", description: "Evolution proposed" },
];

/** Operational / orchestration-aligned events (PROGRAM 6030–6040) */
const DOMAIN_OPERATIONAL_EVENTS: readonly CatalogEntry[] = [
  { type: "MISSION_CREATED", version: 1, label: "Mission created", description: "Mission aggregate created" },
  { type: "MISSION_STARTED", version: 1, label: "Mission started", description: "Mission entered active execution" },
  { type: "MISSION_PAUSED", version: 1, label: "Mission paused", description: "Mission paused" },
  { type: "MISSION_RESUMED", version: 1, label: "Mission resumed", description: "Mission resumed" },
  { type: "MISSION_CANCELLED", version: 1, label: "Mission cancelled", description: "Mission cancelled" },
  { type: "MISSION_COMPLETED", version: 1, label: "Mission completed", description: "Mission completed" },
  { type: "MISSION_FAILED", version: 1, label: "Mission failed", description: "Mission failed" },
  { type: "MISSION_STATE_CHANGED", version: 1, label: "Mission state changed", description: "Authorized mission transition" },
  { type: "PLAN_CREATED", version: 1, label: "Plan created", description: "Execution plan created" },
  { type: "PLAN_APPROVED", version: 1, label: "Plan approved", description: "Plan approved" },
  { type: "PLAN_REPAIRED", version: 1, label: "Plan repaired", description: "Plan repaired" },
  { type: "NODE_READY", version: 1, label: "Node ready", description: "Execution node ready" },
  { type: "NODE_STARTED", version: 1, label: "Node started", description: "Execution node started" },
  { type: "NODE_COMPLETED", version: 1, label: "Node completed", description: "Execution node completed" },
  { type: "NODE_FAILED", version: 1, label: "Node failed", description: "Execution node failed" },
  { type: "NODE_SKIPPED", version: 1, label: "Node skipped", description: "Execution node skipped" },
  { type: "NODE_BLOCKED", version: 1, label: "Node blocked", description: "Execution node blocked" },
  { type: "EXECUTION_NODE_STATE_CHANGED", version: 1, label: "Execution node state changed", description: "Authorized node transition" },
  { type: "APPROVAL_REQUESTED", version: 1, label: "Approval requested", description: "Approval requested" },
  { type: "APPROVAL_GRANTED", version: 1, label: "Approval granted", description: "Approval granted" },
  { type: "APPROVAL_DENIED", version: 1, label: "Approval denied", description: "Approval denied" },
  { type: "OUTPUT_SELECTION_PROPOSED", version: 1, label: "Output selection proposed", description: "Output selection proposed" },
  { type: "OUTPUT_SELECTION_APPROVED", version: 1, label: "Output selection approved", description: "Output selection approved" },
  { type: "OUTPUT_STATE_CHANGED", version: 1, label: "Output state changed", description: "Authorized output transition" },
  { type: "CODEBASE_STATE_CHANGED", version: 1, label: "Codebase state changed", description: "Authorized codebase transition" },
  { type: "BUILD_STATE_CHANGED", version: 1, label: "Build state changed", description: "Authorized build transition" },
  { type: "PREVIEW_STATE_CHANGED", version: 1, label: "Preview state changed", description: "Authorized preview transition" },
  { type: "RELEASE_STATE_CHANGED", version: 1, label: "Release state changed", description: "Authorized release transition" },
  { type: "DEPLOYMENT_STATE_CHANGED", version: 1, label: "Deployment state changed", description: "Authorized deployment transition" },
  { type: "DECISION_STATE_CHANGED", version: 1, label: "Decision state changed", description: "Authorized decision transition" },
  { type: "RECOVERY_APPLIED", version: 1, label: "Recovery applied", description: "Recovery applied" },
  { type: "SNAPSHOT_TAKEN", version: 1, label: "Snapshot taken", description: "Snapshot taken" },
  { type: "MISSION_TIMELINE_APPENDED", version: 1, label: "Timeline appended", description: "Timeline entry from real event" },
];

export const DOMAIN_EVENT_CATALOG: readonly CatalogEntry[] = [
  ...DOMAIN_6010_EVENTS,
  ...DOMAIN_OPERATIONAL_EVENTS,
];

export function isDomainCatalogEvent(type: string): boolean {
  return DOMAIN_EVENT_CATALOG.some((e) => e.type === type);
}
