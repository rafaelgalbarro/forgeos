/**
 * PM2 trading-cycle scheduler — survives Next.js deploys / request lifecycle.
 * Next.js does not keep setInterval across requests; this process owns the timer.
 *
 * Usage: pm2 start ecosystem.config.js --only forgeos-scheduler
 */
const API_KEY = process.env.IBKR_INTERNAL_API_KEY;
const BASE_URL = (process.env.FORGEOS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const INTERVAL = 3 * 60 * 1000; // 3 minutes
const TIMEOUT_MS = 180_000;

async function runCycle() {
  if (!API_KEY) {
    console.error("[Scheduler] Falta IBKR_INTERNAL_API_KEY — ciclo omitido");
    return;
  }
  try {
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

console.log("[Scheduler] Iniciando ciclo cada 3 minutos…");
runCycle();
setInterval(runCycle, INTERVAL);
