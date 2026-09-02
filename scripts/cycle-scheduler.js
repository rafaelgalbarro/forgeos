/**
 * PM2 trading-cycle scheduler — adaptive interval by Madrid session.
 * Next.js does not keep setInterval across deploys/requests.
 *
 * Loads IBKR_INTERNAL_API_KEY from process.env or .env.local
 * (/var/www/forgeos/.env.local on server, or cwd/.env.local locally).
 *
 * Usage: pm2 start ecosystem.config.js --only forgeos-scheduler
 */
const fs = require("node:fs");
const path = require("node:path");

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
      if (key && process.env[key] == null) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn(
      "[Scheduler] No se pudo leer env file:",
      filePath,
      err instanceof Error ? err.message : err,
    );
  }
}

const envCandidates = [
  process.env.FORGEOS_ENV_FILE,
  "/var/www/forgeos/.env.local",
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(__dirname, "..", ".env.local"),
].filter(Boolean);

for (const candidate of envCandidates) {
  loadEnvFile(candidate);
}

const API_KEY = process.env.IBKR_INTERNAL_API_KEY;
const BASE_URL = (process.env.FORGEOS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT_MS = 180_000;

function madridParts() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "Mon").toLowerCase();
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return {
    weekday,
    hour,
    minute,
    nowMinutes: hour * 60 + minute,
    weekend: weekday.startsWith("sat") || weekday.startsWith("sun"),
  };
}

/** Mirrors getTradingCycleIntervalMs in market-session.ts */
function localIntervalMs() {
  const { nowMinutes, weekend, hour } = madridParts();
  if (weekend) {
    if (hour >= 22 || hour < 2) return 5 * 60 * 1000;
    return 60 * 1000;
  }
  // USA apertura 14:30–15:30 (+ premarket 14:00) → 1m
  if (nowMinutes >= 14 * 60 && nowMinutes < 15 * 60 + 30) return 60 * 1000;
  // Asia 01:00–08:00 → 5m
  if (hour >= 1 && hour < 8) return 5 * 60 * 1000;
  // After-hours 21:00–02:00 → 5m
  if (hour >= 21 || hour < 2) return 5 * 60 * 1000;
  // Europe 09:00–17:30 + USA regular 15:30–21:00 → 3m
  if (hour >= 9 && (hour < 17 || (hour === 17 && nowMinutes < 17 * 60 + 30))) return 3 * 60 * 1000;
  if (nowMinutes >= 15 * 60 + 30 && nowMinutes < 21 * 60) return 3 * 60 * 1000;
  return 15 * 60 * 1000;
}

async function resolveIntervalMs() {
  try {
    const res = await fetch(`${BASE_URL}/api/trading/cycle`, {
      method: "GET",
      headers: API_KEY ? { "x-internal-api-key": API_KEY } : {},
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const json = await res.json();
      const ms = Number(json?.config?.cycleIntervalMs ?? json?.cycleIntervalMs);
      if (Number.isFinite(ms) && ms >= 30_000 && ms <= 30 * 60 * 1000) return ms;
    }
  } catch {
    /* fall through */
  }
  return localIntervalMs();
}

async function runCycle() {
  if (!API_KEY) {
    console.error(
      "[Scheduler] Falta IBKR_INTERNAL_API_KEY — ciclo omitido (set in .env.local or PM2 env)",
    );
    return;
  }
  try {
    await fetch(`${BASE_URL}/api/investment/daily-pipeline?session=auto`, {
      method: "GET",
      headers: { "x-internal-api-key": API_KEY },
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);

    const endpoints = [
      "/api/trading/cycle/stocks",
      "/api/trading/cycle/crypto",
      "/api/trading/cycle/forex",
    ];

    const results = await Promise.all(
      endpoints.map(async (path) => {
        const res = await fetch(`${BASE_URL}${path}`, {
          method: "POST",
          headers: {
            "x-internal-api-key": API_KEY,
            "content-type": "application/json",
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const body = await res.text().catch(() => "");
        return { path, status: res.status, ok: res.ok, body: body.slice(0, 200) };
      }),
    );

    const failed = results.filter((r) => !r.ok && r.status !== 409);
    if (failed.length > 0) {
      for (const r of failed) {
        console.error(`[Scheduler] ${r.path} HTTP ${r.status}:`, r.body || "error");
      }
      return;
    }

    const skipped = results.filter((r) => r.status === 409);
    const ok = results.filter((r) => r.ok);
    console.log(
      "[Scheduler] Ciclos typed completados:",
      new Date().toISOString(),
      `ok=${ok.length} skipped=${skipped.length}`,
      ok.map((r) => r.path.replace("/api/trading/cycle/", "")).join(", "),
    );
  } catch (err) {
    console.error("[Scheduler] Error en ciclo:", err instanceof Error ? err.message : String(err));
  }
}

async function loop() {
  const interval = 3 * 60 * 1000;
  console.log(`[Scheduler] Próximo ciclo typed (stocks+crypto+forex) en ${interval / 1000}s…`);
  await runCycle();
  setTimeout(() => {
    void loop();
  }, interval);
}

console.log(
  `[Scheduler] Iniciando 3 ciclos typed cada 3min (stocks/crypto/forex)… key=${API_KEY ? `set(len=${API_KEY.length})` : "MISSING"}`,
);
void loop();
