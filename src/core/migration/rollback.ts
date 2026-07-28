/**
 * PROGRAM 6070 — Rollback helpers.
 * Each registry entry defines trigger/scope/impact/command/validation/limitations.
 */

import { V2_FLAG_DEFAULTS, type V2FeatureFlags } from "./feature-flags";
import { getRegistryEntry, MIGRATION_REGISTRY } from "./registry";
import type { MigrationComponentId } from "./types";

export interface RollbackPlanResult {
  component: MigrationComponentId;
  ok: boolean;
  flagsToApply: Partial<V2FeatureFlags>;
  steps: string[];
  validation: string;
  limitations: string;
  messages: string[];
}

/** Map components to the minimal flag set that must be OFF for safe rollback. */
export function flagsForRollback(component: MigrationComponentId): Partial<V2FeatureFlags> {
  switch (component) {
    case "mission.reads":
    case "outputs":
      return { ENABLE_V2_QUERIES: false };
    case "mission.commands":
    case "decisions":
    case "artifacts":
      return { ENABLE_V2_COMMANDS: false };
    case "codebases":
      return { ENABLE_V2_STUDIO: false, ENABLE_V2_QUERIES: false };
    case "builds":
      return { ENABLE_V2_ORCHESTRATION: false };
    case "previews":
    case "deployments":
      return { ENABLE_V2_ORCHESTRATION: false, ENABLE_V2_COMMANDS: false };
    case "company.overview":
      return { ENABLE_V2_COMPANY_OS: false };
    default:
      return { ...V2_FLAG_DEFAULTS };
  }
}

/**
 * Plan (dry) rollback for a component — does not mutate env.
 * Operators apply flags via .env / deployment config.
 */
export function planRollback(component: MigrationComponentId): RollbackPlanResult {
  const entry = getRegistryEntry(component);
  if (!entry) {
    return {
      component,
      ok: false,
      flagsToApply: {},
      steps: [],
      validation: "",
      limitations: "",
      messages: [`Unknown component: ${component}`],
    };
  }

  const flagsToApply = flagsForRollback(component);
  const steps = [
    `Set flags: ${Object.entries(flagsToApply)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `Trigger: ${entry.rollback.trigger}`,
    `Scope: ${entry.rollback.scope}`,
    `Run: ${entry.rollback.rollbackCommand}`,
    `Validate: ${entry.rollback.validation}`,
  ];

  return {
    component,
    ok: true,
    flagsToApply,
    steps,
    validation: entry.rollback.validation,
    limitations: entry.rollback.limitations,
    messages: [
      `Rollback planned for ${component} (status=${entry.status})`,
      `Data impact: ${entry.rollback.dataImpact}`,
    ],
  };
}

/** Emergency: all V2 flags off — documented full-platform rollback. */
export function planFullLegacyRollback(): RollbackPlanResult {
  return {
    component: "mission.reads",
    ok: true,
    flagsToApply: { ...V2_FLAG_DEFAULTS },
    steps: [
      "Set all ENABLE_V2_* flags to false in .env",
      "Restart Node/Next process",
      "Smoke main routes: /, /mission-control, /studio, /admin",
      "Confirm migration dashboard shows legacy-only mode",
    ],
    validation: "isLegacyOnlyMode() === true; registry consumers still import legacy barrels",
    limitations: "Does not delete V2 data stores; additive V2 rows remain but are unread",
    messages: ["Full legacy rollback planned for all registry components"],
  };
}

export function listRollbackCommands(): Array<{ component: MigrationComponentId; command: string }> {
  return MIGRATION_REGISTRY.map((e) => ({
    component: e.component,
    command: e.rollback.rollbackCommand,
  }));
}
