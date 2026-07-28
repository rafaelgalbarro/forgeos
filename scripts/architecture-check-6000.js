#!/usr/bin/env node
/**
 * PROGRAM 6000 — ForgeOS architecture:check
 *
 * Detects boundary / freeze risks without breaking the current green build.
 *
 * Exit codes:
 *   0 — OK, or only WARNINGs (soft findings / known legacy debt)
 *   1 — CRITICAL violation(s) that can be proven against freeze rules for V2 paths
 *   2 — Unexpected I/O error
 *
 * Checks:
 *   1. Presentation (app/, components/) importing @/lib/capabilities  → WARN (or CRIT if --strict)
 *   2. React / Next imports in src/core/domain/**                     → CRITICAL
 *   3. localStorage / sessionStorage in src/core/domain/**            → CRITICAL
 *   4. localStorage in lib/domain/**                                  → WARN
 *   5. Known critical circular import pair (mission-control ↔ live-mission) → WARN (proven legacy)
 *   6. Canonical type declarations outside src/core/domain            → WARN (legacy grandfathered;
 *      use scripts/check-canonical-redefinition.js for hard STOP on contracts wave)
 *   7. Undeclared-looking engine imports from components              → WARN
 *
 * Usage:
 *   npm run architecture:check:6000
 *   node scripts/architecture-check.js
 *   node scripts/architecture-check-6000.js --strict
 */
const fs = require("fs");
const path = require("path");
const { ROOT, log, logStep } = require("./_utils");

const STRICT = process.argv.includes("--strict");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  "out",
  "build",
]);

const CANONICAL_NAMES = [
  "Mission",
  "Venture",
  "Founder",
  "Workspace",
  "Artifact",
  "Output",
  "Codebase",
  "Build",
  "Preview",
  "Release",
  "Deployment",
  "DomainEventEnvelope",
];

const DECL_RE = new RegExp(
  String.raw`\b(?:export\s+)?(?:type|interface|class)\s+(${CANONICAL_NAMES.join("|")})\b`,
  "g"
);

const warnings = [];
const critical = [];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function collectSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function addWarn(msg) {
  warnings.push(msg);
}

function addCrit(msg) {
  critical.push(msg);
}

function checkPresentationCapabilities() {
  const roots = [path.join(ROOT, "app"), path.join(ROOT, "components")];
  const re = /from\s+["']@\/lib\/capabilities(?:\/[^"']*)?["']|require\(\s*["']@\/lib\/capabilities/;
  for (const root of roots) {
    for (const file of collectSourceFiles(root)) {
      const rel = toPosix(path.relative(ROOT, file));
      const src = stripComments(read(file));
      if (re.test(src)) {
        const msg = `Presentation imports capabilities: ${rel}`;
        if (STRICT) addCrit(msg);
        else addWarn(msg);
      }
    }
  }
}

function checkDomainPurity() {
  const domainRoot = path.join(ROOT, "src", "core", "domain");
  if (!fs.existsSync(domainRoot)) {
    addWarn("src/core/domain missing — skip domain purity checks");
    return;
  }
  const reactRe =
    /from\s+["']react(?:\/[^"']*)?["']|from\s+["']next(?:\/[^"']*)?["']|require\(\s*["']react|require\(\s*["']next/;
  const storageRe = /\blocalStorage\b|\bsessionStorage\b/;
  for (const file of collectSourceFiles(domainRoot)) {
    const rel = toPosix(path.relative(ROOT, file));
    const src = stripComments(read(file));
    if (reactRe.test(src)) addCrit(`React/Next in core domain: ${rel}`);
    if (storageRe.test(src)) addCrit(`Web storage API in core domain: ${rel}`);
  }
}

function checkLibDomainStorage() {
  const libDomain = path.join(ROOT, "lib", "domain");
  if (!fs.existsSync(libDomain)) return;
  const storageRe = /\blocalStorage\b|\bsessionStorage\b/;
  for (const file of collectSourceFiles(libDomain)) {
    const rel = toPosix(path.relative(ROOT, file));
    if (storageRe.test(stripComments(read(file)))) {
      addWarn(`localStorage/sessionStorage in lib/domain: ${rel}`);
    }
  }
}

function checkKnownCircular() {
  const mcIndex = path.join(ROOT, "lib", "mission-control", "index.ts");
  const liveDir = path.join(ROOT, "lib", "live-mission");
  if (!fs.existsSync(mcIndex) || !fs.existsSync(liveDir)) return;

  const mcImportsLive = /@\/lib\/live-mission/.test(read(mcIndex));
  let liveImportsMc = false;
  for (const file of collectSourceFiles(liveDir)) {
    if (/@\/lib\/mission-control/.test(read(file))) {
      liveImportsMc = true;
      break;
    }
  }
  if (mcImportsLive && liveImportsMc) {
    addWarn(
      "Critical circular import (legacy proven): lib/mission-control ↔ lib/live-mission — see dependency-map.md"
    );
  }
}

function checkCanonicalOutsideDomain() {
  const allowed = path.resolve(ROOT, "src", "core", "domain");
  const scanRoots = ["lib", "app", "components", "src"].map((d) => path.join(ROOT, d));
  for (const root of scanRoots) {
    if (!fs.existsSync(root)) continue;
    for (const file of collectSourceFiles(root)) {
      const resolved = path.resolve(file);
      if (resolved === allowed || resolved.startsWith(allowed + path.sep)) continue;
      const rel = toPosix(path.relative(ROOT, file));
      if (rel.startsWith("docs/")) continue;
      const stripped = stripComments(read(file));
      DECL_RE.lastIndex = 0;
      const found = new Set();
      let match;
      while ((match = DECL_RE.exec(stripped)) !== null) found.add(match[1]);
      for (const name of found) {
        addWarn(
          `Legacy/forbidden canonical declaration outside src/core/domain: ${rel} defines ${name}`
        );
      }
    }
  }
}

function checkUiEngineImports() {
  const components = path.join(ROOT, "components");
  if (!fs.existsSync(components)) return;
  const re = /from\s+["']@\/lib\/[^"']*-engine(?:\/[^"']*)?["']/;
  let count = 0;
  const samples = [];
  for (const file of collectSourceFiles(components)) {
    const rel = toPosix(path.relative(ROOT, file));
    if (re.test(stripComments(read(file)))) {
      count += 1;
      if (samples.length < 8) samples.push(rel);
    }
  }
  if (count > 0) {
    addWarn(
      `Undeclared legacy UI→engine deps: ${count} component file(s) import *-engine (e.g. ${samples.join(", ")}) — freeze: no new ones`
    );
  }
}

function checkProgram6000Docs() {
  const required = [
    "docs/architecture-v2/current-system-inventory.md",
    "docs/architecture-v2/domain-duplication-map.md",
    "docs/architecture-v2/state-machine-audit.md",
    "docs/architecture-v2/event-audit.md",
    "docs/architecture-v2/dependency-map.md",
    "docs/architecture-v2/persistence-audit.md",
    "docs/architecture-v2/experience-map.md",
    "docs/architecture-v2/freeze-rules.md",
    "docs/architecture-v2/migration-matrix.md",
    "docs/architecture-v2/adr/ADR-001-canonical-domain.md",
    "docs/architecture-v2/adr/ADR-008-codebase-build-release-separation.md",
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      addCrit(`PROGRAM 6000 deliverable missing: ${rel}`);
    }
  }
}

function main() {
  logStep("PROGRAM 6000 — architecture:check");
  log(
    "  Mode: warn-friendly (exit 0 unless CRITICAL). Use --strict to fail on soft presentation/capability hits."
  );
  log("  Docs: docs/architecture-v2/freeze-rules.md");

  checkProgram6000Docs();
  checkPresentationCapabilities();
  checkDomainPurity();
  checkLibDomainStorage();
  checkKnownCircular();
  checkCanonicalOutsideDomain();
  checkUiEngineImports();

  log("\n══════════════════════════════════════════");
  if (warnings.length) {
    log(`  WARNINGS (${warnings.length}):`);
    for (const w of warnings) log(`  ⚠ ${w}`);
  } else {
    log("  WARNINGS: none");
  }

  if (critical.length) {
    log(`\n  CRITICAL (${critical.length}):`);
    for (const c of critical) log(`  ✗ ${c}`);
    log("  RESULTADO: FAIL");
    log("══════════════════════════════════════════\n");
    process.exit(1);
  }

  log("\n  RESULTADO: OK (architecture check passed; warnings do not fail build)");
  log("══════════════════════════════════════════\n");
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(2);
}
