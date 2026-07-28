/**
 * PROGRAM 6070 — Legacy Migration and Compatibility public API.
 * Zero React. Additive with Programs 6000–6060.
 */

export { MIGRATION_VERSION } from "./types";
export type * from "./types";

export {
  V2_FLAG_KEYS,
  V2_FLAG_DEFAULTS,
  FLAG_MATRICES,
  readV2FeatureFlags,
  isV2FlagEnabled,
  isLegacyOnlyMode,
  describeFlagMatrix,
} from "./feature-flags";
export type { V2FlagKey, V2FeatureFlags } from "./feature-flags";

export {
  MIGRATION_REGISTRY,
  REGISTRY_SEED_COUNT,
  getRegistryEntry,
  listRegistryByStatus,
  registryProgress,
  nextComponentsToMigrate,
} from "./registry";

export { DualReadService, dualReadService } from "./dual-read";
export { DualWriteService, dualWriteService, DEFAULT_DUAL_WRITE_RETIREMENT } from "./dual-write";

export {
  recordFallback,
  recordDivergence,
  recordError,
  recordDualWrite,
  getMigrationTelemetry,
  resetMigrationTelemetry,
  countFallbacks,
  countDivergences,
} from "./telemetry";

export { planRollback, planFullLegacyRollback, flagsForRollback, listRollbackCommands } from "./rollback";

export {
  deprecationAnnotation,
  evaluateDeprecationGates,
  DEPRECATION_MARKERS,
} from "./deprecation";

export { loadMigrationDashboardSummary } from "./dashboard/summary";
export type { MigrationDashboardSummary } from "./dashboard/summary";

export * from "./adapters";
export { migrateMissionsV2 } from "./runners/migrate-v2-missions";
export { migrateDecisionsV2 } from "./runners/migrate-v2-decisions";
export { migrateOutputsV2 } from "./runners/migrate-v2-outputs";
export { runIdempotentMigrator, checksumRecords, schemaCheck } from "./runners/types";
