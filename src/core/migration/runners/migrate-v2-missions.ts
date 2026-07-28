/**
 * PROGRAM 6070 — Mission migrator (idempotent).
 * Usage: import and call with injected stores; or via scripts/migrate-v2-missions.ts
 */

import { fromLegacyMission, type LegacyMissionLike, type MissionReadDto } from "../adapters/mission-reads";
import { runIdempotentMigrator } from "./types";
import type { DataMigrationReport } from "../types";

export async function migrateMissionsV2(opts: {
  dryRun?: boolean;
  backupPath?: string | null;
  loadLegacy: () => Promise<LegacyMissionLike[]> | LegacyMissionLike[];
  loadV2: () => Promise<MissionReadDto[]> | MissionReadDto[];
  writeV2: (row: MissionReadDto) => Promise<void> | void;
}): Promise<DataMigrationReport> {
  return runIdempotentMigrator<LegacyMissionLike & Record<string, unknown>, MissionReadDto & Record<string, unknown>>({
    component: "mission.reads",
    dryRun: opts.dryRun ?? true,
    backupPath: opts.backupPath ?? null,
    requiredLegacyKeys: ["id"],
    loadLegacy: async () => (await opts.loadLegacy()) as Array<LegacyMissionLike & Record<string, unknown>>,
    loadV2: async () => (await opts.loadV2()) as Array<MissionReadDto & Record<string, unknown>>,
    toV2: (legacy) => fromLegacyMission(legacy) as MissionReadDto & Record<string, unknown>,
    getId: (row) => String((row as { id: string }).id),
    writeV2: (row) => opts.writeV2(row),
    findOrphans: (v2) => v2.filter((r) => !r.id).map((_, i) => `orphan-index-${i}`),
  });
}
