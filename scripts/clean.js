#!/usr/bin/env node
const { logStep, cleanCaches } = require("./_utils");

logStep("Limpiando cachés de Next.js…");
const removed = cleanCaches();

if (removed.length === 0) {
  console.log("  · Nada que limpiar (.next ya ausente)");
} else {
  for (const dir of removed) {
    console.log(`  ✓ Eliminado ${dir}/`);
  }
}

console.log("\n✓ Limpieza completada.\n");
