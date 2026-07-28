#!/usr/bin/env node
/**
 * PROGRAM 6040 — architecture:check
 * Heuristic: flag direct `.status = "READY"` / `.status = 'READY'` outside allowlisted paths.
 * Also verifies core events module files exist and no React imports under src/core/events.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const EVENTS_ROOT = path.join(ROOT, "src", "core", "events");

const REQUIRED = [
  "envelope.ts",
  "index.ts",
  "catalog/index.ts",
  "state-machines/index.ts",
  "transition/transition-service.ts",
  "store/event-log-repository.ts",
  "projections/index.ts",
  "idempotency/processed-event-registry.ts",
  "versioning/upcasters.ts",
  "observability/processing-metrics.ts",
  "adapters/index.ts",
  "bus/canonical-bus.ts",
  "timeline/mission-timeline.ts",
];

const DOCS = [
  "docs/architecture-v2/README.md",
  "docs/architecture-v2/events/README.md",
  "docs/architecture-v2/events/event-envelope.md",
  "docs/architecture-v2/events/catalog.md",
  "docs/architecture-v2/events/state-machines.md",
  "docs/architecture-v2/events/projections.md",
  "docs/architecture-v2/events/idempotency.md",
  "docs/architecture-v2/events/versioning.md",
  "docs/architecture-v2/events/legacy-events.md",
];

const STATUS_READY_RE = /\.status\s*=\s*["']READY["']/;
const REACT_IMPORT_RE = /from\s+["']react(?:-dom)?["']|from\s+["']next\//;

const ALLOW_STATUS_READY = [
  path.join("src", "core", "domain"),
  path.join("src", "core", "events", "transition"),
  path.join("src", "core", "events", "state-machines"),
  path.join("lib", "preview-deployment"),
  path.join("scripts"),
];

let issues = 0;
let warnings = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function warn(msg) {
  warnings += 1;
  console.log(`  ⚠ ${msg}`);
}
function fail(msg) {
  issues += 1;
  console.log(`  ✗ ${msg}`);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

console.log("\nPROGRAM 6040 — architecture:check\n");

console.log("Required event modules");
for (const rel of REQUIRED) {
  const full = path.join(EVENTS_ROOT, rel);
  if (fs.existsSync(full)) ok(rel);
  else fail(`missing ${rel}`);
}

console.log("\nDocs");
for (const rel of DOCS) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) ok(rel);
  else fail(`missing ${rel}`);
}

console.log("\nZero React/Next in src/core/events");
const eventFiles = walk(EVENTS_ROOT);
for (const file of eventFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (REACT_IMPORT_RE.test(text)) {
    fail(`React/Next import in ${path.relative(ROOT, file)}`);
  }
}
ok(`${eventFiles.length} event files scanned`);

console.log("\nDirect status=READY heuristic");
const scanRoots = [
  path.join(ROOT, "src"),
  path.join(ROOT, "lib", "mission-control"),
  path.join(ROOT, "lib", "live-mission"),
];
let hits = 0;
for (const root of scanRoots) {
  for (const file of walk(root)) {
    const rel = path.relative(ROOT, file);
    if (ALLOW_STATUS_READY.some((a) => rel.startsWith(a))) continue;
    const text = fs.readFileSync(file, "utf8");
    if (STATUS_READY_RE.test(text)) {
      hits += 1;
      warn(`direct .status = "READY" in ${rel} (prefer transition service / aggregate)`);
    }
  }
}
if (hits === 0) ok("no unexpected .status = \"READY\" assignments");
else warn(`${hits} occurrence(s) flagged — see state-machines.md policy`);

console.log(`\nResult: ${issues === 0 ? "PASS" : "FAIL"} (${issues} issue(s), ${warnings} warning(s))\n`);
process.exit(issues > 0 ? 1 : 0);
