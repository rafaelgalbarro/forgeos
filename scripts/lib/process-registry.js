/**
 * PROGRAM 6085 — ForgeOS process registry (PID ownership).
 * Only registered ForgeOS processes may be stopped by kill:ports cleanup.
 */
const fs = require("fs");
const path = require("path");
const { ROOT } = require("../_utils");
const { isPidAlive } = require("./exclusive-execution-lock");

const REGISTRY_DIR = path.join(ROOT, ".forgeos", "registry");
const PROCESS_FILE = path.join(REGISTRY_DIR, "processes.json");

function ensure() {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  if (!fs.existsSync(PROCESS_FILE)) {
    fs.writeFileSync(PROCESS_FILE, JSON.stringify({ version: 1, processes: [] }, null, 2));
  }
}

function load() {
  ensure();
  try {
    const raw = fs.readFileSync(PROCESS_FILE, "utf8").replace(/^\uFEFF/, "");
    const data = JSON.parse(raw);
    if (!data.processes) data.processes = [];
    return data;
  } catch {
    return { version: 1, processes: [] };
  }
}

function save(data) {
  ensure();
  fs.writeFileSync(PROCESS_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * @param {{ pid: number, command: string, role?: string, port?: number, missionId?: string, sandboxId?: string, owner?: string }} entry
 */
function registerProcess(entry) {
  const data = load();
  const pid = Number(entry.pid);
  data.processes = data.processes.filter((p) => Number(p.pid) !== pid);
  data.processes.push({
    pid,
    command: entry.command,
    role: entry.role || "unknown",
    port: entry.port ?? null,
    missionId: entry.missionId ?? null,
    sandboxId: entry.sandboxId ?? null,
    owner: entry.owner || "forgeos",
    registeredAt: new Date().toISOString(),
  });
  save(data);
  return data.processes.find((p) => Number(p.pid) === pid);
}

function unregisterProcess(pid) {
  const data = load();
  const before = data.processes.length;
  data.processes = data.processes.filter((p) => Number(p.pid) !== Number(pid));
  save(data);
  return before !== data.processes.length;
}

function listProcesses({ includeDead = true } = {}) {
  const data = load();
  return data.processes
    .map((p) => ({ ...p, alive: isPidAlive(p.pid) }))
    .filter((p) => includeDead || p.alive);
}

function pruneDeadProcesses() {
  const data = load();
  const kept = [];
  const removed = [];
  for (const p of data.processes) {
    if (isPidAlive(p.pid)) kept.push(p);
    else removed.push(p);
  }
  data.processes = kept;
  save(data);
  return { removed, kept };
}

function findByPort(port) {
  return listProcesses().filter((p) => Number(p.port) === Number(port));
}

module.exports = {
  PROCESS_FILE,
  registerProcess,
  unregisterProcess,
  listProcesses,
  pruneDeadProcesses,
  findByPort,
  loadProcessRegistry: load,
};
