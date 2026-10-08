/**
 * Technical indicators for Kraken crypto engine.
 */

import "server-only";

import type { Bar } from "@/lib/brokers/kraken/market-store";

export function ema(values: readonly number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
  }
  return prev;
}

export function emaSeries(values: readonly number[], period: number): Array<number | null> {
  const out: Array<number | null> = values.map(() => null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values: readonly number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function atr(bars: readonly Bar[], period = 14): number | null {
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

export function dailyVwap(bars: readonly Bar[]): number | null {
  if (!bars.length) return null;
  // Approximate: session from last 24h of 1m/15m bars
  const cutoff = (bars[bars.length - 1]!.time ?? 0) - 24 * 3600;
  let pv = 0;
  let vol = 0;
  for (const b of bars) {
    if (b.time < cutoff) continue;
    const typical = (b.high + b.low + b.close) / 3;
    pv += typical * b.volume;
    vol += b.volume;
  }
  return vol > 0 ? pv / vol : null;
}

export function relVolume(bars: readonly Bar[], lookback = 20): number | null {
  if (bars.length < lookback + 1) return null;
  const last = bars[bars.length - 1]!.volume;
  const avg =
    bars.slice(-lookback - 1, -1).reduce((s, b) => s + b.volume, 0) / lookback;
  return avg > 0 ? last / avg : null;
}

export function highestHigh(bars: readonly Bar[], n: number): number | null {
  if (bars.length < n) return null;
  return Math.max(...bars.slice(-n).map((b) => b.high));
}

export function lowestLow(bars: readonly Bar[], n: number): number | null {
  if (bars.length < n) return null;
  return Math.min(...bars.slice(-n).map((b) => b.low));
}

/** Wilder RSI series (last value). period=2 for RSI2_TREND. */
export function rsiLast(values: readonly number[], period: number): number | null {
  return rsi(values, period);
}

export type Bollinger = {
  mid: number;
  upper: number;
  lower: number;
  width: number;
};

export function bollinger(
  values: readonly number[],
  period = 20,
  mult = 2,
): Bollinger | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mid = slice.reduce((s, v) => s + v, 0) / period;
  const variance =
    slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = mid + mult * std;
  const lower = mid - mult * std;
  const width = mid > 0 ? (upper - lower) / mid : 0;
  return { mid, upper, lower, width };
}

/** Bollinger width series for squeeze detection (last N widths). */
export function bollingerWidthSeries(
  values: readonly number[],
  period = 20,
  mult = 2,
): number[] {
  const out: number[] = [];
  for (let i = period; i <= values.length; i++) {
    const bb = bollinger(values.slice(0, i), period, mult);
    if (bb) out.push(bb.width);
  }
  return out;
}

export function sma(values: readonly number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

export type PairIndicators = {
  price: number;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  atr14: number | null;
  vwap: number | null;
  relVol: number | null;
  high20: number | null;
  low20: number | null;
};

export function computeIndicators(bars: readonly Bar[]): PairIndicators | null {
  if (bars.length < 30) return null;
  const closes = bars.map((b) => b.close);
  const price = closes[closes.length - 1]!;
  return {
    price,
    ema9: ema(closes, 9),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi14: rsi(closes, 14),
    atr14: atr(bars, 14),
    vwap: dailyVwap(bars),
    relVol: relVolume(bars, 20),
    high20: highestHigh(bars, 20),
    low20: lowestLow(bars, 20),
  };
}
