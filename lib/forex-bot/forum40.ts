/**
 * "40 estrategias" (owner's list, 29/10) — the ones that can be written as exact rules on OHLC.
 * Pure module: indicators, entry/exit rules, backtest and the validation gate.
 *
 * Every rule: signal on the close of bar i → entry at the next bar's open (± half spread).
 * Protective stop = 2 × ATR(14) (the articles' pip stops do not scale across pairs/timeframes),
 * optional take-profit (rr × stop) where the article gives one, rule exit on a closed bar,
 * time exit after `maxBars`, flat for the weekend (except D1). Long and short are symmetric.
 */

import { isWeekendFlattenTime } from "./sessions";
import type { FxCandle, FxSide } from "./types";

type Arr = Array<number | null>;

// ── indicators ──────────────────────────────────────────────────────────────
const sma = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); let s = 0;
  for (let i = 0; i < v.length; i += 1) { s += v[i]!; if (i >= n) s -= v[i - n]!; if (i >= n - 1) o[i] = s / n; }
  return o;
};
const ema = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); if (v.length < n) return o;
  let e = 0; for (let i = 0; i < n; i += 1) e += v[i]!; e /= n; o[n - 1] = e;
  const k = 2 / (n + 1);
  for (let i = n; i < v.length; i += 1) { e = v[i]! * k + e * (1 - k); o[i] = e; }
  return o;
};
/** Smoothed MA (Wilder / SMMA). */
const smma = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); if (v.length < n) return o;
  let e = 0; for (let i = 0; i < n; i += 1) e += v[i]!; e /= n; o[n - 1] = e;
  for (let i = n; i < v.length; i += 1) { e = (e * (n - 1) + v[i]!) / n; o[i] = e; }
  return o;
};
/** Linear-weighted MA. */
const wma = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); const den = (n * (n + 1)) / 2;
  for (let i = n - 1; i < v.length; i += 1) { let s = 0; for (let k = 0; k < n; k += 1) s += v[i - k]! * (n - k); o[i] = s / den; }
  return o;
};
const fill = (a: Arr): number[] => a.map((x) => (x == null ? NaN : x));
const shift = (a: Arr, k: number): Arr => a.map((_, i) => (i - k >= 0 ? a[i - k]! : null));
const sub = (a: Arr, b: Arr): Arr => a.map((x, i) => (x == null || b[i] == null ? null : x - b[i]!));
/** MA over a series that has leading nulls. */
const maOf = (a: Arr, n: number, f: (v: number[], n: number) => Arr): Arr => {
  const first = a.findIndex((x) => x != null); const o: Arr = new Array(a.length).fill(null);
  if (first < 0) return o;
  const r = f(a.slice(first) as number[], n); r.forEach((x, j) => { o[first + j] = x; });
  return o;
};
const rsi = (v: readonly number[], n: number): Arr => {
  const o: Arr = new Array(v.length).fill(null); if (v.length <= n) return o;
  let g = 0; let l = 0;
  for (let i = 1; i <= n; i += 1) { const d = v[i]! - v[i - 1]!; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n; o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < v.length; i += 1) {
    const d = v[i]! - v[i - 1]!; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n;
    o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return o;
};
const atr = (b: readonly FxCandle[], n = 14): Arr => {
  const tr = b.map((x, i) => (i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1]!.close), Math.abs(x.low - b[i - 1]!.close))));
  return smma(tr, n);
};
/** Stochastic: %K raw(k) smoothed by `slow`, %D = SMA(d) of it. */
const stoch = (b: readonly FxCandle[], k: number, d: number, slow: number): { K: Arr; D: Arr } => {
  const raw: Arr = new Array(b.length).fill(null);
  for (let i = k - 1; i < b.length; i += 1) {
    let hi = -Infinity; let lo = Infinity;
    for (let j = i - k + 1; j <= i; j += 1) { hi = Math.max(hi, b[j]!.high); lo = Math.min(lo, b[j]!.low); }
    raw[i] = hi > lo ? ((b[i]!.close - lo) / (hi - lo)) * 100 : 50;
  }
  const K = maOf(raw, slow, sma); const D = maOf(K, d, sma);
  return { K, D };
};
const adx = (b: readonly FxCandle[], n = 14): { adx: Arr; pdi: Arr; mdi: Arr } => {
  const len = b.length; const pdm: number[] = [0]; const mdm: number[] = [0]; const tr: number[] = [b[0] ? b[0].high - b[0].low : 0];
  for (let i = 1; i < len; i += 1) {
    const up = b[i]!.high - b[i - 1]!.high; const dn = b[i - 1]!.low - b[i]!.low;
    pdm.push(up > dn && up > 0 ? up : 0); mdm.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(b[i]!.high - b[i]!.low, Math.abs(b[i]!.high - b[i - 1]!.close), Math.abs(b[i]!.low - b[i - 1]!.close)));
  }
  const str = smma(tr, n); const sp = smma(pdm, n); const sm = smma(mdm, n);
  const pdi: Arr = str.map((t, i) => (t && sp[i] != null ? (100 * sp[i]!) / t : null));
  const mdi: Arr = str.map((t, i) => (t && sm[i] != null ? (100 * sm[i]!) / t : null));
  const dx: Arr = pdi.map((p, i) => (p == null || mdi[i] == null || p + mdi[i]! === 0 ? null : (100 * Math.abs(p - mdi[i]!)) / (p + mdi[i]!)));
  return { adx: maOf(dx, n, smma), pdi, mdi };
};
const psar = (b: readonly FxCandle[], step: number, max: number): { sar: Arr; up: boolean[] } => {
  const sar: Arr = new Array(b.length).fill(null); const up: boolean[] = new Array(b.length).fill(true);
  if (b.length < 3) return { sar, up };
  let isUp = b[1]!.close >= b[0]!.close; let af = step; let ep = isUp ? b[1]!.high : b[1]!.low; let s = isUp ? b[0]!.low : b[0]!.high;
  for (let i = 1; i < b.length; i += 1) {
    s = s + af * (ep - s);
    if (isUp) {
      s = Math.min(s, b[i - 1]!.low, i > 1 ? b[i - 2]!.low : b[i - 1]!.low);
      if (b[i]!.low < s) { isUp = false; s = ep; ep = b[i]!.low; af = step; }
      else if (b[i]!.high > ep) { ep = b[i]!.high; af = Math.min(max, af + step); }
    } else {
      s = Math.max(s, b[i - 1]!.high, i > 1 ? b[i - 2]!.high : b[i - 1]!.high);
      if (b[i]!.high > s) { isUp = true; s = ep; ep = b[i]!.high; af = step; }
      else if (b[i]!.low < ep) { ep = b[i]!.low; af = Math.min(max, af + step); }
    }
    sar[i] = s; up[i] = isUp;
  }
  return { sar, up };
};
const momentum = (v: readonly number[], n: number): Arr => v.map((x, i) => (i >= n && v[i - n]! !== 0 ? (x / v[i - n]!) * 100 : null));
const stdev = (v: readonly number[], n: number): Arr => {
  const m = sma(v, n);
  return v.map((_, i) => { if (m[i] == null) return null; let q = 0; for (let j = i - n + 1; j <= i; j += 1) q += (v[j]! - m[i]!) ** 2; return Math.sqrt(q / n); });
};
const cci = (b: readonly FxCandle[], n: number): Arr => {
  const tp = b.map((x) => (x.high + x.low + x.close) / 3); const m = sma(tp, n);
  return tp.map((x, i) => { if (m[i] == null) return null; let d = 0; for (let j = i - n + 1; j <= i; j += 1) d += Math.abs(tp[j]! - m[i]!); d /= n; return d > 0 ? (x - m[i]!) / (0.015 * d) : 0; });
};
/** Relative Vigor Index (n) and its 4-bar weighted signal. */
const rvi = (b: readonly FxCandle[], n: number): { rvi: Arr; sig: Arr } => {
  const co = b.map((x) => x.close - x.open); const hl = b.map((x) => x.high - x.low);
  const w = (a: number[], i: number) => (a[i]! + 2 * a[i - 1]! + 2 * a[i - 2]! + a[i - 3]!) / 6;
  const num: Arr = co.map((_, i) => (i >= 3 ? w(co, i) : null)); const den: Arr = hl.map((_, i) => (i >= 3 ? w(hl, i) : null));
  const sn = maOf(num, n, sma); const sd = maOf(den, n, sma);
  const r: Arr = sn.map((x, i) => (x == null || !sd[i] ? null : x / sd[i]!));
  const sig: Arr = r.map((_, i) => (i >= 3 && r[i] != null && r[i - 3] != null ? (r[i]! + 2 * r[i - 1]! + 2 * r[i - 2]! + r[i - 3]!) / 6 : null));
  return { rvi: r, sig };
};

export type F40Ind = ReturnType<typeof f40Indicators>;

export function f40Indicators(b: readonly FxCandle[]) {
  const c = b.map((x) => x.close); const lo = b.map((x) => x.low); const hi = b.map((x) => x.high);
  const med = b.map((x) => (x.high + x.low) / 2);
  const ao = sub(sma(med, 5), sma(med, 34)); const ac = sub(ao, maOf(ao, 5, sma));
  const macd = (f: number, s: number, g: number) => { const m = sub(ema(c, f), ema(c, s)); const sg = maOf(m, g, ema); return { m, sg, h: sub(m, sg) }; };
  const bbMid = sma(c, 20); const sd20 = stdev(c, 20);
  const ichi = (t: number, k: number, s: number) => {
    const mid = (n: number) => b.map((_, i) => { if (i < n - 1) return null; let H = -Infinity; let L = Infinity; for (let j = i - n + 1; j <= i; j += 1) { H = Math.max(H, hi[j]!); L = Math.min(L, lo[j]!); } return (H + L) / 2; });
    const ten = mid(t); const kij = mid(k);
    const a: Arr = ten.map((x, i) => (x == null || kij[i] == null ? null : (x + kij[i]!) / 2));
    return { spanA: shift(a, k), spanB: shift(mid(s), k) };
  };
  return {
    b, c, len: b.length,
    atr14: atr(b, 14), atr7: atr(b, 7),
    ema: (n: number) => ema(c, n), sma: (n: number) => sma(c, n), wma: (n: number) => wma(c, n),
    lwmaLow: (n: number) => wma(lo, n), smaHigh: (n: number) => sma(hi, n), smaLow: (n: number) => sma(lo, n),
    smmaMed: (n: number) => smma(med, n),
    rsi: (n: number) => rsi(c, n),
    ao, ac,
    macd,
    stoch: (k: number, d: number, s: number) => stoch(b, k, d, s),
    adx: adx(b, 14),
    psar: (s: number, m: number) => psar(b, s, m),
    mom18: momentum(c, 18),
    bbMid, sd20,
    ichi,
    cci: (n: number) => cci(b, n),
    rvi10: rvi(b, 10),
    sd: (n: number) => stdev(c, n),
    fill,
  };
}

// ── rules ───────────────────────────────────────────────────────────────────
type Rule = {
  id: string;
  name: string;
  /** entry on the close of bar i */
  entry: (x: F40Ind, i: number, cache: Map<string, unknown>) => FxSide | null;
  /** rule exit on the close of bar j for an open position */
  exit?: (x: F40Ind, j: number, side: FxSide, cache: Map<string, unknown>) => boolean;
  rr?: number;
};

const memo = <T,>(cache: Map<string, unknown>, k: string, f: () => T): T => {
  if (!cache.has(k)) cache.set(k, f());
  return cache.get(k) as T;
};
const crossUp = (a: Arr, b: Arr | number, i: number) => {
  const b0 = typeof b === "number" ? b : b[i - 1]; const b1 = typeof b === "number" ? b : b[i];
  return a[i - 1] != null && a[i] != null && b0 != null && b1 != null && a[i - 1]! <= b0 && a[i]! > b1;
};
const crossDn = (a: Arr, b: Arr | number, i: number) => {
  const b0 = typeof b === "number" ? b : b[i - 1]; const b1 = typeof b === "number" ? b : b[i];
  return a[i - 1] != null && a[i] != null && b0 != null && b1 != null && a[i - 1]! >= b0 && a[i]! < b1;
};
const v = (a: Arr, i: number) => a[i];
const rising = (a: Arr, i: number) => a[i] != null && a[i - 1] != null && a[i]! > a[i - 1]!;
const falling = (a: Arr, i: number) => a[i] != null && a[i - 1] != null && a[i]! < a[i - 1]!;

export const F40_RULES: Rule[] = [
  {
    id: "F01_WILLIAMS", name: "Bill Williams: ruptura de la mandíbula del Alligator + AC verde + AO cruza 0",
    entry: (x, i, m) => {
      const jaw = memo(m, "jaw", () => shift(x.smmaMed(13), 8));
      const aoUp = [0, 1, 2].some((k) => crossUp(x.ao, 0, i - k)); const aoDn = [0, 1, 2].some((k) => crossDn(x.ao, 0, i - k));
      if (crossUp(x.c as unknown as Arr, jaw, i) && rising(x.ac, i) && aoUp) return "long";
      if (crossDn(x.c as unknown as Arr, jaw, i) && falling(x.ac, i) && aoDn) return "short";
      return null;
    },
    exit: (x, j, s, m) => {
      const lips = memo(m, "lips", () => shift(x.smmaMed(5), 3));
      return s === "long" ? crossDn(x.c as unknown as Arr, lips, j) : crossUp(x.c as unknown as Arr, lips, j);
    },
  },
  {
    id: "F02_SIDUS", name: "Sidus: WMA5/WMA8 cruzan el canal EMA18–EMA28",
    entry: (x, i, m) => {
      const w5 = memo(m, "w5", () => x.wma(5)); const w8 = memo(m, "w8", () => x.wma(8));
      const e18 = memo(m, "e18", () => x.ema(18)); const e28 = memo(m, "e28", () => x.ema(28));
      const top = memo(m, "sidTop", (): Arr => e18.map((a, k) => (a == null || e28[k] == null ? null : Math.max(a, e28[k]!))));
      const bot = memo(m, "sidBot", (): Arr => e18.map((a, k) => (a == null || e28[k] == null ? null : Math.min(a, e28[k]!))));
      if (crossUp(w8, top, i) && v(w5, i)! > v(top, i)!) return "long";
      if (crossDn(w8, bot, i) && v(w5, i)! < v(bot, i)!) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const w5 = memo(m, "w5", () => x.wma(5)); const w8 = memo(m, "w8", () => x.wma(8)); return s === "long" ? crossDn(w5, w8, j) : crossUp(w5, w8, j); },
  },
  {
    id: "F03_PURIA", name: "Puria: EMA5 cruza LWMA75/85 (mínimos) + MACD(15,26) a favor",
    entry: (x, i, m) => {
      const e5 = memo(m, "e5", () => x.ema(5)); const a = memo(m, "l75", () => x.lwmaLow(75)); const b = memo(m, "l85", () => x.lwmaLow(85));
      const mc = memo(m, "m1526", () => x.macd(15, 26, 1)).m;
      const hiMa = memo(m, "purHi", (): Arr => a.map((y, k) => (y == null || b[k] == null ? null : Math.max(y, b[k]!))));
      const loMa = memo(m, "purLo", (): Arr => a.map((y, k) => (y == null || b[k] == null ? null : Math.min(y, b[k]!))));
      if (crossUp(e5, hiMa, i) && v(mc, i)! > 0) return "long";
      if (crossDn(e5, loMa, i) && v(mc, i)! < 0) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const mc = memo(m, "m1526", () => x.macd(15, 26, 1)).m; return s === "long" ? falling(mc, j) && falling(mc, j - 1) : rising(mc, j) && rising(mc, j - 1); },
  },
  {
    id: "F04_KUMO", name: "Ruptura de Kumo (8,29,34) + giro del AO",
    entry: (x, i, m) => {
      const k = memo(m, "kumo", () => x.ichi(8, 29, 34));
      const top = memo(m, "kTop", (): Arr => k.spanA.map((a, j) => (a == null || k.spanB[j] == null ? null : Math.max(a, k.spanB[j]!))));
      const bot = memo(m, "kBot", (): Arr => k.spanA.map((a, j) => (a == null || k.spanB[j] == null ? null : Math.min(a, k.spanB[j]!))));
      if (crossUp(x.c as unknown as Arr, top, i) && rising(x.ao, i)) return "long";
      if (crossDn(x.c as unknown as Arr, bot, i) && falling(x.ao, i)) return "short";
      return null;
    },
    exit: (x, j, s) => (s === "long" ? crossDn(x.ao, 0, j) : crossUp(x.ao, 0, j)),
  },
  {
    id: "F05_ELDER_MOM", name: "Momentum(18) cruza 100 con cierre sobre/bajo EMA19",
    entry: (x, i, m) => {
      const e = memo(m, "e19", () => x.ema(19));
      if (x.c[i]! > v(e, i)! && crossUp(x.mom18, 100, i)) return "long";
      if (x.c[i]! < v(e, i)! && crossDn(x.mom18, 100, i)) return "short";
      return null;
    },
    exit: (x, j, s) => (s === "long" ? crossDn(x.mom18, 100, j) : crossUp(x.mom18, 100, j)),
  },
  {
    id: "F07_MACD_AO", name: "MACD(34,89,9) por encima de señal y cero + AO gira a verde",
    entry: (x, i, m) => {
      const mc = memo(m, "m3489", () => x.macd(34, 89, 9));
      const aoGreen = rising(x.ao, i) && falling(x.ao, i - 1); const aoRed = falling(x.ao, i) && rising(x.ao, i - 1);
      if (v(mc.m, i)! > 0 && v(mc.h, i)! > 0 && aoGreen) return "long";
      if (v(mc.m, i)! < 0 && v(mc.h, i)! < 0 && aoRed) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const mc = memo(m, "m3489", () => x.macd(34, 89, 9)); return s === "long" ? v(mc.h, j)! < 0 : v(mc.h, j)! > 0; },
  },
  {
    id: "F09_BB_STOCH", name: "Rebote en banda de Bollinger + estocástico(5,3,3) cruza en sobreventa/sobrecompra",
    rr: 1.5,
    entry: (x, i, m) => {
      const s = memo(m, "st533", () => x.stoch(5, 3, 3));
      const lo = (k: number) => x.bbMid[k]! - 2 * x.sd20[k]!; const hi = (k: number) => x.bbMid[k]! + 2 * x.sd20[k]!;
      if (x.bbMid[i] == null) return null;
      if (x.b[i - 1]!.low <= lo(i - 1) && x.c[i]! > x.b[i]!.open && crossUp(s.K, s.D, i) && v(s.K, i)! < 30) return "long";
      if (x.b[i - 1]!.high >= hi(i - 1) && x.c[i]! < x.b[i]!.open && crossDn(s.K, s.D, i) && v(s.K, i)! > 70) return "short";
      return null;
    },
  },
  {
    id: "F10_BB_RSI_ADX", name: "Bollinger + RSI(7) en extremo con ADX < 32 (rango)",
    entry: (x, i, m) => {
      const r = memo(m, "r7", () => x.rsi(7)); const a = x.adx.adx[i];
      if (x.bbMid[i] == null || a == null || a >= 32) return null;
      if (x.b[i]!.low <= x.bbMid[i]! - 2 * x.sd20[i]! && v(r, i)! < 30 && x.c[i]! > x.b[i]!.open) return "long";
      if (x.b[i]!.high >= x.bbMid[i]! + 2 * x.sd20[i]! && v(r, i)! > 70 && x.c[i]! < x.b[i]!.open) return "short";
      return null;
    },
    exit: (x, j, s) => (s === "long" ? x.c[j]! >= x.bbMid[j]! : x.c[j]! <= x.bbMid[j]!),
  },
  {
    id: "F12_PSAR_MACD", name: "MACD(12,26,9) cruza su señal + giro del SAR parabólico",
    entry: (x, i, m) => {
      const mc = memo(m, "m12", () => x.macd(12, 26, 9)); const p = memo(m, "ps", () => x.psar(0.02, 0.2));
      const flipUp = [0, 1, 2].some((k) => p.up[i - k] && !p.up[i - k - 1]); const flipDn = [0, 1, 2].some((k) => !p.up[i - k] && p.up[i - k - 1]);
      if (crossUp(mc.m, mc.sg, i) && p.up[i] && flipUp) return "long";
      if (crossDn(mc.m, mc.sg, i) && !p.up[i] && flipDn) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const p = memo(m, "ps", () => x.psar(0.02, 0.2)); return s === "long" ? !p.up[j] : p.up[j]; },
  },
  {
    id: "F17_TWO_STOCH", name: "Dos estocásticos: rápido (5,3,3) y lento (21,9,9) cruzan en zona extrema",
    entry: (x, i, m) => {
      const f = memo(m, "st533", () => x.stoch(5, 3, 3)); const s = memo(m, "st2199", () => x.stoch(21, 9, 9));
      const fUp = [0, 1, 2, 3].some((k) => crossUp(f.K, f.D, i - k) && v(f.K, i - k)! < 30); const fDn = [0, 1, 2, 3].some((k) => crossDn(f.K, f.D, i - k) && v(f.K, i - k)! > 70);
      if (fUp && crossUp(s.K, s.D, i) && v(s.K, i)! < 40) return "long";
      if (fDn && crossDn(s.K, s.D, i) && v(s.K, i)! > 60) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const st = memo(m, "st2199", () => x.stoch(21, 9, 9)); return s === "long" ? crossDn(st.K, st.D, j) : crossUp(st.K, st.D, j); },
  },
  {
    id: "F20_EMA_RVI", name: "Cruce EMA18/EMA28 confirmado por RVI(10)",
    entry: (x, i, m) => {
      const a = memo(m, "e18", () => x.ema(18)); const b = memo(m, "e28", () => x.ema(28)); const r = x.rvi10;
      if (crossUp(a, b, i) && v(r.rvi, i)! > v(r.sig, i)!) return "long";
      if (crossDn(a, b, i) && v(r.rvi, i)! < v(r.sig, i)!) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const a = memo(m, "e18", () => x.ema(18)); const b = memo(m, "e28", () => x.ema(28)); return s === "long" ? crossDn(a, b, j) : crossUp(a, b, j); },
  },
  {
    id: "F22_SMA_GROUPS", name: "Dos grupos de SMA (3–15 y 30–60) ordenados y subiendo",
    entry: (x, i, m) => {
      const fast = memo(m, "gf", () => [3, 5, 8, 10, 12, 15].map((n) => x.sma(n))); const slow = memo(m, "gs", () => [30, 35, 40, 45, 50, 60].map((n) => x.sma(n)));
      const ordUp = (g: Arr[], k: number) => g.every((a, q) => a[k] != null && (q === 0 || g[q - 1]![k]! > a[k]!)) && g.every((a) => rising(a, k));
      const ordDn = (g: Arr[], k: number) => g.every((a, q) => a[k] != null && (q === 0 || g[q - 1]![k]! < a[k]!)) && g.every((a) => falling(a, k));
      if (ordUp(fast, i) && ordUp(slow, i) && fast[5]![i]! > slow[0]![i]! && !(ordUp(fast, i - 1) && ordUp(slow, i - 1))) return "long";
      if (ordDn(fast, i) && ordDn(slow, i) && fast[5]![i]! < slow[0]![i]! && !(ordDn(fast, i - 1) && ordDn(slow, i - 1))) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const f = memo(m, "gf", () => [3, 5, 8, 10, 12, 15].map((n) => x.sma(n))); return s === "long" ? crossDn(f[0]!, f[5]!, j) : crossUp(f[0]!, f[5]!, j); },
  },
  {
    id: "F24_YEN", name: "EMA8 cruza SMA21 de máximos/mínimos + ADX>15 subiendo y DI a favor",
    entry: (x, i, m) => {
      const e8 = memo(m, "e8", () => x.ema(8)); const h = memo(m, "sh21", () => x.smaHigh(21)); const l = memo(m, "sl21", () => x.smaLow(21));
      const a = x.adx;
      if (v(a.adx, i) == null || v(a.adx, i)! < 15 || !rising(a.adx, i)) return null;
      if (crossUp(e8, h, i) && x.c[i]! > v(h, i)! && v(a.pdi, i)! > v(a.mdi, i)!) return "long";
      if (crossDn(e8, l, i) && x.c[i]! < v(l, i)! && v(a.mdi, i)! > v(a.pdi, i)!) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const e8 = memo(m, "e8", () => x.ema(8)); const h = memo(m, "sh21", () => x.smaHigh(21)); const l = memo(m, "sl21", () => x.smaLow(21)); return s === "long" ? crossDn(e8, l, j) : crossUp(e8, h, j); },
  },
  {
    id: "F25_THREE_RSI", name: "Tres RSI (8/14/19) se ordenan a favor con cierre sobre/bajo SMA9",
    entry: (x, i, m) => {
      const r8 = memo(m, "r8", () => x.rsi(8)); const r14 = memo(m, "r14", () => x.rsi(14)); const r19 = memo(m, "r19", () => x.rsi(19)); const s9 = memo(m, "s9", () => x.sma(9));
      const up = (k: number) => v(r8, k)! > v(r14, k)! && v(r14, k)! > v(r19, k)!; const dn = (k: number) => v(r8, k)! < v(r14, k)! && v(r14, k)! < v(r19, k)!;
      if (v(r19, i - 1) == null || v(s9, i - 1) == null) return null;
      if (up(i) && !up(i - 1) && x.c[i - 1]! > v(s9, i - 1)!) return "long";
      if (dn(i) && !dn(i - 1) && x.c[i - 1]! < v(s9, i - 1)!) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const r8 = memo(m, "r8", () => x.rsi(8)); return s === "long" ? v(r8, j)! < 50 : v(r8, j)! > 50; },
  },
  {
    id: "F26_BULLDOZER", name: "Bulldozer: cierre sobre EMA70 con EMA21 aún debajo + AO verde subiendo",
    entry: (x, i, m) => {
      const e21 = memo(m, "e21", () => x.ema(21)); const e70 = memo(m, "e70", () => x.ema(70));
      const up = (k: number) => x.c[k]! > v(e70, k)! && v(e21, k)! < v(e70, k)! && v(x.ao, k)! > 0 && rising(x.ao, k);
      const dn = (k: number) => x.c[k]! < v(e70, k)! && v(e21, k)! > v(e70, k)! && v(x.ao, k)! < 0 && falling(x.ao, k);
      if (v(e70, i - 1) == null || v(x.ao, i - 1) == null) return null;
      if (up(i) && !up(i - 1)) return "long";
      if (dn(i) && !dn(i - 1)) return "short";
      return null;
    },
    exit: (x, j, s) => (s === "long" ? crossDn(x.ao, 0, j) : crossUp(x.ao, 0, j)),
  },
  {
    id: "F27_4UJ", name: "4UJ: precio sobre SMA48 y ATR(7) cruza su media de 30",
    rr: 4,
    entry: (x, i, m) => {
      const s48 = memo(m, "s48", () => x.sma(48)); const am = memo(m, "atr7ma", () => maOf(x.atr7, 30, sma));
      if (v(s48, i) == null) return null;
      if (x.c[i]! > v(s48, i)! && crossUp(x.atr7, am, i)) return "long";
      if (x.c[i]! < v(s48, i)! && crossUp(x.atr7, am, i)) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const s48 = memo(m, "s48", () => x.sma(48)); return s === "long" ? x.c[j]! < v(s48, j)! : x.c[j]! > v(s48, j)!; },
  },
  {
    id: "F31_3EMA_STOCH", name: "3 EMA (4/13/50) + estocástico(12,9,5) saliendo de extremo",
    entry: (x, i, m) => {
      const e4 = memo(m, "e4", () => x.ema(4)); const e13 = memo(m, "e13", () => x.ema(13)); const e50 = memo(m, "e50", () => x.ema(50)); const s = memo(m, "st1295", () => x.stoch(12, 9, 5));
      if (crossUp(e13, e50, i) && v(e4, i)! > v(e50, i)! && rising(s.K, i) && v(s.K, i)! < 60) return "long";
      if (crossDn(e13, e50, i) && v(e4, i)! < v(e50, i)! && falling(s.K, i) && v(s.K, i)! > 40) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const st = memo(m, "st1295", () => x.stoch(12, 9, 5)); return s === "long" ? v(st.K, j)! > 80 : v(st.K, j)! < 20; },
  },
  {
    id: "F33_DOUBLE_MACD", name: "MACD doble: precio sobre SMA60, MACD(30,60) > 0 y MACD(6,12) cruza 0",
    entry: (x, i, m) => {
      const s60 = memo(m, "s60", () => x.sma(60)); const sen = memo(m, "m3060", () => x.macd(30, 60, 30)).m; const jun = memo(m, "m612", () => x.macd(6, 12, 5)).m;
      if (v(s60, i) == null) return null;
      if (x.c[i]! > v(s60, i)! && v(sen, i)! > 0 && crossUp(jun, 0, i)) return "long";
      if (x.c[i]! < v(s60, i)! && v(sen, i)! < 0 && crossDn(jun, 0, i)) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const s60 = memo(m, "s60", () => x.sma(60)); return s === "long" ? x.c[j]! < v(s60, j)! : x.c[j]! > v(s60, j)!; },
  },
  {
    id: "F35_SARDAR", name: "Sardar: RVI(10) cruza 0 con RSI y desviación típica subiendo",
    rr: 2.5,
    entry: (x, i, m) => {
      const r = memo(m, "r14", () => x.rsi(14)); const sd = memo(m, "sd20", () => x.sd(20));
      if (crossUp(x.rvi10.rvi, 0, i) && rising(r, i) && rising(sd, i)) return "long";
      if (crossDn(x.rvi10.rvi, 0, i) && falling(r, i) && falling(sd, i)) return "short";
      return null;
    },
  },
  {
    id: "F36_RANGER", name: "Guardabosques: estocástico(5,5,5) cruza bajo 25 / sobre 75 con SAR a favor",
    rr: 2.5,
    entry: (x, i, m) => {
      const s = memo(m, "st555", () => x.stoch(5, 5, 5)); const p = memo(m, "ps2", () => x.psar(0.04, 0.1));
      if (crossUp(s.K, s.D, i) && v(s.K, i)! < 25 && p.up[i]) return "long";
      if (crossDn(s.K, s.D, i) && v(s.K, i)! > 75 && !p.up[i]) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const st = memo(m, "st555", () => x.stoch(5, 5, 5)); return s === "long" ? v(st.K, j)! > 75 : v(st.K, j)! < 25; },
  },
  {
    id: "F37_UMI", name: "UMI: cierre sobre la nube (9,26,52) y el Alligator, CCI(50) > 50 y estocástico > 50",
    entry: (x, i, m) => {
      const k = memo(m, "kumo9", () => x.ichi(9, 26, 52)); const jaw = memo(m, "jaw", () => shift(x.smmaMed(13), 8)); const teeth = memo(m, "teeth", () => shift(x.smmaMed(8), 5));
      const lips = memo(m, "lips", () => shift(x.smmaMed(5), 3)); const c50 = memo(m, "cci50", () => x.cci(50)); const st = memo(m, "st1433", () => x.stoch(14, 3, 3));
      const ok = (q: number, dir: 1 | -1) => {
        const vals = [k.spanA[q], k.spanB[q], jaw[q], teeth[q], lips[q], c50[q], st.K[q]];
        if (vals.some((z) => z == null)) return false;
        const lim = [k.spanA[q]!, k.spanB[q]!, jaw[q]!, teeth[q]!, lips[q]!];
        return dir === 1 ? lim.every((z) => x.c[q]! > z) && c50[q]! > 50 && st.K[q]! > 50 : lim.every((z) => x.c[q]! < z) && c50[q]! < -50 && st.K[q]! < 50;
      };
      if (ok(i, 1) && !ok(i - 1, 1)) return "long";
      if (ok(i, -1) && !ok(i - 1, -1)) return "short";
      return null;
    },
    exit: (x, j, s, m) => { const teeth = memo(m, "teeth", () => shift(x.smmaMed(8), 5)); return s === "long" ? x.c[j]! < v(teeth, j)! : x.c[j]! > v(teeth, j)!; },
  },
  {
    id: "F39_ENV_MACD", name: "Envolventes(21; 0,07 %) rotas con el cuerpo fuera + MACD > 0",
    rr: 2,
    entry: (x, i, m) => {
      const s21 = memo(m, "s21", () => x.sma(21)); const mc = memo(m, "m12", () => x.macd(12, 26, 9));
      if (v(s21, i) == null) return null;
      const up = v(s21, i)! * 1.0007; const dn = v(s21, i)! * 0.9993; const b = x.b[i]!;
      if (Math.min(b.open, b.close) > up && x.b[i - 1]!.close <= v(s21, i - 1)! * 1.0007 && v(mc.h, i)! > 0) return "long";
      if (Math.max(b.open, b.close) < dn && x.b[i - 1]!.close >= v(s21, i - 1)! * 0.9993 && v(mc.h, i)! < 0) return "short";
      return null;
    },
  },
];

// ── backtest ────────────────────────────────────────────────────────────────
export type F40Tf = "H1" | "H4" | "D1";
const TF_SEC: Record<F40Tf, number> = { H1: 3600, H4: 14400, D1: 86400 };
const MAX_BARS: Record<F40Tf, number> = { H1: 72, H4: 30, D1: 20 };

export type F40Trade = { entryTime: number; side: FxSide; r: number };

export type F40Ctx = { x: F40Ind; cache: Map<string, unknown> };
export function f40Ctx(bars: readonly FxCandle[]): F40Ctx {
  return { x: f40Indicators(bars), cache: new Map() };
}

export function backtestF40(rule: Rule, bars: readonly FxCandle[], tf: F40Tf, spread: number, costSpread = spread, ctx?: F40Ctx): F40Trade[] {
  const { x, cache } = ctx ?? f40Ctx(bars);
  const weekend = bars.map((b) => tf !== "D1" && isWeekendFlattenTime(new Date((b.time + TF_SEC[tf]) * 1000)));
  const out: F40Trade[] = [];
  for (let i = 120; i < bars.length - 1; i += 1) {
    if (weekend[i]) continue;
    let side: FxSide | null = null;
    try { side = rule.entry(x, i, cache); } catch { side = null; }
    if (!side) continue;
    const a = x.atr14[i];
    if (a == null || !(a > 0)) continue;
    const risk = 2 * a;
    if (spread > 0.25 * risk) continue;
    const dir = side === "long" ? 1 : -1;
    const entry = bars[i + 1]!.open + (dir * costSpread) / 2;
    const stop = entry - dir * risk;
    const tp = rule.rr ? entry + dir * rule.rr * risk : null;
    let exit: number | null = null;
    let j = i + 1;
    for (; j < bars.length; j += 1) {
      const b = bars[j]!;
      if (side === "long" ? b.low <= stop : b.high >= stop) { exit = (j > i + 1 && (side === "long" ? b.open < stop : b.open > stop) ? b.open : stop) - (dir * costSpread) / 2; break; }
      if (tp != null && (side === "long" ? b.high >= tp : b.low <= tp)) { exit = tp - (dir * costSpread) / 2; break; }
      let ruleExit = false;
      try { ruleExit = rule.exit ? rule.exit(x, j, side, cache) : false; } catch { ruleExit = false; }
      if (ruleExit || weekend[j] || j - i >= MAX_BARS[tf]) { exit = b.close - (dir * costSpread) / 2; break; }
    }
    if (exit == null) break;
    out.push({ entryTime: bars[i + 1]!.time, side, r: ((exit - entry) * dir) / risk });
    i = j;
  }
  return out;
}

export type F40Stats = { trades: number; winRate: number; pf: number; meanR: number; totalR: number };
export function f40Stats(t: readonly F40Trade[]): F40Stats {
  const gp = t.filter((q) => q.r > 0).reduce((s, q) => s + q.r, 0); const gl = -t.filter((q) => q.r <= 0).reduce((s, q) => s + q.r, 0);
  return { trades: t.length, winRate: t.length ? t.filter((q) => q.r > 0).length / t.length : 0, pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0, meanR: t.length ? (gp - gl) / t.length : 0, totalR: gp - gl };
}

export const F40_GATE = { minTrades: 60, minPF: 1.15, minMeanR: 0.05, stress: 1.5 } as const;

export type F40Result = {
  id: string; rule: string; name: string; instrument: string; tf: F40Tf; bars: number;
  all: F40Stats; firstHalf: F40Stats; secondHalf: F40Stats; stressed: F40Stats; liveEligible: boolean; reason: string; locked?: boolean;
};

export function evaluateF40(rule: Rule, instrument: string, tf: F40Tf, bars: readonly FxCandle[], spread: number, ctx?: F40Ctx): F40Result {
  const c = ctx ?? f40Ctx(bars);
  const t = backtestF40(rule, bars, tf, spread, spread, c);
  const from = bars[0]?.time ?? 0; const to = bars[bars.length - 1]?.time ?? 0; const mid = from + (to - from) / 2;
  const all = f40Stats(t); const firstHalf = f40Stats(t.filter((q) => q.entryTime < mid)); const secondHalf = f40Stats(t.filter((q) => q.entryTime >= mid));
  const stressed = f40Stats(backtestF40(rule, bars, tf, spread, spread * F40_GATE.stress, c));
  const r: string[] = [];
  if (all.trades < F40_GATE.minTrades) r.push(`ops=${all.trades}<${F40_GATE.minTrades}`);
  if (all.pf < F40_GATE.minPF) r.push(`PF=${all.pf.toFixed(2)}`);
  if (all.meanR < F40_GATE.minMeanR) r.push(`media=${all.meanR.toFixed(3)}R`);
  if (firstHalf.meanR <= 0 || secondHalf.meanR <= 0) r.push("no gana en las dos mitades");
  if (stressed.meanR <= 0) r.push(`pierde con spread ×${F40_GATE.stress}`);
  return { id: `${rule.id}_${instrument.replace("_", "")}_${tf}`, rule: rule.id, name: rule.name, instrument, tf, bars: bars.length, all, firstHalf, secondHalf, stressed, liveEligible: r.length === 0, reason: r.join("; ") || "ok" };
}

/** Live: signal of `ruleId` on the last closed bar (index len-2 of a series whose last bar is forming). */
export function f40SignalOnLastClosed(ruleId: string, bars: readonly FxCandle[]): { side: FxSide; atr: number } | null {
  const rule = F40_RULES.find((r) => r.id === ruleId);
  if (!rule || bars.length < 150) return null;
  const x = f40Indicators(bars);
  const i = bars.length - 2;
  const side = rule.entry(x, i, new Map());
  const a = x.atr14[i];
  return side && a != null && a > 0 ? { side, atr: a } : null;
}

export function f40RuleExitOnLastClosed(ruleId: string, bars: readonly FxCandle[], side: FxSide): boolean {
  const rule = F40_RULES.find((r) => r.id === ruleId);
  if (!rule?.exit || bars.length < 150) return false;
  const x = f40Indicators(bars);
  return rule.exit(x, bars.length - 2, side, new Map());
}

export function f40Rule(ruleId: string): { id: string; name: string; rr?: number } | null {
  const r = F40_RULES.find((q) => q.id === ruleId);
  return r ? { id: r.id, name: r.name, rr: r.rr } : null;
}
