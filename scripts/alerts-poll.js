#!/usr/bin/env node
/**
 * Alerts sidecar — evalúa alertas y watchlist cada 2 min (mercado activo) o 10 min (cerrado).
 */
const http = require("http");
const { loadEnvLocal, log, internalApiHeaders } = require("./_utils");

loadEnvLocal();

if (process.env.ALERTS_POLL_ENABLED === "false") {
  log("[alerts-poll] omitido — ALERTS_POLL_ENABLED=false");
  process.exit(0);
}

const BASE = process.env.FORGEOS_SCANNER_BASE_URL ?? "http://127.0.0.1:3000";
const ACTIVE_MS = 2 * 60 * 1000;
const OFFHOURS_MS = 10 * 60 * 1000;

function getUsSessionPhase() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "Mon").toLowerCase();
  if (weekday.startsWith("sat") || weekday.startsWith("sun")) return "CLOSED";
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const mins = h * 60 + m;
  if (mins >= 540 && mins < 930) return "PRE_MARKET";
  if (mins >= 930 && mins < 1320) return "REGULAR";
  if (mins >= 1320 || mins < 60) return "AFTER_MARKET";
  return "CLOSED";
}

function intervalMs() {
  const phase = getUsSessionPhase();
  return phase === "REGULAR" || phase === "PRE_MARKET" || phase === "AFTER_MARKET"
    ? ACTIVE_MS
    : OFFHOURS_MS;
}

function evaluateAlerts() {
  return new Promise((resolve) => {
    const url = new URL("/api/investment/alerts?evaluate=1", BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: "GET",
        timeout: 120_000,
        headers: internalApiHeaders(),
      },
      (res) => {
        res.resume();
        log(`[alerts-poll] evaluate HTTP ${res.statusCode}`);
        resolve(res.statusCode);
      },
    );
    req.on("error", (err) => {
      log(`[alerts-poll] error: ${err.message}`);
      resolve(0);
    });
    req.on("timeout", () => {
      req.destroy();
      log("[alerts-poll] timeout");
      resolve(0);
    });
    req.end();
  });
}

async function loop() {
  const phase = getUsSessionPhase();
  log(`[alerts-poll] ▶ fase=${phase} interval=${intervalMs() / 1000}s`);
  await evaluateAlerts();
  setTimeout(loop, intervalMs());
}

setTimeout(loop, 20_000);
