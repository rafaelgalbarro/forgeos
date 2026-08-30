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
/** POST /api/trading/cycle — allow up to 5 min for large universes. */
const TIMEOUT_MS = 300_000;
/** Fixed cycle interval — 3 minutes (was drifting to 900s via API). */
const CYCLE_INTERVAL_MS = 180_000;

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

/** Ciclo cada 3 minutos — fijo (no usar 900s standby del API). */
function localIntervalMs() {
  return CYCLE_INTERVAL_MS;
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
      if (Number.isFinite(ms) && ms >= 30_000 && ms <= CYCLE_INTERVAL_MS) return ms;
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

    const res = await fetch(`${BASE_URL}/api/trading/cycle`, {
      method: "POST",
      headers: {
        "x-internal-api-key": API_KEY,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(
        `[Scheduler] Ciclo HTTP ${res.status}:`,
        body.slice(0, 300) || res.statusText,
      );
      return;
    }
    console.log("[Scheduler] Ciclo completado:", new Date().toISOString(), `status=${res.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/timeout|timed?\s*out|AbortError|aborted|ETIMEDOUT/i.test(msg)) {
      console.log("[Scheduler] Ciclo en progreso, esperando...");
      return;
    }
    console.error("[Scheduler] Error en ciclo:", msg);
  }
}

async function loop() {
  const interval = await resolveIntervalMs();
  console.log(`[Scheduler] Próximo ciclo en ${interval / 1000}s…`);
  await runCycle();
  setTimeout(() => {
    void loop();
  }, interval);
}

console.log(
  `[Scheduler] Iniciando ciclo adaptativo 24h (Madrid)… key=${API_KEY ? `set(len=${API_KEY.length})` : "MISSING"}`,
);
void loop();
