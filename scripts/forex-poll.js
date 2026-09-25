#!/usr/bin/env node
/**
 * FOREX cycle sidecar — every 5 min in Madrid trading window (07:00–22:00).
 * Triggers /api/investment/forex?action=cycle&staged=false when FOREX_ENABLED.
 * Cycle never places at IBKR — Telegram APROBAR/RECHAZAR is the gate.
 * Also fires Europe-open (08:00) and session-close (22:00) Telegram reports once/day.
 */
const http = require("http");
const { loadEnvLocal, log, internalApiHeaders } = require("./_utils");

loadEnvLocal();

if (process.env.FOREX_POLL_ENABLED === "false") {
  log("[forex-poll] omitido — FOREX_POLL_ENABLED=false");
  process.exit(0);
}

const BASE = process.env.FORGEOS_SCANNER_BASE_URL ?? "http://127.0.0.1:3000";
const ACTIVE_MS = 5 * 60 * 1000;
const IDLE_MS = 15 * 60 * 1000;
const CYCLE_TIMEOUT_MS = 60_000;

function isForexEnabled() {
  const raw = (process.env.FOREX_ENABLED ?? process.env.ALLOW_FOREX ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

function madridParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "0";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    weekend: weekday.startsWith("Sat") || weekday.startsWith("Sun"),
    hour,
    minute,
    mins: hour * 60 + minute,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function post(path, bodyObj = {}, timeoutMs = CYCLE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const payload = JSON.stringify(bodyObj);
    const headers = internalApiHeaders({
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    });
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: "POST",
        timeout: timeoutMs,
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: `timeout after ${timeoutMs}ms` });
    });
    req.on("error", (err) => resolve({ status: 0, body: String(err) }));
    req.write(payload);
    req.end();
  });
}

const sent = { open: "", close: "" };

async function tick() {
  const m = madridParts();
  const active = !m.weekend && m.mins >= 7 * 60 && m.mins < 22 * 60;

  if (!m.weekend && m.hour === 8 && m.minute < 10 && sent.open !== m.dateKey) {
    const r = await post("/api/investment/forex?action=europe-open");
    log(`[forex-poll] europe-open ${r.status}`);
    sent.open = m.dateKey;
  }
  if (!m.weekend && m.hour === 22 && m.minute < 10 && sent.close !== m.dateKey) {
    const r = await post("/api/investment/forex?action=session-close");
    log(`[forex-poll] session-close ${r.status}`);
    sent.close = m.dateKey;
  }

  if (active) {
    const live = isForexEnabled();
    const staged = live ? "false" : "true";
    const r = await post(
      `/api/investment/forex?action=cycle&staged=${staged}`,
      { staged: live ? false : true },
    );
    log(`[forex-poll] cycle staged=${staged} ${r.status} ${String(r.body).slice(0, 160)}`);
  } else {
    log("[forex-poll] idle — fuera de ventana FOREX");
  }

  setTimeout(tick, active ? ACTIVE_MS : IDLE_MS);
}

log(`[forex-poll] start base=${BASE} FOREX_ENABLED=${isForexEnabled()} timeout=${CYCLE_TIMEOUT_MS}ms`);
tick();
