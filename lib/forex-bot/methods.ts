/**
 * Published trader methods from "Manual completo del bot" (23-10-2026), formalised for a bot.
 * Pure module; the same simulation runs the backtest and (later) live signals.
 *
 * HOLY_GRAIL (Linda Raschke)
 *   Strength: ADX14 > 30 and rising within the last 5 bars, direction by DMI (+DI > −DI → long).
 *   Pullback: the bar touches EMA20 (low ≤ EMA20 for longs).
 *   Entry: buy-stop above the high of the touching bar (sell-stop below the low), valid 3 bars.
 *   Stop: extreme of the pullback (lowest low from the touch bar to the fill).
 *   Exit: no fixed target. Once price has moved +1R, trail the stop under the lowest low of the
 *         last 3 closed bars; flat at the session end.
 * MOMO (Kathy Lien, Five-Minute Momo) — FX, M5
 *   Long: close crosses above EMA20 and the MACD(12,26,9) histogram turns positive within 5 bars
 *   of each other. Entry: buy-stop at EMA20 + 10 pips, valid 3 bars. Stop: 20 pips.
 *   Exit: half at +1R; then the stop of the rest goes to breakeven and it is closed when a bar
 *   closes below EMA20 − 15 pips. Shorts mirrored. Flat at the session end.
 * R2 (Larry Connors, Improved R2) — daily, index
 *   Close > SMA200; RSI(2) < 65 on day 1 and lower on day 2 and day 3 → buy at the next open
 *   (we never assume the close price that is only known afterwards). Exit at the next open after
 *   RSI(2) closes > 75. A catastrophic stop of 3×ATR14 is added (every bot order carries a stop).
 *
 * Costs: the full spread is charged on entry and on each exit leg; same bar hitting stop and a
 * profit level → stop first. Entries need spread ≤ 0.20 R. Max 2 trades per day per variant.
 */

import { pipSize } from "./indicators";
import { localParts, localToEpoch } from "./playbook";
import type { FxCandle, FxSide } from "./types";

export type MethodKind = "HOLY_GRAIL" | "MOMO" | "R2";

export type MethodSpec = {
  id: string;
  kind: MethodKind;
  instrument: string;
  symbols: string[];
  name: string;
  tf: "M5" | "M15" | "D1";
  tz: string;
  /** entry window and session exit (local minutes); D1 ignores them */
  entry: [number, number];
  exit: number;
  /** typical spread in price units */
  spread: number;
};

const hm = (h: number, m = 0) => h * 60 + m;
const LDN_NY = { tz: "Europe/London", entry: [hm(7), hm(16)] as [number, number], exit: hm(17) };

export const METHODS: MethodSpec[] = [
  // Raschke Holy Grail — majors in their liquid sessions (manual: per-instrument assignment)
  { id: "HG_EURUSD", kind: "HOLY_GRAIL", instrument: "EUR_USD", symbols: ["EURUSD"], name: "EUR/USD · Holy Grail (Raschke)", tf: "M15", ...LDN_NY, spread: 0.0001 },
  { id: "HG_GBPUSD", kind: "HOLY_GRAIL", instrument: "GBP_USD", symbols: ["GBPUSD"], name: "GBP/USD · Holy Grail (Raschke)", tf: "M15", ...LDN_NY, spread: 0.00014 },
  { id: "HG_USDJPY_TKY", kind: "HOLY_GRAIL", instrument: "USD_JPY", symbols: ["USDJPY"], name: "USD/JPY · Holy Grail Tokio", tf: "M15", tz: "Asia/Tokyo", entry: [hm(9), hm(14)], exit: hm(15), spread: 0.012 },
  { id: "HG_USDJPY_NY", kind: "HOLY_GRAIL", instrument: "USD_JPY", symbols: ["USDJPY"], name: "USD/JPY · Holy Grail Nueva York", tf: "M15", tz: "America/New_York", entry: [hm(8), hm(15)], exit: hm(16), spread: 0.012 },
  { id: "HG_USDCHF", kind: "HOLY_GRAIL", instrument: "USD_CHF", symbols: ["USDCHF"], name: "USD/CHF · Holy Grail", tf: "M15", ...LDN_NY, spread: 0.00016 },
  { id: "HG_AUDUSD", kind: "HOLY_GRAIL", instrument: "AUD_USD", symbols: ["AUDUSD"], name: "AUD/USD · Holy Grail", tf: "M15", ...LDN_NY, spread: 0.00013 },
  { id: "HG_NZDUSD", kind: "HOLY_GRAIL", instrument: "NZD_USD", symbols: ["NZDUSD"], name: "NZD/USD · Holy Grail", tf: "M15", ...LDN_NY, spread: 0.00016 },
  { id: "HG_USDCAD", kind: "HOLY_GRAIL", instrument: "USD_CAD", symbols: ["USDCAD"], name: "USD/CAD · Holy Grail (Nueva York)", tf: "M15", tz: "America/New_York", entry: [hm(8), hm(15)], exit: hm(16), spread: 0.00018 },
  { id: "HG_GOLD", kind: "HOLY_GRAIL", instrument: "GOLD", symbols: ["GOLD", "XAUUSD"], name: "Oro · Holy Grail (Nueva York)", tf: "M5", tz: "America/New_York", entry: [hm(8, 30), hm(14)], exit: hm(15), spread: 0.5 },
  // Lien Five-Minute Momo
  { id: "MOMO_EURUSD", kind: "MOMO", instrument: "EUR_USD", symbols: ["EURUSD"], name: "EUR/USD · 5-Minute Momo (Lien)", tf: "M5", ...LDN_NY, spread: 0.0001 },
  { id: "MOMO_GBPUSD", kind: "MOMO", instrument: "GBP_USD", symbols: ["GBPUSD"], name: "GBP/USD · 5-Minute Momo (Lien)", tf: "M5", ...LDN_NY, spread: 0.00014 },
  { id: "MOMO_AUDUSD", kind: "MOMO", instrument: "AUD_USD", symbols: ["AUDUSD"], name: "AUD/USD · 5-Minute Momo (Lien)", tf: "M5", ...LDN_NY, spread: 0.00013 },
  { id: "MOMO_NZDUSD", kind: "MOMO", instrument: "NZD_USD", symbols: ["NZDUSD"], name: "NZD/USD · 5-Minute Momo (Lien)", tf: "M5", ...LDN_NY, spread: 0.00016 },
  // Connors Improved R2
  { id: "R2_US500", kind: "R2", instrument: "US500", symbols: ["US500"], name: "US500 · Improved R2 (Connors, diario)", tf: "D1", tz: "America/New_York", entry: [0, 1440], exit: 1440, spread: 0.6 },
];

export const TF_MIN: Record<MethodSpec["tf"], number> = { M5: 5, M15: 15, D1: 1440 };

// ── Indicators (whole series) ─────────────────────────────────────────────────

type Arr = Array<number | null>;

function ema(v: readonly number[], n: number): Arr {
  const o: Arr = new Array(v.length).fill(null);
  if (v.length < n) return o;
  let e = v.slice(0, n).reduce((s, x) => s + x, 0) / n;
  o[n - 1] = e;
  const k = 2 / (n + 1);
  for (let i = n; i < v.length; i += 1) { e = v[i]! * k + e * (1 - k); o[i] = e; }
  return o;
}

function sma(v: readonly number[], n: number): Arr {
  const o: Arr = new Array(v.length).fill(null);
  let s = 0;
  for (let i = 0; i < v.length; i += 1) {
    s += v[i]!;
    if (i >= n) s -= v[i - n]!;
    if (i >= n - 1) o[i] = s / n;
  }
  return o;
}

function rsi(v: readonly number[], n: number): Arr {
  const o: Arr = new Array(v.length).fill(null);
  if (v.length <= n) return o;
  let g = 0; let l = 0;
  for (let i = 1; i <= n; i += 1) { const d = v[i]! - v[i - 1]!; if (d >= 0) g += d; else l -= d; }
  g /= n; l /= n;
  o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < v.length; i += 1) {
    const d = v[i]! - v[i - 1]!;
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    l = (l * (n - 1) + Math.max(-d, 0)) / n;
    o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return o;
}

/** Wilder ATR, +DI, −DI and ADX (period n). */
export function dmi(b: readonly FxCandle[], n = 14): { atr: Arr; pdi: Arr; mdi: Arr; adx: Arr } {
  const len = b.length;
  const atr: Arr = new Array(len).fill(null);
  const pdi: Arr = new Array(len).fill(null);
  const mdi: Arr = new Array(len).fill(null);
  const adx: Arr = new Array(len).fill(null);
  if (len <= 2 * n) return { atr, pdi, mdi, adx };
  let trS = 0; let pS = 0; let mS = 0;
  const dx: number[] = [];
  for (let i = 1; i < len; i += 1) {
    const h = b[i]!.high; const l = b[i]!.low; const pc = b[i - 1]!.close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const up = h - b[i - 1]!.high;
    const dn = b[i - 1]!.low - l;
    const pdm = up > dn && up > 0 ? up : 0;
    const mdm = dn > up && dn > 0 ? dn : 0;
    if (i <= n) {
      trS += tr; pS += pdm; mS += mdm;
      if (i < n) continue;
    } else {
      trS = trS - trS / n + tr; pS = pS - pS / n + pdm; mS = mS - mS / n + mdm;
    }
    atr[i] = trS / n;
    const p = trS > 0 ? (100 * pS) / trS : 0;
    const m = trS > 0 ? (100 * mS) / trS : 0;
    pdi[i] = p; mdi[i] = m;
    dx.push(p + m > 0 ? (100 * Math.abs(p - m)) / (p + m) : 0);
    if (dx.length === n) adx[i] = dx.reduce((s, x) => s + x, 0) / n;
    else if (dx.length > n) adx[i] = (adx[i - 1]! * (n - 1) + dx[dx.length - 1]!) / n;
  }
  return { atr, pdi, mdi, adx };
}

// ── Simulation ───────────────────────────────────────────────────────────────

export type MethodTrade = {
  spec: string;
  day: string;
  side: FxSide;
  signalTime: number;
  entryTime: number;
  entry: number;
  stop: number;
  exitTime: number | null;
  reason: "SL" | "TRAIL" | "PARTIAL+BE" | "PARTIAL+EMA" | "PARTIAL+SL" | "EMA" | "SESSION" | "RSI" | "OPEN";
  r: number | null;
};

type Pending = { side: FxSide; trigger: number; stop: number; until: number; signalTime: number; pullbackExtreme: number };

export function simulateMethod(spec: MethodSpec, bars: readonly FxCandle[], spread = spec.spread, costSpread = spread): MethodTrade[] {
  if (spec.kind === "R2") return simulateR2(spec, bars, spread, costSpread);
  const n = bars.length;
  if (n < 300) return [];
  const tfSec = TF_MIN[spec.tf] * 60;
  const close = bars.map((b) => b.close);
  const e20 = ema(close, 20);
  const { adx, pdi, mdi } = dmi(bars, 14);
  const e12 = ema(close, 12);
  const e26 = ema(close, 26);
  const macd = close.map((_, i) => (e12[i] != null && e26[i] != null ? e12[i]! - e26[i]! : null));
  const first = macd.findIndex((x) => x != null);
  const sig: Arr = new Array(n).fill(null);
  if (first >= 0) ema(macd.slice(first) as number[], 9).forEach((x, j) => { sig[first + j] = x; });
  const hist = macd.map((m, i) => (m != null && sig[i] != null ? m - sig[i]! : null));
  const lp = bars.map((b) => localParts(b.time + tfSec, spec.tz)); // at bar CLOSE
  const pip = pipSize(spec.instrument);
  const out: MethodTrade[] = [];
  const perDay = new Map<string, number>();
  let pend: Pending | null = null;

  const inEntry = (i: number) => lp[i]!.weekday >= 1 && lp[i]!.weekday <= 5 && lp[i]!.minutes > spec.entry[0] && lp[i]!.minutes <= spec.entry[1];

  for (let i = 30; i < n - 1; i += 1) {
    // 1) a pending stop order may fill on the next bar(s)
    if (pend && i > pend.until) pend = null;
    // 2) new setup on the close of bar i
    if (!pend && inEntry(i) && (perDay.get(lp[i]!.ymd) ?? 0) < 2) {
      const b = bars[i]!;
      if (spec.kind === "HOLY_GRAIL") {
        let strong = false;
        for (let k = Math.max(1, i - 5); k <= i; k += 1) {
          if (adx[k] != null && adx[k - 1] != null && adx[k]! > 30 && adx[k]! > adx[k - 1]!) { strong = true; break; }
        }
        const e = e20[i];
        if (strong && e != null && pdi[i] != null && mdi[i] != null) {
          if (pdi[i]! > mdi[i]! && b.low <= e && b.close > b.low) {
            pend = { side: "long", trigger: b.high + pip * 0.1, stop: b.low, until: i + 3, signalTime: b.time, pullbackExtreme: b.low };
          } else if (mdi[i]! > pdi[i]! && b.high >= e && b.close < b.high) {
            pend = { side: "short", trigger: b.low - pip * 0.1, stop: b.high, until: i + 3, signalTime: b.time, pullbackExtreme: b.high };
          }
        }
      } else if (spec.kind === "MOMO") {
        const e = e20[i];
        if (e != null && hist[i] != null && hist[i - 1] != null) {
          const crossUp = (k: number) => e20[k] != null && e20[k - 1] != null && close[k]! > e20[k]! && close[k - 1]! <= e20[k - 1]!;
          const crossDn = (k: number) => e20[k] != null && e20[k - 1] != null && close[k]! < e20[k]! && close[k - 1]! >= e20[k - 1]!;
          const histUp = (k: number) => hist[k] != null && hist[k - 1] != null && hist[k]! > 0 && hist[k - 1]! <= 0;
          const histDn = (k: number) => hist[k] != null && hist[k - 1] != null && hist[k]! < 0 && hist[k - 1]! >= 0;
          const near = (f: (k: number) => boolean) => { for (let k = Math.max(1, i - 5); k <= i; k += 1) if (f(k)) return true; return false; };
          if (close[i]! > e && ((histUp(i) && near(crossUp)) || (crossUp(i) && near(histUp)))) {
            const trig = e + 10 * pip;
            pend = { side: "long", trigger: Math.max(trig, b.close), stop: Math.max(trig, b.close) - 20 * pip, until: i + 3, signalTime: b.time, pullbackExtreme: b.low };
          } else if (close[i]! < e && ((histDn(i) && near(crossDn)) || (crossDn(i) && near(histDn)))) {
            const trig = e - 10 * pip;
            pend = { side: "short", trigger: Math.min(trig, b.close), stop: Math.min(trig, b.close) + 20 * pip, until: i + 3, signalTime: b.time, pullbackExtreme: b.high };
          }
        }
      }
      continue; // a setup on bar i can only fill from bar i+1
    }
    if (!pend) continue;
    // 3) fill check on bar i
    const b = bars[i]!;
    const dir = pend.side === "long" ? 1 : -1;
    const hit = pend.side === "long" ? b.high >= pend.trigger : b.low <= pend.trigger;
    if (!hit) {
      // Holy Grail: the stop follows the pullback extreme while the order waits.
      if (spec.kind === "HOLY_GRAIL") {
        if (pend.side === "long") pend.stop = Math.min(pend.stop, b.low);
        else pend.stop = Math.max(pend.stop, b.high);
      }
      continue;
    }
    const day = lp[i]!.ymd;
    const fill = (pend.side === "long" ? Math.max(b.open, pend.trigger) : Math.min(b.open, pend.trigger)) + (dir * costSpread) / 2;
    // Initial stop excludes the fill bar; if that bar also reaches it, it counts as stopped (conservative).
    const stop0 = pend.stop;
    const risk = Math.abs(fill - stop0);
    const p = pend;
    pend = null;
    if (!(risk > 0) || spread > 0.2 * risk) continue;
    if ((perDay.get(day) ?? 0) >= 2) continue;
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    const exitAt = localToEpoch(localParts(b.time, spec.tz).ymd, spec.exit, spec.tz);
    // 4) manage the position from the NEXT bar (the fill bar only checks the initial stop)
    let stop = stop0;
    let half = false; // MOMO partial taken
    let rHalf = 0;
    let trailOn = false;
    let r: number | null = null;
    let reason: MethodTrade["reason"] = "OPEN";
    let exitTime: number | null = null;
    const exitPx = (px: number) => ((px - (dir * costSpread) / 2 - fill) * dir) / risk;
    for (let j = i; j < n; j += 1) {
      const c = bars[j]!;
      const hitStop = p.side === "long" ? c.low <= stop : c.high >= stop;
      if (hitStop) {
        // gap through the stop → filled at the open
        const px = j > i && (p.side === "long" ? c.open < stop : c.open > stop) ? c.open : stop;
        const rr = exitPx(px);
        if (half) { r = 0.5 * rHalf + 0.5 * rr; reason = stop === fill ? "PARTIAL+BE" : "PARTIAL+SL"; }
        else { r = rr; reason = trailOn ? "TRAIL" : "SL"; }
        exitTime = c.time + tfSec; break;
      }
      if (j === i) continue;
      if (spec.kind === "MOMO") {
        const oneR = fill + dir * risk;
        if (!half && (p.side === "long" ? c.high >= oneR : c.low <= oneR)) {
          half = true; rHalf = exitPx(oneR); stop = fill; // rest to breakeven
        }
        if (half && e20[j] != null) {
          const out2 = p.side === "long" ? c.close < e20[j]! - 15 * pip : c.close > e20[j]! + 15 * pip;
          if (out2) { r = 0.5 * rHalf + 0.5 * exitPx(c.close); reason = "PARTIAL+EMA"; exitTime = c.time + tfSec; break; }
        }
      } else {
        // Holy Grail: trail under the last 3 closed bars once +1R has been reached
        if (!trailOn && (p.side === "long" ? c.high >= fill + risk : c.low <= fill - risk)) trailOn = true;
        if (trailOn) {
          const w = bars.slice(Math.max(i, j - 2), j + 1);
          const lvl = p.side === "long" ? Math.min(...w.map((x) => x.low)) : Math.max(...w.map((x) => x.high));
          stop = p.side === "long" ? Math.max(stop, lvl) : Math.min(stop, lvl);
        }
      }
      if (c.time + tfSec >= exitAt) {
        const rr = exitPx(c.close);
        r = half ? 0.5 * rHalf + 0.5 * rr : rr; reason = "SESSION"; exitTime = c.time + tfSec; break;
      }
    }
    out.push({ spec: spec.id, day, side: p.side, signalTime: p.signalTime, entryTime: b.time, entry: fill, stop: stop0, exitTime, reason, r });
    // skip ahead to after the exit
    if (exitTime != null) while (i + 1 < n && bars[i + 1]!.time < exitTime) i += 1;
  }
  return out;
}

function simulateR2(spec: MethodSpec, bars: readonly FxCandle[], spread: number, costSpread: number): MethodTrade[] {
  const n = bars.length;
  const close = bars.map((b) => b.close);
  const s200 = sma(close, 200);
  const r2 = rsi(close, 2);
  const { atr } = dmi(bars, 14);
  const out: MethodTrade[] = [];
  for (let i = 203; i < n - 1; i += 1) {
    const ok = s200[i] != null && close[i]! > s200[i]! &&
      r2[i - 2] != null && r2[i - 2]! < 65 && r2[i - 1]! < r2[i - 2]! && r2[i]! < r2[i - 1]!;
    if (!ok || atr[i] == null) continue;
    const fill = bars[i + 1]!.open + costSpread / 2;
    const stop = fill - 3 * atr[i]!;
    const risk = fill - stop;
    if (!(risk > 0) || spread > 0.2 * risk) continue;
    let r: number | null = null;
    let reason: MethodTrade["reason"] = "OPEN";
    let exitTime: number | null = null;
    let j = i + 1;
    for (; j < n; j += 1) {
      const c = bars[j]!;
      if (c.low <= stop) { r = (stop - costSpread / 2 - fill) / risk; reason = "SL"; exitTime = c.time + 86400; break; }
      if (r2[j] != null && r2[j]! > 75 && j + 1 < n) {
        r = (bars[j + 1]!.open - costSpread / 2 - fill) / risk; reason = "RSI"; exitTime = bars[j + 1]!.time; j += 1; break;
      }
    }
    out.push({ spec: spec.id, day: new Date(bars[i]!.time * 1000).toISOString().slice(0, 10), side: "long", signalTime: bars[i]!.time, entryTime: bars[i + 1]!.time, entry: fill, stop, exitTime, reason, r });
    i = j; // one position at a time
  }
  return out;
}

// ── Evaluation (same acceptance as the playbook) ─────────────────────────────

export type MethodStats = { trades: number; winRate: number; meanR: number; pf: number; totalR: number; maxDdR: number };

export function mStats(t: readonly MethodTrade[]): MethodStats {
  const c = t.filter((x) => x.r != null);
  const gp = c.filter((x) => x.r! > 0).reduce((s, x) => s + x.r!, 0);
  const gl = -c.filter((x) => x.r! <= 0).reduce((s, x) => s + x.r!, 0);
  let eq = 0; let pk = 0; let dd = 0;
  for (const x of c) { eq += x.r!; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); }
  const tot = c.reduce((s, x) => s + x.r!, 0);
  return { trades: c.length, winRate: c.length ? c.filter((x) => x.r! > 0).length / c.length : 0, meanR: c.length ? tot / c.length : 0, pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0, totalR: tot, maxDdR: dd };
}

export const M_GATE = { minTrades: 40, minTradesDaily: 25, minPF: 1.15, minMeanR: 0.05, stress: 1.5 } as const;

export type MethodResult = {
  id: string; instrument: string; name: string; symbol: string | null; bars: number; from: number; to: number;
  all: MethodStats; firstHalf: MethodStats; secondHalf: MethodStats; stressed: MethodStats;
  exits: Record<string, number>; liveEligible: boolean; reason: string; locked?: boolean;
};

export function evaluateMethod(spec: MethodSpec, bars: readonly FxCandle[], spread: number, symbol: string | null): MethodResult {
  const t = simulateMethod(spec, bars, spread);
  const from = bars[0]?.time ?? 0;
  const to = bars[bars.length - 1]?.time ?? 0;
  const mid = from + (to - from) / 2;
  const all = mStats(t);
  const firstHalf = mStats(t.filter((x) => x.entryTime < mid));
  const secondHalf = mStats(t.filter((x) => x.entryTime >= mid));
  const stressed = mStats(simulateMethod(spec, bars, spread, spread * M_GATE.stress));
  const exits: Record<string, number> = {};
  for (const x of t) exits[x.reason] = (exits[x.reason] ?? 0) + 1;
  const minT = spec.tf === "D1" ? M_GATE.minTradesDaily : M_GATE.minTrades;
  const r: string[] = [];
  if (all.trades < minT) r.push(`ops=${all.trades}<${minT}`);
  if (all.pf < M_GATE.minPF) r.push(`PF=${all.pf.toFixed(2)}<${M_GATE.minPF}`);
  if (all.meanR < M_GATE.minMeanR) r.push(`media=${all.meanR.toFixed(3)}R<${M_GATE.minMeanR}`);
  if (firstHalf.meanR <= 0 || secondHalf.meanR <= 0) r.push("no gana en las dos mitades");
  if (stressed.meanR <= 0) r.push(`pierde con costes ×${M_GATE.stress}`);
  return { id: spec.id, instrument: spec.instrument, name: spec.name, symbol, bars: bars.length, from, to, all, firstHalf, secondHalf, stressed, exits, liveEligible: r.length === 0, reason: r.join("; ") || "ok" };
}
