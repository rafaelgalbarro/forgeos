#!/usr/bin/env node
/**
 * PROGRAM 6070 — architecture:check
 * Validates migration docs, registry seed surface, and V2 flag defaults in .env.example.
 * Also ensures src/core/migration has zero React imports.
 */
const fs = require("fs");
const path = require("path");
const { ROOT, log, logStep } = require("./_utils");

let failures = 0;

function fail(msg) {
  failures += 1;
  log(`  ✗ ${msg}`);
}

function ok(msg) {
  log(`  ✓ ${msg}`);
}

function mustExist(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) fail(`missing ${rel}`);
  else ok(rel);
}

function collectTs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTs(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

logStep("PROGRAM 6070 — architecture:check");

const required = [
  "src/core/migration/index.ts",
  "src/core/migration/types.ts",
  "src/core/migration/feature-flags.ts",
  "src/core/migration/registry.ts",
  "src/core/migration/dual-read.ts",
  "src/core/migration/dual-write.ts",
  "src/core/migration/rollback.ts",
  "src/core/migration/deprecation.ts",
  "src/core/migration/adapters/mission-reads.ts",
  "src/core/migration/adapters/mission-commands.ts",
  "src/core/migration/adapters/decisions.ts",
  "src/core/migration/adapters/artifacts.ts",
  "src/core/migration/adapters/outputs.ts",
  "src/core/migration/adapters/codebases.ts",
  "src/core/migration/adapters/builds.ts",
  "src/core/migration/adapters/previews.ts",
  "src/core/migration/adapters/deployments.ts",
  "src/core/migration/adapters/company-overview.ts",
  "src/core/migration/runners/migrate-v2-missions.ts",
  "src/core/migration/dashboard/summary.ts",
  "app/admin/migration-v2/page.tsx",
  "components/admin/MigrationV2Dashboard.tsx",
  "docs/architecture-v2/migration/strategy.md",
  "docs/architecture-v2/migration/registry.md",
  "docs/architecture-v2/migration/dual-read.md",
  "docs/architecture-v2/migration/dual-write.md",
  "docs/architecture-v2/migration/data-migration.md",
  "docs/architecture-v2/migration/feature-flags.md",
  "docs/architecture-v2/migration/rollback.md",
  "docs/architecture-v2/migration/deprecation.md",
  "DEPRECATION.md",
  "tests/migration/migration-6070.test.ts",
];

for (const rel of required) mustExist(rel);

const registry = fs.readFileSync(path.join(ROOT, "src/core/migration/registry.ts"), "utf8");
const componentMatches = registry.match(/component:\s*"/g) || [];
if (componentMatches.length < 10) fail(`registry seed count < 10 (found ${componentMatches.length})`);
else ok(`registry seed entries ≥ 10 (${componentMatches.length})`);

const envExample = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
const flags = [
  "ENABLE_V2_DOMAIN",
  "ENABLE_V2_COMMANDS",
  "ENABLE_V2_QUERIES",
  "ENABLE_V2_ORCHESTRATION",
  "ENABLE_V2_EVENTS",
  "ENABLE_V2_STUDIO",
  "ENABLE_V2_COMPANY_OS",
];
for (const flag of flags) {
  const re = new RegExp(`^${flag}=false\\s*$`, "m");
  if (!re.test(envExample)) fail(`.env.example missing ${flag}=false`);
  else ok(`.env.example ${flag}=false`);
}

const readme = fs.readFileSync(path.join(ROOT, "docs/architecture-v2/README.md"), "utf8");
if (!readme.includes("migration/strategy.md") && !readme.includes("./migration/")) {
  fail("architecture-v2 README missing migration section/links");
} else {
  ok("architecture-v2 README links migration docs");
}

const reactRe = /from\s+["']react(?:\/[^"']*)?["']|from\s+["']next(?:\/[^"']*)?["']/;
const migrationRoot = path.join(ROOT, "src", "core", "migration");
for (const file of collectTs(migrationRoot)) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const src = fs.readFileSync(file, "utf8");
  if (reactRe.test(src)) fail(`React/Next import in migration core: ${rel}`);
}
ok("src/core/migration has no React/Next imports");

log("\n══════════════════════════════════════════");
if (failures > 0) {
  log(`  RESULTADO: FAIL — ${failures} issue(s)`);
  process.exit(1);
}
log("  RESULTADO: OK — PROGRAM 6070 architecture surface");
log("══════════════════════════════════════════\n");
process.exit(0);
