/**
 * Strategy Lab metrics — extends paper-trading Sharpe/Sortino/DD helpers.
 * Pure functions; no broker / order path.
 */

import {
  buildEquityCurve,
  computeMaxDrawdownPct,
  computeSharpe,
  computeSortino,
} from "../../paper-trading/metrics";
import type { StrategyLabMetrics, StrategyLabTradeSample } from "../domain/types";

type PaperLike = {
  readonly pnl: number;
  readonly commission: number;
  readonly closedAt: string;
};

function toPaperLike(trades: readonly StrategyLabTradeSample[]): PaperLike[] {
  return trades.map((t, i) => ({
    pnl: t.pnl,
    commission: t.commission,
    closedAt: `1970-01-01T00:${String(i % 60).padStart(2, "0")}:00.000Z`,
  }));
}

function safeMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function safeStd(values: readonly number[]): number | null {
  const mean = safeMean(values);
  if (mean === null || values.length < 2) return null;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function computeProfitFactor(trades: readonly StrategyLabTradeSample[]): number | null {
  const gains = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const losses = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  if (losses === 0) return gains > 0 ? null : 0;
  return gains / losses;
}

export function computeExpectancy(trades: readonly StrategyLabTradeSample[]): number {
  if (trades.length === 0) return 0;
  return trades.reduce((s, t) => s + (t.pnl - t.commission), 0) / trades.length;
}

export function computeUlcerIndex(equityCurve: readonly number[]): number | null {
  if (equityCurve.length < 2) return null;
  let peak = equityCurve[0]!;
  let sumSq = 0;
  let n = 0;
  for (const nav of equityCurve) {
    if (nav > peak) peak = nav;
    const ddPct = peak > 0 ? ((peak - nav) / peak) * 100 : 0;
    sumSq += ddPct * ddPct;
    n += 1;
  }
  return n === 0 ? null : Math.sqrt(sumSq / n);
}

export function computeRecoveryFactor(
  netPnl: number,
  maxDrawdownPct: number | null,
  startingEquity: number,
): number | null {
  if (maxDrawdownPct === null || maxDrawdownPct <= 0 || startingEquity <= 0) return null;
  const ddAbs = (maxDrawdownPct / 100) * startingEquity;
  if (ddAbs <= 0) return null;
  return netPnl / ddAbs;
}

export function computeCalmar(cagr: number | null, maxDrawdownPct: number | null): number | null {
  if (cagr === null || maxDrawdownPct === null || maxDrawdownPct <= 0) return null;
  return cagr / (maxDrawdownPct / 100);
}

export function computeCagr(startEquity: number, endEquity: number, years: number): number | null {
  if (startEquity <= 0 || endEquity <= 0 || years <= 0) return null;
  return Math.pow(endEquity / startEquity, 1 / years) - 1;
}

/**
 * Full Strategy Lab metric suite from trade samples.
 * When MAE/MFE/holding missing, corresponding fields are null / estimated.
 */
export function computeStrategyLabMetrics(
  trades: readonly StrategyLabTradeSample[],
  options?: {
    readonly startingEquity?: number;
    readonly periodsPerYear?: number;
    readonly riskFreeRate?: number;
    readonly assumedYears?: number;
  },
): StrategyLabMetrics {
  const startingEquity = options?.startingEquity ?? 100_000;
  const periodsPerYear = options?.periodsPerYear ?? 252;
  const riskFree = options?.riskFreeRate ?? 0;
  const paper = toPaperLike(trades);
  const { equityCurve, periodReturns } = buildEquityCurve(paper as never, startingEquity);
  const endEquity = equityCurve[equityCurve.length - 1] ?? startingEquity;
  const years =
    options?.assumedYears ??
    Math.max(periodReturns.length / periodsPerYear, periodReturns.length > 0 ? 1 / periodsPerYear : 0);
  const cagr = years > 0 ? computeCagr(startingEquity, endEquity, years) : null;
  const sharpeRaw = computeSharpe(periodReturns, riskFree);
  const sortinoRaw = computeSortino(periodReturns, riskFree);
  const annualize = (x: number | null) =>
    x === null ? null : x * Math.sqrt(Math.min(periodsPerYear, Math.max(periodReturns.length, 1)));
  const maxDd = computeMaxDrawdownPct(equityCurve);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const netPnl = trades.reduce((s, t) => s + t.pnl - t.commission, 0);
  const maeVals = trades.map((t) => t.mae).filter((v): v is number => typeof v === "number");
  const mfeVals = trades.map((t) => t.mfe).filter((v): v is number => typeof v === "number");
  const holdVals = trades
    .map((t) => t.holdingPeriodHours)
    .filter((v): v is number => typeof v === "number");
  const riskVals = trades.map((t) => t.riskPct).filter((v): v is number => typeof v === "number");
  const vol = safeStd(periodReturns);
  const annualizedReturn =
    periodReturns.length === 0 ? null : (safeMean(periodReturns) ?? 0) * periodsPerYear;

  return {
    annualizedReturn,
    cagr,
    sharpe: annualize(sharpeRaw),
    sortino: annualize(sortinoRaw),
    calmar: computeCalmar(cagr, maxDd),
    profitFactor: computeProfitFactor(trades),
    expectancy: computeExpectancy(trades),
    winRate: trades.length === 0 ? null : wins.length / trades.length,
    averageWin: wins.length === 0 ? 0 : wins.reduce((s, t) => s + t.pnl, 0) / wins.length,
    averageLoss: losses.length === 0 ? 0 : losses.reduce((s, t) => s + t.pnl, 0) / losses.length,
    mae: safeMean(maeVals),
    mfe: safeMean(mfeVals),
    maxDrawdownPct: maxDd,
    ulcerIndex: computeUlcerIndex(equityCurve),
    recoveryFactor: computeRecoveryFactor(netPnl, maxDd, startingEquity),
    volatility: vol === null ? null : vol * Math.sqrt(periodsPerYear),
    tradeCount: trades.length,
    avgTimeInMarketHours: safeMean(holdVals),
    riskPerTradePct: safeMean(riskVals),
    totalRiskPct: riskVals.length === 0 ? null : riskVals.reduce((s, v) => s + v, 0),
  };
}

export function emptyStrategyLabMetrics(): StrategyLabMetrics {
  return computeStrategyLabMetrics([]);
}

/** Deterministic DEMO samples for lab UI when no paper ledger is attached. */
export function demoTradeSamplesForStrategy(strategyId: string, seed = 1): StrategyLabTradeSample[] {
  let h = seed;
  for (let i = 0; i < strategyId.length; i++) h = (h * 31 + strategyId.charCodeAt(i)) >>> 0;
  const out: StrategyLabTradeSample[] = [];
  for (let i = 0; i < 24; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const raw = (h % 2000) / 1000 - 0.85;
    const pnl = Math.round(raw * 420 * 100) / 100;
    out.push({
      pnl,
      commission: 1.25,
      mae: Math.abs(pnl) * 0.4,
      mfe: Math.abs(pnl) * 0.9,
      holdingPeriodHours: 8 + (h % 72),
      riskPct: 0.5 + (h % 50) / 100,
    });
  }
  return out;
}
