#!/usr/bin/env node
/**
 * ForgeOS 2030.1 — lightweight quality gate check for dashboard forbidden imports.
 * Scans components/dashboard for imports blocked by delivery policy.
 */
const fs = require("fs");
const path = require("path");
const { ROOT, log, logStep } = require("./_utils");

const DASHBOARD_DIR = path.join(ROOT, "components", "dashboard");

const FORBIDDEN_PATTERNS = [
  { id: "fos", pattern: /from\s+["']@\/lib\/fos["']/, reason: "lib/fos desconectado" },
  { id: "ceo", pattern: /from\s+["']@\/lib\/ceo["']/, reason: "lib/ceo desconectado" },
  { id: "board", pattern: /from\s+["']@\/lib\/board["']/, reason: "lib/board desconectado" },
  {
    id: "build-engine",
    pattern: /from\s+["']@\/lib\/build-engine["']/,
    reason: "lib/build-engine no en dashboard",
  },
  {
    id: "platform",
    pattern: /from\s+["']@\/lib\/platform["']/,
    reason: "lib/platform no wired en dashboard",
  },
  {
    id: "programs",
    pattern: /from\s+["']@\/lib\/programs["']/,
    reason: "lib/programs no wired en dashboard",
  },
  {
    id: "delivery",
    pattern: /from\s+["']@\/lib\/delivery["']/,
    reason: "lib/delivery governance — no importar en dashboard",
  },
];

let violations = 0;

function collectFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

logStep("Forbidden imports — components/dashboard");

const files = collectFiles(DASHBOARD_DIR);
if (files.length === 0) {
  log("  ⚠ No se encontraron archivos en components/dashboard");
  process.exit(0);
}

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(content)) {
      violations += 1;
      log(`  ✗ ${rel} — ${rule.id}: ${rule.reason}`);
    }
  }
}

log("\n══════════════════════════════════════════");
if (violations > 0) {
  log(`  RESULTADO: ${violations} violación(es) de imports prohibidos`);
  log("  Ver docs/delivery/03_quality_gates.md");
} else {
  log(`  RESULTADO: OK — ${files.length} archivo(s) escaneados`);
}
log("══════════════════════════════════════════\n");

process.exit(violations > 0 ? 1 : 0);
