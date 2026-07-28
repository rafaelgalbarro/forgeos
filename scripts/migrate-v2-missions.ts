/**
 * PROGRAM 6070 — dry-run mission migrator CLI (in-memory demo store).
 * Real operators inject production loaders; this proves the runner path.
 *
 * Usage: npx tsx scripts/migrate-v2-missions.ts [--apply]
 */

import { migrateMissionsV2 } from "../src/core/migration";

async function main() {
  const apply = process.argv.includes("--apply");
  const legacy = [
    { id: "demo-1", title: "Demo mission", status: "active", updatedAt: new Date().toISOString() },
  ];
  const v2: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    sourceHint: "legacy" | "v2";
  }> = [];

  const report = await migrateMissionsV2({
    dryRun: !apply,
    backupPath: apply ? ".migration-backups/missions-demo.json" : null,
    loadLegacy: () => legacy,
    loadV2: () => v2,
    writeV2: (row) => {
      v2.push(row);
    },
  });

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
