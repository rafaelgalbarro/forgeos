#!/usr/bin/env node
/**
 * PROGRAM 6020 — architecture:check
 * Ensures CQ application layer exists and core has zero React/Next imports.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  failures += 1;
  console.error(`  ✗ ${msg}`);
}

console.log("PROGRAM 6020 — architecture:check");

const required = [
  "src/core/application/index.ts",
  "src/core/application/commands/bus.ts",
  "src/core/application/queries/bus.ts",
  "src/core/application/handlers/command/index.ts",
  "src/core/application/handlers/query/index.ts",
  "src/core/application/ports/index.ts",
  "src/core/application/policies/index.ts",
  "src/core/application/errors/index.ts",
  "src/core/application/dto/index.ts",
  "src/core/application/mappers/index.ts",
  "src/core/application/testing/in-memory.ts",
  "src/core/application/compat-domain/index.ts",
  "src/presentation/actions/create-mission-action.ts",
  "src/presentation/queries/get-mission-overview.ts",
  "src/presentation/bridges/legacy-bridges.ts",
  "docs/architecture-v2/application/README.md",
  "docs/architecture-v2/application/commands.md",
  "docs/architecture-v2/application/queries.md",
  "docs/architecture-v2/application/ports.md",
  "docs/architecture-v2/application/authorization.md",
  "docs/architecture-v2/application/idempotency.md",
  "docs/architecture-v2/application/transactions.md",
  "docs/architecture-v2/application/errors.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(ROOT, rel))) ok(rel);
  else fail(`missing ${rel}`);
}

const FORBIDDEN = [
  /from\s+['"]react['"]/,
  /from\s+['"]react-dom['"]/,
  /from\s+['"]next(\/|$)/,
  /from\s+['"]@\/components\//,
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) files.push(full);
  }
  return files;
}

for (const target of [
  path.join(ROOT, "src", "core", "application"),
  path.join(ROOT, "src", "core", "domain"),
]) {
  for (const file of walk(target)) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) {
        fail(`Forbidden import in ${path.relative(ROOT, file)}`);
      }
    }
  }
}

const policies = fs.readFileSync(
  path.join(ROOT, "src", "core", "application", "policies", "index.ts"),
  "utf8",
);
if (!policies.includes("CanDeployProduction") || !policies.includes("PRODUCTION_DEPLOY_DISABLED")) {
  fail("CanDeployProduction must deny by default");
} else {
  ok("CanDeployProduction deny-by-default");
}

if (failures > 0) {
  console.error(`architecture:check:6020 failed (${failures})`);
  process.exit(1);
}
console.log("architecture:check:6020 passed");
