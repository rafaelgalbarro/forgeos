#!/usr/bin/env node
/**
 * PROGRAM 6085 — kill:ports
 * 1. read ForgeOS process/port registry
 * 2. verify ownership
 * 3. kill only registered processes
 * 4. verify required ports free
 * 5. clean registry
 * 6. nonzero exit if required port stuck
 *
 * Does NOT indiscriminately kill by process name.
 */
const { logStep, log } = require("./_utils");
const { cleanupRegisteredForgeosProcesses } = require("./lib/process-cleanup");
const { pruneDeadProcesses } = require("./lib/process-registry");

logStep("ForgeOS kill:ports — solo procesos registrados…");
pruneDeadProcesses();
const result = cleanupRegisteredForgeosProcesses();

if (result.killed > 0) {
  log(`\n✓ ${result.killed} proceso(s) ForgeOS terminado(s).`);
} else {
  log("\n✓ No había procesos ForgeOS registrados vivos.");
}

if (result.skippedForeign.length > 0) {
  log(
    `· ${result.skippedForeign.length} PID(s) ajenos en puertos registrados — no tocados.`,
  );
}

if (!result.ok) {
  console.error(
    `\n✗ No se pudieron liberar puertos requeridos: ${result.stuckRequired.join(", ")}`,
  );
  console.error(
    "  Acción segura: liberar manualmente esos PIDs ajenos, o registrar el proceso ForgeOS antes de kill:ports.\n",
  );
  process.exit(1);
}

log("✓ Puertos requeridos libres.\n");
process.exit(0);
