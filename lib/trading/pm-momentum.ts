/**
 * Momentum by % gain — US stocks already up X % vs the previous close (pure; backtest + live).
 *
 * PM (premarket) variants: at `at` (ET minutes, before 09:30) the stock is ≥ minPct above the
 * previous close with ≥ $100k traded in the premarket so far.
 *   AT    → buy the next bar's open;  BREAK → buy the first break of the premarket high.
 * OPEN variants (after the open, no look-ahead): at `at` (≥ 09:35) the stock is ≥ minPct up and
 * above the session VWAP → buy the next bar's open.
 * Exit: fixed take-profit / stop in % of entry, or the close of the first bar at/after `exitBy`.
 * Same bar stop+target → stop. Costs: slippage per side (premarket wider) + IBKR commission
 * on a `notionalUsd` position.
 */

import { usCommission, nyMinutes, type Bar5 } from "./gap-and-go";

export type PmVariant = {
  id: string;
  kind: "PM" | "OPEN";
  at: number;
  minPct: number;
  entry: "AT" | "BREAK";
  tp: number;
  sl: number;
  exitBy: number;
};

export type PmTrade = { day: string; code: string; chgPct: number; entry: number; exit: number; netPct: number; reason: "TP" | "SL" | "TIME" };

export type PmCost = { notionalUsd: number; slipPm: number; slipRth: number; commissionMult: number };
export const DEFAULT_PM_COST: PmCost = { notionalUsd: 250, slipPm: 0.003, slipRth: 0.0015, commissionMult: 1 };

const OPEN = 570;

export function simulatePm(args: { day: string; code: string; prevClose: number; bars: readonly Bar5[]; v: PmVariant; cost?: PmCost }): PmTrade | null {
  const { v, prevClose } = args;
  const cost = args.cost ?? DEFAULT_PM_COST;
  if (!(prevClose > 0)) return null;
  const bars = [...args.bars].sort((a, b) => a.t - b.t).map((b) => ({ ...b, m: nyMinutes(b.t) }));
  const before = bars.filter((b) => b.m < v.at && (v.kind === "PM" ? b.m >= 240 : b.m >= OPEN));
  if (!before.length) return null;
  const last = before[before.length - 1]!;
  const chg = last.c / prevClose - 1;
  if (chg < v.minPct) return null;
  if (v.kind === "PM") {
    const dv = before.reduce((a, b) => a + b.v * b.c, 0);
    if (dv < 100_000) return null;
  } else {
    let pv = 0; let vol = 0;
    for (const b of before) { pv += ((b.h + b.l + b.c) / 3) * b.v; vol += b.v; }
    if (!(vol > 0) || last.c <= pv / vol) return null;
  }
  const after = bars.filter((b) => b.m >= v.at);
  if (!after.length) return null;
  let i = 0;
  let raw = 0;
  if (v.entry === "AT") {
    raw = after[0]!.o;
  } else {
    const hi = Math.max(...before.map((b) => b.h));
    for (; i < after.length; i += 1) {
      const b = after[i]!;
      if (b.m >= v.exitBy) return null;
      if (b.h > hi) { raw = Math.max(hi, b.o); break; }
    }
    if (!(raw > 0)) return null;
  }
  const slipIn = after[i]!.m < OPEN ? cost.slipPm : cost.slipRth;
  const entry = raw * (1 + slipIn);
  const tp = entry * (1 + v.tp);
  const sl = entry * (1 - v.sl);
  let exitRaw = 0;
  let reason: PmTrade["reason"] = "TIME";
  let exitBar = after[after.length - 1]!;
  for (let j = i; j < after.length; j += 1) {
    const b = after[j]!;
    exitBar = b;
    if (b.l <= sl) { exitRaw = j > i ? Math.min(sl, b.o) : sl; reason = "SL"; break; }
    if (b.h >= tp) { exitRaw = j > i ? Math.max(tp, b.o) : tp; reason = "TP"; break; }
    if (b.m >= v.exitBy || j === after.length - 1) { exitRaw = b.c; reason = "TIME"; break; }
  }
  const slipOut = exitBar.m < OPEN ? cost.slipPm : cost.slipRth;
  const exit = exitRaw * (1 - slipOut);
  const shares = Math.max(1, Math.floor(cost.notionalUsd / entry));
  const comm = (usCommission(shares, entry) + usCommission(shares, exit)) * cost.commissionMult;
  const pnl = (exit - entry) * shares - comm;
  return { day: args.day, code: args.code, chgPct: chg, entry, exit, netPct: (pnl / (entry * shares)) * 100, reason };
}

export function pmVariants(): PmVariant[] {
  const out: PmVariant[] = [];
  const exits: Array<[number, number]> = [[0.02, 0.015], [0.03, 0.02], [0.05, 0.03]];
  for (const minPct of [0.05, 0.1, 0.2]) {
    for (const [tp, sl] of exits) {
      for (const at of [480, 540]) {
        for (const entry of ["AT", "BREAK"] as const) {
          for (const exitBy of [575, 600]) {
            out.push({ id: `PM${at / 60}h_${Math.round(minPct * 100)}_${entry}_TP${tp * 100}_SL${sl * 100}_X${exitBy === 575 ? "935" : "1000"}`, kind: "PM", at, minPct, entry, tp, sl, exitBy });
          }
        }
      }
      for (const at of [585, 600]) {
        for (const exitBy of [660, 955]) {
          out.push({ id: `OPEN${at === 585 ? "945" : "1000"}_${Math.round(minPct * 100)}_TP${tp * 100}_SL${sl * 100}_X${exitBy === 660 ? "1100" : "EOD"}`, kind: "OPEN", at, minPct, entry: "AT", tp, sl, exitBy });
        }
      }
    }
  }
  return out;
}
