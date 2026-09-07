import type { PaperClosedTrade } from "./domain";

function safeMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeStd(values: readonly number[]): number | null {
  const mean = safeMean(values);
  if (mean === null || values.length < 2) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function downsideDeviation(returns: readonly number[]): number | null {
  if (returns.length === 0) return null;
  const downside = returns.filter((r) => r < 0).map((r) => r ** 2);
  if (downside.length === 0) return 0;
  return Math.sqrt(downside.reduce((sum, value) => sum + value, 0) / returns.length);
}

export function buildEquityCurve(
  closedTrades: readonly PaperClosedTrade[],
  startingEquity: number,
): { equityCurve: number[]; periodReturns: number[] } {
  const sorted = [...closedTrades].sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  const equityCurve: number[] = [startingEquity];
  const periodReturns: number[] = [];
  let equity = startingEquity;
  for (const trade of sorted) {
    const next = equity + trade.pnl - trade.commission;
    const periodReturn = equity > 0 ? (next - equity) / equity : 0;
    periodReturns.push(periodReturn);
    equity = next;
    equityCurve.push(equity);
  }
  return { equityCurve, periodReturns };
}

export function computeSharpe(periodReturns: readonly number[], riskFreeRate: number): number | null {
  const mean = safeMean(periodReturns);
  const std = safeStd(periodReturns);
  if (mean === null || std === null || std <= 0) return null;
  return (mean - riskFreeRate) / std;
}

export function computeSortino(periodReturns: readonly number[], riskFreeRate: number): number | null {
  const mean = safeMean(periodReturns);
  const downside = downsideDeviation(periodReturns);
  if (mean === null || downside === null) return null;
  // No downside observations ⇒ undefined Sortino (not infinite).
  if (downside === 0) return mean > riskFreeRate ? null : 0;
  return (mean - riskFreeRate) / downside;
}

export function computeMaxDrawdownPct(equityCurve: readonly number[]): number | null {
  if (equityCurve.length < 2) return null;
  let peak = equityCurve[0]!;
  let worst = 0;
  for (const nav of equityCurve) {
    if (nav > peak) peak = nav;
    if (peak > 0) {
      const dd = (peak - nav) / peak;
      if (dd > worst) worst = dd;
    }
  }
  return worst * 100;
}

export function averageMetric(
  trades: readonly PaperClosedTrade[],
  pick: (trade: PaperClosedTrade) => number,
): number {
  if (trades.length === 0) return 0;
  return trades.reduce((sum, trade) => sum + pick(trade), 0) / trades.length;
}

export function groupPnlBy(
  trades: readonly PaperClosedTrade[],
  key: "sessionTag" | "regimeTag",
): Array<{ tag: string; pnl: number; trades: number }> {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const trade of trades) {
    const tag = trade[key];
    const prev = map.get(tag) ?? { pnl: 0, trades: 0 };
    map.set(tag, { pnl: prev.pnl + trade.pnl, trades: prev.trades + 1 });
  }
  return [...map.entries()]
    .map(([tag, value]) => ({ tag, ...value }))
    .sort((a, b) => b.pnl - a.pnl);
}
