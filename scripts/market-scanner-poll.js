#!/usr/bin/env node
/**
 * MarketScanner sidecar — 5 min mercado activo, 30 min fuera de horario.
 * Dispara daily-pipeline (sesiones 06:00 / 08:45 / 15:15 / 22:00 Madrid)
 * y /api/investment/multi-scanner?cycle=1
 */
const http = require("http");
const { loadEnvLocal, log } = require("./_utils");

loadEnvLocal();

const BASE = process.env.FORGEOS_SCANNER_BASE_URL ?? "http://127.0.0.1:3000";
const ACTIVE_MS = 5 * 60 * 1000;
const OFFHOURS_MS = 30 * 60 * 1000;

function madridMins() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "Mon").toLowerCase();
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { weekday, mins: h * 60 + m };
}

function getUsSessionPhase() {
  const { weekday, mins } = madridMins();
  if (weekday.startsWith("sat") || weekday.startsWith("sun")) return "CLOSED";
  if (mins >= 540 && mins < 930) return "PRE_MARKET";
  if (mins >= 930 && mins < 1320) return "REGULAR";
  if (mins >= 1320 || mins < 60) return "AFTER_MARKET";
  return "CLOSED";
}

function inPipelineWindow() {
  const { weekday, mins } = madridMins();
  if (weekday.startsWith("sat") || weekday.startsWith("sun")) return false;
  return (
    (mins >= 350 && mins < 400) ||
    (mins >= 515 && mins < 565) ||
    (mins >= 905 && mins < 955) ||
    (mins >= 1310 && mins < 1360)
  );
}

function intervalMs() {
  if (inPipelineWindow()) return ACTIVE_MS;
  const phase = getUsSessionPhase();
  return phase === "REGULAR" || phase === "PRE_MARKET" || phase === "AFTER_MARKET"
    ? ACTIVE_MS
    : OFFHOURS_MS;
}

function httpGet(pathname) {
  return new Promise((resolve) => {
    const url = new URL(pathname, BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: "GET",
        timeout: 300_000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", (err) => {
      log(`[market-scanner-poll] ${pathname} error: ${err.message}`);
      resolve(0);
    });
    req.on("timeout", () => {
      req.destroy();
      log(`[market-scanner-poll] ${pathname} timeout`);
      resolve(0);
    });
    req.end();
  });
}

async function triggerCycle() {
  const pipeCode = await httpGet("/api/investment/daily-pipeline?session=auto");
  log(`[market-scanner-poll] pipeline HTTP ${pipeCode}`);
  const cycleCode = await httpGet("/api/investment/multi-scanner?cycle=1");
  log(`[market-scanner-poll] cycle HTTP ${cycleCode}`);
}

async function loop() {
  const phase = getUsSessionPhase();
  log(
    `[market-scanner-poll] ▶ fase=${phase} pipelineWindow=${inPipelineWindow()} interval=${intervalMs() / 1000}s`,
  );
  await triggerCycle();
  setTimeout(loop, intervalMs());
}

setTimeout(loop, 15_000);
