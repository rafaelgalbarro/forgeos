/**
 * PROGRAM 6070 — dry-run decisions migrator CLI.
 * Usage: npx tsx scripts/migrate-v2-decisions.ts [--apply]
 */

import { migrateDecisionsV2, type DecisionDto } from "../src/core/migration";

async function main() {
  const apply = process.argv.includes("--apply");
  const legacy: DecisionDto[] = [
    {
      id: "dec-1",
      missionId: "demo-1",
      status: "pending",
      title: "Choose stack",
      updatedAt: new Date().toISOString(),
    },
  ];
  const v2: DecisionDto[] = [];

  const report = await migrateDecisionsV2({
    dryRun: !apply,
    loadLegacy: () => legacy,
    loadV2: () => v2,
    writeV2: (row) => {
      v2.push(row);
    },
    knownMissionIds: new Set(["demo-1"]),
  });

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
