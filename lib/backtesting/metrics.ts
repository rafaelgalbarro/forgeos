/**
 * Backtest performance metrics — reuses paper-trading Sharpe/Sortino/DD helpers.
 */

import {
  computeMaxDrawdownPct,
  computeSharpe,
  computeSortino,
} from "@/src/core/investment/paper-trading/metrics";
import type { BacktestMetrics, BacktestTrade, EquityPoint } from "./types";

export function computeProfitFactorFromTrades(trades: readonly BacktestTrade[]): number | null {
  const gains = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const losses = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  if (losses === 0) return gains > 0 ? null : 0;
  return gains / losses;
}

export function computeBacktestMetrics(
  trades: readonly BacktestTrade[],
  equityCurve: readonly EquityPoint[],
  periodReturns: readonly number[],
  options?: { readonly periodsPerYear?: number; readonly riskFreeRate?: number },
): BacktestMetrics {
  const periodsPerYear = options?.periodsPerYear ?? 252;
  const riskFree = options?.riskFreeRate ?? 0;
  const sharpeRaw = computeSharpe(periodReturns, riskFree);
  const sortinoRaw = computeSortino(periodReturns, riskFree);
  const annualize = (x: number | null) =>
    x === null ? null : x * Math.sqrt(Math.min(periodsPerYear, Math.max(periodReturns.length, 1)));
  const equityValues = equityCurve.map((p) => p.equity);
  const start = equityValues[0] ?? 100_000;
  const end = equityValues[equityValues.length - 1] ?? start;
  const wins = trades.filter((t) => t.pnl > 0);
  const net = trades.reduce((s, t) => s + t.pnl - t.commission, 0);

  return {
    sharpe: annualize(sharpeRaw),
    sortino: annualize(sortinoRaw),
    maxDrawdownPct: computeMaxDrawdownPct(equityValues),
    winRate: trades.length === 0 ? null : wins.length / trades.length,
    profitFactor: computeProfitFactorFromTrades(trades),
    tradeCount: trades.length,
    totalReturnPct: start > 0 ? ((end - start) / start) * 100 : null,
    expectancy: trades.length === 0 ? 0 : net / trades.length,
  };
}

/** Score for ranking grid / walk-forward trials (higher is better). */
export function scoreMetrics(m: BacktestMetrics): number {
  return (
    (m.sharpe ?? 0) * 0.35 +
    (m.sortino ?? 0) * 0.15 +
    (m.profitFactor ?? 0) * 0.25 +
    (m.winRate ?? 0) * 0.15 -
    (m.maxDrawdownPct ?? 0) * 0.01 +
    Math.min(m.tradeCount, 40) * 0.005
  );
}
