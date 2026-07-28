/**
 * PROGRAM 6070 — rollback planner CLI.
 * Usage: npx tsx scripts/rollback-v2.ts --component mission.reads
 *        npx tsx scripts/rollback-v2.ts --full
 */

import {
  planRollback,
  planFullLegacyRollback,
  listRollbackCommands,
  type MigrationComponentId,
} from "../src/core/migration";

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    for (const row of listRollbackCommands()) {
      console.log(`${row.component}\t${row.command}`);
    }
    return;
  }

  if (args.includes("--full")) {
    const plan = planFullLegacyRollback();
    console.log(JSON.stringify(plan, null, 2));
    process.exit(plan.ok ? 0 : 1);
  }

  const idx = args.indexOf("--component");
  const component = (idx >= 0 ? args[idx + 1] : args[0]) as MigrationComponentId | undefined;
  if (!component) {
    console.error("Usage: --component <id> | --full | --list");
    process.exit(2);
  }

  const plan = planRollback(component);
  console.log(JSON.stringify(plan, null, 2));
  process.exit(plan.ok ? 0 : 1);
}

main();
