/**
 * PROGRAM 6085 — Exclusive execution lock for incompatible ops
 * (clean / build / reset:dev / certification / sandbox prep).
 *
 * Atomic acquire via O_EXCL. Does NOT delete a lock whose owner PID is still alive.
 */
const fs = require("fs");
const path = require("path");
const { ROOT } = require("../_utils");

const LOCK_DIR = path.join(ROOT, ".forgeos", "locks");
const DEFAULT_LOCK_NAME = "v2-integration.lock";
const STALE_MS = Number(process.env.FORGEOS_LOCK_STALE_MS || 2 * 60 * 60 * 1000);

function ensureLockDir() {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
}

function lockPath(name = DEFAULT_LOCK_NAME) {
  return path.join(LOCK_DIR, name);
}

function isPidAlive(pid) {
  if (!pid || !Number.isFinite(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (err) {
    return err && err.code === "EPERM";
  }
}

function readLock(name = DEFAULT_LOCK_NAME) {
  const file = lockPath(name);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return { corrupted: true, path: file };
  }
}

function formatBlockMessage(existing) {
  const ageMs = existing.timestamp ? Date.now() - Date.parse(existing.timestamp) : null;
  const ageMin = ageMs != null && Number.isFinite(ageMs) ? Math.round(ageMs / 60000) : "?";
  const alive = isPidAlive(existing.pid);
  return [
    "FORGEOS exclusive lock active — incompatible second run blocked.",
    `  lock: ${existing.path || lockPath()}`,
    `  owner: ${existing.owner || "unknown"}`,
    `  command: ${existing.command || "unknown"}`,
    `  pid: ${existing.pid || "unknown"} (alive=${alive})`,
    `  age: ${ageMin} min (since ${existing.timestamp || "?"})`,
    alive
      ? "  safe action: wait for the other process to finish, or stop that PID then re-run."
      : "  safe action: owner PID is dead — remove stale lock with releaseExclusiveLock({ forceStale: true }) or delete the lock file.",
  ].join("\n");
}

/**
 * @param {{ owner: string, command: string, lockName?: string, staleMs?: number }} opts
 * @returns {{ ok: true, record: object } | { ok: false, error: string, existing: object }}
 */
function acquireExclusiveLock(opts) {
  ensureLockDir();
  const name = opts.lockName || DEFAULT_LOCK_NAME;
  const file = lockPath(name);
  const staleMs = opts.staleMs ?? STALE_MS;

  const existing = readLock(name);
  if (existing && !existing.corrupted) {
    const age = existing.timestamp ? Date.now() - Date.parse(existing.timestamp) : 0;
    const alive = isPidAlive(existing.pid);
    if (alive) {
      return { ok: false, error: formatBlockMessage({ ...existing, path: file }), existing };
    }
    if (age < staleMs && existing.pid) {
      // PID dead but within grace: still treat as stale-eligible
    }
    try {
      fs.unlinkSync(file);
    } catch {
      /* race */
    }
  } else if (existing && existing.corrupted) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }

  const record = {
    owner: opts.owner,
    command: opts.command,
    pid: process.pid,
    timestamp: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
    hostname: require("os").hostname(),
    cwd: ROOT,
  };

  try {
    const fd = fs.openSync(file, "wx");
    fs.writeFileSync(fd, JSON.stringify(record, null, 2), "utf8");
    fs.closeSync(fd);
    return { ok: true, record: { ...record, path: file } };
  } catch (err) {
    if (err && err.code === "EEXIST") {
      const again = readLock(name) || {};
      return {
        ok: false,
        error: formatBlockMessage({ ...again, path: file }),
        existing: again,
      };
    }
    throw err;
  }
}

function heartbeatExclusiveLock(name = DEFAULT_LOCK_NAME) {
  const file = lockPath(name);
  const existing = readLock(name);
  if (!existing || existing.corrupted) return false;
  if (Number(existing.pid) !== process.pid) return false;
  existing.heartbeatAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(existing, null, 2), "utf8");
  return true;
}

/**
 * @param {{ lockName?: string, forceStale?: boolean }} [opts]
 */
function releaseExclusiveLock(opts = {}) {
  const name = opts.lockName || DEFAULT_LOCK_NAME;
  const file = lockPath(name);
  const existing = readLock(name);
  if (!existing) return { released: false, reason: "no-lock" };
  if (existing.corrupted) {
    fs.unlinkSync(file);
    return { released: true, reason: "corrupted-cleared" };
  }
  const owner = Number(existing.pid) === process.pid;
  const alive = isPidAlive(existing.pid);
  if (!owner && alive && !opts.forceStale) {
    return {
      released: false,
      reason: "foreign-alive",
      error: formatBlockMessage({ ...existing, path: file }),
    };
  }
  if (!owner && alive && opts.forceStale) {
    return {
      released: false,
      reason: "refused-alive-force",
      error: "Refusing to force-delete lock while owner PID is still alive.",
    };
  }
  try {
    fs.unlinkSync(file);
    return { released: true, reason: owner ? "owner-release" : "stale-cleanup" };
  } catch (err) {
    return { released: false, reason: "unlink-failed", error: String(err) };
  }
}

module.exports = {
  LOCK_DIR,
  DEFAULT_LOCK_NAME,
  acquireExclusiveLock,
  releaseExclusiveLock,
  heartbeatExclusiveLock,
  readLock,
  isPidAlive,
  lockPath,
};
