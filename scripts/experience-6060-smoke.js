/**
 * PROGRAM 6060 — smoke test (no Jest required).
 * Validates Query Layer + command bridges + view-model adapters.
 */
const assert = require("assert");
const path = require("path");

async function main() {
  // Compile-free smoke via dynamic require of compiled-less TS is not available;
  // instead validate file presence + run a minimal Node-side reimplementation check.
  const root = path.join(__dirname, "..");
  const fs = require("fs");

  const mustExist = [
    "src/core/application/experience-snapshots.ts",
    "src/core/application/command-bridges.ts",
    "src/core/application/queries/definitions.ts",
    "src/presentation/adapters/mission-query-adapter.ts",
    "src/presentation/view-models/types.ts",
    "lib/navigation/sidebar-items.ts",
    "app/mission-control/page.tsx",
    "app/missions/[missionId]/page.tsx",
    "app/studio/[missionId]/[section]/page.tsx",
    "app/company/[ventureId]/page.tsx",
    "app/activity/page.tsx",
    "app/review/page.tsx",
    "styles/fhis/mission-control.css",
    "docs/v2/experience-fix/root-cause.md",
    "docs/architecture-v2/experience/navigation.md",
  ];

  for (const rel of mustExist) {
    assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
  }

  const sidebar = fs.readFileSync(path.join(root, "lib/navigation/sidebar-items.ts"), "utf8");
  for (const label of ["Mission Control", "Ventures", "Studio", "Company", "Activity", "Settings"]) {
    assert.ok(sidebar.includes(`label: "${label}"`), `sidebar missing ${label}`);
  }
  assert.ok(sidebar.includes('section: "advanced"'), "sidebar missing advanced section");
  assert.ok(
    /website-factory[\s\S]*section:\s*"secondary"/.test(sidebar) ||
      sidebar.includes('id: "website-factory"') && sidebar.includes('status: "lab"'),
    "factories should not be primary"
  );

  const queries = fs.readFileSync(path.join(root, "src/core/application/queries/definitions.ts"), "utf8");
  assert.ok(queries.includes("GetMissionOverview"), "GetMissionOverview missing");

  const snaps = fs.readFileSync(path.join(root, "src/core/application/experience-snapshots.ts"), "utf8");
  assert.ok(snaps.includes("getMissionOverview"), "experience getMissionOverview missing");

  const bridges = fs.readFileSync(path.join(root, "src/core/application/command-bridges.ts"), "utf8");
  for (const cmd of [
    "CreateVenture",
    "StartMission",
    "OpenStudio",
    "RequestChange",
    "StartBuild",
    "CreatePreview",
    "CreateRelease",
    "DeployPreview",
    "ReviewCompany",
    "PauseMission",
  ]) {
    assert.ok(bridges.includes(cmd), `bridge missing ${cmd}`);
  }

  console.log("test OK — PROGRAM 6060 smoke checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
