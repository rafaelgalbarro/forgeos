/**
 * Shared utilities for ForgeOS dev environment scripts.
 * Cross-platform (Windows-first).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEV_PORTS = [3000, 3001];

function isWindows() {
  return process.platform === "win32";
}

function log(msg) {
  console.log(msg);
}

function logStep(msg) {
  console.log(`\n▸ ${msg}`);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function getPidsOnPort(port) {
  const pids = new Set();

  try {
    if (isWindows()) {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
        windowsHide: true,
      });
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      for (const pid of out.split(/\r?\n/)) {
        if (pid.trim()) pids.add(pid.trim());
      }
    }
  } catch {
    // Port not in use or command unavailable
  }

  return [...pids];
}

function killPid(pid) {
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

function killChild(child) {
  if (!child?.pid) return;
  killPid(child.pid);
}

/**
 * @deprecated Prefer scripts/lib/process-cleanup.js (registry-owned only).
 * Kept for doctor/legacy callers; kill:ports no longer uses this indiscriminately.
 */
function killPorts(ports = DEV_PORTS) {
  let killed = 0;

  for (const port of ports) {
    const pids = getPidsOnPort(port);
    for (const pid of pids) {
      if (killPid(pid)) {
        log(`  ✓ Puerto ${port}: proceso ${pid} terminado`);
        killed += 1;
      }
    }
    if (pids.length === 0) {
      log(`  · Puerto ${port}: libre`);
    }
  }

  return killed;
}

function isPortInUse(port) {
  return getPidsOnPort(port).length > 0;
}

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy-wait for Windows file lock release
  }
}

function rmDir(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) return false;

  const maxAttempts = isWindows() ? 5 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.rmSync(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return true;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      sleepMs(1000);
    }
  }

  return false;
}

function cleanCaches() {
  const removed = [];

  if (rmDir(".next")) removed.push(".next");
  if (rmDir(path.join("node_modules", ".cache"))) {
    removed.push("node_modules/.cache");
  }

  return removed;
}

/**
 * After `next build`, `.next` contains production server chunks.
 * Running `next dev` on top causes missing chunk errors (e.g. ./331.js).
 */
function hasProductionBuildCache() {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  const serverDir = path.join(ROOT, ".next", "server");
  return fs.existsSync(buildId) && fs.existsSync(serverDir);
}

function readPackageJson() {
  const raw = fs.readFileSync(path.join(ROOT, "package.json"), "utf8");
  return JSON.parse(raw);
}

function getInstalledNextVersion() {
  try {
    const nextPkg = path.join(ROOT, "node_modules", "next", "package.json");
    if (fs.existsSync(nextPkg)) {
      return JSON.parse(fs.readFileSync(nextPkg, "utf8")).version;
    }
  } catch {
    // ignore
  }
  return "unknown";
}

/** Load `.env.local` into process.env (does not override existing vars). */
function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

/** Headers for PM2 → Next internal API calls (middleware accepts X-Internal-API-Key). */
function internalApiHeaders(extra = {}) {
  const key =
    process.env.IBKR_INTERNAL_API_KEY?.trim() || process.env.INTERNAL_API_KEY?.trim() || "";
  const headers = { ...extra };
  if (key) headers["X-Internal-API-Key"] = key;
  return headers;
}

module.exports = {
  ROOT,
  DEV_PORTS,
  isWindows,
  log,
  logStep,
  fileExists,
  getPidsOnPort,
  killPorts,
  isPortInUse,
  cleanCaches,
  hasProductionBuildCache,
  readPackageJson,
  getInstalledNextVersion,
  loadEnvLocal,
  internalApiHeaders,
  killChild,
};
