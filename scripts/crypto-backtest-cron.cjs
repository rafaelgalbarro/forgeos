/**
 * Runs crypto-backtest.ts once per day at 03:00 Europe/Madrid.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || ROOT;

let lastRunDay = "";

function madridParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.CRYPTO_BACKTEST_TZ || "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    dayKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function runBacktest() {
  const stub = path.join(__dirname, "stub-server-only.cjs");
  const script = path.join(__dirname, "crypto-backtest.ts");
  console.log(`[CryptoBacktestCron] launching ${script}`);
  const child = spawn(
    process.execPath,
    ["--require", stub, "--import", "tsx", script],
    { cwd: ROOT, env: process.env, stdio: "inherit" },
  );
  child.on("exit", (code) => {
    console.log(`[CryptoBacktestCron] exit code=${code}`);
  });
}

const targetHour = Number(process.env.CRYPTO_BACKTEST_HOUR ?? 3);

setInterval(() => {
  const { dayKey, hour, minute } = madridParts();
  if (hour === targetHour && minute < 5 && lastRunDay !== dayKey) {
    lastRunDay = dayKey;
    runBacktest();
  }
}, 30_000);

console.log(
  `[CryptoBacktestCron] watching ${targetHour}:00 Europe/Madrid FORGEOS_ROOT=${process.env.FORGEOS_ROOT}`,
);
