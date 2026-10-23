/**
 * Connors-style short-term mean reversion in the direction of the trend ("small targets, many
 * trades"), on H1 and H4, for all FX pairs, gold and indices. Pure module (backtest + live).
 *
 * Long:  close > SMA200 and RSI(2) < 10  → buy.   Exit: close > SMA5, or RSI(2) > 70.
 * Short: close < SMA200 and RSI(2) > 90  → sell.  Exit: close < SMA5, or RSI(2) < 30.
 * Protective stop 2 × ATR14 (always on the broker), time stop (H1 24 bars, H4 10 bars),
 * flat before the weekend.
 *
 * Entry (pre-registered as the main variant): LIMIT — 0.25 × ATR better than the signal close,
 * valid only for the next bar (buying the dip instead of paying the spread at market).
 * The MARKET variant (next open) is computed alongside for comparison only.
 * Costs: spread on entry and exit; candles are bid → a buy limit fills when low ≤ L − spread/2.
 */

import { isWeekendFlattenTime } from "./sessions";
import type { FxCandle, FxSide } from "./types";

export type MrTf = "H1" | "H4";
export type MrEntry = "LMT" | "MKT";

export type MrSpec = {
  id: string;
  instrument: string;
  symbols: string[];
  name: string;
  tf: MrTf;
  entry: MrEntry;
  spread: number;
};

const FX: Array<[string, number]> = [
  ["EUR_USD", 0.0001], ["GBP_USD", 0.00014], ["USD_JPY", 0.012], ["AUD_USD", 0.00013], ["USD_CAD", 0.00018],
  ["USD_CHF", 0.00016], ["NZD_USD", 0.00016], ["EUR_GBP", 0.00014], ["EUR_JPY", 0.019], ["GBP_JPY", 0.028],
  ["EUR_CHF", 0.00019], ["EUR_AUD", 0.00025], ["EUR_CAD", 0.00026], ["GBP_CHF", 0.0003], ["GBP_AUD", 0.00035],
  ["AUD_JPY", 0.02], ["AUD_NZD", 0.00026], ["AUD_CAD", 0.00024], ["CAD_JPY", 0.024], ["CHF_JPY", 0.028], ["NZD_JPY", 0.026],
];
const OTHER: Array<[string, string[], number, string]> = [
  ["GOLD", ["GOLD", "XAUUSD"], 0.5, "Oro"],
  ["US500", ["US500"], 0.9, "US500"],
  ["US100", ["US100"], 1.5, "US100"],
  ["DE30", ["DE30", "GER40", "DE40"], 3.6, "DE30"],
];

export function mrSpecs(): MrSpec[] {
  const out: MrSpec[] = [];
  const all: Array<[string, string[], number, string]> = [
    ...FX.map(([p, s]) => [p, [p.replace("_", "")], s, p.replace("_", "/")] as [string, string[], number, string]),
    ...OTHER,
  ];
  for (const [inst, symbols, spread, label] of all) {
    for (const tf of ["H1", "H4"] as const) {
      for (const entry of ["LMT", "MKT"] as const) {
        out.push({ id: `MR_${inst.replace("_", "")}_${tf}_${entry}`, instrument: inst, symbols, name: `${label} · RSI2 en tendencia ${tf} (${entry === "LMT" ? "limitada" : "mercado"})`, tf, entry, spread });
      }
    }
  }
  return out;
}

const TF_SEC: Record<MrTf, number> = { H1: 3600, H4: 14400 };
const MAX_BARS: Record<MrTf, number> = { H1: 24, H4: 10 };

type Arr = Array<number | null>;

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

function atr(b: readonly FxCandle[], n = 14): Arr {
  const o: Arr = new Array(b.length).fill(null);
  if (b.length <= n) return o;
  const tr = b.map((x, i) => (i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1]!.close), Math.abs(x.low - b[i - 1]!.close))));
  let a = 0;
  for (let i = 1; i <= n; i += 1) a += tr[i]!;
  a /= n; o[n] = a;
  for (let i = n + 1; i < b.length; i += 1) { a = (a * (n - 1) + tr[i]!) / n; o[i] = a; }
  return o;
}

export type MrIndicators = { s200: Arr; s5: Arr; r2: Arr; atr: Arr; weekend: boolean[] };

export function mrIndicators(bars: readonly FxCandle[], tf: MrTf): MrIndicators {
  const c = bars.map((b) => b.close);
  return {
    s200: sma(c, 200), s5: sma(c, 5), r2: rsi(c, 2), atr: atr(bars, 14),
    weekend: bars.map((b) => isWeekendFlattenTime(new Date((b.time + TF_SEC[tf]) * 1000))),
  };
}

/** Signal on the close of bar i. */
export function mrSignal(bars: readonly FxCandle[], ind: MrIndicators, i: number): FxSide | null {
  const c = bars[i]!.close;
  const s = ind.s200[i]; const r = ind.r2[i];
  if (s == null || r == null || ind.weekend[i]) return null;
  if (c > s && r < 10) return "long";
  if (c < s && r > 90) return "short";
  return null;
}

/** Rule exit on the close of bar j (position side). */
export function mrExit(bars: readonly FxCandle[], ind: MrIndicators, j: number, side: FxSide): boolean {
  const c = bars[j]!.close; const s5 = ind.s5[j]; const r = ind.r2[j];
  if (s5 == null || r == null) return false;
  return side === "long" ? c > s5 || r > 70 : c < s5 || r < 30;
}

export type MrTrade = { entryTime: number; exitTime: number | null; side: FxSide; r: number | null; reason: "RULE" | "SL" | "TIME" | "WEEKEND" | "OPEN"; pnlPrice: number | null };

export function simulateMr(spec: MrSpec, bars: readonly FxCandle[], spread = spec.spread, costSpread = spread): MrTrade[] {
  const n = bars.length;
  if (n < 260) return [];
  const ind = mrIndicators(bars, spec.tf);
  const out: MrTrade[] = [];
  for (let i = 205; i < n - 1; i += 1) {
    const side = mrSignal(bars, ind, i);
    const a = ind.atr[i];
    if (!side || a == null || !(a > 0)) continue;
    const dir = side === "long" ? 1 : -1;
    const nx = bars[i + 1]!;
    let entry: number;
    if (spec.entry === "LMT") {
      const L = bars[i]!.close - dir * 0.25 * a;
      const filled = side === "long" ? nx.low <= L - costSpread / 2 : nx.high >= L + costSpread / 2;
      if (!filled) continue;
      entry = side === "long" ? Math.min(nx.open + costSpread / 2, L) : Math.max(nx.open - costSpread / 2, L);
    } else {
      entry = nx.open + (dir * costSpread) / 2;
    }
    const stop = entry - dir * 2 * a;
    const risk = 2 * a;
    if (spread > 0.25 * risk) continue;
    let exit: number | null = null;
    let reason: MrTrade["reason"] = "OPEN";
    let j = i + 1;
    for (; j < n; j += 1) {
      const b = bars[j]!;
      const hit = side === "long" ? b.low <= stop : b.high >= stop;
      if (hit) {
        const px = j > i + 1 && (side === "long" ? b.open < stop : b.open > stop) ? b.open : stop;
        exit = px - (dir * costSpread) / 2; reason = "SL"; break;
      }
      if (mrExit(bars, ind, j, side)) { exit = b.close - (dir * costSpread) / 2; reason = "RULE"; break; }
      if (ind.weekend[j]) { exit = b.close - (dir * costSpread) / 2; reason = "WEEKEND"; break; }
      if (j - i >= MAX_BARS[spec.tf]) { exit = b.close - (dir * costSpread) / 2; reason = "TIME"; break; }
    }
    if (exit == null) break;
    out.push({ entryTime: nx.time, exitTime: bars[j]!.time + TF_SEC[spec.tf], side, r: ((exit - entry) * dir) / risk, reason, pnlPrice: (exit - entry) * dir });
    i = j;
  }
  return out;
}

export type MrStats = { trades: number; winRate: number; meanR: number; pf: number; totalR: number; maxDdR: number; avgWinR: number; avgLossR: number };

export function mrStats(t: readonly MrTrade[]): MrStats {
  const c = t.filter((x) => x.r != null);
  const w = c.filter((x) => x.r! > 0); const l = c.filter((x) => x.r! <= 0);
  const gp = w.reduce((s, x) => s + x.r!, 0); const gl = -l.reduce((s, x) => s + x.r!, 0);
  let eq = 0; let pk = 0; let dd = 0;
  for (const x of c) { eq += x.r!; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); }
  const tot = gp - gl;
  return {
    trades: c.length, winRate: c.length ? w.length / c.length : 0, meanR: c.length ? tot / c.length : 0,
    pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0, totalR: tot, maxDdR: dd,
    avgWinR: w.length ? gp / w.length : 0, avgLossR: l.length ? -gl / l.length : 0,
  };
}

export const MR_GATE = { minTrades: 60, minPF: 1.15, minMeanR: 0.03, stress: 1.5 } as const;

export type MrResult = {
  id: string; instrument: string; name: string; tf: MrTf; entry: MrEntry; symbol: string | null; bars: number; from: number; to: number;
  all: MrStats; firstHalf: MrStats; secondHalf: MrStats; stressed: MrStats; liveEligible: boolean; reason: string; locked?: boolean;
};

export function evaluateMr(spec: MrSpec, bars: readonly FxCandle[], spread: number, symbol: string | null): MrResult {
  const t = simulateMr(spec, bars, spread);
  const from = bars[0]?.time ?? 0; const to = bars[bars.length - 1]?.time ?? 0;
  const mid = from + (to - from) / 2;
  const all = mrStats(t);
  const firstHalf = mrStats(t.filter((x) => x.entryTime < mid));
  const secondHalf = mrStats(t.filter((x) => x.entryTime >= mid));
  const stressed = mrStats(simulateMr(spec, bars, spread, spread * MR_GATE.stress));
  const r: string[] = [];
  if (spec.entry !== "LMT") r.push("variante de comparación (mercado)");
  if (all.trades < MR_GATE.minTrades) r.push(`ops=${all.trades}<${MR_GATE.minTrades}`);
  if (all.pf < MR_GATE.minPF) r.push(`PF=${all.pf.toFixed(2)}<${MR_GATE.minPF}`);
  if (all.meanR < MR_GATE.minMeanR) r.push(`media=${all.meanR.toFixed(3)}R<${MR_GATE.minMeanR}`);
  if (firstHalf.meanR <= 0 || secondHalf.meanR <= 0) r.push("no gana en las dos mitades");
  if (stressed.meanR <= 0) r.push(`pierde con costes ×${MR_GATE.stress}`);
  return { id: spec.id, instrument: spec.instrument, name: spec.name, tf: spec.tf, entry: spec.entry, symbol, bars: bars.length, from, to, all, firstHalf, secondHalf, stressed, liveEligible: r.length === 0, reason: r.join("; ") || "ok" };
}
