/**
 * Long-only bar simulator — ANALYSIS_ONLY equity path (no broker orders).
 */

import { computeBacktestMetrics } from "./metrics";
import { buildSignalSeries, defaultParams } from "./signals";
import type {
  BacktestBar,
  BacktestHorizon,
  BacktestSignalFamily,
  BacktestTrade,
  EquityPoint,
  IndicatorParams,
  SimulationResult,
} from "./types";

function horizonMaxHold(horizon: BacktestHorizon): number {
  switch (horizon) {
    case "intraday":
      return 12; // ~1h on 5m bars
    case "swing":
      return 10; // 1–10 day swing emphasis
    case "daily5y":
    default:
      return 20;
  }
}

function periodsPerYearFor(horizon: BacktestHorizon): number {
  switch (horizon) {
    case "intraday":
      return 252 * 78;
    default:
      return 252;
  }
}

export function simulateStrategy(input: {
  readonly bars: readonly BacktestBar[];
  readonly family: BacktestSignalFamily;
  readonly params?: IndicatorParams;
  readonly horizon?: BacktestHorizon;
  readonly startingEquity?: number;
  readonly commissionBps?: number;
}): SimulationResult {
  const horizon = input.horizon ?? "daily5y";
  const params = {
    ...defaultParams(input.family, horizonMaxHold(horizon)),
    ...input.params,
  };
  const maxHold = params.maxHoldBars ?? horizonMaxHold(horizon);
  const startEquity = input.startingEquity ?? 100_000;
  const commissionBps = input.commissionBps ?? 5;
  const signals = buildSignalSeries(input.bars, input.family, params);

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  const periodReturns: number[] = [];

  let equity = startEquity;
  let position: { entryIndex: number; entryPrice: number; shares: number } | null = null;

  equityCurve.push({
    index: 0,
    equity,
    date: input.bars[0]?.date,
  });

  for (let i = 1; i < input.bars.length; i += 1) {
    const bar = input.bars[i]!;
    const signal = signals[i] ?? 0;

    // Mark-to-market when in position
    if (position) {
      const mtm = position.shares * bar.close;
      const costBasis = position.shares * position.entryPrice;
      const unrealized = mtm - costBasis;
      const holdBars = i - position.entryIndex;
      const shouldExit = signal === -1 || holdBars >= maxHold || i === input.bars.length - 1;

      if (shouldExit) {
        const exitNotional = position.shares * bar.close;
        const entryNotional = position.shares * position.entryPrice;
        const commission =
          ((entryNotional + exitNotional) * commissionBps) / 10_000;
        const pnl = exitNotional - entryNotional;
        trades.push({
          entryIndex: position.entryIndex,
          exitIndex: i,
          entryPrice: position.entryPrice,
          exitPrice: bar.close,
          pnl,
          commission,
          holdingBars: holdBars,
          side: "long",
        });
        const nextEquity = equity + pnl - commission;
        const ret = equity > 0 ? (nextEquity - equity) / equity : 0;
        periodReturns.push(ret);
        equity = nextEquity;
        position = null;
        void unrealized;
      }
    } else if (signal === 1) {
      // Enter with ~95% of equity
      const notional = equity * 0.95;
      const shares = notional / bar.close;
      if (shares > 0 && Number.isFinite(shares)) {
        position = { entryIndex: i, entryPrice: bar.close, shares };
      }
    }

    equityCurve.push({
      index: i,
      equity:
        position != null
          ? equity + position.shares * (bar.close - position.entryPrice)
          : equity,
      date: bar.date,
    });
  }

  const metrics = computeBacktestMetrics(trades, equityCurve, periodReturns, {
    periodsPerYear: periodsPerYearFor(horizon),
  });

  return {
    params,
    family: input.family,
    trades,
    equityCurve,
    periodReturns,
    metrics,
    note: `Long-only ${input.family} sim · maxHold=${maxHold} · ANALYSIS_ONLY (no orders).`,
  };
}
