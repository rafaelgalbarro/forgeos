/**
 * PROGRAM 6085 — Process cleanup: kill only ForgeOS-registered PIDs.
 * Never indiscriminate kill-by-name.
 * Optionally reclaim orphans whose command line references this workspace + next.
 */
const { execSync } = require("child_process");
const { getPidsOnPort, log, isWindows, ROOT } = require("../_utils");
const {
  listProcesses,
  pruneDeadProcesses,
  unregisterProcess,
  registerProcess,
} = require("./process-registry");
const {
  listRegisteredPorts,
  unregisterPort,
  isPortFree,
  getRequiredPorts,
  registerPort,
} = require("./port-registry");
const { isPidAlive } = require("./exclusive-execution-lock");

function killOwnedPid(pid) {
  try {
    if (isWindows()) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", windowsHide: true });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

function getCommandLine(pid) {
  try {
    if (isWindows()) {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\").CommandLine"`,
        { encoding: "utf8", windowsHide: true, timeout: 8000 },
      );
      return (out || "").trim();
    }
    const out = execSync(`ps -p ${pid} -o args=`, { encoding: "utf8", timeout: 5000 });
    return (out || "").trim();
  } catch {
    return "";
  }
}

/**
 * Reclaim a PID only if its command line clearly belongs to this ForgeOS workspace
 * and is a next/node forgeos script — not kill-by-name alone.
 */
function isForgeosOwnedCommand(cmd) {
  if (!cmd) return false;
  const rootNorm = ROOT.replace(/\\/g, "/").toLowerCase();
  const cmdNorm = cmd.replace(/\\/g, "/").toLowerCase();
  if (!cmdNorm.includes(rootNorm)) return false;
  return (
    cmdNorm.includes("next") ||
    cmdNorm.includes("scripts/dev") ||
    cmdNorm.includes("scripts\\dev") ||
    cmdNorm.includes("forgeos")
  );
}

function reclaimOrphanForgeosOnPorts(ports) {
  const reclaimed = [];
  for (const port of ports) {
    if (isPortFree(port)) continue;
    for (const pid of getPidsOnPort(port)) {
      const n = Number(pid);
      const cmd = getCommandLine(n);
      if (!isForgeosOwnedCommand(cmd)) continue;
      log(`  ✓ Reclamando huérfano ForgeOS PID ${n} en puerto ${port} (cwd/cmd del workspace)`);
      registerProcess({
        pid: n,
        command: cmd.slice(0, 200),
        role: "orphan-reclaim",
        port,
        owner: "forgeos",
      });
      registerPort({ port, pid: n, role: "orphan-reclaim" });
      if (killOwnedPid(n)) {
        reclaimed.push({ pid: n, port });
        unregisterProcess(n);
        unregisterPort(port);
      }
    }
  }
  return reclaimed;
}

/**
 * Kill only processes present in the ForgeOS process/port registries.
 */
function cleanupRegisteredForgeosProcesses(options = {}) {
  const required = options.requiredPorts || getRequiredPorts();
  pruneDeadProcesses();

  const registered = listProcesses({ includeDead: true });
  const portRegs = listRegisteredPorts();
  const ownedPids = new Set(
    [...registered.map((p) => Number(p.pid)), ...portRegs.map((p) => Number(p.pid))].filter(
      (n) => Number.isFinite(n) && n > 0,
    ),
  );

  let killed = 0;
  const skippedForeign = [];

  for (const pid of ownedPids) {
    if (!isPidAlive(pid)) {
      unregisterProcess(pid);
      continue;
    }
    log(`  ✓ Deteniendo proceso ForgeOS registrado PID ${pid}`);
    if (killOwnedPid(pid)) {
      killed += 1;
      unregisterProcess(pid);
    }
  }

  for (const reg of portRegs) {
    const onPort = getPidsOnPort(reg.port);
    for (const pid of onPort) {
      const n = Number(pid);
      if (ownedPids.has(n) || Number(reg.pid) === n) {
        if (isPidAlive(n) && killOwnedPid(n)) {
          killed += 1;
          log(`  ✓ Puerto ${reg.port}: PID registrado ${n} terminado`);
        }
      } else {
        skippedForeign.push({ port: reg.port, pid: n, reason: "not-in-forgeos-registry" });
        log(
          `  · Puerto ${reg.port}: PID ${n} NO es ForgeOS registrado — no se mata (propiedad ajena)`,
        );
      }
    }
    unregisterPort(reg.port);
  }

  const reclaimed = reclaimOrphanForgeosOnPorts(required);
  killed += reclaimed.length;

  const stuckRequired = [];
  for (const port of required) {
    if (!isPortFree(port)) {
      const foreign = getPidsOnPort(port);
      stuckRequired.push(port);
      log(
        `  ✗ Puerto requerido ${port} sigue ocupado por PID(s) no registrados: ${foreign.join(", ")}`,
      );
    } else {
      log(`  · Puerto ${port}: libre`);
    }
  }

  return {
    killed,
    skippedForeign,
    stuckRequired,
    reclaimed,
    ok: stuckRequired.length === 0,
  };
}

module.exports = {
  cleanupRegisteredForgeosProcesses,
  killOwnedPid,
  reclaimOrphanForgeosOnPorts,
  isForgeosOwnedCommand,
};
