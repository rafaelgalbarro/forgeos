#!/usr/bin/env node
/**
 * Start next dev with safety checks + ForgeOS process/port registration.
 * Does NOT auto-clean (use reset:dev for that).
 */
const { spawn } = require("child_process");
const {
  ROOT,
  log,
  logStep,
  isPortInUse,
  hasProductionBuildCache,
  getPidsOnPort,
  cleanCaches,
} = require("./_utils");
const { registerProcess, unregisterProcess } = require("./lib/process-registry");
const { registerPort, unregisterPort } = require("./lib/port-registry");

const PORT = 3000;

if (isPortInUse(PORT)) {
  const pids = getPidsOnPort(PORT);
  console.error(`\n✗ Puerto ${PORT} ocupado (PID: ${pids.join(", ")}).`);
  console.error("  Usa: npm run reset:dev");
  console.error("  O:   npm run kill:ports && npm run dev\n");
  process.exit(1);
}

if (hasProductionBuildCache()) {
  log("\n⚠ Detectado build de producción en .next — limpiando antes de dev.");
  log("  (mezclar build + dev causa: Cannot find module './331.js')\n");
  const removed = cleanCaches();
  for (const dir of removed) {
    log(`  ✓ Eliminado ${dir}/`);
  }
  if (removed.length === 0) {
    log("  · No se pudo limpiar .next — usa: npm run reset:dev");
  }
}

logStep(`Arrancando next dev en puerto ${PORT}…`);
log(`  → http://localhost:${PORT}/dashboard\n`);

const child = spawn("npx", ["next", "dev", "--port", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

function registerChild(pid) {
  if (!pid) return;
  registerProcess({
    pid,
    command: "next dev",
    role: "dev-server",
    port: PORT,
    owner: "forgeos",
  });
  registerPort({ port: PORT, pid, role: "dev-server" });
}

child.on("spawn", () => registerChild(child.pid));
if (child.pid) registerChild(child.pid);

function cleanup() {
  if (child.pid) {
    unregisterProcess(child.pid);
    unregisterPort(PORT);
  }
}

child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
process.on("SIGINT", () => {
  child.kill("SIGINT");
  cleanup();
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
  cleanup();
});
