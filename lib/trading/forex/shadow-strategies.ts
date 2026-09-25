/**
 * Forex intradía — SHADOW by default (no live orders).
 * Pairs: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF, USDCAD.
 * LONDON_BREAKOUT (07:00–09:00 Madrid range) + NY_OVERLAP_MOMENTUM (14:30–17:00).
 */

import "server-only";

import type { OhlcvBar } from "@/lib/market-data/types";

export const FOREX_INTRADAY_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCHF",
  "USDCAD",
] as const;

export type ForexIntradayPair = (typeof FOREX_INTRADAY_PAIRS)[number];

export type ForexStrategyId = "LONDON_BREAKOUT" | "NY_OVERLAP_MOMENTUM";

export type ForexShadowSignal = {
  direction: "BUY" | "SELL" | "HOLD";
  strategyId: ForexStrategyId | null;
  confidence: number;
  reasoning: string;
  stopLoss: number;
  takeProfit: number;
  atr: number;
  shadow: true;
};

export function isForexShadowMode(): boolean {
  const v = (process.env.FOREX_SHADOW_MODE ?? "true").trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

export function forexMinNotionalUsd(): number {
  const n = Number(process.env.FOREX_MIN_NOTIONAL_USD ?? 25_000);
  return Number.isFinite(n) && n > 0 ? n : 25_000;
}

function madridParts(d = new Date()): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { h, m };
}

function madridMinutes(d = new Date()): number {
  const { h, m } = madridParts(d);
  return h * 60 + m;
}

function atr(bars: readonly OhlcvBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let a = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trs.length; i += 1) {
    a = (a * (period - 1) + trs[i]!) / period;
  }
  return a > 0 ? a : null;
}

function hold(reason: string): ForexShadowSignal {
  return {
    direction: "HOLD",
    strategyId: null,
    confidence: 0,
    reasoning: reason,
    stopLoss: 0,
    takeProfit: 0,
    atr: 0,
    shadow: true,
  };
}

/**
 * bars5m / bars15m should include timestamps in bar.date (ISO or parseable).
 * London range built from bars whose Madrid time is 07:00–09:00.
 */
export function evaluateForexShadowStrategies(
  pairId: string,
  bars5m: readonly OhlcvBar[],
  bars15m: readonly OhlcvBar[],
  now = new Date(),
): ForexShadowSignal {
  const mins = madridMinutes(now);
  // Force flat after 22:00 Madrid
  if (mins >= 22 * 60) {
    return hold(`${pairId}: fuera de sesión (cierre forzoso 22:00 Madrid)`);
  }

  const atr15 = atr(bars15m.length >= 20 ? bars15m : bars5m, 14);
  const price = (bars5m.at(-1) ?? bars15m.at(-1))?.close ?? 0;
  if (!(atr15 != null && price > 0)) return hold(`${pairId}: ATR/precio inválido`);

  const stopDist = atr15;
  const mk = (dir: "BUY" | "SELL", id: ForexStrategyId, conf: number, reason: string): ForexShadowSignal => ({
    direction: dir,
    strategyId: id,
    confidence: conf,
    reasoning: reason,
    stopLoss: dir === "BUY" ? price - stopDist : price + stopDist,
    takeProfit: dir === "BUY" ? price + stopDist * 2 : price - stopDist * 2,
    atr: atr15,
    shadow: true,
  });

  // LONDON_BREAKOUT — after 09:00, break of 07:00–09:00 range
  if (mins >= 9 * 60 && mins < 14 * 60 + 30) {
    const rangeBars = bars5m.filter((b) => {
      if (!b.date) return false;
      const t = new Date(b.date);
      if (Number.isNaN(t.getTime())) return false;
      const m = madridMinutes(t);
      return m >= 7 * 60 && m < 9 * 60;
    });
    if (rangeBars.length >= 4) {
      const hi = Math.max(...rangeBars.map((b) => b.high));
      const lo = Math.min(...rangeBars.map((b) => b.low));
      if (price > hi) {
        return mk("BUY", "LONDON_BREAKOUT", 0.7, `LONDON_BREAKOUT: ruptura rango $${lo.toFixed(5)}–$${hi.toFixed(5)}`);
      }
      if (price < lo) {
        return mk("SELL", "LONDON_BREAKOUT", 0.7, `LONDON_BREAKOUT: ruptura bajista rango $${lo.toFixed(5)}–$${hi.toFixed(5)}`);
      }
    }
  }

  // NY_OVERLAP_MOMENTUM 14:30–17:00 Madrid
  if (mins >= 14 * 60 + 30 && mins < 17 * 60) {
    const recent = bars5m.slice(-12);
    if (recent.length >= 6) {
      const first = recent[0]!.close;
      const last = recent[recent.length - 1]!.close;
      const mom = (last - first) / first;
      if (mom > 0.0008) {
        return mk("BUY", "NY_OVERLAP_MOMENTUM", 0.68, `NY_OVERLAP_MOMENTUM: momentum +${(mom * 100).toFixed(2)}%`);
      }
      if (mom < -0.0008) {
        return mk("SELL", "NY_OVERLAP_MOMENTUM", 0.68, `NY_OVERLAP_MOMENTUM: momentum ${(mom * 100).toFixed(2)}%`);
      }
    }
  }

  return hold(`${pairId}: sin setup forex shadow`);
}
