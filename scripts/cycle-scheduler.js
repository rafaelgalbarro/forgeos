/**
 * PM2 trading-cycle scheduler — adaptive interval by Madrid session.
 * Next.js does not keep setInterval across deploys/requests.
 *
 * Usage: pm2 start ecosystem.config.js --only forgeos-scheduler
 */
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
    return 15 * 60 * 1000;
  }
  if (nowMinutes >= 14 * 60 + 30 && nowMinutes < 15 * 60 + 30) return 60 * 1000;
  if (nowMinutes >= 9 * 60 && nowMinutes < 10 * 60) return 60 * 1000;
  if (hour >= 22 || hour < 2) return 5 * 60 * 1000;
  if (hour >= 1 && hour < 8) return 3 * 60 * 1000;
  if (hour >= 9 && (hour < 17 || (hour === 17 && minuteOk(nowMinutes)))) return 3 * 60 * 1000;
  if (nowMinutes >= 14 * 60 && nowMinutes < 14 * 60 + 30) return 3 * 60 * 1000;
  if (nowMinutes >= 15 * 60 + 30 && nowMinutes < 21 * 60) return 3 * 60 * 1000;
  return 15 * 60 * 1000;
}

function minuteOk(nowMinutes) {
  return nowMinutes < 17 * 60 + 30;
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
    console.error("[Scheduler] Falta IBKR_INTERNAL_API_KEY — ciclo omitido");
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
    console.error("[Scheduler] Error en ciclo:", err instanceof Error ? err.message : String(err));
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

console.log("[Scheduler] Iniciando ciclo adaptativo 24h (Madrid)…");
void loop();
