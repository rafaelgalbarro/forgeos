/**
 * PROGRAM 6070 — Server-safe migration dashboard summary loader.
 * No React — safe for RSC page loaders.
 */

import { readV2FeatureFlags, isLegacyOnlyMode, FLAG_MATRICES } from "../feature-flags";
import { MIGRATION_REGISTRY, nextComponentsToMigrate, registryProgress, REGISTRY_SEED_COUNT } from "../registry";
import { getMigrationTelemetry } from "../telemetry";
import { MIGRATION_VERSION } from "../types";

export interface MigrationDashboardSummary {
  version: typeof MIGRATION_VERSION;
  seedCount: number;
  legacyOnly: boolean;
  flags: ReturnType<typeof readV2FeatureFlags>;
  progress: ReturnType<typeof registryProgress>;
  components: Array<{
    component: string;
    label: string;
    status: string;
    flow: string;
    adapter: string;
  }>;
  next: Array<{ component: string; label: string; status: string }>;
  telemetry: {
    fallbackCount: number;
    divergenceCount: number;
    errorCount: number;
    dualWriteCount: number;
    recentFallbacks: ReturnType<typeof getMigrationTelemetry>["fallbacks"];
    recentDivergences: ReturnType<typeof getMigrationTelemetry>["divergences"];
    recentErrors: ReturnType<typeof getMigrationTelemetry>["errors"];
  };
  matrices: typeof FLAG_MATRICES;
}

export function loadMigrationDashboardSummary(): MigrationDashboardSummary {
  const telemetry = getMigrationTelemetry();
  const progress = registryProgress();
  return {
    version: MIGRATION_VERSION,
    seedCount: REGISTRY_SEED_COUNT,
    legacyOnly: isLegacyOnlyMode(),
    flags: readV2FeatureFlags(),
    progress,
    components: MIGRATION_REGISTRY.map((e) => ({
      component: e.component,
      label: e.label,
      status: e.status,
      flow: e.flow,
      adapter: e.adapter,
    })),
    next: nextComponentsToMigrate(3).map((e) => ({
      component: e.component,
      label: e.label,
      status: e.status,
    })),
    telemetry: {
      fallbackCount: telemetry.fallbacks.length,
      divergenceCount: telemetry.divergences.length,
      errorCount: telemetry.errors.length,
      dualWriteCount: telemetry.dualWriteLog.length,
      recentFallbacks: telemetry.fallbacks.slice(-10),
      recentDivergences: telemetry.divergences.slice(-10),
      recentErrors: telemetry.errors.slice(-10),
    },
    matrices: FLAG_MATRICES,
  };
}
