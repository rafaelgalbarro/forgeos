/**
 * Swing equity strategies (IBKR) — hold 2–10 days.
 * Daily EODHD bars (≈275) + optional 1h bars for entry timing.
 */

import "server-only";

import type { OhlcvBar } from "@/lib/market-data/types";

export type SwingStrategyId =
  | "TREND_PULLBACK"
  | "BREAKOUT_BASE"
  | "OVERSOLD_REVERSAL";

export type SwingSignal = {
  direction: "BUY" | "HOLD";
  strategyId: SwingStrategyId | null;
  confidence: number;
  reasoning: string;
  stopLoss: number;
  takeProfit: number;
  atr: number;
  stopLossPct: number;
  takeProfitPct: number;
  /** Initial risk distance (entry − stop) for R-multiples. */
  riskR: number;
};

function closes(bars: readonly OhlcvBar[]): number[] {
  return bars.map((b) => b.close);
}

function ema(values: readonly number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
  }
  return prev;
}

function sma(values: readonly number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function rsi(values: readonly number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

/** Wilder ATR(14) on daily bars. */
export function atrDaily(bars: readonly OhlcvBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (trs.length < period) return null;
  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trs.length; i += 1) {
    atr = (atr * (period - 1) + trs[i]!) / period;
  }
  return atr > 0 ? atr : null;
}

function hold(reason: string): SwingSignal {
  return {
    direction: "HOLD",
    strategyId: null,
    confidence: 0,
    reasoning: reason,
    stopLoss: 0,
    takeProfit: 0,
    atr: 0,
    stopLossPct: 0,
    takeProfitPct: 0,
    riskR: 0,
  };
}

function levelsFromAtr(price: number, atr: number): {
  stopLoss: number;
  takeProfit: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskR: number;
} {
  const stopDist = Math.min(atr * 1.5, price * 0.06);
  const stopLoss = price - stopDist;
  const takeProfit = price + stopDist * 3; // 1:2 R
  return {
    stopLoss,
    takeProfit,
    stopLossPct: stopDist / price,
    takeProfitPct: (stopDist * 3) / price,
    riskR: stopDist,
  };
}

/** Commission round-trip filter: reject if cost > 0.5% or target path < 5× cost. */
export function passesCostFilter(params: {
  notional: number;
  roundTripCostUsd: number;
  targetMoveUsd: number;
}): boolean {
  const { notional, roundTripCostUsd, targetMoveUsd } = params;
  if (!(notional > 0)) return false;
  if (roundTripCostUsd / notional > 0.005) return false;
  if (targetMoveUsd < roundTripCostUsd * 5) return false;
  return true;
}

/**
 * Evaluate swing strategies on daily bars.
 * Optional hourlyBars refine confidence (not required for signal).
 */
export function evaluateSwingStrategies(
  symbol: string,
  dailyBars: readonly OhlcvBar[],
  hourlyBars?: readonly OhlcvBar[],
): SwingSignal {
  if (dailyBars.length < 60) {
    return hold(`${symbol}: insuficientes barras diarias (${dailyBars.length})`);
  }

  const c = closes(dailyBars);
  const price = c[c.length - 1]!;
  const atr = atrDaily(dailyBars);
  if (!(atr != null && atr > 0) || !(price > 0)) {
    return hold(`${symbol}: ATR/precio inválido`);
  }

  const ema20 = ema(c, 20);
  const ema50 = ema(c, 50);
  const ema200 = ema(c, 200);
  const rsi14 = rsi(c, 14);
  const last = dailyBars[dailyBars.length - 1]!;
  const vol20 = sma(
    dailyBars.map((b) => b.volume),
    20,
  );
  const high20 = Math.max(...dailyBars.slice(-21, -1).map((b) => b.high));

  // TREND_PULLBACK: price > EMA50 > EMA200, pullback to EMA20, RSI 40–50
  if (
    ema20 != null &&
    ema50 != null &&
    ema200 != null &&
    rsi14 != null &&
    price > ema50 &&
    ema50 > ema200 &&
    Math.abs(price - ema20) / price <= 0.015 &&
    rsi14 >= 40 &&
    rsi14 <= 50
  ) {
    const lv = levelsFromAtr(price, atr);
    let conf = 0.72;
    if (hourlyBars && hourlyBars.length >= 20) {
      const hc = closes(hourlyBars);
      const hEma20 = ema(hc, 20);
      if (hEma20 != null && hc[hc.length - 1]! >= hEma20) conf = 0.78;
    }
    return {
      direction: "BUY",
      strategyId: "TREND_PULLBACK",
      confidence: conf,
      reasoning: `TREND_PULLBACK: alcista EMA50>EMA200, retroceso EMA20 RSI=${rsi14.toFixed(0)}`,
      ...lv,
    };
  }

  // BREAKOUT_BASE: close > 20d high, volume > 1.5× avg20
  if (
    vol20 != null &&
    vol20 > 0 &&
    last.close > high20 &&
    last.volume > vol20 * 1.5
  ) {
    const lv = levelsFromAtr(price, atr);
    return {
      direction: "BUY",
      strategyId: "BREAKOUT_BASE",
      confidence: 0.74,
      reasoning: `BREAKOUT_BASE: ruptura máx20d $${high20.toFixed(2)} vol ${(last.volume / vol20).toFixed(1)}×`,
      ...lv,
    };
  }

  // OVERSOLD_REVERSAL: RSI < 30 near support, bullish close
  const low20 = Math.min(...dailyBars.slice(-20).map((b) => b.low));
  const nearSupport = Math.abs(last.low - low20) / price <= 0.02 || last.low <= low20 * 1.01;
  if (
    rsi14 != null &&
    rsi14 < 30 &&
    nearSupport &&
    last.close > last.open
  ) {
    const lv = levelsFromAtr(price, atr);
    return {
      direction: "BUY",
      strategyId: "OVERSOLD_REVERSAL",
      confidence: 0.7,
      reasoning: `OVERSOLD_REVERSAL: RSI=${rsi14.toFixed(0)} sobre soporte $${low20.toFixed(2)}`,
      ...lv,
    };
  }

  return hold(`${symbol}: sin setup swing`);
}

/** Swing exit helpers — initial SL 1.5×ATR (max 6%), TP 3×ATR; after +1R → BE + trail 2×ATR; max 10 days. */
export const SWING_MAX_HOLD_DAYS = 10;
export const SWING_TRAIL_ATR_MULT = 2;
export const SWING_BE_AT_R = 1;
