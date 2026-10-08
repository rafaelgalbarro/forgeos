import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, highestHigh, lowestLow } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

function zonedParts(
  date: Date,
  timeZone: string,
): { hour: number; minute: number; dayKey: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    dayKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/**
 * True during first ~30 min after Europe open (08:00 Europe/London)
 * or US open (09:30 America/New_York) — IANA only.
 */
export function isSessionOpenWindow(at: Date = new Date()): {
  active: boolean;
  session: "EU" | "US" | null;
} {
  const lon = zonedParts(at, "Europe/London");
  const ny = zonedParts(at, "America/New_York");
  // Europe: 08:00–08:30 London
  if (lon.hour === 8 && lon.minute < 30) return { active: true, session: "EU" };
  // US: 09:30–10:00 New York
  if (ny.hour === 9 && ny.minute >= 30) return { active: true, session: "US" };
  if (ny.hour === 10 && ny.minute === 0) return { active: true, session: "US" };
  return { active: false, session: null };
}

/**
 * SESSION_OPEN_BREAKOUT: break prior 2h range at EU/US session open.
 */
export function evaluateSessionOpenBreakout(
  bars15: readonly Bar[],
  at: Date = new Date(),
): CryptoStrategySignal {
  const id = "SESSION_OPEN_BREAKOUT" as const;
  const win = isSessionOpenWindow(at);
  if (!win.active) return holdSignal(id, "fuera de ventana apertura EU/US");
  if (bars15.length < 12) return holdSignal(id, "insuficientes barras");

  // Prior 2h = 8 × 15m bars before last
  const prior = bars15.slice(-9, -1);
  const hi = highestHigh(prior, prior.length);
  const lo = lowestLow(prior, prior.length);
  const last = bars15[bars15.length - 1]!;
  if (hi == null || lo == null) return holdSignal(id, "rango 2h n/a");

  if (!(last.close > hi && last.high >= hi)) {
    return holdSignal(id, "sin ruptura rango 2h");
  }

  const entry = last.close;
  const a = atr(bars15, 14) ?? (hi - lo) * 0.5;
  const stopLoss = Math.max(lo, entry - a);
  const takeProfit = entry + (entry - stopLoss) * 2;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.68,
    reasoning: `SESSION_OPEN ${win.session} break hi=${hi.toFixed(4)}`,
    entry,
    stopLoss,
    takeProfit,
    expectedMovePct: (takeProfit - entry) / entry,
    maxHoldMs: 6 * 3600_000,
    atr: a,
    stopLossPct: (entry - stopLoss) / entry,
    riskR: entry - stopLoss,
    candleTime: last.time,
  };
}
