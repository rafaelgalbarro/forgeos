/**
 * Per-pair short-term FX strategies (pure).
 *
 * A library of rule families × parameter sets ("specs"). The optimizer backtests every spec on
 * each pair's real M15 history (OANDA via MT5), picks the best one on the first 2/3 of the data
 * (in-sample) and validates it on the last 1/3 (out-of-sample). Only a pair whose chosen spec
 * also passes OOS may trade live; the rest keep running in shadow.
 *
 * The very same `signalAt` is used by the backtest and by the live engine (no drift).
 *
 * Families (signal on the close of an M15 bar, entry at the next price):
 *   EMA_CROSS      EMA fast crosses EMA slow, in the direction of EMA200 (trend filter).
 *   MACD_TREND     MACD(12,26,9) line crosses its signal, in the direction of EMA200.
 *   DONCHIAN_BREAK close breaks the N-bar high/low, in the direction of EMA200.
 *   RSI_REVERT     RSI leaves an extreme zone (back inside), mean reversion.
 *   BB_REVERT      close back inside Bollinger(20,2) after closing outside, mean reversion.
 *   STOCH_TREND    Stochastic(14,3) %K crosses back above 20 (below 80) in the EMA200 trend.
 *   KELTNER_BREAK  close beyond EMA20 ± k×ATR(14) in the EMA200 trend (momentum).
 *   INSIDE_BAR     previous bar inside its mother bar; close breaks the mother bar, EMA200 trend.
 *   ADX_RSI_PULLBACK ADX(14) > 25, RSI(14) dips below 40 (above 60) and turns back, EMA50 trend.
 *   ASIA_BREAKOUT  (M15/H1) first close beyond the 00–07 London range between 07:00 and 10:00.
 * Stop = atrMult × ATR(14); take profit = rr × stop; time exit after maxBars; flat for the weekend.
 */

import { pipSize } from "./indicators";
import { isFxEntryWindow, isWeekendFlattenTime, londonMinutes } from "./sessions";
import type { FxCandle, FxSide } from "./types";

export type FxFamily =
  | "EMA_CROSS" | "MACD_TREND" | "DONCHIAN_BREAK" | "RSI_REVERT" | "BB_REVERT" | "PULLBACK"
  // added 29/10: more entry types (trend pullbacks / momentum / session breakout)
  | "STOCH_TREND" | "KELTNER_BREAK" | "INSIDE_BAR" | "ADX_RSI_PULLBACK" | "ASIA_BREAKOUT";

/** Entry session (London clock at the signal bar close). */
export type FxSession = "all" | "asia" | "london" | "ny";
const SESSION_MIN: Record<Exclude<FxSession, "all">, [number, number]> = {
  asia: [0, 8 * 60],
  london: [7 * 60, 16 * 60],
  ny: [12 * 60, 21 * 60],
};

export type FxTf = "M15" | "H1" | "H4" | "D1";
export const TF_SEC: Record<FxTf, number> = { M15: 900, H1: 3600, H4: 14400, D1: 86400 };

export type FxSpec = {
  id: string;
  /** candle timeframe the rule runs on */
  tf: FxTf;
  /** entries only in this session (default all) */
  session?: FxSession;
  family: FxFamily;
  /** family parameters: fast/slow, n, lo/hi … */
  p: Record<string, number>;
  atrMult: number;
  rr: number;
  maxBars: number;
};

/** Time exit per timeframe: trend rules / reversion rules (in bars). */
const MAX_BARS: Record<FxTf, { trend: number; revert: number }> = {
  M15: { trend: 96, revert: 48 }, // 24 h / 12 h
  H1: { trend: 72, revert: 36 }, // 3 d / 1.5 d
  H4: { trend: 30, revert: 15 }, // 5 d / 2.5 d
  D1: { trend: 20, revert: 8 }, // 4 weeks / 8 days (held over weekends)
};

function spec(tf: FxTf, family: FxFamily, p: Record<string, number>, atrMult: number, rr: number, session: FxSession = "all"): FxSpec {
  const ps = Object.entries(p).map(([k, v]) => `${k}${v}`).join("_");
  const revert = family === "RSI_REVERT" || family === "BB_REVERT" || family === "STOCH_TREND" || family === "ADX_RSI_PULLBACK" || family === "ASIA_BREAKOUT";
  const maxBars = MAX_BARS[tf][revert ? "revert" : "trend"];
  const ss = session === "all" ? "" : `_S${session}`;
  return { id: `${tf}_${family}${ps ? `_${ps}` : ""}_A${atrMult}_R${rr}${ss}`, tf, family, p, atrMult, rr, maxBars, session };
}

/** Parameter grid (kept small on purpose: fewer specs → less curve fitting). */
/**
 * Parameter grid per timeframe. Intraday frames (M15/H1) also get session variants
 * (Asia / London / New York), so each pair can trade only when it moves best.
 */
export function specGrid(tf: FxTf = "M15", withSessions = tf === "M15" || tf === "H1"): FxSpec[] {
  const base: Array<[FxFamily, Record<string, number>, number, number]> = [];
  for (const [fast, slow] of [[9, 21], [20, 50], [12, 26]] as const) {
    for (const a of [1.5, 2]) for (const r of [1.5, 2]) base.push(["EMA_CROSS", { fast, slow }, a, r]);
  }
  for (const a of [1.5, 2]) for (const r of [1.5, 2]) base.push(["MACD_TREND", {}, a, r]);
  for (const n of [20, 55]) for (const a of [1.5, 2]) for (const r of [1.5, 2]) base.push(["DONCHIAN_BREAK", { n }, a, r]);
  for (const a of [1.5, 2]) for (const r of [1.5, 2]) base.push(["PULLBACK", {}, a, r]);
  for (const [lo, hi] of [[30, 70], [25, 75]] as const) for (const r of [1, 1.5]) base.push(["RSI_REVERT", { lo, hi }, 1.5, r]);
  for (const r of [1, 1.5]) base.push(["BB_REVERT", {}, 1.5, r]);
  for (const a of [1.5, 2]) for (const r of [1, 1.5]) base.push(["STOCH_TREND", {}, a, r]);
  for (const k of [2, 2.5]) for (const r of [1.5, 2]) base.push(["KELTNER_BREAK", { k }, 1.5, r]);
  for (const a of [1, 1.5]) for (const r of [1.5, 2]) base.push(["INSIDE_BAR", {}, a, r]);
  for (const a of [1.5, 2]) for (const r of [1, 1.5]) base.push(["ADX_RSI_PULLBACK", {}, a, r]);
  if (tf === "M15" || tf === "H1") for (const a of [1, 1.5]) for (const r of [1, 1.5, 2]) base.push(["ASIA_BREAKOUT", {}, a, r]);
  const sessions: FxSession[] = withSessions ? ["all", "asia", "london", "ny"] : ["all"];
  const out: FxSpec[] = [];
  for (const ss of sessions) {
    for (const [f, p, a, r] of base) {
      if (f === "ASIA_BREAKOUT" && ss !== "all") continue; // has its own time window
      out.push(spec(tf, f, p, a, r, ss));
    }
  }
  return out;
}

// ── Indicators over the whole series (null until warmed up) ─────────────────

type Arr = Array<number | null>;

function emaArr(v: readonly number[], n: number): Arr {
  const out: Arr = new Array(v.length).fill(null);
  if (v.length < n) return out;
  let s = 0;
  for (let i = 0; i < n; i += 1) s += v[i]!;
  let e = s / n;
  out[n - 1] = e;
  const k = 2 / (n + 1);
  for (let i = n; i < v.length; i += 1) {
    e = v[i]! * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

function rsiArr(v: readonly number[], n = 14): Arr {
  const out: Arr = new Array(v.length).fill(null);
  if (v.length <= n) return out;
  let g = 0;
  let l = 0;
  for (let i = 1; i <= n; i += 1) {
    const d = v[i]! - v[i - 1]!;
    if (d >= 0) g += d; else l -= d;
  }
  g /= n; l /= n;
  out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < v.length; i += 1) {
    const d = v[i]! - v[i - 1]!;
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    l = (l * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

function atrArr(b: readonly FxCandle[], n = 14): Arr {
  const out: Arr = new Array(b.length).fill(null);
  if (b.length <= n) return out;
  const tr = b.map((x, i) => (i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1]!.close), Math.abs(x.low - b[i - 1]!.close))));
  let a = 0;
  for (let i = 1; i <= n; i += 1) a += tr[i]!;
  a /= n;
  out[n] = a;
  for (let i = n + 1; i < b.length; i += 1) {
    a = (a * (n - 1) + tr[i]!) / n;
    out[i] = a;
  }
  return out;
}

export type FxIndicators = {
  bars: readonly FxCandle[];
  close: number[];
  ema: (n: number) => Arr;
  rsi14: Arr;
  atr14: Arr;
  macd: Arr;
  macdSig: Arr;
  bbMid: Arr;
  bbSd: Arr;
  donHi: (n: number) => Arr;
  donLo: (n: number) => Arr;
  stochK: Arr;
  adx14: Arr;
  /** Asia range (00–07 London, same day) known at bar i, or null outside 07:00–10:00 */
  asiaHi: Arr;
  asiaLo: Arr;
  /** first bar index of the current 07–10 window that already broke the range (one trade/day) */
  asiaBroke: boolean[];
  /** per bar (by bar close time): entries allowed (24h window) / weekend flatten */
  entryOk: boolean[];
  weekend: boolean[];
  /** London minutes-of-day at each bar close */
  lonMin: number[];
};

/** Slow stochastic %K: SMA3 of raw %K(14). */
function stochKArr(b: readonly FxCandle[], n = 14, smooth = 3): Arr {
  const raw: Arr = new Array(b.length).fill(null);
  for (let i = n - 1; i < b.length; i += 1) {
    let hi = -Infinity; let lo = Infinity;
    for (let j = i - n + 1; j <= i; j += 1) { hi = Math.max(hi, b[j]!.high); lo = Math.min(lo, b[j]!.low); }
    raw[i] = hi > lo ? ((b[i]!.close - lo) / (hi - lo)) * 100 : 50;
  }
  const out: Arr = new Array(b.length).fill(null);
  for (let i = n - 1 + smooth - 1; i < b.length; i += 1) {
    let s = 0;
    for (let j = i - smooth + 1; j <= i; j += 1) s += raw[j]!;
    out[i] = s / smooth;
  }
  return out;
}

/** Wilder ADX(14). */
function adxArr(b: readonly FxCandle[], n = 14): Arr {
  const out: Arr = new Array(b.length).fill(null);
  if (b.length < 2 * n + 2) return out;
  let trS = 0; let pS = 0; let mS = 0;
  const dx: number[] = [];
  for (let i = 1; i < b.length; i += 1) {
    const up = b[i]!.high - b[i - 1]!.high;
    const dn = b[i - 1]!.low - b[i]!.low;
    const pdm = up > dn && up > 0 ? up : 0;
    const mdm = dn > up && dn > 0 ? dn : 0;
    const tr = Math.max(b[i]!.high - b[i]!.low, Math.abs(b[i]!.high - b[i - 1]!.close), Math.abs(b[i]!.low - b[i - 1]!.close));
    if (i <= n) { trS += tr; pS += pdm; mS += mdm; if (i < n) continue; }
    else { trS = trS - trS / n + tr; pS = pS - pS / n + pdm; mS = mS - mS / n + mdm; }
    const pdi = trS > 0 ? (100 * pS) / trS : 0;
    const mdi = trS > 0 ? (100 * mS) / trS : 0;
    dx.push(pdi + mdi > 0 ? (100 * Math.abs(pdi - mdi)) / (pdi + mdi) : 0);
    if (dx.length === n) out[i] = dx.reduce((a, x) => a + x, 0) / n;
    else if (dx.length > n) out[i] = (out[i - 1]! * (n - 1) + dx[dx.length - 1]!) / n;
  }
  return out;
}

/** Asia range (bars closing 00:00–07:00 London) usable from 07:00 to 10:00 London. */
function asiaRange(b: readonly FxCandle[], lonMin: readonly number[], close: readonly number[]): { asiaHi: Arr; asiaLo: Arr; asiaBroke: boolean[] } {
  const asiaHi: Arr = new Array(b.length).fill(null);
  const asiaLo: Arr = new Array(b.length).fill(null);
  const asiaBroke: boolean[] = new Array(b.length).fill(false);
  let hi = -Infinity; let lo = Infinity; let have = false; let broke = false;
  for (let i = 0; i < b.length; i += 1) {
    const m = lonMin[i]!;
    const prev = i > 0 ? lonMin[i - 1]! : -1;
    if (m < prev || (m > 0 && m <= 60 && prev > 60)) { hi = -Infinity; lo = Infinity; have = false; broke = false; } // new London day
    if (m > 0 && m <= 7 * 60) { hi = Math.max(hi, b[i]!.high); lo = Math.min(lo, b[i]!.low); have = true; continue; }
    if (have && m > 7 * 60 && m <= 10 * 60) {
      asiaHi[i] = hi; asiaLo[i] = lo; asiaBroke[i] = broke;
      if (close[i]! > hi || close[i]! < lo) broke = true;
    }
  }
  return { asiaHi, asiaLo, asiaBroke };
}

export function computeIndicators(bars: readonly FxCandle[], barSec = 900): FxIndicators {
  const close = bars.map((b) => b.close);
  const emaCache = new Map<number, Arr>();
  const ema = (n: number): Arr => {
    let e = emaCache.get(n);
    if (!e) { e = emaArr(close, n); emaCache.set(n, e); }
    return e;
  };
  const e12 = ema(12);
  const e26 = ema(26);
  const macd: Arr = close.map((_, i) => (e12[i] != null && e26[i] != null ? e12[i]! - e26[i]! : null));
  const firstMacd = macd.findIndex((x) => x != null);
  const macdSig: Arr = new Array(close.length).fill(null);
  if (firstMacd >= 0) {
    const sig = emaArr(macd.slice(firstMacd) as number[], 9);
    sig.forEach((x, j) => { macdSig[firstMacd + j] = x; });
  }
  const bbMid: Arr = new Array(close.length).fill(null);
  const bbSd: Arr = new Array(close.length).fill(null);
  for (let i = 19; i < close.length; i += 1) {
    let s = 0;
    for (let j = i - 19; j <= i; j += 1) s += close[j]!;
    const m = s / 20;
    let q = 0;
    for (let j = i - 19; j <= i; j += 1) q += (close[j]! - m) ** 2;
    bbMid[i] = m;
    bbSd[i] = Math.sqrt(q / 20);
  }
  const donCache = new Map<string, Arr>();
  const don = (n: number, hi: boolean): Arr => {
    const key = `${hi ? "h" : "l"}${n}`;
    let d = donCache.get(key);
    if (!d) {
      d = new Array(bars.length).fill(null);
      // channel of the n bars BEFORE i (excluding i) so the close of i can break it
      for (let i = n; i < bars.length; i += 1) {
        let v = hi ? -Infinity : Infinity;
        for (let j = i - n; j < i; j += 1) v = hi ? Math.max(v, bars[j]!.high) : Math.min(v, bars[j]!.low);
        d[i] = v;
      }
      donCache.set(key, d);
    }
    return d;
  };
  const entryOk: boolean[] = [];
  const weekend: boolean[] = [];
  const lonMin: number[] = [];
  for (const b of bars) {
    // London clock evaluated once per bar, at the bar close.
    const end = new Date((b.time + barSec) * 1000);
    entryOk.push(isFxEntryWindow(end, "24h"));
    weekend.push(isWeekendFlattenTime(end));
    lonMin.push(londonMinutes(end));
  }
  const { asiaHi, asiaLo, asiaBroke } = asiaRange(bars, lonMin, close);
  return {
    entryOk, weekend, lonMin,
    bars, close, ema, rsi14: rsiArr(close), atr14: atrArr(bars), macd, macdSig, bbMid, bbSd,
    donHi: (n) => don(n, true), donLo: (n) => don(n, false),
    stochK: stochKArr(bars), adx14: adxArr(bars), asiaHi, asiaLo, asiaBroke,
  };
}

/** Signal on the close of bar i (null = no signal). */
export function signalAt(s: FxSpec, ind: FxIndicators, i: number): FxSide | null {
  if (i < 1) return null;
  if (s.session && s.session !== "all") {
    const [a, b] = SESSION_MIN[s.session];
    const m = ind.lonMin[i];
    if (m == null || m < a || m >= b) return null;
  }
  const c = ind.close;
  const t200 = ind.ema(200)[i];
  const trendUp = t200 != null && c[i]! > t200;
  const trendDn = t200 != null && c[i]! < t200;
  switch (s.family) {
    case "EMA_CROSS": {
      const f = ind.ema(s.p.fast!);
      const sl = ind.ema(s.p.slow!);
      if (f[i] == null || sl[i] == null || f[i - 1] == null || sl[i - 1] == null) return null;
      if (f[i - 1]! <= sl[i - 1]! && f[i]! > sl[i]! && trendUp) return "long";
      if (f[i - 1]! >= sl[i - 1]! && f[i]! < sl[i]! && trendDn) return "short";
      return null;
    }
    case "MACD_TREND": {
      const m = ind.macd; const g = ind.macdSig;
      if (m[i] == null || g[i] == null || m[i - 1] == null || g[i - 1] == null) return null;
      if (m[i - 1]! <= g[i - 1]! && m[i]! > g[i]! && m[i]! < 0 && trendUp) return "long";
      if (m[i - 1]! >= g[i - 1]! && m[i]! < g[i]! && m[i]! > 0 && trendDn) return "short";
      return null;
    }
    case "DONCHIAN_BREAK": {
      const hi = ind.donHi(s.p.n!)[i];
      const lo = ind.donLo(s.p.n!)[i];
      if (hi == null || lo == null) return null;
      if (c[i]! > hi && c[i - 1]! <= hi && trendUp) return "long";
      if (c[i]! < lo && c[i - 1]! >= lo && trendDn) return "short";
      return null;
    }
    case "PULLBACK": {
      // trend (EMA50 vs EMA200), bar dipped to EMA20 and closed back in trend direction
      const e20 = ind.ema(20)[i]; const e50 = ind.ema(50)[i];
      if (e20 == null || e50 == null || t200 == null) return null;
      const b = ind.bars[i]!;
      if (e50 > t200 && c[i]! > e50 && b.low <= e20 && c[i]! > e20 && c[i]! > b.open) return "long";
      if (e50 < t200 && c[i]! < e50 && b.high >= e20 && c[i]! < e20 && c[i]! < b.open) return "short";
      return null;
    }
    case "RSI_REVERT": {
      const r = ind.rsi14;
      if (r[i] == null || r[i - 1] == null) return null;
      if (r[i - 1]! < s.p.lo! && r[i]! >= s.p.lo!) return "long";
      if (r[i - 1]! > s.p.hi! && r[i]! <= s.p.hi!) return "short";
      return null;
    }
    case "STOCH_TREND": {
      const k = ind.stochK;
      if (k[i] == null || k[i - 1] == null) return null;
      if (trendUp && k[i - 1]! < 20 && k[i]! >= 20) return "long";
      if (trendDn && k[i - 1]! > 80 && k[i]! <= 80) return "short";
      return null;
    }
    case "KELTNER_BREAK": {
      const e20 = ind.ema(20); const a = ind.atr14;
      if (e20[i] == null || e20[i - 1] == null || a[i] == null || a[i - 1] == null) return null;
      const k = s.p.k ?? 2;
      const up1 = e20[i]! + k * a[i]!; const up0 = e20[i - 1]! + k * a[i - 1]!;
      const dn1 = e20[i]! - k * a[i]!; const dn0 = e20[i - 1]! - k * a[i - 1]!;
      if (trendUp && c[i]! > up1 && c[i - 1]! <= up0) return "long";
      if (trendDn && c[i]! < dn1 && c[i - 1]! >= dn0) return "short";
      return null;
    }
    case "INSIDE_BAR": {
      if (i < 2) return null;
      const m = ind.bars[i - 2]!; const ib = ind.bars[i - 1]!;
      if (!(ib.high < m.high && ib.low > m.low)) return null;
      if (trendUp && c[i]! > m.high) return "long";
      if (trendDn && c[i]! < m.low) return "short";
      return null;
    }
    case "ADX_RSI_PULLBACK": {
      const adx = ind.adx14[i]; const r = ind.rsi14; const e50 = ind.ema(50)[i];
      if (adx == null || adx < 25 || e50 == null || r[i] == null || r[i - 1] == null || t200 == null) return null;
      if (e50 > t200 && c[i]! > t200 && r[i - 1]! < 40 && r[i]! >= 40) return "long";
      if (e50 < t200 && c[i]! < t200 && r[i - 1]! > 60 && r[i]! <= 60) return "short";
      return null;
    }
    case "ASIA_BREAKOUT": {
      const hi = ind.asiaHi[i]; const lo = ind.asiaLo[i];
      if (hi == null || lo == null || ind.asiaBroke[i]) return null;
      if (c[i]! > hi) return "long";
      if (c[i]! < lo) return "short";
      return null;
    }
    case "BB_REVERT": {
      const m = ind.bbMid; const sd = ind.bbSd;
      if (m[i] == null || sd[i] == null || m[i - 1] == null || sd[i - 1] == null) return null;
      const lo0 = m[i - 1]! - 2 * sd[i - 1]!; const lo1 = m[i]! - 2 * sd[i]!;
      const hi0 = m[i - 1]! + 2 * sd[i - 1]!; const hi1 = m[i]! + 2 * sd[i]!;
      if (c[i - 1]! < lo0 && c[i]! > lo1) return "long";
      if (c[i - 1]! > hi0 && c[i]! < hi1) return "short";
      return null;
    }
  }
}

export function describeSpec(s: FxSpec): string {
  const p = s.p;
  const base =
    s.family === "EMA_CROSS" ? `cruce EMA${p.fast}/EMA${p.slow} a favor de EMA200`
      : s.family === "MACD_TREND" ? "cruce MACD(12,26,9) a favor de EMA200"
        : s.family === "DONCHIAN_BREAK" ? `ruptura del máximo/mínimo de ${p.n} velas a favor de EMA200`
          : s.family === "PULLBACK" ? "retroceso a EMA20 en tendencia (EMA50 vs EMA200)"
          : s.family === "RSI_REVERT" ? `RSI(14) sale de ${p.lo}/${p.hi} (reversión)`
          : s.family === "STOCH_TREND" ? "Estocástico(14,3) sale de 20/80 a favor de EMA200"
          : s.family === "KELTNER_BREAK" ? `ruptura de Keltner EMA20±${p.k}×ATR a favor de EMA200`
          : s.family === "INSIDE_BAR" ? "ruptura de vela madre tras inside bar a favor de EMA200"
          : s.family === "ADX_RSI_PULLBACK" ? "ADX>25 y RSI(14) gira desde 40/60 a favor de la tendencia"
          : s.family === "ASIA_BREAKOUT" ? "ruptura del rango asiático (00–07 Londres) entre 07:00 y 10:00"
            : "vuelta dentro de Bollinger(20,2) (reversión)";
  const h = (s.maxBars * TF_SEC[s.tf]) / 3600;
  const ses = s.session && s.session !== "all" ? ` · solo sesión ${s.session === "asia" ? "Asia" : s.session === "london" ? "Londres" : "Nueva York"}` : "";
  return `${s.tf}: ${base}${ses} · SL ${s.atrMult}×ATR · TP ${s.rr}R · máx ${h >= 48 ? `${h / 24} d` : `${h} h`}`;
}

// ── Backtest ────────────────────────────────────────────────────────────────

export type SpecTrade = { entryTime: number; exitTime: number; side: FxSide; r: number; reason: "TP" | "SL" | "TIME" | "WEEKEND" };

export function backtestSpec(s: FxSpec, ind: FxIndicators, instrument: string, spreadPips: number): SpecTrade[] {
  const bars = ind.bars;
  const spread = spreadPips * pipSize(instrument);
  const out: SpecTrade[] = [];
  let busyUntil = -1;
  for (let i = 210; i < bars.length - 1; i += 1) {
    if (i <= busyUntil) continue;
    if (!ind.entryOk[i]) continue;
    const side = signalAt(s, ind, i);
    if (!side) continue;
    const a = ind.atr14[i];
    if (a == null || !(a > 0)) continue;
    const risk = s.atrMult * a;
    if (spread > 0.25 * risk) continue; // same spread filter as live
    const dir = side === "long" ? 1 : -1;
    const entry = bars[i + 1]!.open + (dir * spread) / 2;
    const stop = entry - dir * risk;
    const tp = entry + dir * s.rr * risk;
    let exit = entry;
    let reason: SpecTrade["reason"] = "TIME";
    let j = i + 1;
    for (; j < bars.length; j += 1) {
      const b = bars[j]!;
      const hitSl = side === "long" ? b.low <= stop : b.high >= stop;
      const hitTp = side === "long" ? b.high >= tp : b.low <= tp;
      if (hitSl) { exit = stop - (dir * spread) / 2; reason = "SL"; break; }
      if (hitTp) { exit = tp - (dir * spread) / 2; reason = "TP"; break; }
      if (ind.weekend[j] && s.tf !== "D1") { exit = b.close - (dir * spread) / 2; reason = "WEEKEND"; break; }
      if (j - i >= s.maxBars) { exit = b.close - (dir * spread) / 2; reason = "TIME"; break; }
    }
    if (j >= bars.length) break; // still open at the end of the data: ignore
    out.push({ entryTime: bars[i + 1]!.time, exitTime: bars[j]!.time + 1, side, r: ((exit - entry) * dir) / risk, reason });
    busyUntil = j;
  }
  return out;
}

export type SpecStats = { trades: number; winRate: number; meanR: number; pf: number; totalR: number; maxDdR: number };

export function specStats(t: readonly SpecTrade[]): SpecStats {
  const gp = t.filter((x) => x.r > 0).reduce((s, x) => s + x.r, 0);
  const gl = -t.filter((x) => x.r <= 0).reduce((s, x) => s + x.r, 0);
  let eq = 0; let peak = 0; let dd = 0;
  for (const x of t) { eq += x.r; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); }
  const total = t.reduce((s, x) => s + x.r, 0);
  return {
    trades: t.length,
    winRate: t.length ? t.filter((x) => x.r > 0).length / t.length : 0,
    meanR: t.length ? total / t.length : 0,
    pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0,
    totalR: total,
    maxDdR: dd,
  };
}

/** Selection on in-sample, validation on out-of-sample. */
export const PAIR_GATE = { minIsTrades: 40, minOosTrades: 15, minOosPF: 1.15, minOosMeanR: 0.05 } as const;

export type PairChoice = {
  instrument: string;
  /** confirmed strategy: kept as-is by later optimizations */
  locked?: boolean;
  spec: FxSpec | null;
  description: string;
  is: SpecStats | null;
  oos: SpecStats | null;
  liveEligible: boolean;
  reason: string;
  candidates: number;
  bars: number;
  from: number;
  to: number;
};

export function choosePairStrategy(
  instrument: string,
  data: Partial<Record<FxTf, readonly FxCandle[]>> | readonly FxCandle[],
  spreadPips: number,
): PairChoice {
  const sets: Array<[FxTf, readonly FxCandle[]]> = Array.isArray(data)
    ? [["M15", data as readonly FxCandle[]]]
    : (Object.entries(data) as Array<[FxTf, readonly FxCandle[]]>).filter(([, b]) => b && b.length > 0);
  let best: { s: FxSpec; is: SpecStats; oos: SpecStats; score: number; from: number; to: number; bars: number } | null = null;
  let candidates = 0;
  let from = Infinity;
  let to = 0;
  let nBars = 0;
  for (const [tf, bars] of sets) {
    const f = bars[0]!.time;
    const t = bars[bars.length - 1]!.time;
    from = Math.min(from, f); to = Math.max(to, t); nBars += bars.length;
    const split = f + ((t - f) * 2) / 3;
    const ind = computeIndicators(bars, TF_SEC[tf]);
    const grid = specGrid(tf);
    candidates += grid.length;
    for (const s of grid) {
      const tr = backtestSpec(s, ind, instrument, spreadPips);
      const is = specStats(tr.filter((x) => x.entryTime < split));
      if (is.trades < PAIR_GATE.minIsTrades || is.pf <= 1) continue;
      // score: expectancy, lightly rewarding sample size (avoids lucky tiny samples)
      const score = is.meanR * Math.sqrt(is.trades);
      if (!best || score > best.score) best = { s, is, oos: specStats(tr.filter((x) => x.entryTime >= split)), score, from: f, to: t, bars: bars.length };
    }
  }
  const base = { instrument, candidates, bars: nBars, from: Number.isFinite(from) ? from : 0, to };
  if (!best) return { ...base, spec: null, description: "ninguna regla rentable en la muestra de entrenamiento", is: null, oos: null, liveEligible: false, reason: "sin candidata IS" };
  const reasons: string[] = [];
  if (best.oos.trades < PAIR_GATE.minOosTrades) reasons.push(`oos_ops=${best.oos.trades}<${PAIR_GATE.minOosTrades}`);
  if (best.oos.pf < PAIR_GATE.minOosPF) reasons.push(`oos_PF=${best.oos.pf.toFixed(2)}<${PAIR_GATE.minOosPF}`);
  if (best.oos.meanR < PAIR_GATE.minOosMeanR) reasons.push(`oos_media=${best.oos.meanR.toFixed(3)}R<${PAIR_GATE.minOosMeanR}`);
  return {
    ...base,
    from: best.from,
    to: best.to,
    bars: best.bars,
    spec: best.s,
    description: describeSpec(best.s),
    is: best.is,
    oos: best.oos,
    liveEligible: reasons.length === 0,
    reason: reasons.join("; ") || "ok",
  };
}
