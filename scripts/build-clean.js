#!/usr/bin/env node
/**
 * ForgeOS build clean — kill dev ports, remove .next, production build.
 */
const { spawnSync } = require("child_process");
const { ROOT, log, logStep, killPorts, cleanCaches, hasProductionBuildCache } = require("./_utils");

log("\n══════════════════════════════════════════");
log("  ForgeOS — build:clean");
log("══════════════════════════════════════════");

logStep("Paso 1/3 — Liberar puertos 3000 y 3001");
killPorts();

logStep("Paso 2/3 — Limpiar cachés");
if (hasProductionBuildCache()) {
  log("  · Build de producción previo detectado en .next");
}
const removed = cleanCaches();
for (const dir of removed) {
  log(`  ✓ Eliminado ${dir}/`);
}
if (removed.length === 0) {
  log("  · .next ya estaba limpio");
}

logStep("Paso 3/3 — next build");
const result = spawnSync("npx", ["next", "build"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

process.exit(result.status ?? 1);
