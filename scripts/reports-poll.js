#!/usr/bin/env node
/**
 * Telegram reports sidecar — polls every 2–5 min and triggers scheduled
 * ForgeOS Investment reports via Next.js API.
 *
 * Schedule (Europe/Madrid) in lib/notifications/report-generator.ts:
 *   Morning — market days at REPORT_MORNING_HOUR:MINUTE (default 08:30) + PDF
 *   Daily   — market days at REPORT_DAILY_HOUR (default 22:00) + PDF
 *   Weekly  — Sundays at REPORT_WEEKLY_HOUR (default 20:00) + PDF
 */
const http = require("http");
const { loadEnvLocal, log } = require("./_utils");

loadEnvLocal();

if (process.env.REPORTS_POLL_ENABLED === "false") {
  log("[reports-poll] omitido — REPORTS_POLL_ENABLED=false");
  process.exit(0);
}

const BASE = process.env.FORGEOS_SCANNER_BASE_URL ?? "http://127.0.0.1:3000";
const POLL_MS = (() => {
  const n = Number(process.env.REPORTS_POLL_MS ?? 120_000);
  if (!Number.isFinite(n)) return 120_000;
  return Math.min(5 * 60_000, Math.max(60_000, Math.floor(n)));
})();

function triggerAuto() {
  return new Promise((resolve) => {
    const url = new URL("/api/investment/reports?type=auto", BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: "POST",
        timeout: 180_000,
        headers: { "Content-Type": "application/json", "Content-Length": "0" },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          let summary = "";
          try {
            const parsed = JSON.parse(body);
            const m = parsed.morning?.sent
              ? "morning_sent"
              : parsed.morning?.skippedReason ?? "morning_idle";
            const d = parsed.daily?.sent ? "daily_sent" : parsed.daily?.skippedReason ?? "daily_idle";
            const w = parsed.weekly?.sent
              ? "weekly_sent"
              : parsed.weekly?.skippedReason ?? "weekly_idle";
            const clock = parsed.madridNow
              ? `${parsed.madridNow.dateKey} ${String(parsed.madridNow.hour).padStart(2, "0")}:${String(parsed.madridNow.minute).padStart(2, "0")}`
              : "?";
            summary = ` madrid=${clock} ${m} ${d} ${w}`;
          } catch {
            summary = "";
          }
          log(`[reports-poll] auto HTTP ${res.statusCode}${summary}`);
          resolve(res.statusCode);
        });
      },
    );
    req.on("error", (err) => {
      log(`[reports-poll] error: ${err.message}`);
      resolve(0);
    });
    req.on("timeout", () => {
      req.destroy();
      log("[reports-poll] timeout");
      resolve(0);
    });
    req.end();
  });
}

async function loop() {
  log(`[reports-poll] ▶ interval=${POLL_MS / 1000}s`);
  await triggerAuto();
  setTimeout(loop, POLL_MS);
}

setTimeout(loop, 45_000);
