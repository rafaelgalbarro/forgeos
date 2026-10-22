/**
 * Forex bot loop (PM2: forgeos-forex-bot). One cycle per minute; decisions only on closed M15 bars.
 */

import { runForexBotCycle } from "@/lib/forex-bot/engine";

const INTERVAL_MS = Math.max(30_000, Number(process.env.FOREX_BOT_INTERVAL_MS ?? 60_000) || 60_000);
let busy = false;

async function tick(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    console.log(`${new Date().toISOString()} ${await runForexBotCycle()}`);
  } catch (err) {
    console.error(`${new Date().toISOString()} [ForexBot] ciclo falló:`, err instanceof Error ? err.message : err);
  } finally {
    busy = false;
  }
}

console.log(`[ForexBot] arranque intervalo=${INTERVAL_MS}ms`);
void tick();
setInterval(() => void tick(), INTERVAL_MS);
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
