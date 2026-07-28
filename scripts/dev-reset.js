#!/usr/bin/env node
/**
 * ForgeOS dev reset — canonical recovery for chunk/cache corruption.
 * Uses registry-owned kill only (PROGRAM 6085).
 * 1. Kill registered ForgeOS processes / free required ports
 * 2. Remove .next and node_modules/.cache
 * 3. Start next dev on port 3000 (registered)
 */
const { spawn } = require("child_process");
const {
  ROOT,
  log,
  logStep,
  cleanCaches,
  hasProductionBuildCache,
  isPortInUse,
} = require("./_utils");
const { cleanupRegisteredForgeosProcesses } = require("./lib/process-cleanup");
const { registerProcess, unregisterProcess } = require("./lib/process-registry");
const { registerPort, unregisterPort } = require("./lib/port-registry");

const PORT = 3000;
const URL = `http://localhost:${PORT}/dashboard`;

log("\n══════════════════════════════════════════");
log("  ForgeOS — reset:dev");
log("══════════════════════════════════════════");

logStep("Paso 1/3 — Liberar procesos/puertos ForgeOS registrados");
const cleanup = cleanupRegisteredForgeosProcesses();
if (!cleanup.ok) {
  console.error(
    `\n✗ Puertos requeridos ocupados por procesos no registrados: ${cleanup.stuckRequired.join(", ")}`,
  );
  console.error("  No se mata por nombre. Libera esos PIDs manualmente y reintenta.\n");
  process.exit(1);
}

logStep("Paso 2/3 — Limpiar cachés corruptas");
if (hasProductionBuildCache()) {
  log("  ⚠ Detectado build de producción en .next (mezclar build + dev causa errores de chunks)");
}
const removed = cleanCaches();
for (const dir of removed) {
  log(`  ✓ Eliminado ${dir}/`);
}
if (removed.length === 0) {
  log("  · .next ya estaba limpio");
}

logStep("Paso 3/3 — Arrancar next dev");
if (isPortInUse(PORT)) {
  console.error(`\n✗ Puerto ${PORT} sigue ocupado. Ejecuta: npm run kill:ports\n`);
  process.exit(1);
}

log(`\n  → ${URL}`);
log("  Ctrl+C para detener\n");

const child = spawn("npx", ["next", "dev", "--port", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

function registerChild(pid) {
  if (!pid) return;
  registerProcess({
    pid,
    command: "next dev (reset:dev)",
    role: "dev-server",
    port: PORT,
    owner: "forgeos",
  });
  registerPort({ port: PORT, pid, role: "dev-server" });
}

child.on("spawn", () => registerChild(child.pid));
if (child.pid) registerChild(child.pid);

function cleanupRegs() {
  if (child.pid) {
    unregisterProcess(child.pid);
    unregisterPort(PORT);
  }
}

child.on("exit", (code) => {
  cleanupRegs();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  cleanupRegs();
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
  cleanupRegs();
});
