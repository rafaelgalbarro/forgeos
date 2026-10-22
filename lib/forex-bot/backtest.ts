/**
 * Walk-forward backtest for the intraday FX strategies (pure).
 * - Signals on closed M15 bars; entry at the next bar's open; full typical spread charged.
 * - SL/TP checked on later bars (same bar touching both → stop, conservative).
 * - Intraday: flat at 21:00 London and before the weekend.
 * Results in R multiples; first 2/3 of the period = in-sample, last 1/3 = out-of-sample.
 */

import { aggregate, pipSize } from "./indicators";
import { londonMinutes, londonWeekday, isWeekendFlattenTime } from "./sessions";
import { evaluateLondonBreakout, evaluateTrendPullback } from "./strategies";
import { isFxSignal, type FxCandle, type FxStrategyId } from "./types";

export type FxBacktestTrade = {
  strategy: FxStrategyId;
  instrument: string;
  side: "long" | "short";
  entryTime: number;
  exitTime: number;
  r: number;
  exitReason: "TP" | "SL" | "TIME" | "WEEKEND";
};

export type FxStrategyStats = {
  strategy: FxStrategyId;
  trades: number;
  winRate: number;
  meanR: number;
  profitFactor: number;
  totalR: number;
  maxDrawdownR: number;
};

export type FxGateRow = FxStrategyStats & { oosTrades: number; oosMeanR: number; oosPF: number; liveEligible: boolean; reason: string };

export const FX_GATE = { minOosTrades: 30, minOosPF: 1.2, minOosMeanR: 0.05 } as const;

export function backtestInstrument(
  instrument: string,
  m15All: readonly FxCandle[],
  strategies: readonly FxStrategyId[],
  spreadPips: number,
): FxBacktestTrade[] {
  const h1All = aggregate(m15All, 60);
  const spread = spreadPips * pipSize(instrument);
  const trades: FxBacktestTrade[] = [];
  let h1Ptr = 0;
  let busyUntil = 0; // one open trade per instrument & strategy set at a time
  for (let i = 300; i < m15All.length - 1; i += 1) {
    const bar = m15All[i]!;
    const barEnd = bar.time + 900;
    while (h1Ptr < h1All.length && h1All[h1Ptr]!.time + 3600 <= barEnd) h1Ptr += 1;
    if (bar.time < busyUntil) continue;
    const at = new Date(barEnd * 1000);
    const lm = londonMinutes(at);
    const wd = londonWeekday(at);
    if (wd < 1 || wd > 5 || lm < 7 * 60 || lm >= 16 * 60 + 30 || (wd === 5 && lm >= 14 * 60)) continue;
    const m15 = m15All.slice(Math.max(0, i - 299), i + 1);
    const h1 = h1All.slice(Math.max(0, h1Ptr - 120), h1Ptr);
    for (const strategy of strategies) {
      const ev =
        strategy === "FX_TREND_PULLBACK_M15"
          ? evaluateTrendPullback(instrument, m15, h1)
          : evaluateLondonBreakout(instrument, m15, h1, at);
      if (!isFxSignal(ev)) continue;
      // Entry next bar open, paying the spread.
      const next = m15All[i + 1]!;
      const dirSign = ev.side === "long" ? 1 : -1;
      const entry = next.open + (dirSign * spread) / 2;
      const stop = entry - dirSign * ev.risk;
      const tp = entry + dirSign * (Math.abs(ev.takeProfit - ev.entry));
      let exitPx = entry;
      let exitTime = next.time;
      let reason: FxBacktestTrade["exitReason"] = "TIME";
      for (let j = i + 1; j < m15All.length; j += 1) {
        const b = m15All[j]!;
        const hitSl = ev.side === "long" ? b.low <= stop : b.high >= stop;
        const hitTp = ev.side === "long" ? b.high >= tp : b.low <= tp;
        exitTime = b.time + 900;
        if (hitSl) { exitPx = stop - (dirSign * spread) / 2; reason = "SL"; break; }
        if (hitTp) { exitPx = tp - (dirSign * spread) / 2; reason = "TP"; break; }
        const endAt = new Date((b.time + 900) * 1000);
        if (isWeekendFlattenTime(endAt)) { exitPx = b.close; reason = "WEEKEND"; break; }
        if (londonMinutes(endAt) >= 21 * 60) { exitPx = b.close; reason = "TIME"; break; }
      }
      const r = ((exitPx - entry) * dirSign) / ev.risk;
      trades.push({ strategy, instrument, side: ev.side, entryTime: next.time, exitTime, r, exitReason: reason });
      busyUntil = exitTime;
      break;
    }
  }
  return trades;
}

export function statsFor(strategy: FxStrategyId, trades: readonly FxBacktestTrade[]): FxStrategyStats {
  const t = trades.filter((x) => x.strategy === strategy);
  const wins = t.filter((x) => x.r > 0);
  const gp = wins.reduce((s, x) => s + x.r, 0);
  const gl = -t.filter((x) => x.r <= 0).reduce((s, x) => s + x.r, 0);
  let eq = 0;
  let peak = 0;
  let mdd = 0;
  for (const x of [...t].sort((a, b) => a.exitTime - b.exitTime)) {
    eq += x.r;
    peak = Math.max(peak, eq);
    mdd = Math.max(mdd, peak - eq);
  }
  const totalR = t.reduce((s, x) => s + x.r, 0);
  return {
    strategy,
    trades: t.length,
    winRate: t.length ? wins.length / t.length : 0,
    meanR: t.length ? totalR / t.length : 0,
    profitFactor: gl > 0 ? gp / gl : gp > 0 ? 99 : 0,
    totalR,
    maxDrawdownR: mdd,
  };
}

export function gateRows(
  strategies: readonly FxStrategyId[],
  trades: readonly FxBacktestTrade[],
  splitTime: number,
): FxGateRow[] {
  return strategies.map((s) => {
    const all = statsFor(s, trades);
    const oos = statsFor(s, trades.filter((t) => t.entryTime >= splitTime));
    const reasons: string[] = [];
    if (oos.trades < FX_GATE.minOosTrades) reasons.push(`oos_trades=${oos.trades}<${FX_GATE.minOosTrades}`);
    if (oos.profitFactor < FX_GATE.minOosPF) reasons.push(`oos_PF=${oos.profitFactor.toFixed(2)}<${FX_GATE.minOosPF}`);
    if (oos.meanR < FX_GATE.minOosMeanR) reasons.push(`oos_meanR=${oos.meanR.toFixed(3)}<${FX_GATE.minOosMeanR}`);
    return {
      ...all,
      oosTrades: oos.trades,
      oosMeanR: oos.meanR,
      oosPF: oos.profitFactor,
      liveEligible: reasons.length === 0,
      reason: reasons.join("; ") || "ok",
    };
  });
}
