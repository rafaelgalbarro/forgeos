import type {
  OhlcvBar,
  TechnicalLevels,
  TechnicalMomentum,
  TechnicalSnapshot,
  TechnicalTrend,
  TechnicalVolatility,
  TechnicalVolume,
} from "@/lib/market-data/types";

function closes(bars: readonly OhlcvBar[]): number[] {
  return bars.map((b) => b.close);
}

function last<T>(arr: readonly T[]): T | null {
  return arr.length ? arr[arr.length - 1]! : null;
}

function emaSeries(values: readonly number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const out: number[] = [prev];
  for (let i = period; i < values.length; i += 1) {
    prev = values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function ema(values: readonly number[], period: number): number | null {
  const s = emaSeries(values, period);
  return last(s);
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
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function rsiSeries(values: readonly number[], period = 14): number[] {
  const out: number[] = [];
  for (let i = period + 1; i <= values.length; i += 1) {
    const slice = values.slice(0, i);
    const v = rsi(slice, period);
    if (v != null) out.push(v);
  }
  return out;
}

function macd(values: readonly number[]): { line: number; signal: number; histogram: number } | null {
  if (values.length < 35) return null;
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  const offset = ema26.length - ema12.length;
  const macdLine: number[] = [];
  for (let i = 0; i < ema12.length; i += 1) {
    const j = i + offset;
    if (j >= 0 && j < ema26.length) macdLine.push(ema12[i]! - ema26[j]!);
  }
  if (macdLine.length < 9) return null;
  const signal = emaSeries(macdLine, 9);
  const line = last(macdLine)!;
  const sig = last(signal)!;
  return { line, signal: sig, histogram: line - sig };
}

function atr(bars: readonly OhlcvBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1]!;
    const bar = bars[i]!;
    trs.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function adx(bars: readonly OhlcvBar[], period = 14): number | null {
  if (bars.length < period * 2) return null;
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const up = bars[i]!.high - bars[i - 1]!.high;
    const down = bars[i - 1]!.low - bars[i]!.low;
    plusDm.push(up > down && up > 0 ? up : 0);
    minusDm.push(down > up && down > 0 ? down : 0);
    const prev = bars[i - 1]!;
    const bar = bars[i]!;
    tr.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close)));
  }
  const smooth = (arr: number[]) => {
    let sum = arr.slice(0, period).reduce((s, v) => s + v, 0);
    const out = [sum];
    for (let i = period; i < arr.length; i += 1) {
      sum = sum - sum / period + arr[i]!;
      out.push(sum);
    }
    return out;
  };
  const trS = smooth(tr);
  const plusS = smooth(plusDm);
  const minusS = smooth(minusDm);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i += 1) {
    const pdi = trS[i]! > 0 ? (100 * plusS[i]!) / trS[i]! : 0;
    const mdi = trS[i]! > 0 ? (100 * minusS[i]!) / trS[i]! : 0;
    const sum = pdi + mdi;
    dx.push(sum === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / sum);
  }
  if (dx.length < period) return null;
  return dx.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function ichimoku(bars: readonly OhlcvBar[]) {
  if (bars.length < 52) return null;
  const mid = (slice: readonly OhlcvBar[]) =>
    (Math.max(...slice.map((b) => b.high)) + Math.min(...slice.map((b) => b.low))) / 2;
  const tenkan = mid(bars.slice(-9));
  const kijun = mid(bars.slice(-26));
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = mid(bars.slice(-52));
  const cloudTop = Math.max(senkouA, senkouB);
  const cloudBottom = Math.min(senkouA, senkouB);
  const price = bars.at(-1)!.close;
  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
    cloudTop,
    cloudBottom,
    aboveCloud: price > cloudTop,
  };
}

function stochRsi(values: readonly number[]): { k: number; d: number } | null {
  const rsiVals = rsiSeries(values, 14);
  if (rsiVals.length < 14) return null;
  const slice = rsiVals.slice(-14);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const k = max === min ? 50 : ((last(rsiVals)! - min) / (max - min)) * 100;
  const d = (k + (slice.at(-2) ?? k) + (slice.at(-3) ?? k)) / 3;
  return { k, d };
}

function cci(bars: readonly OhlcvBar[], period = 20): number | null {
  if (bars.length < period) return null;
  const tps = bars.map((b) => (b.high + b.low + b.close) / 3);
  const slice = tps.slice(-period);
  const mean = slice.reduce((s, v) => s + v, 0) / period;
  const md = slice.reduce((s, v) => s + Math.abs(v - mean), 0) / period;
  if (md === 0) return 0;
  return (last(tps)! - mean) / (0.015 * md);
}

function williamsR(bars: readonly OhlcvBar[], period = 14): number | null {
  if (bars.length < period) return null;
  const slice = bars.slice(-period);
  const hh = Math.max(...slice.map((b) => b.high));
  const ll = Math.min(...slice.map((b) => b.low));
  const close = bars.at(-1)!.close;
  if (hh === ll) return -50;
  return ((hh - close) / (hh - ll)) * -100;
}

function bollinger(values: readonly number[], period = 20, mult = 2) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const middle = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = middle + mult * std;
  const lower = middle - mult * std;
  const price = last(values)!;
  const percentB = upper === lower ? 0.5 : (price - lower) / (upper - lower);
  const bandwidth = middle > 0 ? (upper - lower) / middle : 0;
  return { upper, middle, lower, percentB, bandwidth };
}

function keltner(bars: readonly OhlcvBar[], period = 20, mult = 2) {
  const c = closes(bars);
  const mid = ema(c, period);
  const a = atr(bars, period);
  if (mid == null || a == null) return null;
  return { upper: mid + mult * a, middle: mid, lower: mid - mult * a };
}

function vwap(bars: readonly OhlcvBar[]): number | null {
  let pv = 0;
  let vol = 0;
  for (const b of bars) {
    const tp = (b.high + b.low + b.close) / 3;
    pv += tp * b.volume;
    vol += b.volume;
  }
  return vol > 0 ? pv / vol : null;
}

function obv(bars: readonly OhlcvBar[]): number | null {
  if (bars.length < 2) return null;
  let total = 0;
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1]!;
    const bar = bars[i]!;
    if (bar.close > prev.close) total += bar.volume;
    else if (bar.close < prev.close) total -= bar.volume;
  }
  return total;
}

function volumeProfile(bars: readonly OhlcvBar[], bins = 10) {
  if (bars.length === 0) return [];
  const min = Math.min(...bars.map((b) => b.low));
  const max = Math.max(...bars.map((b) => b.high));
  const step = (max - min) / bins || 1;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    price: min + step * (i + 0.5),
    volume: 0,
  }));
  for (const b of bars) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((b.close - min) / step)));
    buckets[idx]!.volume += b.volume;
  }
  return buckets.sort((a, b) => b.volume - a.volume).slice(0, 5);
}

function relativeVolume(bars: readonly OhlcvBar[], period = 20): number | null {
  if (bars.length < period) return null;
  const avg = bars.slice(-period, -1).reduce((s, b) => s + b.volume, 0) / (period - 1);
  const lastVol = bars.at(-1)!.volume;
  return avg > 0 ? lastVol / avg : null;
}

function fibonacci(bars: readonly OhlcvBar[]) {
  const slice = bars.slice(-60);
  const high = Math.max(...slice.map((b) => b.high));
  const low = Math.min(...slice.map((b) => b.low));
  const diff = high - low;
  const levels = ["23.6%", "38.2%", "50%", "61.8%", "78.6%"];
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786];
  return levels.map((level, i) => ({
    level,
    price: high - diff * ratios[i]!,
  }));
}

function pivots(bars: readonly OhlcvBar[]) {
  const b = bars.at(-1);
  if (!b) return null;
  const h = b.high;
  const l = b.low;
  const c = b.close;
  const p = (h + l + c) / 3;
  const r1 = 2 * p - l;
  const s1 = 2 * p - h;
  const r2 = p + (h - l);
  const s2 = p - (h - l);
  const r3 = h + 2 * (p - l);
  const s3 = l - 2 * (h - p);
  const range = h - l;
  return {
    classic: { P: p, R1: r1, S1: s1, R2: r2, S2: s2 },
    camarilla: {
      R4: c + range * 1.1 / 2,
      R3: c + range * 1.1 / 4,
      S3: c - range * 1.1 / 4,
      S4: c - range * 1.1 / 2,
    },
    woodie: {
      P: (h + l + 2 * c) / 4,
      R1: 2 * ((h + l + 2 * c) / 4) - l,
      S1: 2 * ((h + l + 2 * c) / 4) - h,
    },
  };
}

function findLevels(bars: readonly OhlcvBar[]): { support: number[]; resistance: number[] } {
  const slice = bars.slice(-63);
  const lows = slice.map((b) => b.low).sort((a, b) => a - b);
  const highs = slice.map((b) => b.high).sort((a, b) => b - a);
  return {
    support: [...new Set(lows.slice(0, 3))],
    resistance: [...new Set(highs.slice(0, 3))],
  };
}

function rsiZone(r: number | null): TechnicalMomentum["rsiZone"] {
  if (r == null) return "NEUTRAL";
  if (r < 30) return "OVERSOLD";
  if (r > 70) return "OVERBOUGHT";
  return "NEUTRAL";
}

/** Computes full technical snapshot from OHLCV bars. */
export function computeTechnicalIndicators(bars: readonly OhlcvBar[]): TechnicalSnapshot {
  const c = closes(bars);
  const bb = bollinger(c);
  const kc = keltner(bars);
  const squeezeActive =
    bb != null && kc != null && bb.upper < kc.upper && bb.lower > kc.lower;
  const levels = findLevels(bars);

  const trend: TechnicalTrend = {
    ema9: ema(c, 9),
    ema20: ema(c, 20),
    ema50: ema(c, 50),
    ema200: ema(c, 200),
    macd: macd(c),
    ichimoku: ichimoku(bars),
    adx: adx(bars),
  };

  const rsiVal = rsi(c);
  const momentum: TechnicalMomentum = {
    rsi: rsiVal,
    rsiZone: rsiZone(rsiVal),
    stochRsi: stochRsi(c),
    cci: cci(bars),
    williamsR: williamsR(bars),
  };

  const volatility: TechnicalVolatility = {
    bollingerBands: bb,
    atr: atr(bars),
    keltner: kc,
    squeeze: {
      active: squeezeActive,
      momentum: bb?.bandwidth ?? 0,
    },
  };

  const volume: TechnicalVolume = {
    vwap: vwap(bars.slice(-20)),
    obv: obv(bars),
    relativeVolume: relativeVolume(bars),
    volumeProfile: volumeProfile(bars.slice(-30)),
  };

  const levelData: TechnicalLevels = {
    fibonacci: fibonacci(bars),
    pivots: pivots(bars),
    support: levels.support,
    resistance: levels.resistance,
  };

  return { trend, momentum, volatility, volume, levels: levelData };
}

/** Export helpers used by pattern recognition. */
export { rsi, rsiSeries, ema, emaSeries, atr, closes, last, macd, relativeVolume };
