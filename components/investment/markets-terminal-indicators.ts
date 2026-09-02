/**
 * Indicator math from real OHLC only. Returns null when bars are insufficient.
 * Never invents prices or pads series.
 */

import type { IndicatorId, OhlcBar } from "./markets-terminal.types";

function closes(bars: readonly OhlcBar[]): number[] {
  return bars.map((b) => b.close);
}

function smaAt(values: readonly number[], period: number, end: number): number | null {
  if (end + 1 < period) return null;
  let sum = 0;
  for (let i = end - period + 1; i <= end; i += 1) sum += values[i]!;
  return sum / period;
}

export function seriesSma(bars: readonly OhlcBar[], period: number): (number | null)[] {
  const c = closes(bars);
  return c.map((_, i) => smaAt(c, period, i));
}

export function seriesEma(bars: readonly OhlcBar[], period: number): (number | null)[] {
  const c = closes(bars);
  const out: (number | null)[] = Array(c.length).fill(null);
  if (c.length < period) return out;
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i += 1) ema += c[i]!;
  ema /= period;
  out[period - 1] = ema;
  for (let i = period; i < c.length; i += 1) {
    ema = c[i]! * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

export function seriesVwap(bars: readonly OhlcBar[]): (number | null)[] {
  const out: (number | null)[] = [];
  let cumPv = 0;
  let cumV = 0;
  for (const b of bars) {
    const vol = typeof b.volume === "number" && Number.isFinite(b.volume) ? b.volume : null;
    if (vol == null || vol <= 0) {
      out.push(null);
      continue;
    }
    const typical = (b.high + b.low + b.close) / 3;
    cumPv += typical * vol;
    cumV += vol;
    out.push(cumV > 0 ? cumPv / cumV : null);
  }
  return out;
}

export function seriesRsi(bars: readonly OhlcBar[], period = 14): (number | null)[] {
  const c = closes(bars);
  const out: (number | null)[] = Array(c.length).fill(null);
  if (c.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = c[i]! - c[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < c.length; i += 1) {
    const d = c[i]! - c[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function seriesMacd(bars: readonly OhlcBar[]): {
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
} {
  const ema12 = seriesEma(bars, 12);
  const ema26 = seriesEma(bars, 26);
  const macd = ema12.map((v, i) =>
    v != null && ema26[i] != null ? v - ema26[i]! : null,
  );
  const signal: (number | null)[] = Array(macd.length).fill(null);
  const hist: (number | null)[] = Array(macd.length).fill(null);
  const valid = macd.map((v, i) => (v != null ? { i, v } : null)).filter(Boolean) as {
    i: number;
    v: number;
  }[];
  if (valid.length < 9) return { macd, signal, hist };
  const k = 2 / (9 + 1);
  let ema = valid.slice(0, 9).reduce((s, x) => s + x.v, 0) / 9;
  signal[valid[8]!.i] = ema;
  hist[valid[8]!.i] = valid[8]!.v - ema;
  for (let j = 9; j < valid.length; j += 1) {
    ema = valid[j]!.v * k + ema * (1 - k);
    signal[valid[j]!.i] = ema;
    hist[valid[j]!.i] = valid[j]!.v - ema;
  }
  return { macd, signal, hist };
}

export function seriesAtr(bars: readonly OhlcBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(bars.length).fill(null);
  if (bars.length < 2) return out;
  const tr: number[] = [bars[0]!.high - bars[0]!.low];
  for (let i = 1; i < bars.length; i += 1) {
    const b = bars[i]!;
    const prev = bars[i - 1]!;
    tr.push(Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close)));
  }
  if (tr.length < period) return out;
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = atr;
  for (let i = period; i < tr.length; i += 1) {
    atr = (atr * (period - 1) + tr[i]!) / period;
    out[i] = atr;
  }
  return out;
}

export function seriesAdx(bars: readonly OhlcBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(bars.length).fill(null);
  if (bars.length < period * 2) return out;
  const plusDm: number[] = [0];
  const minusDm: number[] = [0];
  const tr: number[] = [bars[0]!.high - bars[0]!.low];
  for (let i = 1; i < bars.length; i += 1) {
    const up = bars[i]!.high - bars[i - 1]!.high;
    const down = bars[i - 1]!.low - bars[i]!.low;
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
    const b = bars[i]!;
    const prev = bars[i - 1]!;
    tr.push(Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close)));
  }
  let atr = tr.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let pDm = plusDm.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let mDm = minusDm.slice(1, period + 1).reduce((a, b) => a + b, 0);
  const dx: number[] = [];
  for (let i = period; i < bars.length; i += 1) {
    if (i > period) {
      atr = atr - atr / period + tr[i]!;
      pDm = pDm - pDm / period + plusDm[i]!;
      mDm = mDm - mDm / period + minusDm[i]!;
    }
    const pDi = atr === 0 ? 0 : (100 * pDm) / atr;
    const mDi = atr === 0 ? 0 : (100 * mDm) / atr;
    const sum = pDi + mDi;
    dx.push(sum === 0 ? 0 : (100 * Math.abs(pDi - mDi)) / sum);
    if (dx.length === period) {
      const adx0 = dx.reduce((a, b) => a + b, 0) / period;
      out[i] = adx0;
    } else if (dx.length > period) {
      const prev = out[i - 1];
      if (prev != null) out[i] = (prev * (period - 1) + dx[dx.length - 1]!) / period;
    }
  }
  return out;
}

export function seriesBollinger(
  bars: readonly OhlcBar[],
  period = 20,
  mult = 2,
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const c = closes(bars);
  const mid = seriesSma(bars, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < c.length; i += 1) {
    const m = mid[i];
    if (m == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j += 1) sumSq += (c[j]! - m) ** 2;
    const sd = Math.sqrt(sumSq / period);
    upper.push(m + mult * sd);
    lower.push(m - mult * sd);
  }
  return { mid, upper, lower };
}

export function seriesIchimoku(bars: readonly OhlcBar[]): {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  spanA: (number | null)[];
  spanB: (number | null)[];
} {
  const highLow = (period: number, end: number): number | null => {
    if (end + 1 < period) return null;
    let hi = -Infinity;
    let lo = Infinity;
    for (let i = end - period + 1; i <= end; i += 1) {
      hi = Math.max(hi, bars[i]!.high);
      lo = Math.min(lo, bars[i]!.low);
    }
    return (hi + lo) / 2;
  };
  const tenkan = bars.map((_, i) => highLow(9, i));
  const kijun = bars.map((_, i) => highLow(26, i));
  const spanA = bars.map((_, i) =>
    tenkan[i] != null && kijun[i] != null ? (tenkan[i]! + kijun[i]!) / 2 : null,
  );
  const spanB = bars.map((_, i) => highLow(52, i));
  return { tenkan, kijun, spanA, spanB };
}

export function seriesSupertrend(
  bars: readonly OhlcBar[],
  period = 10,
  mult = 3,
): (number | null)[] {
  const atr = seriesAtr(bars, period);
  const out: (number | null)[] = Array(bars.length).fill(null);
  let trendUp = true;
  let prevSuper: number | null = null;
  for (let i = 0; i < bars.length; i += 1) {
    const a = atr[i];
    if (a == null) continue;
    const mid = (bars[i]!.high + bars[i]!.low) / 2;
    const upper = mid + mult * a;
    const lower = mid - mult * a;
    if (prevSuper == null) {
      prevSuper = lower;
      out[i] = lower;
      continue;
    }
    if (trendUp) {
      const st = Math.max(lower, prevSuper);
      if (bars[i]!.close < st) {
        trendUp = false;
        prevSuper = upper;
      } else {
        prevSuper = st;
      }
    } else {
      const st = Math.min(upper, prevSuper);
      if (bars[i]!.close > st) {
        trendUp = true;
        prevSuper = lower;
      } else {
        prevSuper = st;
      }
    }
    out[i] = prevSuper;
  }
  return out;
}

export function seriesDonchian(
  bars: readonly OhlcBar[],
  period = 20,
): { upper: (number | null)[]; lower: (number | null)[]; mid: (number | null)[] } {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const mid: (number | null)[] = [];
  for (let i = 0; i < bars.length; i += 1) {
    if (i + 1 < period) {
      upper.push(null);
      lower.push(null);
      mid.push(null);
      continue;
    }
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j += 1) {
      hi = Math.max(hi, bars[j]!.high);
      lo = Math.min(lo, bars[j]!.low);
    }
    upper.push(hi);
    lower.push(lo);
    mid.push((hi + lo) / 2);
  }
  return { upper, lower, mid };
}

export function fibonacciLevels(bars: readonly OhlcBar[]): Record<string, number> | null {
  if (bars.length < 5) return null;
  let hi = -Infinity;
  let lo = Infinity;
  for (const b of bars) {
    hi = Math.max(hi, b.high);
    lo = Math.min(lo, b.low);
  }
  if (!Number.isFinite(hi) || !Number.isFinite(lo) || hi === lo) return null;
  const range = hi - lo;
  return {
    "0.0": hi,
    "0.236": hi - range * 0.236,
    "0.382": hi - range * 0.382,
    "0.5": hi - range * 0.5,
    "0.618": hi - range * 0.618,
    "1.0": lo,
  };
}

export function pivotPoints(bars: readonly OhlcBar[]): Record<string, number> | null {
  if (bars.length < 2) return null;
  const prev = bars[bars.length - 2]!;
  const p = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * p - prev.low;
  const s1 = 2 * p - prev.high;
  const r2 = p + (prev.high - prev.low);
  const s2 = p - (prev.high - prev.low);
  return { P: p, R1: r1, S1: s1, R2: r2, S2: s2 };
}

/** Simple swing highs/lows from real bars — null if not enough structure. */
export function marketStructure(bars: readonly OhlcBar[]): {
  lastSwingHigh: number | null;
  lastSwingLow: number | null;
  bias: "higher-highs" | "lower-lows" | "range" | null;
} {
  if (bars.length < 10) {
    return { lastSwingHigh: null, lastSwingLow: null, bias: null };
  }
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 2; i < bars.length - 2; i += 1) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    if (h > bars[i - 1]!.high && h > bars[i - 2]!.high && h > bars[i + 1]!.high && h > bars[i + 2]!.high) {
      highs.push(h);
    }
    if (l < bars[i - 1]!.low && l < bars[i - 2]!.low && l < bars[i + 1]!.low && l < bars[i + 2]!.low) {
      lows.push(l);
    }
  }
  const lastSwingHigh = highs.length ? highs[highs.length - 1]! : null;
  const lastSwingLow = lows.length ? lows[lows.length - 1]! : null;
  let bias: "higher-highs" | "lower-lows" | "range" | null = null;
  if (highs.length >= 2 && lows.length >= 2) {
    const hh = highs[highs.length - 1]! > highs[highs.length - 2]!;
    const ll = lows[lows.length - 1]! < lows[lows.length - 2]!;
    if (hh && !ll) bias = "higher-highs";
    else if (ll && !hh) bias = "lower-lows";
    else bias = "range";
  }
  return { lastSwingHigh, lastSwingLow, bias };
}

export function fairValueGaps(
  bars: readonly OhlcBar[],
): readonly { index: number; top: number; bottom: number; direction: "up" | "down" }[] {
  const gaps: { index: number; top: number; bottom: number; direction: "up" | "down" }[] = [];
  for (let i = 2; i < bars.length; i += 1) {
    const a = bars[i - 2]!;
    const c = bars[i]!;
    if (c.low > a.high) {
      gaps.push({ index: i, top: c.low, bottom: a.high, direction: "up" });
    } else if (c.high < a.low) {
      gaps.push({ index: i, top: a.low, bottom: c.high, direction: "down" });
    }
  }
  return gaps.slice(-8);
}

export function liquidityZones(
  bars: readonly OhlcBar[],
  lookback = 20,
): { resistance: number | null; support: number | null } {
  if (bars.length < lookback) return { resistance: null, support: null };
  const slice = bars.slice(-lookback);
  let hi = -Infinity;
  let lo = Infinity;
  for (const b of slice) {
    hi = Math.max(hi, b.high);
    lo = Math.min(lo, b.low);
  }
  return {
    resistance: Number.isFinite(hi) ? hi : null,
    support: Number.isFinite(lo) ? lo : null,
  };
}

/** Order-block heuristic: last bullish/bearish impulse candle before opposite move. */
export function orderBlocks(
  bars: readonly OhlcBar[],
): readonly { index: number; high: number; low: number; kind: "bullish" | "bearish" }[] {
  if (bars.length < 20) return [];
  const out: { index: number; high: number; low: number; kind: "bullish" | "bearish" }[] = [];
  for (let i = 5; i < bars.length - 1; i += 1) {
    const b = bars[i]!;
    const next = bars[i + 1]!;
    const body = Math.abs(b.close - b.open);
    const range = b.high - b.low || 1;
    if (body / range < 0.55) continue;
    if (b.close > b.open && next.close < next.open && next.low < b.low) {
      out.push({ index: i, high: b.high, low: b.low, kind: "bearish" });
    } else if (b.close < b.open && next.close > next.open && next.high > b.high) {
      out.push({ index: i, high: b.high, low: b.low, kind: "bullish" });
    }
  }
  return out.slice(-6);
}

export function lastFinite(series: readonly (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const v = series[i];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return NaN;
  return ((to - from) / from) * 100;
}

export function realizedVol(bars: readonly OhlcBar[], window = 20): number | null {
  if (bars.length < window + 1) return null;
  const rets: number[] = [];
  for (let i = bars.length - window; i < bars.length; i += 1) {
    const prev = bars[i - 1]!.close;
    const cur = bars[i]!.close;
    if (prev === 0) continue;
    rets.push(Math.log(cur / prev));
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varSum = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(varSum) * Math.sqrt(252) * 100;
}

export function indicatorAvailability(
  id: IndicatorId,
  bars: readonly OhlcBar[],
  hasVolume: boolean,
): "READY" | "UNAVAILABLE" | "NO_DATA" {
  if (bars.length < 2) return "NO_DATA";
  switch (id) {
    case "ema":
    case "sma":
      return bars.length >= 20 ? "READY" : "UNAVAILABLE";
    case "vwap":
      return hasVolume && bars.length >= 2 ? "READY" : "UNAVAILABLE";
    case "rsi":
      return bars.length >= 15 ? "READY" : "UNAVAILABLE";
    case "macd":
      return bars.length >= 35 ? "READY" : "UNAVAILABLE";
    case "adx":
      return bars.length >= 28 ? "READY" : "UNAVAILABLE";
    case "atr":
      return bars.length >= 15 ? "READY" : "UNAVAILABLE";
    case "bollinger":
      return bars.length >= 20 ? "READY" : "UNAVAILABLE";
    case "ichimoku":
      return bars.length >= 52 ? "READY" : "UNAVAILABLE";
    case "supertrend":
      return bars.length >= 15 ? "READY" : "UNAVAILABLE";
    case "donchian":
      return bars.length >= 20 ? "READY" : "UNAVAILABLE";
    case "fibonacci":
      return bars.length >= 5 ? "READY" : "UNAVAILABLE";
    case "pivot":
      return bars.length >= 2 ? "READY" : "UNAVAILABLE";
    case "marketStructure":
      return bars.length >= 10 ? "READY" : "UNAVAILABLE";
    case "orderBlocks":
      return bars.length >= 20 ? "READY" : "UNAVAILABLE";
    case "fvg":
      return bars.length >= 5 ? "READY" : "UNAVAILABLE";
    case "liquidity":
      return bars.length >= 20 ? "READY" : "UNAVAILABLE";
    default:
      return "UNAVAILABLE";
  }
}
