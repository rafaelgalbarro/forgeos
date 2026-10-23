/**
 * Momentum ignition (volume + impulse) and news-reaction rules — pure, shared by FX/CFDs (MT5 tick
 * volume) and crypto (Kraken Futures traded volume). Longs and shorts.
 *
 * IGNITION — on the close of bar i:
 *   range_i ≥ 1.5 × ATR14(i−1)  and  volume_i ≥ 2.5 × SMA20(volume, i−1)
 *   long : close in the top 25 % of the bar and close > open;  short: bottom 25 % and close < open.
 *   Entry: next bar open (market — speed matters). Stop: the other extreme of the ignition bar
 *   (± 0.1 ATR). Target: 1R (small, frequent). Time exit after `maxBars`.
 * NEWS — around a scheduled high-impact release at time T:
 *   the first bar starting at T is the "reaction bar"; if its range ≥ 1.5 × ATR14 of the bars
 *   before T, enter the next bar in the bar's direction; stop at its other extreme; target 1R;
 *   flat after 60 min.
 * Costs: `cost` is the round trip in price units (FX spread) or as a fraction of price
 * (`costPct`, crypto fees + slippage). Same bar hitting stop and target → stop.
 */

import type { FxCandle, FxSide } from "./types";

export type IgTrade = { entryTime: number; side: FxSide; r: number; reason: "TP" | "SL" | "TIME" };

function atrArr(b: readonly FxCandle[], n = 14): Array<number | null> {
  const o: Array<number | null> = new Array(b.length).fill(null);
  if (b.length <= n) return o;
  const tr = b.map((x, i) => (i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - b[i - 1]!.close), Math.abs(x.low - b[i - 1]!.close))));
  let a = 0;
  for (let i = 1; i <= n; i += 1) a += tr[i]!;
  a /= n; o[n] = a;
  for (let i = n + 1; i < b.length; i += 1) { a = (a * (n - 1) + tr[i]!) / n; o[i] = a; }
  return o;
}

export type IgCost = { abs?: number; pct?: number };
const roundTrip = (c: IgCost, px: number) => (c.abs ?? 0) + (c.pct ?? 0) * px;

/** Ignition signal on the close of bar i (needs ≥ 21 prior bars). */
export function ignitionSignal(bars: readonly FxCandle[], atr: Array<number | null>, i: number): FxSide | null {
  if (i < 21) return null;
  const b = bars[i]!;
  const a = atr[i - 1];
  if (a == null || !(a > 0)) return null;
  let v = 0;
  for (let k = i - 20; k < i; k += 1) v += bars[k]!.volume;
  v /= 20;
  const range = b.high - b.low;
  if (!(range >= 1.5 * a) || !(v > 0) || !(b.volume >= 2.5 * v)) return null;
  const pos = (b.close - b.low) / range;
  if (pos >= 0.75 && b.close > b.open) return "long";
  if (pos <= 0.25 && b.close < b.open) return "short";
  return null;
}

function runTrade(bars: readonly FxCandle[], i: number, side: FxSide, stop: number, cost: IgCost, maxBars: number, rr = 1): IgTrade | null {
  const n = bars.length;
  if (i + 1 >= n) return null;
  const dir = side === "long" ? 1 : -1;
  const nx = bars[i + 1]!;
  const rt = roundTrip(cost, nx.open);
  const entry = nx.open + (dir * rt) / 2;
  const risk = (entry - stop) * dir;
  if (!(risk > 0) || rt > 0.35 * risk) return null; // costs must stay well below the target
  const tp = entry + dir * rr * risk;
  for (let j = i + 1; j < n; j += 1) {
    const c = bars[j]!;
    if (side === "long" ? c.low <= stop : c.high >= stop) {
      const px = j > i + 1 && (side === "long" ? c.open < stop : c.open > stop) ? c.open : stop;
      return { entryTime: nx.time, side, r: ((px - (dir * rt) / 2 - entry) * dir) / risk, reason: "SL" };
    }
    if (side === "long" ? c.high >= tp : c.low <= tp) return { entryTime: nx.time, side, r: ((tp - (dir * rt) / 2 - entry) * dir) / risk, reason: "TP" };
    if (j - i >= maxBars) return { entryTime: nx.time, side, r: ((c.close - (dir * rt) / 2 - entry) * dir) / risk, reason: "TIME" };
  }
  return null;
}

export function simulateIgnition(bars: readonly FxCandle[], cost: IgCost, maxBars = 8): IgTrade[] {
  const atr = atrArr(bars);
  const out: IgTrade[] = [];
  for (let i = 21; i < bars.length - 1; i += 1) {
    const side = ignitionSignal(bars, atr, i);
    if (!side) continue;
    const a = atr[i - 1]!;
    const b = bars[i]!;
    const stop = side === "long" ? b.low - 0.1 * a : b.high + 0.1 * a;
    const t = runTrade(bars, i, side, stop, cost, maxBars);
    if (!t) continue;
    out.push(t);
    // one position at a time: skip to after this trade's entry window
    i += 1;
    while (i + 1 < bars.length && bars[i + 1]!.time <= t.entryTime + maxBars * (bars[1]!.time - bars[0]!.time)) i += 1;
  }
  return out;
}

/** News reaction: `events` are epoch seconds of high-impact releases relevant to the instrument. */
export function simulateNewsReaction(bars: readonly FxCandle[], events: readonly number[], cost: IgCost, tfSec: number): IgTrade[] {
  const atr = atrArr(bars);
  const out: IgTrade[] = [];
  const idxByTime = new Map(bars.map((b, i) => [b.time, i]));
  for (const T of events) {
    const t0 = Math.floor(T / tfSec) * tfSec;
    const i = idxByTime.get(t0);
    if (i == null || i < 20) continue;
    const a = atr[i - 1];
    const b = bars[i]!;
    if (a == null || !(b.high - b.low >= 1.5 * a)) continue;
    const side: FxSide = b.close >= b.open ? "long" : "short";
    const stop = side === "long" ? b.low - 0.1 * a : b.high + 0.1 * a;
    const t = runTrade(bars, i, side, stop, cost, Math.max(1, Math.round(3600 / tfSec)));
    if (t) out.push(t);
  }
  return out;
}

export type IgStats = { trades: number; winRate: number; meanR: number; pf: number; totalR: number; maxDdR: number };

export function igStats(t: readonly IgTrade[]): IgStats {
  const gp = t.filter((x) => x.r > 0).reduce((s, x) => s + x.r, 0);
  const gl = -t.filter((x) => x.r <= 0).reduce((s, x) => s + x.r, 0);
  let eq = 0; let pk = 0; let dd = 0;
  for (const x of t) { eq += x.r; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); }
  return { trades: t.length, winRate: t.length ? t.filter((x) => x.r > 0).length / t.length : 0, meanR: t.length ? (gp - gl) / t.length : 0, pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0, totalR: gp - gl, maxDdR: dd };
}

export const IG_GATE = { minTrades: 60, minPF: 1.15, minMeanR: 0.03, stress: 1.5 } as const;

export type IgResult = {
  id: string; market: "fx" | "crypto"; kind: "IGNITION" | "NEWS"; instrument: string; tf: string; bars: number; from: number; to: number;
  all: IgStats; firstHalf: IgStats; secondHalf: IgStats; stressed: IgStats; liveEligible: boolean; reason: string; locked?: boolean;
};

export function evaluateIg(args: {
  id: string; market: "fx" | "crypto"; kind: "IGNITION" | "NEWS"; instrument: string; tf: string;
  bars: readonly FxCandle[]; cost: IgCost; run: (cost: IgCost) => IgTrade[];
}): IgResult {
  const t = args.run(args.cost);
  const from = args.bars[0]?.time ?? 0; const to = args.bars[args.bars.length - 1]?.time ?? 0;
  const mid = from + (to - from) / 2;
  const all = igStats(t);
  const firstHalf = igStats(t.filter((x) => x.entryTime < mid));
  const secondHalf = igStats(t.filter((x) => x.entryTime >= mid));
  const stressed = igStats(args.run({ abs: (args.cost.abs ?? 0) * IG_GATE.stress, pct: (args.cost.pct ?? 0) * IG_GATE.stress }));
  const r: string[] = [];
  const minT = args.kind === "NEWS" ? 30 : IG_GATE.minTrades;
  if (all.trades < minT) r.push(`ops=${all.trades}<${minT}`);
  if (all.pf < IG_GATE.minPF) r.push(`PF=${all.pf.toFixed(2)}<${IG_GATE.minPF}`);
  if (all.meanR < IG_GATE.minMeanR) r.push(`media=${all.meanR.toFixed(3)}R<${IG_GATE.minMeanR}`);
  if (firstHalf.meanR <= 0 || secondHalf.meanR <= 0) r.push("no gana en las dos mitades");
  if (stressed.meanR <= 0) r.push(`pierde con costes ×${IG_GATE.stress}`);
  return { id: args.id, market: args.market, kind: args.kind, instrument: args.instrument, tf: args.tf, bars: args.bars.length, from, to, all, firstHalf, secondHalf, stressed, liveEligible: r.length === 0, reason: r.join("; ") || "ok" };
}
