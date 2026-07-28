#!/usr/bin/env node
/**
 * ForgeOS Architecture V2 — canonical entity redefinition heuristic.
 *
 * FAIL: type/interface/class for protected names under src/** outside src/core/domain
 *       (V2 agents must not create a second canonical model).
 * WARN: same declarations under lib/**, app/**, components/** (legacy; migrate later).
 *
 * Manual run (architecture:check not yet wired — integration agent owns package.json):
 *   node scripts/check-canonical-redefinition.js
 *
 * Exit codes:
 *   0 — OK (warnings may still print for legacy)
 *   1 — FAIL redefinition(s) under src/ outside domain (STOP EXECUTION)
 *   2 — I/O / unexpected error
 */
const fs = require("fs");
const path = require("path");
const { ROOT, log, logStep } = require("./_utils");

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

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  "out",
  "build",
]);

/** Relative path prefixes (posix) that are never scanned for definitions */
const SKIP_PREFIXES = [
  "docs/",
  "scripts/check-canonical-redefinition.js",
];

const DECL_RE = new RegExp(
  String.raw`\b(?:export\s+)?(?:type|interface|class)\s+(${CANONICAL_NAMES.join("|")})\b`,
  "g"
);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function isAllowedDeclaration(relPosix, name) {
  if (relPosix.startsWith("src/core/domain/")) return true;
  // Program 6040 owns the unified envelope under events (not a second Mission/Venture model).
  if (name === "DomainEventEnvelope" && relPosix.startsWith("src/core/events/")) {
    return true;
  }
  // Program 6020 documented compat stubs (bridge until full domain cutover) — not a parallel SoT.
  // See docs/architecture-v2/agent-change-log.md Program 6010/6020 notes.
  if (relPosix.startsWith("src/core/application/compat-domain/")) {
    return true;
  }
  return false;
}

function shouldSkipFile(relPosix) {
  if (SKIP_PREFIXES.some((p) => relPosix === p || relPosix.startsWith(p))) {
    return true;
  }
  // Ignore declaration files that only re-export (still flag if they declare)
  return false;
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

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function main() {
  logStep("Canonical redefinition check (Architecture V2)");
  log(`  Allowed definitions: src/core/domain/** (+ DomainEventEnvelope in src/core/events/**)`);
  log(`  Names: ${CANONICAL_NAMES.join(", ")}`);

  const scanRoots = [
    path.join(ROOT, "src"),
    path.join(ROOT, "lib"),
    path.join(ROOT, "app"),
    path.join(ROOT, "components"),
  ].filter((d) => fs.existsSync(d));

  const failures = [];
  const warnings = [];

  for (const root of scanRoots) {
    const files = collectSourceFiles(root);
    for (const file of files) {
      const rel = toPosix(path.relative(ROOT, file));
      if (shouldSkipFile(rel)) continue;

      let content;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }

      const stripped = stripComments(content);
      DECL_RE.lastIndex = 0;
      let match;
      const found = new Set();
      while ((match = DECL_RE.exec(stripped)) !== null) {
        found.add(match[1]);
      }
      for (const name of found) {
        if (isAllowedDeclaration(rel, name)) continue;
        const hit = { file: rel, name };
        // New V2 surface: fail. Legacy trees: warn only.
        if (rel.startsWith("src/")) {
          failures.push(hit);
        } else {
          warnings.push(hit);
        }
      }
    }
  }

  log("\n══════════════════════════════════════════");
  if (warnings.length > 0) {
    log(`  WARN: ${warnings.length} legacy declaration(s) outside domain (non-blocking)`);
    const sample = warnings.slice(0, 25);
    for (const w of sample) {
      log(`  ⚠ ${w.file} — ${w.name}`);
    }
    if (warnings.length > sample.length) {
      log(`  … and ${warnings.length - sample.length} more`);
    }
  }

  if (failures.length > 0) {
    log("  RESULTADO: FAIL — canonical entity redefinition under src/ outside domain");
    log("  ACTION: STOP EXECUTION — fix before merge (contracts owner / offending package)");
    for (const v of failures) {
      log(`  ✗ ${v.file} — redefines ${v.name} (must live under src/core/domain)`);
    }
    log("  See docs/architecture-v2/parallel-execution-governance.md rule #9");
    log("══════════════════════════════════════════\n");
    process.exit(1);
  }

  log("  RESULTADO: OK — no FAIL-level redefinitions under src/ outside domain");
  log("══════════════════════════════════════════\n");
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(2);
}
