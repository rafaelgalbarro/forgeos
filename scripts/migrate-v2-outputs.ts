/**
 * PROGRAM 6070 — dry-run outputs migrator CLI.
 * Usage: npx tsx scripts/migrate-v2-outputs.ts [--apply]
 */

import { migrateOutputsV2, type OutputDto } from "../src/core/migration";

async function main() {
  const apply = process.argv.includes("--apply");
  const legacy: OutputDto[] = [
    {
      id: "out-1",
      missionId: "demo-1",
      type: "website",
      version: "1",
      status: "ready",
      updatedAt: new Date().toISOString(),
    },
  ];
  const v2: OutputDto[] = [];

  const report = await migrateOutputsV2({
    dryRun: !apply,
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
