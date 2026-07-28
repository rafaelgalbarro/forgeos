#!/usr/bin/env node
/**
 * ForgeOS dev fast — start next dev on port 3000 without deleting .next.
 * Use for warm incremental restarts after the first dev:clean / reset:dev.
 */
const { spawn } = require("child_process");
const { ROOT, log, logStep, killPorts, isPortInUse } = require("./_utils");

const PORT = 3000;
const URL = `http://localhost:${PORT}/dashboard`;

log("\n══════════════════════════════════════════");
log("  ForgeOS — dev:fast");
log("══════════════════════════════════════════");

if (isPortInUse(PORT)) {
  logStep(`Puerto ${PORT} ocupado — liberando solo ${PORT}`);
  killPorts([PORT]);
  if (isPortInUse(PORT)) {
    console.error(`\n✗ Puerto ${PORT} sigue ocupado. Ejecuta: npm run kill:ports\n`);
    process.exit(1);
  }
}

logStep("Arrancando next dev (sin limpiar .next)");
log(`  → ${URL}`);
log("  Ctrl+C para detener\n");

const child = spawn("npx", ["next", "dev", "--port", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
