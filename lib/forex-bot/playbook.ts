/**
 * Playbook — fixed intraday rules per instrument from "Guía bot trading por instrumento" (23-10-2026).
 * Pure module. The SAME scan is used for the backtest and for live signals (signal = a trade whose
 * signal bar is the last closed bar).
 *
 * Common conventions (guide §Convenciones):
 *  - Closed candles only. ATR14 (Wilder) of the entry timeframe, frozen at the bar BEFORE the signal bar.
 *  - H1 trend: last closed H1 close > EMA50 and EMA50 now > EMA50 3 bars ago (bearish: inverse).
 *  - Margin = 0.10 × ATR. Entry = next bar open; discarded if > 0.25 ATR away from the signal close.
 *  - Stop at entry, never widened; stop distance must lie in [minAtr, maxAtr] × ATR.
 *  - Target k·R or stop; flat at the session exit time. One trade per day per strategy.
 *  - Round-trip cost must be ≤ 0.10 R (spread charged on entry and exit).
 *  - Same bar touching stop and target → stop (conservative).
 * Windows are local times in IANA zones (DST handled by Intl).
 */

import type { FxCandle, FxSide } from "./types";

export type PlaybookKind = "RANGE_BREAK" | "RANGE_RETEST" | "PULLBACK_CONT" | "CLOSE_MOMENTUM";

export type PlaybookSpec = {
  id: string;
  /** internal instrument id (EUR_USD, GOLD, OILWTI, OILBRENT, US100, US500) */
  instrument: string;
  /** broker symbol bases to try, in order */
  symbols: string[];
  name: string;
  kind: PlaybookKind;
  tfMin: 5 | 15;
  tz: string;
  /** range window [from, to) in local minutes (RANGE_*), entry window [from, to) */
  range?: [number, number];
  entry: [number, number];
  /** session exit (local minutes): flat at the close of the bar ending at this time */
  exit: number;
  rr: number | null;
  stopAtr: [number, number];
  /** CLOSE_MOMENTUM: decision time & reference (prev session) time, filter vs daily ATR, stop ATR mult */
  momentum?: { decision: number; reference: number; minDailyAtr: number; stopAtr: number };
  /** typical round-trip spread in price units (backtest cost) */
  spread: number;
};

const hm = (h: number, m = 0) => h * 60 + m;

/** The 11 instrument sheets of the guide. */
export const PLAYBOOK: PlaybookSpec[] = [
  { id: "PB_EURUSD_LDN_RANGE", instrument: "EUR_USD", symbols: ["EURUSD"], name: "EUR/USD · ruptura del rango previo a Londres",
    kind: "RANGE_BREAK", tfMin: 15, tz: "Europe/London", range: [hm(0), hm(8)], entry: [hm(8), hm(11)], exit: hm(16), rr: 2, stopAtr: [0.8, 2], spread: 0.00010 },
  { id: "PB_GBPUSD_LDN_RETEST", instrument: "GBP_USD", symbols: ["GBPUSD"], name: "GBP/USD · ruptura con retesteo",
    kind: "RANGE_RETEST", tfMin: 15, tz: "Europe/London", range: [hm(0), hm(8)], entry: [hm(8), hm(11)], exit: hm(16), rr: 2, stopAtr: [0.8, 2], spread: 0.00014 },
  { id: "PB_USDJPY_TKY_PULLBACK", instrument: "USD_JPY", symbols: ["USDJPY"], name: "USD/JPY · continuación tras retroceso (Tokio)",
    kind: "PULLBACK_CONT", tfMin: 15, tz: "Asia/Tokyo", entry: [hm(9), hm(12)], exit: hm(15), rr: 1.8, stopAtr: [0.8, 2], spread: 0.012 },
  { id: "PB_USDCHF_LDN_PULLBACK", instrument: "USD_CHF", symbols: ["USDCHF"], name: "USD/CHF · continuación europea",
    kind: "PULLBACK_CONT", tfMin: 15, tz: "Europe/London", entry: [hm(8), hm(11)], exit: hm(16), rr: 1.8, stopAtr: [0.8, 2], spread: 0.00016 },
  { id: "PB_AUDUSD_SYD_RANGE", instrument: "AUD_USD", symbols: ["AUDUSD"], name: "AUD/USD · ruptura de rango australiano",
    kind: "RANGE_BREAK", tfMin: 15, tz: "Australia/Sydney", range: [hm(8), hm(9)], entry: [hm(9), hm(12)], exit: hm(16), rr: 1.8, stopAtr: [0.8, 2], spread: 0.00013 },
  { id: "PB_NZDUSD_SYD_RANGE", instrument: "NZD_USD", symbols: ["NZDUSD"], name: "NZD/USD · ruptura australiana independiente",
    kind: "RANGE_BREAK", tfMin: 15, tz: "Australia/Sydney", range: [hm(8), hm(9)], entry: [hm(9), hm(12)], exit: hm(16), rr: 1.8, stopAtr: [0.8, 2], spread: 0.00016 },
  { id: "PB_USDCAD_NY_RANGE", instrument: "USD_CAD", symbols: ["USDCAD"], name: "USD/CAD · ruptura de mañana estadounidense",
    kind: "RANGE_BREAK", tfMin: 15, tz: "America/New_York", range: [hm(8), hm(9)], entry: [hm(9), hm(11)], exit: hm(15), rr: 2, stopAtr: [0.8, 2], spread: 0.00018 },
  { id: "PB_GOLD_NY_RETEST", instrument: "GOLD", symbols: ["GOLD", "XAUUSD"], name: "Oro · ruptura con retesteo (Nueva York)",
    kind: "RANGE_RETEST", tfMin: 5, tz: "America/New_York", range: [hm(8), hm(8, 30)], entry: [hm(8, 30), hm(11)], exit: hm(15), rr: 2, stopAtr: [1, 2.5], spread: 0.5 },
  { id: "PB_WTI_NY_RANGE", instrument: "OILWTI", symbols: ["OILWTI", "WTI", "USOIL"], name: "WTI · ruptura de rango horario",
    kind: "RANGE_BREAK", tfMin: 5, tz: "America/New_York", range: [hm(9), hm(9, 30)], entry: [hm(9, 30), hm(11, 30)], exit: hm(14), rr: 2, stopAtr: [1, 2.5], spread: 0.05 },
  { id: "PB_BRENT_LDN_RANGE", instrument: "OILBRENT", symbols: ["OILBRENT", "BRENT", "UKOIL"], name: "Brent · ruptura europea",
    kind: "RANGE_BREAK", tfMin: 5, tz: "Europe/London", range: [hm(8), hm(8, 30)], entry: [hm(8, 30), hm(11)], exit: hm(16), rr: 2, stopAtr: [1, 2.5], spread: 0.05 },
  { id: "PB_US100_NY_ORB", instrument: "US100", symbols: ["US100", "NAS100", "USTEC"], name: "US100 · ruptura del rango inicial",
    kind: "RANGE_BREAK", tfMin: 5, tz: "America/New_York", range: [hm(9, 30), hm(9, 45)], entry: [hm(9, 45), hm(11)], exit: hm(15, 55), rr: 2, stopAtr: [1, 2.5], spread: 1.5 },
  { id: "PB_US500_CLOSE_MOM", instrument: "US500", symbols: ["US500", "SPX500", "US500"], name: "US500 · momentum de cierre",
    kind: "CLOSE_MOMENTUM", tfMin: 5, tz: "America/New_York", entry: [hm(15, 30), hm(15, 35)], exit: hm(16), rr: null, stopAtr: [0, 99],
    momentum: { decision: hm(15, 30), reference: hm(16), minDailyAtr: 0.25, stopAtr: 1.5 }, spread: 0.6 },
];

// ── Time helpers (IANA) ───────────────────────────────────────────────────────

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
    fmtCache.set(tz, f);
  }
  return f;
}

export function localParts(epochSec: number, tz: string): { ymd: string; minutes: number; weekday: number } {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(epochSec * 1000)).map((x) => [x.type, x.value]));
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    minutes: (Number(p.hour) % 24) * 60 + Number(p.minute),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday ?? ""),
  };
}

/** Epoch seconds of a local wall time (ymd + minutes) in `tz`. */
export function localToEpoch(ymd: string, minutes: number, tz: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  let guess = Date.UTC(y!, m! - 1, d!, Math.floor(minutes / 60), minutes % 60) / 1000;
  for (let k = 0; k < 2; k += 1) {
    const lp = localParts(guess, tz);
    const [ly, lm, ld] = lp.ymd.split("-").map(Number);
    const localAsUtc = Date.UTC(ly!, lm! - 1, ld!, Math.floor(lp.minutes / 60), lp.minutes % 60) / 1000;
    const target = Date.UTC(y!, m! - 1, d!, Math.floor(minutes / 60), minutes % 60) / 1000;
    guess += target - localAsUtc;
  }
  return guess;
}

// ── Indicators ───────────────────────────────────────────────────────────────

function atrWilder(b: readonly FxCandle[], n = 14): Array<number | null> {
  const out: Array<number | null> = new Array(b.length).fill(null);
  if (b.length <= n) return out;
  const tr = b.map((x, i) => (i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1]!.close), Math.abs(x.low - b[i - 1]!.close))));
  let a = 0;
  for (let i = 1; i <= n; i += 1) a += tr[i]!;
  a /= n;
  out[n] = a;
  for (let i = n + 1; i < b.length; i += 1) { a = (a * (n - 1) + tr[i]!) / n; out[i] = a; }
  return out;
}

function emaArr(v: readonly number[], n: number): Array<number | null> {
  const out: Array<number | null> = new Array(v.length).fill(null);
  if (v.length < n) return out;
  let e = v.slice(0, n).reduce((s, x) => s + x, 0) / n;
  out[n - 1] = e;
  const k = 2 / (n + 1);
  for (let i = n; i < v.length; i += 1) { e = v[i]! * k + e * (1 - k); out[i] = e; }
  return out;
}

/** H1 trend (+1 / -1 / 0) known at the close of each base bar (only H1 bars fully closed by then). */
function h1TrendAtBars(bars: readonly FxCandle[], tfSec: number): number[] {
  // Build H1 bars from the base bars (aligned to the hour).
  const h1: Array<{ end: number; close: number }> = [];
  let cur: { start: number; close: number } | null = null;
  for (const b of bars) {
    const start = Math.floor(b.time / 3600) * 3600;
    if (!cur || cur.start !== start) {
      if (cur) h1.push({ end: cur.start + 3600, close: cur.close });
      cur = { start, close: b.close };
    } else cur.close = b.close;
  }
  if (cur) h1.push({ end: cur.start + 3600, close: cur.close });
  const e50 = emaArr(h1.map((x) => x.close), 50);
  const trendAtH1 = h1.map((x, j) => {
    if (j < 3 || e50[j] == null || e50[j - 3] == null) return 0;
    if (x.close > e50[j]! && e50[j]! > e50[j - 3]!) return 1;
    if (x.close < e50[j]! && e50[j]! < e50[j - 3]!) return -1;
    return 0;
  });
  const out: number[] = new Array(bars.length).fill(0);
  let j = -1;
  for (let i = 0; i < bars.length; i += 1) {
    const closeT = bars[i]!.time + tfSec;
    while (j + 1 < h1.length && h1[j + 1]!.end <= closeT) j += 1;
    // the last H1 bucket may still be forming at the end of the data: only use fully closed ones
    out[i] = j >= 0 ? trendAtH1[j]! : 0;
  }
  return out;
}

// ── Scan (backtest + live) ────────────────────────────────────────────────────

export type PlaybookTrade = {
  spec: string;
  day: string;
  side: FxSide;
  signalIndex: number;
  signalTime: number;
  entryTime: number;
  entry: number;
  stop: number;
  target: number | null;
  /** epoch seconds of the session exit */
  exitAt: number;
  exitTime: number | null;
  exit: number | null;
  reason: "TP" | "SL" | "SESSION" | "OPEN" | null;
  r: number | null;
};

/** `spread` drives the filters (cost ≤ 0.10 R); `costSpread` is what each trade pays (stress tests). */
export function scanPlaybook(spec: PlaybookSpec, bars: readonly FxCandle[], spread = spec.spread, costSpread = spread): PlaybookTrade[] {
  const tfSec = spec.tfMin * 60;
  const n = bars.length;
  if (n < 100) return [];
  const atr = atrWilder(bars);
  const trend = h1TrendAtBars(bars, tfSec);
  const ema20 = emaArr(bars.map((b) => b.close), 20);
  const lp = bars.map((b) => localParts(b.time, spec.tz)); // at bar OPEN
  const out: PlaybookTrade[] = [];
  const doneDays = new Set<string>();

  // Daily ATR (CLOSE_MOMENTUM filter): local-day OHLC from the base bars.
  const dailyAtrByDay = new Map<string, number>();
  if (spec.kind === "CLOSE_MOMENTUM") {
    const days: Array<{ ymd: string; high: number; low: number; close: number }> = [];
    for (let i = 0; i < n; i += 1) {
      const d = days[days.length - 1];
      if (!d || d.ymd !== lp[i]!.ymd) days.push({ ymd: lp[i]!.ymd, high: bars[i]!.high, low: bars[i]!.low, close: bars[i]!.close });
      else { d.high = Math.max(d.high, bars[i]!.high); d.low = Math.min(d.low, bars[i]!.low); d.close = bars[i]!.close; }
    }
    const tr = days.map((d, k) => (k === 0 ? d.high - d.low : Math.max(d.high - d.low, Math.abs(d.high - days[k - 1]!.close), Math.abs(d.low - days[k - 1]!.close))));
    for (let k = 15; k < days.length; k += 1) {
      // ATR of the 14 sessions CLOSED before day k
      const a = tr.slice(k - 14, k).reduce((s, x) => s + x, 0) / 14;
      dailyAtrByDay.set(days[k]!.ymd, a);
    }
  }

  const inWin = (i: number, w: [number, number]): boolean => {
    const s = lp[i]!.minutes;
    return s >= w[0] && s + spec.tfMin <= w[1];
  };

  const open = (i: number, side: FxSide, stopPx: number, a: number): void => {
    const day = lp[i]!.ymd;
    if (doneDays.has(day)) return;
    const exitAt = localToEpoch(day, spec.exit, spec.tz);
    const dir = side === "long" ? 1 : -1;
    const sigClose = bars[i]!.close;
    if (i + 1 >= n) {
      // live: signal on the last closed bar — entry happens now at the market
      const risk = Math.abs(sigClose - stopPx);
      if (!(risk > 0) || spread > 0.1 * risk) return;
      if (risk < spec.stopAtr[0] * a || risk > spec.stopAtr[1] * a) return;
      doneDays.add(day);
      out.push({ spec: spec.id, day, side, signalIndex: i, signalTime: bars[i]!.time, entryTime: bars[i]!.time + tfSec, entry: sigClose, stop: stopPx,
        target: spec.rr ? sigClose + dir * spec.rr * risk : null, exitAt, exitTime: null, exit: null, reason: "OPEN", r: null });
      return;
    }
    const nx = bars[i + 1]!;
    if (Math.abs(nx.open - sigClose) > 0.25 * a) return; // entry too far from confirmation
    const entry = nx.open + (dir * costSpread) / 2;
    const risk = Math.abs(entry - stopPx);
    if (!(risk > 0) || (side === "long" ? stopPx >= entry : stopPx <= entry)) return;
    if (risk < spec.stopAtr[0] * a || risk > spec.stopAtr[1] * a) return;
    if (spread > 0.1 * risk) return; // round-trip cost ≤ 0.10 R
    doneDays.add(day);
    const target = spec.rr ? entry + dir * spec.rr * risk : null;
    let exit: number | null = null;
    let exitTime: number | null = null;
    let reason: PlaybookTrade["reason"] = "OPEN";
    for (let j = i + 1; j < n; j += 1) {
      const b = bars[j]!;
      const hitSl = side === "long" ? b.low <= stopPx : b.high >= stopPx;
      const hitTp = target != null && (side === "long" ? b.high >= target : b.low <= target);
      if (hitSl) { exit = stopPx - (dir * costSpread) / 2; reason = "SL"; exitTime = b.time + tfSec; break; }
      if (hitTp) { exit = target! - (dir * costSpread) / 2; reason = "TP"; exitTime = b.time + tfSec; break; }
      if (b.time + tfSec >= exitAt) { exit = b.close - (dir * costSpread) / 2; reason = "SESSION"; exitTime = b.time + tfSec; break; }
    }
    out.push({ spec: spec.id, day, side, signalIndex: i, signalTime: bars[i]!.time, entryTime: nx.time, entry, stop: stopPx, target, exitAt, exitTime, exit, reason,
      r: exit != null ? ((exit - entry) * dir) / risk : null });
  };

  if (spec.kind === "RANGE_BREAK" || spec.kind === "RANGE_RETEST") {
    let rDay = "";
    let hi = -Infinity;
    let lo = Infinity;
    let rangeDone = false;
    let broke: { side: FxSide; level: number; at: number } | null = null;
    for (let i = 1; i < n; i += 1) {
      const p = lp[i]!;
      if (p.ymd !== rDay) { rDay = p.ymd; hi = -Infinity; lo = Infinity; rangeDone = false; broke = null; }
      if (p.weekday === 0 || p.weekday === 6) continue;
      if (inWin(i, spec.range!)) { hi = Math.max(hi, bars[i]!.high); lo = Math.min(lo, bars[i]!.low); continue; }
      if (p.minutes >= spec.range![1] && Number.isFinite(hi)) rangeDone = true;
      if (!rangeDone || !inWin(i, spec.entry) || doneDays.has(p.ymd)) continue;
      const a = atr[i - 1];
      if (a == null || !(a > 0)) continue;
      const m = 0.1 * a;
      const c = bars[i]!.close;
      if (spec.kind === "RANGE_BREAK") {
        if (c > hi + m && trend[i] === 1) open(i, "long", bars[i]!.low - m, a);
        else if (c < lo - m && trend[i] === -1) open(i, "short", bars[i]!.high + m, a);
        continue;
      }
      // RANGE_RETEST
      if (!broke) {
        if (c > hi + m && trend[i] === 1) broke = { side: "long", level: hi, at: i };
        else if (c < lo - m && trend[i] === -1) broke = { side: "short", level: lo, at: i };
        continue;
      }
      if (i - broke.at > 3) { broke = null; continue; } // retest must come within 3 bars
      const b = bars[i]!;
      if (broke.side === "long" && trend[i] === 1 && Math.abs(b.low - broke.level) <= 0.15 * a && c > broke.level && c > b.open) {
        open(i, "long", b.low - m, a);
      } else if (broke.side === "short" && trend[i] === -1 && Math.abs(b.high - broke.level) <= 0.15 * a && c < broke.level && c < b.open) {
        open(i, "short", b.high + m, a);
      }
    }
    return out;
  }

  if (spec.kind === "PULLBACK_CONT") {
    for (let i = 2; i < n; i += 1) {
      const p = lp[i]!;
      if (p.weekday === 0 || p.weekday === 6 || !inWin(i, spec.entry) || doneDays.has(p.ymd)) continue;
      // confirmation bar i; setup bar s ∈ {i-1, i-2}, also inside the window
      for (const s of [i - 1, i - 2]) {
        if (!inWin(s, spec.entry) || lp[s]!.ymd !== p.ymd) continue;
        const e = ema20[s];
        const a = atr[s - 1];
        if (e == null || a == null || !(a > 0)) continue;
        const sb = bars[s]!;
        const m = 0.1 * a;
        // the confirmation must be the FIRST close beyond the setup extreme
        const between = bars.slice(s + 1, i);
        if (trend[s] === 1 && sb.low <= e && sb.close > e && bars[i]!.close > sb.high && between.every((x) => x.close <= sb.high)) {
          const stop = Math.min(...bars.slice(s, i + 1).map((x) => x.low)) - m;
          open(i, "long", stop, a);
          break;
        }
        if (trend[s] === -1 && sb.high >= e && sb.close < e && bars[i]!.close < sb.low && between.every((x) => x.close >= sb.low)) {
          const stop = Math.max(...bars.slice(s, i + 1).map((x) => x.high)) + m;
          open(i, "short", stop, a);
          break;
        }
      }
    }
    return out;
  }

  // CLOSE_MOMENTUM
  const mo = spec.momentum!;
  let refPx: number | null = null;
  let refDay = "";
  for (let i = 1; i < n; i += 1) {
    const p = lp[i]!;
    const closeMin = p.minutes + spec.tfMin;
    if (closeMin === mo.reference) { refPx = bars[i]!.close; refDay = p.ymd; continue; }
    if (closeMin !== mo.decision || p.weekday === 0 || p.weekday === 6 || refPx == null || refDay === p.ymd) continue;
    const dAtr = dailyAtrByDay.get(p.ymd);
    const a = atr[i - 1];
    if (dAtr == null || a == null || !(a > 0)) continue;
    const move = bars[i]!.close - refPx;
    if (Math.abs(move) < mo.minDailyAtr * dAtr) continue;
    const side: FxSide = move > 0 ? "long" : "short";
    const stop = side === "long" ? bars[i]!.close - mo.stopAtr * a : bars[i]!.close + mo.stopAtr * a;
    open(i, side, stop, a);
  }
  return out;
}

// ── Stats & acceptance ───────────────────────────────────────────────────────

export type PlaybookStats = { trades: number; winRate: number; meanR: number; pf: number; totalR: number; maxDdR: number };

export function pbStats(t: readonly PlaybookTrade[]): PlaybookStats {
  const c = t.filter((x) => x.r != null);
  const gp = c.filter((x) => x.r! > 0).reduce((s, x) => s + x.r!, 0);
  const gl = -c.filter((x) => x.r! <= 0).reduce((s, x) => s + x.r!, 0);
  let eq = 0; let pk = 0; let dd = 0;
  for (const x of c) { eq += x.r!; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); }
  const tot = c.reduce((s, x) => s + x.r!, 0);
  return { trades: c.length, winRate: c.length ? c.filter((x) => x.r! > 0).length / c.length : 0, meanR: c.length ? tot / c.length : 0, pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0, totalR: tot, maxDdR: dd };
}

/** Fixed rules (nothing fitted) → the whole history is out-of-sample; robustness by halves and costs. */
export const PB_GATE = { minTrades: 40, minPF: 1.15, minMeanR: 0.05, stressSpread: 1.5 } as const;

export type PlaybookResult = {
  id: string;
  instrument: string;
  name: string;
  symbol: string | null;
  bars: number;
  from: number;
  to: number;
  all: PlaybookStats;
  firstHalf: PlaybookStats;
  secondHalf: PlaybookStats;
  stressed: PlaybookStats;
  liveEligible: boolean;
  reason: string;
  locked?: boolean;
};

export function evaluatePlaybook(spec: PlaybookSpec, bars: readonly FxCandle[], spread: number, symbol: string | null): PlaybookResult {
  const t = scanPlaybook(spec, bars, spread);
  const from = bars[0]?.time ?? 0;
  const to = bars[bars.length - 1]?.time ?? 0;
  const mid = from + (to - from) / 2;
  const all = pbStats(t);
  const firstHalf = pbStats(t.filter((x) => x.entryTime < mid));
  const secondHalf = pbStats(t.filter((x) => x.entryTime >= mid));
  // same trades, 50 % higher costs
  const stressed = pbStats(scanPlaybook(spec, bars, spread, spread * PB_GATE.stressSpread));
  const r: string[] = [];
  if (all.trades < PB_GATE.minTrades) r.push(`ops=${all.trades}<${PB_GATE.minTrades}`);
  if (all.pf < PB_GATE.minPF) r.push(`PF=${all.pf.toFixed(2)}<${PB_GATE.minPF}`);
  if (all.meanR < PB_GATE.minMeanR) r.push(`media=${all.meanR.toFixed(3)}R<${PB_GATE.minMeanR}`);
  if (firstHalf.meanR <= 0 || secondHalf.meanR <= 0) r.push("no gana en las dos mitades");
  if (stressed.meanR <= 0) r.push(`pierde con spread ×${PB_GATE.stressSpread}`);
  return { id: spec.id, instrument: spec.instrument, name: spec.name, symbol, bars: bars.length, from, to, all, firstHalf, secondHalf, stressed, liveEligible: r.length === 0, reason: r.join("; ") || "ok" };
}
