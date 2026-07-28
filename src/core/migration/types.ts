/**
 * PROGRAM 6070 — Legacy Migration and Compatibility types.
 * Pure TypeScript. No React.
 */

export const MIGRATION_VERSION = "PROGRAM 6070 — LEGACY MIGRATION AND COMPATIBILITY" as const;

/** Strangler migration status ladder (never skip evidence). */
export type MigrationStatus =
  | "NOT_STARTED"
  | "ADAPTER_READY"
  | "DUAL_READ"
  | "DUAL_WRITE"
  | "V2_PRIMARY"
  | "LEGACY_READ_ONLY"
  | "DEPRECATED"
  | "REMOVED";

/** Flows A–J from PROGRAM 6070. */
export type StranglerFlowId =
  | "A_MISSION_READS"
  | "B_MISSION_COMMANDS"
  | "C_DECISIONS"
  | "D_ARTIFACTS"
  | "E_OUTPUTS"
  | "F_CODEBASES"
  | "G_BUILDS"
  | "H_PREVIEWS"
  | "I_DEPLOYMENTS"
  | "J_COMPANY_OVERVIEW";

export type MigrationComponentId =
  | "mission.reads"
  | "mission.commands"
  | "decisions"
  | "artifacts"
  | "outputs"
  | "codebases"
  | "builds"
  | "previews"
  | "deployments"
  | "company.overview";

export interface RollbackPlan {
  trigger: string;
  scope: string;
  dataImpact: string;
  rollbackCommand: string;
  validation: string;
  limitations: string;
}

export interface MigrationRegistryEntry {
  component: MigrationComponentId;
  flow: StranglerFlowId;
  label: string;
  currentContract: string;
  v2Contract: string;
  adapter: string;
  status: MigrationStatus;
  consumers: string[];
  rollback: RollbackPlan;
  owner: string;
  evidence: string[];
  notes?: string;
}

export type ReadSource = "v2" | "legacy" | "none";

export interface DualReadResult<T> {
  value: T | null;
  source: ReadSource;
  fallbackUsed: boolean;
  inconsistency: string | null;
  component: MigrationComponentId;
  at: string;
}

export interface DualWriteResult {
  component: MigrationComponentId;
  v2Success: boolean;
  legacySuccess: boolean;
  divergence: string | null;
  retried: boolean;
  repaired: boolean;
  at: string;
  retirementCondition: string;
}

export interface FallbackEvent {
  component: MigrationComponentId;
  reason: string;
  at: string;
  details?: string;
}

export interface DivergenceEvent {
  component: MigrationComponentId;
  kind: "read" | "write";
  message: string;
  at: string;
  v2Summary?: string;
  legacySummary?: string;
}

export interface MigrationTelemetrySnapshot {
  fallbacks: FallbackEvent[];
  divergences: DivergenceEvent[];
  errors: Array<{ component: MigrationComponentId; message: string; at: string }>;
  dualWriteLog: DualWriteResult[];
}

export interface DataMigrationPreCheck {
  backupPath: string | null;
  legacyCount: number;
  legacyChecksum: string;
  schemaOk: boolean;
  schemaNotes: string[];
}

export interface DataMigrationPostCheck {
  v2Count: number;
  v2Checksum: string;
  relationshipOk: boolean;
  orphans: string[];
  notes: string[];
}

export interface DataMigrationReport {
  component: MigrationComponentId;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  pre: DataMigrationPreCheck;
  post: DataMigrationPostCheck;
  migrated: number;
  skipped: number;
  failed: number;
  idempotent: boolean;
  ok: boolean;
  messages: string[];
}
