/**
 * PROGRAM 6070 — Outputs migrator (idempotent).
 */

import type { OutputDto } from "../adapters/outputs";
import { runIdempotentMigrator } from "./types";
import type { DataMigrationReport } from "../types";

export async function migrateOutputsV2(opts: {
  dryRun?: boolean;
  backupPath?: string | null;
  loadLegacy: () => Promise<OutputDto[]> | OutputDto[];
  loadV2: () => Promise<OutputDto[]> | OutputDto[];
  writeV2: (row: OutputDto) => Promise<void> | void;
}): Promise<DataMigrationReport> {
  return runIdempotentMigrator<OutputDto & Record<string, unknown>, OutputDto & Record<string, unknown>>({
    component: "outputs",
    dryRun: opts.dryRun ?? true,
    backupPath: opts.backupPath ?? null,
    requiredLegacyKeys: ["id", "missionId", "type"],
    loadLegacy: async () => (await opts.loadLegacy()) as Array<OutputDto & Record<string, unknown>>,
    loadV2: async () => (await opts.loadV2()) as Array<OutputDto & Record<string, unknown>>,
    toV2: (legacy) => ({ ...legacy }),
    getId: (row) => String((row as OutputDto).id),
    writeV2: (row) => opts.writeV2(row),
  });
}
