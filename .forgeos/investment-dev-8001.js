#!/usr/bin/env node
/**
 * Investment stack supervisor: Next.js (:3000) + IBKR FastAPI (:8002).
 * TWS/Gateway (:4001) is checked but never required — ForgeOS still loads OFFLINE.
 * ANALYSIS_ONLY — does not enable live trading or flip safety flags.
 */
const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const {
  ROOT,
  log,
  logStep,
  isPortInUse,
  getPidsOnPort,
  hasProductionBuildCache,
  cleanCaches,
  isWindows,
} = require("C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\scripts\\_utils");
const { registerProcess, unregisterProcess } = require("C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\scripts\\lib\\process-registry");
const { registerPort, unregisterPort } = require("C:\\Users\\RafaelGalbarroBarba\\Projects\\ForgeOS_App_Factory\\ForgeOS_App_Factory_v0_1\\scripts\\lib\\port-registry");

const NEXT_PORT = 3000;
const IBKR_PORT = 8001;
const TWS_PORT = 4001;
const IBKR_HOST = "127.0.0.1";
const HEALTH_INTERVAL_MS = 5_000;
const RESTART_BACKOFF_MS = [2_000, 5_000, 10_000, 20_000];
const LOG_DIR = path.join(ROOT, ".forgeos", "logs");
const LOG_FILE = path.join(LOG_DIR, "ibkr-fastapi.log");
const IBKR_DIR = path.join(ROOT, "services", "ibkr-broker");

let shuttingDown = false;
let nextChild = null;
let ibkrChild = null;
let healthTimer = null;
let restartAttempt = 0;
let lastHealthOk = false;
let lastTwsOk = false;
let ibkrRestarts = 0;
let consecutiveHealthFails = 0;

function appendLog(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line.endsWith("\n") ? line : `${line}\n`, "utf8");
  } catch {
    /* ignore log IO errors */
  }
}

function loadIbkrApiKey() {
  const fromEnv = process.env.IBKR_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const envPath = path.join(IBKR_DIR, ".env");
  if (!fs.existsSync(envPath)) return "";
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*(?:INTERNAL_API_KEY|IBKR_INTERNAL_API_KEY)\s*=\s*(.*)\s*$/);
      if (m) {
        return m[1].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    /* ignore */
  }
  return "";
}

function resolvePython() {
  const win = path.join(IBKR_DIR, ".venv", "Scripts", "python.exe");
  const nix = path.join(IBKR_DIR, ".venv", "bin", "python");
  if (fs.existsSync(win)) return win;
  if (fs.existsSync(nix)) return nix;
  return isWindows() ? "python" : "python3";
}

function tcpReachable(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

function probeHealth(apiKey) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: IBKR_HOST,
        port: IBKR_PORT,
        path: "/health",
        method: "GET",
        timeout: 2_500,
        headers: apiKey ? { "X-Internal-API-Key": apiKey } : {},
      },
      (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            body: body.slice(0, 200),
          });
        });
      },
    );
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.end();
  });
}

function printStatus() {
  const next =
    nextChild && !nextChild.killed
      ? isPortInUse(NEXT_PORT)
        ? "ONLINE"
        : "STARTING"
      : "OFFLINE";
  const fastapi = lastHealthOk ? "ONLINE" : "OFFLINE";
  const tws = lastTwsOk ? "ONLINE" : "OFFLINE";
  log(
    `[investment:dev] status · Next.js=${next} · FastAPI=${fastapi} · TWS=${tws} · restarts=${ibkrRestarts}`,
  );
}

function registerChild(pid, command, role, port) {
  if (!pid) return;
  registerProcess({ pid, command, role, port, owner: "forgeos" });
  registerPort({ port, pid, role });
}

function unregisterChild(pid, port) {
  if (pid) unregisterProcess(pid);
  if (port) unregisterPort(port);
}

function spawnIbkr(apiKey) {
  if (shuttingDown) return;
  if (ibkrChild) return;
  if (!fs.existsSync(path.join(IBKR_DIR, "app", "main.py"))) {
    log("✗ services/ibkr-broker missing — FastAPI not started");
    return;
  }
  if (isPortInUse(IBKR_PORT)) {
    const pids = getPidsOnPort(IBKR_PORT);
    log(`✗ Puerto ${IBKR_PORT} ocupado por PID(s) ${pids.join(", ")} — abortando`);
    shutdown(1);
    return;
  }

  const python = resolvePython();
  const args = ["-m", "uvicorn", "app.main:app", "--host", IBKR_HOST, "--port", String(IBKR_PORT)];
  logStep(`Arrancando IBKR FastAPI en ${IBKR_HOST}:${IBKR_PORT}…`);
  appendLog(`--- spawn ${new Date().toISOString()} ${python} ${args.join(" ")} ---`);

  ibkrChild = spawn(python, args, {
    cwd: IBKR_DIR,
    env: {
      ...process.env,
      ...(apiKey ? { INTERNAL_API_KEY: apiKey } : {}),
      LIVE_TRADING_ENABLED: "false",
      IBKR_READ_ONLY: "true",
      TRADING_MODE: process.env.TRADING_MODE || "ANALYSIS_ONLY",
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
    detached: !isWindows(),
  });

  const onChunk = (buf) => {
    const text = buf.toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line) continue;
      appendLog(line);
      process.stdout.write(`[ibkr] ${line}\n`);
    }
  };
  ibkrChild.stdout?.on("data", onChunk);
  ibkrChild.stderr?.on("data", onChunk);

  const register = () => registerChild(ibkrChild.pid, "uvicorn ibkr-broker", "ibkr-fastapi", IBKR_PORT);
  ibkrChild.on("spawn", register);
  if (ibkrChild.pid) register();

  ibkrChild.on("error", (error) => {
    const failed = ibkrChild;
    unregisterChild(failed?.pid, IBKR_PORT);
    ibkrChild = null;
    lastHealthOk = false;
    appendLog(`--- spawn error: ${error.message} ---`);
    log(`✗ FastAPI no se pudo iniciar: ${error.message}`);
    if (!shuttingDown) {
      const delay = RESTART_BACKOFF_MS[Math.min(restartAttempt, RESTART_BACKOFF_MS.length - 1)];
      restartAttempt += 1;
      ibkrRestarts += 1;
      setTimeout(() => spawnIbkr(apiKey), delay);
    }
  });

  ibkrChild.on("exit", (code, signal) => {
    unregisterChild(ibkrChild?.pid, IBKR_PORT);
    lastHealthOk = false;
    const pid = ibkrChild?.pid;
    ibkrChild = null;
    appendLog(`--- exit code=${code} signal=${signal} pid=${pid} ---`);
    if (shuttingDown) return;
    const delay = RESTART_BACKOFF_MS[Math.min(restartAttempt, RESTART_BACKOFF_MS.length - 1)];
    restartAttempt += 1;
    ibkrRestarts += 1;
    log(`⚠ FastAPI salió (code=${code}) — reinicio en ${delay}ms (attempt ${restartAttempt})`);
    setTimeout(() => spawnIbkr(apiKey), delay);
  });
}

function spawnNext(apiKey) {
  if (shuttingDown) return;
  if (hasProductionBuildCache()) {
    log("\n⚠ Detectado build de producción en .next — limpiando antes de dev.");
    const removed = cleanCaches();
    for (const dir of removed) log(`  ✓ Eliminado ${dir}/`);
  }

  logStep(`Arrancando next dev en puerto ${NEXT_PORT}…`);
  log(`  → http://localhost:${NEXT_PORT}/investment\n`);

  nextChild = spawn("npx", ["next", "dev", "--port", String(NEXT_PORT)], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...(apiKey ? { IBKR_INTERNAL_API_KEY: apiKey } : {}),
      LIVE_TRADING_ENABLED: "false",
      IBKR_READ_ONLY: "true",
      TRADING_MODE: process.env.TRADING_MODE || "ANALYSIS_ONLY",
    },
    detached: !isWindows(),
  });

  const register = () => registerChild(nextChild.pid, "next dev", "dev-server", NEXT_PORT);
  nextChild.on("spawn", register);
  if (nextChild.pid) register();

  nextChild.on("error", (error) => {
    log(`✗ Next.js no se pudo iniciar: ${error.message}`);
    unregisterChild(nextChild?.pid, NEXT_PORT);
    nextChild = null;
    if (!shuttingDown) shutdown(1);
  });

  nextChild.on("exit", (code) => {
    unregisterChild(nextChild?.pid, NEXT_PORT);
    nextChild = null;
    if (!shuttingDown) {
      log("Next.js exited — shutting down investment:dev");
      shutdown(code ?? 0);
    }
  });
}

async function healthLoop(apiKey) {
  lastTwsOk = await tcpReachable(IBKR_HOST, TWS_PORT);
  const health = await probeHealth(apiKey);
  if (health.ok) {
    consecutiveHealthFails = 0;
    lastHealthOk = true;
    restartAttempt = 0;
  } else {
    consecutiveHealthFails += 1;
    // Avoid flapping OFFLINE on a single slow probe while Next is compiling.
    lastHealthOk = consecutiveHealthFails < 2 ? lastHealthOk : false;
  }
  printStatus();
  if (!lastTwsOk) {
    log("  · TWS/Gateway :4001 OFFLINE — broker UI shows OFFLINE; ForgeOS continues");
  }
  if (!lastHealthOk && !ibkrChild && !isPortInUse(IBKR_PORT) && !shuttingDown) {
    log("  · FastAPI health failed and process missing — spawning");
    spawnIbkr(apiKey);
  }
}

function terminateChild(child, signal) {
  if (!child?.pid || child.killed) return;
  try {
    if (isWindows()) {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      process.kill(-child.pid, signal);
    }
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* process already stopped */
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logStep("Apagado limpio investment:dev…");
  if (healthTimer) clearInterval(healthTimer);
  terminateChild(nextChild, "SIGINT");
  terminateChild(ibkrChild, "SIGTERM");
  unregisterChild(nextChild?.pid, NEXT_PORT);
  unregisterChild(ibkrChild?.pid, IBKR_PORT);
  setTimeout(() => process.exit(code), 500);
}

async function main() {
  const occupied = [NEXT_PORT, IBKR_PORT].filter((port) => isPortInUse(port));
  if (occupied.length > 0) {
    for (const port of occupied) {
      const pids = getPidsOnPort(port);
      console.error(`\n✗ Puerto ${port} ocupado (PID: ${pids.join(", ")}).`);
    }
    console.error("  Detén el proceso duplicado/ajeno y ejecuta npm run investment:dev de nuevo.\n");
    process.exit(1);
  }

  const apiKey = loadIbkrApiKey();
  if (!apiKey) {
    log("⚠ No INTERNAL_API_KEY found in services/ibkr-broker/.env — health checks may 401");
  }

  lastTwsOk = await tcpReachable(IBKR_HOST, TWS_PORT);
  if (!lastTwsOk) {
    log("⚠ TWS/Gateway not listening on :4001 — continuing (broker OFFLINE until available)");
  } else {
    log("✓ TWS/Gateway reachable on :4001");
  }

  spawnIbkr(apiKey);

  spawnNext(apiKey);

  // Initial health wait (non-blocking for Next)
  for (let i = 0; i < 10; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    const h = await probeHealth(apiKey);
    if (h.ok) {
      lastHealthOk = true;
      restartAttempt = 0;
      break;
    }
  }
  printStatus();

  healthTimer = setInterval(() => {
    void healthLoop(apiKey);
  }, HEALTH_INTERVAL_MS);

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

main().catch((err) => {
  console.error(err);
  shutdown(1);
});
