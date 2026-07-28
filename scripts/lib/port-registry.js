/**
 * PROGRAM 6085 — ForgeOS port registry (ownership of listening ports).
 */
const fs = require("fs");
const path = require("path");
const { ROOT, getPidsOnPort } = require("../_utils");

const REGISTRY_DIR = path.join(ROOT, ".forgeos", "registry");
const PORT_FILE = path.join(REGISTRY_DIR, "ports.json");

/** Ports ForgeOS may claim for app / previews / sandboxes. */
const FORGEOS_PORTS = [3000, 3001, 3100, 3101, 3200, 3201];

function ensure() {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  if (!fs.existsSync(PORT_FILE)) {
    fs.writeFileSync(PORT_FILE, JSON.stringify({ version: 1, ports: [] }, null, 2));
  }
}

function load() {
  ensure();
  try {
    const raw = fs.readFileSync(PORT_FILE, "utf8").replace(/^\uFEFF/, "");
    const data = JSON.parse(raw);
    if (!data.ports) data.ports = [];
    return data;
  } catch {
    return { version: 1, ports: [] };
  }
}

function save(data) {
  ensure();
  fs.writeFileSync(PORT_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * @param {{ port: number, pid: number, role?: string, missionId?: string, sandboxId?: string }} entry
 */
function registerPort(entry) {
  const data = load();
  const port = Number(entry.port);
  data.ports = data.ports.filter((p) => Number(p.port) !== port);
  data.ports.push({
    port,
    pid: Number(entry.pid),
    role: entry.role || "dev",
    missionId: entry.missionId ?? null,
    sandboxId: entry.sandboxId ?? null,
    registeredAt: new Date().toISOString(),
  });
  save(data);
  return data.ports.find((p) => Number(p.port) === port);
}

function unregisterPort(port) {
  const data = load();
  data.ports = data.ports.filter((p) => Number(p.port) !== Number(port));
  save(data);
}

function listRegisteredPorts() {
  return load().ports;
}

function isPortFree(port) {
  return getPidsOnPort(port).length === 0;
}

function getRequiredPorts() {
  const env = process.env.FORGEOS_REQUIRED_PORTS;
  if (env) {
    return env
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  }
  return [3000, 3001];
}

module.exports = {
  PORT_FILE,
  FORGEOS_PORTS,
  registerPort,
  unregisterPort,
  listRegisteredPorts,
  isPortFree,
  getRequiredPorts,
  loadPortRegistry: load,
};
