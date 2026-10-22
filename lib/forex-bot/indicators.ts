/** Pure indicators for the forex bot (no server-only → unit-testable). */

import type { FxCandle } from "./types";

export function emaSeries(values: readonly number[], period: number): Array<number | null> {
  const out: Array<number | null> = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i += 1) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j += 1) sum += values[j]!;
      prev = sum / period;
    } else {
      prev = values[i]! * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function ema(values: readonly number[], period: number): number | null {
  const s = emaSeries(values, period);
  return s.length ? s[s.length - 1]! : null;
}

/** Wilder RSI on closes. */
export function rsi(values: readonly number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < values.length; i += 1) {
    const d = values[i]! - values[i - 1]!;
    gain = (gain * (period - 1) + Math.max(0, d)) / period;
    loss = (loss * (period - 1) + Math.max(0, -d)) / period;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

/** Wilder ATR. */
export function atr(bars: readonly FxCandle[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const b = bars[i]!;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc)));
  }
  let a = trs.slice(0, period).reduce((s, x) => s + x, 0) / period;
  for (let i = period; i < trs.length; i += 1) a = (a * (period - 1) + trs[i]!) / period;
  return a;
}

/** Aggregate ascending candles into `minutes` buckets (UTC aligned). */
export function aggregate(bars: readonly FxCandle[], minutes: number): FxCandle[] {
  const sec = minutes * 60;
  const out: FxCandle[] = [];
  for (const b of bars) {
    const t = Math.floor(b.time / sec) * sec;
    const last = out[out.length - 1];
    if (last && last.time === t) {
      last.high = Math.max(last.high, b.high);
      last.low = Math.min(last.low, b.low);
      last.close = b.close;
      last.volume += b.volume;
    } else {
      out.push({ ...b, time: t });
    }
  }
  return out;
}

/** Pip size: JPY quotes 0.01, others 0.0001. */
export function pipSize(instrument: string): number {
  return instrument.toUpperCase().endsWith("_JPY") ? 0.01 : 0.0001;
}
