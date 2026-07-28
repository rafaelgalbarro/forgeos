/**
 * PROGRAM 6070 — Decisions migrator (idempotent).
 */

import type { DecisionDto } from "../adapters/decisions";
import { runIdempotentMigrator } from "./types";
import type { DataMigrationReport } from "../types";

export async function migrateDecisionsV2(opts: {
  dryRun?: boolean;
  backupPath?: string | null;
  loadLegacy: () => Promise<DecisionDto[]> | DecisionDto[];
  loadV2: () => Promise<DecisionDto[]> | DecisionDto[];
  writeV2: (row: DecisionDto) => Promise<void> | void;
  knownMissionIds?: Set<string>;
}): Promise<DataMigrationReport> {
  const known = opts.knownMissionIds;
  return runIdempotentMigrator<DecisionDto & Record<string, unknown>, DecisionDto & Record<string, unknown>>({
    component: "decisions",
    dryRun: opts.dryRun ?? true,
    backupPath: opts.backupPath ?? null,
    requiredLegacyKeys: ["id", "missionId", "status"],
    loadLegacy: async () => (await opts.loadLegacy()) as Array<DecisionDto & Record<string, unknown>>,
    loadV2: async () => (await opts.loadV2()) as Array<DecisionDto & Record<string, unknown>>,
    toV2: (legacy) => ({ ...legacy }),
    getId: (row) => String((row as DecisionDto).id),
    writeV2: (row) => opts.writeV2(row),
    findOrphans: (v2) => {
      if (!known) return [];
      return v2.filter((d) => !known.has(d.missionId)).map((d) => d.id);
    },
  });
}
