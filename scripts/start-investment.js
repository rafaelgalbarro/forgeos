#!/usr/bin/env node
/**
 * ForgeOS Investment — arranque unificado
 * uvicorn (:8002) + connect IBKR + next dev (:3000)
 * Reinicia uvicorn automáticamente si se cae.
 */
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { ROOT, log, logStep, isPortInUse, isWindows, loadEnvLocal } = require("./_utils");

const FASTAPI_PORT = 8002;
const NEXT_PORT = 3000;
const TWS_PORT = 7497;
const HOST = "127.0.0.1";
const IBKR_DIR = path.join(ROOT, "services", "ibkr-broker");
const LOG_DIR = path.join(ROOT, ".forgeos", "logs");
const LOG_FILE = path.join(LOG_DIR, "ibkr-fastapi.log");
const RESTART_MS = [2_000, 5_000, 10_000, 20_000];

let shuttingDown = false;
let ibkrChild = null;
let nextChild = null;
let telegramChild = null;
let scannerChild = null;
let alertsChild = null;
let reportsChild = null;
let restartAttempt = 0;
let connectTimer = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readEnvValue(key) {
  const fromProcess = process.env[key];
  if (fromProcess && String(fromProcess).trim()) return String(fromProcess).trim();
  const envPath = path.join(IBKR_DIR, ".env");
  if (!fs.existsSync(envPath)) return "";
  const raw = fs.readFileSync(envPath, "utf8");
  const re = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, "m");
  const m = raw.match(re);
  if (!m) return "";
  return m[1].replace(/^["']|["']$/g, "").trim();
}

function loadSecrets() {
  const apiKey =
    readEnvValue("INTERNAL_API_KEY") || readEnvValue("IBKR_INTERNAL_API_KEY");
  const approvalSecret = readEnvValue("APPROVAL_SECRET");
  return { apiKey, approvalSecret };
}

function resolvePython() {
  const win = path.join(IBKR_DIR, ".venv", "Scripts", "python.exe");
  const nix = path.join(IBKR_DIR, ".venv", "bin", "python");
  if (fs.existsSync(win)) return win;
  if (fs.existsSync(nix)) return nix;
  return isWindows() ? "python" : "python3";
}

function appendLog(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${line}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function probeHealth(apiKey) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: HOST,
        port: FASTAPI_PORT,
        path: "/health",
        method: "GET",
        timeout: 2_500,
        headers: apiKey ? { "X-Internal-Api-Key": apiKey } : {},
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function postConnect(apiKey) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: HOST,
        port: FASTAPI_PORT,
        path: "/api/ibkr/connect",
        method: "POST",
        timeout: 45_000,
        headers: apiKey
          ? { "X-Internal-Api-Key": apiKey, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForHealth(apiKey, label) {
  logStep(`Esperando FastAPI (${label})…`);
  for (let i = 0; i < 90; i += 1) {
    if (await probeHealth(apiKey)) {
      log("  ✓ FastAPI listo en /health");
      return true;
    }
    await sleep(1_000);
  }
  log("  ✗ FastAPI no respondió a /health en 90s");
  return false;
}

async function connectIbkr(apiKey) {
  logStep("Conectando IBKR (/api/ibkr/connect)…");
  const ok = await postConnect(apiKey);
  if (ok) log("  ✓ IBKR connect OK");
  else log("  ⚠ IBKR connect falló — TWS puede estar offline; se reintentará");
}

function buildIbkrProcessEnv(apiKey, approvalSecret) {
  loadEnvLocal();
  const live = process.env.LIVE_TRADING_ENABLED?.trim() || readEnvValue("LIVE_TRADING_ENABLED") || "false";
  const liveOn = ["1", "true", "yes", "on"].includes(live.toLowerCase());
  const readOnly =
    process.env.IBKR_READ_ONLY?.trim() ||
    readEnvValue("IBKR_READ_ONLY") ||
    (liveOn ? "false" : "true");
  const tradingMode =
    process.env.TRADING_MODE?.trim() || readEnvValue("TRADING_MODE") || (liveOn ? "live" : "ANALYSIS_ONLY");
  return {
    ...process.env,
    IBKR_HOST: HOST,
    IBKR_PORT: String(TWS_PORT),
    INTERNAL_API_KEY: apiKey,
    APPROVAL_SECRET: approvalSecret,
    IBKR_READ_ONLY: readOnly,
    LIVE_TRADING_ENABLED: live,
    FOREX_ENABLED: process.env.FOREX_ENABLED?.trim() || readEnvValue("FOREX_ENABLED") || "false",
    TRADING_MODE: tradingMode,
  };
}

function scheduleConnect(apiKey) {
  if (connectTimer) clearTimeout(connectTimer);
  connectTimer = setTimeout(() => {
    void connectIbkr(apiKey);
  }, 500);
}

function spawnIbkr(apiKey, approvalSecret) {
  if (shuttingDown || ibkrChild) return;

  if (isPortInUse(FASTAPI_PORT)) {
    log("Puerto 8002 ya en uso — reutilizando FastAPI existente");
    void waitForHealth(apiKey, "reuse").then((ok) => {
      if (ok) scheduleConnect(apiKey);
    });
    return;
  }

  if (!fs.existsSync(path.join(IBKR_DIR, "app", "main.py"))) {
    log("✗ Falta services/ibkr-broker — no se puede arrancar uvicorn");
    return;
  }

  const python = resolvePython();
  const args = ["-m", "uvicorn", "app.main:app", "--host", HOST, "--port", String(FASTAPI_PORT)];
  logStep(`Arrancando uvicorn en ${HOST}:${FASTAPI_PORT} (TWS → ${TWS_PORT})…`);
  appendLog(`spawn ${new Date().toISOString()} ${python} ${args.join(" ")}`);

  ibkrChild = spawn(python, args, {
    cwd: IBKR_DIR,
    env: buildIbkrProcessEnv(apiKey, approvalSecret),
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
  });

  const onLine = (buf) => {
    for (const line of buf.toString("utf8").split(/\r?\n/)) {
      if (!line) continue;
      appendLog(line);
      process.stdout.write(`[ibkr] ${line}\n`);
    }
  };
  ibkrChild.stdout?.on("data", onLine);
  ibkrChild.stderr?.on("data", onLine);

  ibkrChild.on("error", (err) => {
    log(`✗ uvicorn error: ${err.message}`);
    ibkrChild = null;
    scheduleIbkrRestart(apiKey, approvalSecret);
  });

  ibkrChild.on("exit", (code, signal) => {
    appendLog(`exit code=${code} signal=${signal}`);
    ibkrChild = null;
    if (shuttingDown) return;
    log(`⚠ uvicorn terminó (code=${code}) — reiniciando…`);
    scheduleIbkrRestart(apiKey, approvalSecret);
  });

  void waitForHealth(apiKey, "startup").then((ok) => {
    if (ok) {
      restartAttempt = 0;
      scheduleConnect(apiKey);
    }
  });
}

function scheduleIbkrRestart(apiKey, approvalSecret) {
  if (shuttingDown) return;
  const delay = RESTART_MS[Math.min(restartAttempt, RESTART_MS.length - 1)];
  restartAttempt += 1;
  setTimeout(() => spawnIbkr(apiKey, approvalSecret), delay);
}

function spawnTelegramPoll() {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    log("Telegram poll omitido — TELEGRAM_BOT_TOKEN no configurado");
    return;
  }
  const script = path.join(ROOT, "scripts", "telegram-poll.js");
  logStep("Arrancando Telegram poll sidecar…");
  telegramChild = spawn(process.execPath, [script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
    windowsHide: true,
  });
  telegramChild.on("exit", () => {
    telegramChild = null;
  });
}

function spawnMarketScannerPoll() {
  if (process.env.MARKET_SCANNER_ENABLED === "false") {
    log("Market scanner poll omitido — MARKET_SCANNER_ENABLED=false");
    return;
  }
  const script = path.join(ROOT, "scripts", "market-scanner-poll.js");
  logStep("Arrancando MarketScanner sidecar (multi-IA)…");
  scannerChild = spawn(process.execPath, [script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
    windowsHide: true,
  });
  scannerChild.on("exit", () => {
    scannerChild = null;
  });
}

function spawnAlertsPoll() {
  if (process.env.ALERTS_POLL_ENABLED === "false") {
    log("Alerts poll omitido — ALERTS_POLL_ENABLED=false");
    return;
  }
  const script = path.join(ROOT, "scripts", "alerts-poll.js");
  logStep("Arrancando Alerts poll sidecar (watchlist + alertas)…");
  alertsChild = spawn(process.execPath, [script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
    windowsHide: true,
  });
  alertsChild.on("exit", () => {
    alertsChild = null;
  });
}

function spawnReportsPoll() {
  if (process.env.REPORTS_POLL_ENABLED === "false") {
    log("Reports poll omitido — REPORTS_POLL_ENABLED=false");
    return;
  }
  const script = path.join(ROOT, "scripts", "reports-poll.js");
  logStep("Arrancando Reports poll sidecar (Telegram daily/weekly)…");
  reportsChild = spawn(process.execPath, [script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
    windowsHide: true,
  });
  reportsChild.on("exit", () => {
    reportsChild = null;
  });
}

function spawnNext(apiKey) {
  loadEnvLocal();
  const live = process.env.LIVE_TRADING_ENABLED?.trim() || "false";
  const liveOn = ["1", "true", "yes", "on"].includes(live.toLowerCase());
  const readOnly = process.env.IBKR_READ_ONLY?.trim() || (liveOn ? "false" : "true");
  const forex = process.env.FOREX_ENABLED?.trim() || "false";
  const tradingMode = process.env.TRADING_MODE?.trim() || (liveOn ? "live" : "ANALYSIS_ONLY");

  logStep(`Arrancando next dev en :${NEXT_PORT}…`);
  log(`  → http://localhost:${NEXT_PORT}/investment`);
  log(`  flags LIVE=${live} READ_ONLY=${readOnly} FOREX=${forex} MODE=${tradingMode}\n`);

  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  nextChild = spawn(process.execPath, [nextBin, "dev", "--port", String(NEXT_PORT)], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      IBKR_INTERNAL_API_KEY: apiKey,
      IBKR_SERVICE_URL: `http://${HOST}:${FASTAPI_PORT}`,
      LIVE_TRADING_ENABLED: live,
      IBKR_READ_ONLY: readOnly,
      FOREX_ENABLED: forex,
      TRADING_MODE: tradingMode,
    },
    windowsHide: true,
  });

  nextChild.on("error", (err) => {
    log(`✗ Next.js error: ${err.message}`);
    shutdown(1);
  });

  nextChild.on("exit", (code) => {
    if (!shuttingDown) shutdown(code ?? 0);
  });
}

function killChild(child) {
  if (!child?.pid) return;
  try {
    if (isWindows()) {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    /* already dead */
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (connectTimer) clearTimeout(connectTimer);
  logStep("Apagando ForgeOS Investment…");
  killChild(nextChild);
  killChild(ibkrChild);
  killChild(telegramChild);
  killChild(scannerChild);
  killChild(alertsChild);
  killChild(reportsChild);
  setTimeout(() => process.exit(code), 400);
}

async function main() {
  loadEnvLocal();
  const { apiKey, approvalSecret } = loadSecrets();
  if (!apiKey) {
    log("✗ Falta INTERNAL_API_KEY en services/ibkr-broker/.env");
    process.exit(1);
  }
  if (!approvalSecret) {
    log("✗ Falta APPROVAL_SECRET en services/ibkr-broker/.env");
    process.exit(1);
  }

  log("\n=== ForgeOS Investment (unified start) ===\n");

  spawnIbkr(apiKey, approvalSecret);
  spawnNext(apiKey);
  spawnTelegramPoll();
  spawnMarketScannerPoll();
  spawnAlertsPoll();
  spawnReportsPoll();

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

main().catch((err) => {
  console.error(err);
  shutdown(1);
});
