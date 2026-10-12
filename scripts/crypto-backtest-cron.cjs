/**
 * Runs crypto-backtest.ts once per day at 03:00 Europe/Madrid with --apply.
 * Loads .env.local like crypto-engine.cjs so Telegram keys work.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !(process.env[key] ?? "").trim()) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn(
      "[CryptoBacktestCron] env:",
      filePath,
      err instanceof Error ? err.message : err,
    );
  }
}

const ROOT = path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || ROOT;
const envCandidates = [
  process.env.FORGEOS_ENV_FILE,
  "/var/www/forgeos/.env.local",
  path.join(ROOT, ".env.local"),
].filter(Boolean);
for (const candidate of envCandidates) {
  loadEnvFile(candidate);
}

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
  console.log(`[CryptoBacktestCron] launching ${script} --apply`);
  const child = spawn(
    process.execPath,
    ["--require", stub, "--import", "tsx", script, "--apply"],
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
