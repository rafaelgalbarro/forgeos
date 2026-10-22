/**
 * Intraday FX strategies (pure; closed candles only, ascending).
 *
 * FX_TREND_PULLBACK_M15 — H1 trend (EMA20/EMA50 + slope) and an M15 pullback to the EMA20
 *   that closes back in trend direction with RSI in a neutral zone. Stop beyond the
 *   pullback swing (≥1.2 ATR, ≤2.5 ATR); target 1.8R.
 * FX_LONDON_BREAKOUT — Asian range (00:00–07:00 London) broken by an M15 close during
 *   07:00–10:00 London, in the H1 trend direction. Stop at the range midpoint; target 1.5R.
 */

import { atr, ema, emaSeries, pipSize, rsi } from "./indicators";
import { asianRangeBounds, isLondonOpenWindow } from "./sessions";
import type { FxCandle, FxEvaluation, FxSide } from "./types";

type TrendRead = { dir: FxSide | null; detail: string };

export function h1Trend(h1: readonly FxCandle[]): TrendRead {
  if (h1.length < 60) return { dir: null, detail: "H1 insuficiente" };
  const closes = h1.map((b) => b.close);
  const e20 = emaSeries(closes, 20);
  const e50 = emaSeries(closes, 50);
  const a = e20[e20.length - 1];
  const b = e50[e50.length - 1];
  const b5 = e50[e50.length - 6];
  const px = closes[closes.length - 1]!;
  if (a == null || b == null || b5 == null) return { dir: null, detail: "EMA H1 n/a" };
  if (a > b && b > b5 && px > b) return { dir: "long", detail: "H1 alcista" };
  if (a < b && b < b5 && px < b) return { dir: "short", detail: "H1 bajista" };
  return { dir: null, detail: "H1 sin tendencia" };
}

export function evaluateTrendPullback(
  instrument: string,
  m15: readonly FxCandle[],
  h1: readonly FxCandle[],
): FxEvaluation {
  const strategy = "FX_TREND_PULLBACK_M15" as const;
  if (m15.length < 60) return { strategy, instrument, hold: "M15 insuficiente" };
  const trend = h1Trend(h1);
  if (!trend.dir) return { strategy, instrument, hold: trend.detail };
  const closes = m15.map((b) => b.close);
  const e20 = emaSeries(closes, 20);
  const last = m15[m15.length - 1]!;
  const prev = m15[m15.length - 2]!;
  const ema20 = e20[e20.length - 1];
  const a = atr(m15, 14);
  const r = rsi(closes, 14);
  if (ema20 == null || a == null || r == null || !(a > 0)) {
    return { strategy, instrument, hold: "indicadores M15 n/a" };
  }
  const swing = m15.slice(-6);
  if (trend.dir === "long") {
    const touched = Math.min(prev.low, last.low) <= ema20 + 0.1 * a;
    const reclaimed = last.close > ema20 && last.close > last.open;
    if (!touched) return { strategy, instrument, hold: "sin pullback a EMA20" };
    if (!reclaimed) return { strategy, instrument, hold: "sin cierre alcista sobre EMA20" };
    if (r < 40 || r > 62) return { strategy, instrument, hold: `RSI ${r.toFixed(0)} fuera 40-62` };
    const swingLow = Math.min(...swing.map((b) => b.low));
    let riskDist = Math.max(last.close - swingLow + 0.1 * a, 1.2 * a);
    if (riskDist > 2.5 * a) return { strategy, instrument, hold: "stop > 2.5 ATR" };
    riskDist = Math.max(riskDist, 5 * pipSize(instrument));
    return {
      strategy,
      instrument,
      side: "long",
      entry: last.close,
      stop: last.close - riskDist,
      takeProfit: last.close + 1.8 * riskDist,
      risk: riskDist,
      reason: `${trend.detail}, pullback EMA20 M15, RSI ${r.toFixed(0)}`,
      candleTime: last.time,
    };
  }
  const touched = Math.max(prev.high, last.high) >= ema20 - 0.1 * a;
  const rejected = last.close < ema20 && last.close < last.open;
  if (!touched) return { strategy, instrument, hold: "sin pullback a EMA20" };
  if (!rejected) return { strategy, instrument, hold: "sin cierre bajista bajo EMA20" };
  if (r < 38 || r > 60) return { strategy, instrument, hold: `RSI ${r.toFixed(0)} fuera 38-60` };
  const swingHigh = Math.max(...swing.map((b) => b.high));
  let riskDist = Math.max(swingHigh - last.close + 0.1 * a, 1.2 * a);
  if (riskDist > 2.5 * a) return { strategy, instrument, hold: "stop > 2.5 ATR" };
  riskDist = Math.max(riskDist, 5 * pipSize(instrument));
  return {
    strategy,
    instrument,
    side: "short",
    entry: last.close,
    stop: last.close + riskDist,
    takeProfit: last.close - 1.8 * riskDist,
    risk: riskDist,
    reason: `${trend.detail}, rechazo EMA20 M15, RSI ${r.toFixed(0)}`,
    candleTime: last.time,
  };
}

export function evaluateLondonBreakout(
  instrument: string,
  m15: readonly FxCandle[],
  h1: readonly FxCandle[],
  at: Date,
): FxEvaluation {
  const strategy = "FX_LONDON_BREAKOUT" as const;
  if (!isLondonOpenWindow(at)) return { strategy, instrument, hold: "fuera 07:00-10:00 Londres" };
  if (m15.length < 60) return { strategy, instrument, hold: "M15 insuficiente" };
  const { from, to } = asianRangeBounds(at);
  const asian = m15.filter((b) => b.time >= from && b.time < to);
  if (asian.length < 20) return { strategy, instrument, hold: "rango asiático incompleto" };
  const hi = Math.max(...asian.map((b) => b.high));
  const lo = Math.min(...asian.map((b) => b.low));
  const a = atr(m15, 14);
  if (a == null || !(a > 0)) return { strategy, instrument, hold: "ATR n/a" };
  const width = hi - lo;
  if (width < 2 * a || width > 8 * a) {
    return { strategy, instrument, hold: `rango ${(width / a).toFixed(1)} ATR fuera 2-8` };
  }
  const trend = h1Trend(h1);
  const last = m15[m15.length - 1]!;
  const prev = m15[m15.length - 2]!;
  const mid = (hi + lo) / 2;
  // Only the first close outside the range (previous bar still inside).
  if (last.close > hi && prev.close <= hi) {
    if (trend.dir !== "long") return { strategy, instrument, hold: `ruptura alcista contra ${trend.detail}` };
    const riskDist = last.close - mid;
    return {
      strategy,
      instrument,
      side: "long",
      entry: last.close,
      stop: mid,
      takeProfit: last.close + 1.5 * riskDist,
      risk: riskDist,
      reason: `ruptura rango asiático (${width.toFixed(5)}) + ${trend.detail}`,
      candleTime: last.time,
    };
  }
  if (last.close < lo && prev.close >= lo) {
    if (trend.dir !== "short") return { strategy, instrument, hold: `ruptura bajista contra ${trend.detail}` };
    const riskDist = mid - last.close;
    return {
      strategy,
      instrument,
      side: "short",
      entry: last.close,
      stop: mid,
      takeProfit: last.close - 1.5 * riskDist,
      risk: riskDist,
      reason: `ruptura rango asiático (${width.toFixed(5)}) + ${trend.detail}`,
      candleTime: last.time,
    };
  }
  return { strategy, instrument, hold: "sin ruptura del rango" };
}

export { ema };
