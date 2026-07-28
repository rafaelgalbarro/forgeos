/**
 * PROGRAM 6060 — architecture:check
 * Ensures experience entry modules do not statically import heavy engines.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const ENTRY_GLOBS = [
  "app/mission-control/page.tsx",
  "app/mission-control/[missionId]/page.tsx",
  "app/missions/[missionId]/page.tsx",
  "app/studio/page.tsx",
  "app/studio/[missionId]/page.tsx",
  "app/company/page.tsx",
  "app/company/[ventureId]/page.tsx",
  "app/activity/page.tsx",
  "app/settings/page.tsx",
  "src/presentation/adapters/mission-query-adapter.ts",
  "src/core/application/experience-snapshots.ts",
  "src/core/application/command-bridges.ts",
  "components/experience/MissionControlV2View.tsx",
  "components/experience/ForgeCommandPalette.tsx",
];

const FORBIDDEN = [
  /from\s+["']@\/lib\/ai-runtime/,
  /from\s+["']@\/lib\/skills/,
  /from\s+["']@\/lib\/build-runtime/,
  /from\s+["']@\/lib\/deployment/,
  /from\s+["'].*factory-engine/,
  /from\s+["']@\/lib\/website-factory\/engine/,
  /from\s+["']@\/lib\/mobile-factory\/engine/,
  /from\s+["']@\/lib\/application-factory\/engine/,
];

let failed = false;

for (const rel of ENTRY_GLOBS) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[architecture:check] MISSING ${rel}`);
    failed = true;
    continue;
  }
  const src = fs.readFileSync(abs, "utf8");
  for (const re of FORBIDDEN) {
    if (re.test(src)) {
      console.error(`[architecture:check] FORBIDDEN import in ${rel}: ${re}`);
      failed = true;
    }
  }
}

const requiredDirs = [
  "docs/architecture-v2/experience",
  "src/presentation/view-models",
  "src/core/application",
];
for (const d of requiredDirs) {
  if (!fs.existsSync(path.join(root, d))) {
    console.error(`[architecture:check] MISSING dir ${d}`);
    failed = true;
  }
}

if (failed) {
  console.error("architecture:check FAILED");
  process.exit(1);
}
console.log("architecture:check OK — experience entries clean of heavy engines");
process.exit(0);
