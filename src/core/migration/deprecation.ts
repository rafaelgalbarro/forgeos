/**
 * PROGRAM 6070 — Deprecation markers (no delete until gates pass).
 *
 * Gates before REMOVED:
 * 1. Zero consumers (registry.consumers empty + import scan)
 * 2. Data migrated + checksum parity
 * 3. Tests green for V2-only path
 * 4. Observability shows zero legacy traffic
 * 5. Rollback proven in drill
 *
 * See docs/architecture-v2/migration/deprecation.md and DEPRECATION.md.
 */

import type { MigrationComponentId, MigrationStatus } from "./types";
import { getRegistryEntry } from "./registry";

export interface DeprecationGateResult {
  component: MigrationComponentId;
  canDeprecate: boolean;
  canRemove: boolean;
  blockers: string[];
}

/** Annotate a symbol in docs / comments — keep as runtime metadata too. */
export function deprecationAnnotation(
  component: MigrationComponentId,
  replacement: string,
  since = "PROGRAM 6070",
): string {
  return `@deprecated ${since} — ${component}: prefer ${replacement}. Do not delete until deprecation gates pass (see DEPRECATION.md).`;
}

export function evaluateDeprecationGates(
  component: MigrationComponentId,
  opts?: {
    consumerCount?: number;
    dataMigrated?: boolean;
    testsPass?: boolean;
    observabilityClear?: boolean;
    rollbackProven?: boolean;
  },
): DeprecationGateResult {
  const entry = getRegistryEntry(component);
  const blockers: string[] = [];
  if (!entry) {
    return { component, canDeprecate: false, canRemove: false, blockers: ["unknown component"] };
  }

  const consumerCount = opts?.consumerCount ?? entry.consumers.length;
  if (consumerCount > 0) blockers.push(`consumers_remaining=${consumerCount}`);
  if (!opts?.dataMigrated) blockers.push("data_not_migrated");
  if (!opts?.testsPass) blockers.push("tests_not_proven");
  if (!opts?.observabilityClear) blockers.push("observability_not_clear");
  if (!opts?.rollbackProven) blockers.push("rollback_not_proven");

  const statusOkForDeprecate: MigrationStatus[] = ["V2_PRIMARY", "LEGACY_READ_ONLY", "DEPRECATED"];
  if (!statusOkForDeprecate.includes(entry.status) && entry.status !== "REMOVED") {
    blockers.push(`status_not_ready=${entry.status}`);
  }

  const canDeprecate =
    (blockers.filter((b) => !b.startsWith("consumers_")).length === 0) ||
    Boolean(opts?.dataMigrated && opts?.testsPass && opts?.observabilityClear && opts?.rollbackProven);

  // Strict remove requires zero consumers + all gates.
  const canRemove =
    consumerCount === 0 &&
    !!opts?.dataMigrated &&
    !!opts?.testsPass &&
    !!opts?.observabilityClear &&
    !!opts?.rollbackProven;

  return {
    component,
    canDeprecate: Boolean(canDeprecate && consumerCount === 0),
    canRemove,
    blockers: canRemove ? [] : blockers,
  };
}

/** Marker constant for grep / DEPRECATION.md sync. */
export const DEPRECATION_MARKERS = {
  header: "<!-- DEPRECATION:PROGRAM_6070 -->",
  legacyMissionPersistence: deprecationAnnotation(
    "mission.reads",
    "src/core/domain/mission repository + DualReadService",
  ),
  legacyDecisionCenter: deprecationAnnotation(
    "decisions",
    "src/core/domain/decision + DualWriteService",
  ),
} as const;
