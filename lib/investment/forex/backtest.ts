/**
 * Lightweight FOREX strategy backtest on historical bars (last ~30 days of 1h/5m).
 */

import "server-only";

import { evaluateStrategy } from "@/lib/investment/forex/strategies/engine";
import type { ForexStrategyId } from "@/lib/investment/forex/strategies/defs";
import { getStrategyDef } from "@/lib/investment/forex/strategies/defs";
import type { ForexBar } from "@/lib/investment/forex/indicators";
import { priceToPips, getForexPair } from "@/lib/investment/forex/config";
import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";

export type ForexBacktestStats = {
  strategyId: ForexStrategyId;
  pairId: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPips: number;
  netPips: number;
  bestHourMadrid: number | null;
  badge: string;
};

function hourMadridFromBar(bar: ForexBar): number | null {
  const t = bar.time ?? bar.date;
  if (!t) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(new Date(t));
    return Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  } catch {
    return null;
  }
}

/**
 * Walk-forward simulation: on signal, exit at SL/TP or after N bars (estimatedMinutes).
 */
export function backtestStrategyOnBars(params: {
  strategyId: ForexStrategyId;
  pairId: string;
  bars: readonly ForexBar[];
}): ForexBacktestStats {
  const def = getStrategyDef(params.strategyId);
  const pair = getForexPair(params.pairId);
  const empty: ForexBacktestStats = {
    strategyId: params.strategyId,
    pairId: params.pairId,
    trades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    maxDrawdownPips: 0,
    netPips: 0,
    bestHourMadrid: null,
    badge: "NO_DATA",
  };
  if (!pair || params.bars.length < 40) return empty;

  let wins = 0;
  let losses = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let net = 0;
  let peak = 0;
  let maxDd = 0;
  const hourWins = new Map<number, number>();
  const holdBars = Math.max(3, Math.round(def.estimatedMinutes / (def.timeframe === "5m" ? 5 : def.timeframe === "15m" ? 15 : 60)));

  for (let i = 35; i < params.bars.length - holdBars - 1; i++) {
    const window = params.bars.slice(0, i + 1);
    const sig = evaluateStrategy(params.strategyId, params.pairId, window, {
      spreadPips: 1,
      madridMinutes: 16 * 60,
      weekend: false,
      primarySession: "OVERLAP_LONDON_NY",
    });
    if (!sig) continue;

    const entry = sig.entry;
    let exitPips = 0;
    let resolved = false;
    for (let j = i + 1; j <= i + holdBars && j < params.bars.length; j++) {
      const bar = params.bars[j]!;
      if (sig.side === "BUY") {
        if (bar.low <= sig.stopLoss) {
          exitPips = -sig.stopPips;
          resolved = true;
          break;
        }
        if (bar.high >= sig.takeProfit) {
          exitPips = sig.tpPips;
          resolved = true;
          break;
        }
      } else {
        if (bar.high >= sig.stopLoss) {
          exitPips = -sig.stopPips;
          resolved = true;
          break;
        }
        if (bar.low <= sig.takeProfit) {
          exitPips = sig.tpPips;
          resolved = true;
          break;
        }
      }
    }
    if (!resolved) {
      const last = params.bars[Math.min(i + holdBars, params.bars.length - 1)]!;
      exitPips =
        sig.side === "BUY"
          ? priceToPips(pair, entry, last.close) * (last.close >= entry ? 1 : -1)
          : priceToPips(pair, entry, last.close) * (last.close <= entry ? 1 : -1);
    }

    net += exitPips;
    peak = Math.max(peak, net);
    maxDd = Math.max(maxDd, peak - net);
    if (exitPips >= 0) {
      wins += 1;
      grossWin += exitPips;
    } else {
      losses += 1;
      grossLoss += Math.abs(exitPips);
    }
    const h = hourMadridFromBar(params.bars[i]!);
    if (h != null && exitPips > 0) hourWins.set(h, (hourWins.get(h) ?? 0) + 1);

    i += holdBars; // skip overlap
  }

  const trades = wins + losses;
  const winRate = trades ? wins / trades : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  let bestHour: number | null = null;
  let bestCount = 0;
  for (const [h, c] of hourWins) {
    if (c > bestCount) {
      bestCount = c;
      bestHour = h;
    }
  }

  const badge =
    trades >= 5
      ? `Win ${(winRate * 100).toFixed(0)}% | PF ${profitFactor.toFixed(1)}`
      : trades > 0
        ? `n=${trades} | Win ${(winRate * 100).toFixed(0)}%`
        : "NO_DATA";

  return {
    strategyId: params.strategyId,
    pairId: params.pairId,
    trades,
    wins,
    losses,
    winRate,
    profitFactor,
    maxDrawdownPips: maxDd,
    netPips: net,
    bestHourMadrid: bestHour,
    badge,
  };
}

export function getCachedBacktest(
  strategyId: ForexStrategyId,
  pairId: string,
  bars: readonly ForexBar[],
): ForexBacktestStats {
  const key = cacheKey("fx-bt", strategyId, pairId, String(bars.length));
  const hit = getCached<ForexBacktestStats>(key);
  if (hit) return hit;
  const stats = backtestStrategyOnBars({ strategyId, pairId, bars });
  setCached(key, stats, 30 * 60_000);
  return stats;
}
