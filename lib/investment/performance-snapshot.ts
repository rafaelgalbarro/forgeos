import "server-only";

import {
  computeBenchmarkAnalytics,
  loadMultiBenchmarkReturns,
  type BenchmarkAnalytics,
  type BenchmarkSeriesSnapshot,
} from "@/lib/investment/benchmark-returns-loader";
import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
} from "@/src/core/investment/paper-trading";
import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
} from "@/src/core/investment/server";

export type PerformancePoint = {
  readonly index: number;
  readonly equity: number;
};

export type AttributionBucket = {
  readonly label: string;
  readonly pnl: number;
  readonly trades: number;
};

export type BenchmarkRow = {
  readonly label: "MI" | "NO_DATA";
  readonly symbol: string | null;
  readonly providerId: string | null;
  readonly returnCount: number;
  readonly beta: number | null;
  readonly alpha: number | null;
  readonly correlation: number | null;
  readonly trackingError: number | null;
  readonly informationRatio: number | null;
  readonly note: string;
};

export type PerformanceSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly paper: {
    readonly label: "PAPER";
    readonly tradeCount: number;
    readonly totalPnl: number | null;
    readonly winRate: number | null;
    readonly sharpe: number | null;
    readonly maxDrawdownPct: number | null;
    readonly equityCurve: readonly PerformancePoint[];
    readonly bySession: readonly AttributionBucket[];
    readonly byRegime: readonly AttributionBucket[];
    readonly bySymbol: readonly AttributionBucket[];
    readonly periodReturns: readonly number[];
    readonly periodReturnCount: number;
    readonly note: string;
  };
  readonly shadow: {
    readonly label: "SHADOW";
    readonly operationCount: number;
    readonly hypotheticalPnl: number | null;
    readonly equityCurve: readonly PerformancePoint[];
    readonly bySymbol: readonly AttributionBucket[];
    readonly byStrategy: readonly AttributionBucket[];
    readonly note: string;
  };
  readonly benchmark: BenchmarkRow;
  readonly benchmarks: readonly BenchmarkRow[];
  readonly multiBenchmarkNote: string;
};

function toBenchmarkRow(
  series: BenchmarkSeriesSnapshot,
  analytics: BenchmarkAnalytics,
): BenchmarkRow {
  return {
    label: series.label,
    symbol: series.symbol,
    providerId: series.providerId,
    returnCount: series.returnCount,
    beta: analytics.beta,
    alpha: analytics.alpha,
    correlation: analytics.correlation,
    trackingError: analytics.trackingError,
    informationRatio: analytics.informationRatio,
    note: `${series.note} · ${analytics.note}`,
  };
}

function groupBySymbol(
  trades: ReadonlyArray<{ symbol: string; pnl: number }>,
): AttributionBucket[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    const cur = map.get(t.symbol) ?? { pnl: 0, trades: 0 };
    cur.pnl += t.pnl;
    cur.trades += 1;
    map.set(t.symbol, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, pnl: v.pnl, trades: v.trades }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

/**
 * Read-only performance snapshot from paper orchestrator + shadow memory + optional MI benchmarks.
 * Labels PAPER / SHADOW / MI / NO_DATA honestly — never invents market benchmarks.
 */
export async function getPerformanceSnapshot(): Promise<PerformanceSnapshot> {
  let paper: PerformanceSnapshot["paper"] = {
    label: "PAPER",
    tradeCount: 0,
    totalPnl: null,
    winRate: null,
    sharpe: null,
    maxDrawdownPct: null,
    equityCurve: [],
    bySession: [],
    byRegime: [],
    bySymbol: [],
    periodReturns: [],
    periodReturnCount: 0,
    note: "NO_DATA — paper performance unavailable",
  };

  try {
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: createPaperTradingConfigFromEnv(),
    });
    const report = await orchestrator.getPerformanceReport();
    const dash = await orchestrator.getDashboardModel();
    const bySymbol = groupBySymbol(
      dash.recentTrades.map((t) => ({ symbol: t.symbol, pnl: t.pnl })),
    );
    paper = {
      label: "PAPER",
      tradeCount: report.tradeCount,
      totalPnl: report.totalPnl,
      winRate: report.winRate,
      sharpe: report.sharpe,
      maxDrawdownPct: report.maxDrawdownPct,
      equityCurve: report.equityCurve.map((equity, index) => ({ index, equity })),
      bySession: report.bySession.map((row) => ({
        label: row.sessionTag || "NO_DATA",
        pnl: row.pnl,
        trades: row.trades,
      })),
      byRegime: report.byRegime.map((row) => ({
        label: row.regimeTag || "NO_DATA",
        pnl: row.pnl,
        trades: row.trades,
      })),
      bySymbol,
      periodReturns: report.periodReturns,
      periodReturnCount: report.periodReturns.length,
      note:
        report.equityCurve.length > 1
          ? "PAPER equity + attribution from Paper Trading orchestrator (simulated)."
          : "PAPER report loaded but equity curve insufficient for chart.",
    };
  } catch (error) {
    paper = {
      ...paper,
      note: error instanceof Error ? `PAPER: ${error.message}` : "PAPER: unavailable",
    };
  }

  let shadow: PerformanceSnapshot["shadow"] = {
    label: "SHADOW",
    operationCount: 0,
    hypotheticalPnl: null,
    equityCurve: [],
    bySymbol: [],
    byStrategy: [],
    note: "NO_DATA — no shadow operations in memory",
  };

  try {
    const memory = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const records = await memory.queryDecisionHistory({ kind: "simulated_operation", limit: 500 });
    const shadowOps = records
      .filter((r) => {
        if (!r.payload || typeof r.payload !== "object") return false;
        return (r.payload as { mode?: string }).mode === "shadow";
      })
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

    let cumulative = 0;
    const equityCurve: PerformancePoint[] = [];
    const bySymbolMap = new Map<string, { pnl: number; trades: number }>();
    const byStrategyMap = new Map<string, { pnl: number; trades: number }>();

    for (const r of shadowOps) {
      const payload = r.payload as {
        estimatedPnl?: number;
        strategyId?: string;
        strategy?: string;
        hypotheticalOrder?: { symbol?: string };
      };
      const estimated = Number(payload.estimatedPnl ?? 0);
      if (!Number.isFinite(estimated)) continue;
      cumulative += estimated;
      equityCurve.push({ index: equityCurve.length, equity: cumulative });
      const symbol =
        typeof payload.hypotheticalOrder?.symbol === "string"
          ? payload.hypotheticalOrder.symbol
          : r.indexes.symbol ?? "NO_DATA";
      const cur = bySymbolMap.get(symbol) ?? { pnl: 0, trades: 0 };
      cur.pnl += estimated;
      cur.trades += 1;
      bySymbolMap.set(symbol, cur);

      const strategy =
        (typeof payload.strategyId === "string" && payload.strategyId) ||
        (typeof payload.strategy === "string" && payload.strategy) ||
        null;
      if (strategy) {
        const s = byStrategyMap.get(strategy) ?? { pnl: 0, trades: 0 };
        s.pnl += estimated;
        s.trades += 1;
        byStrategyMap.set(strategy, s);
      }
    }

    shadow = {
      label: "SHADOW",
      operationCount: shadowOps.length,
      hypotheticalPnl: shadowOps.length ? cumulative : null,
      equityCurve,
      bySymbol: [...bySymbolMap.entries()]
        .map(([label, v]) => ({ label, pnl: v.pnl, trades: v.trades }))
        .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)),
      byStrategy: [...byStrategyMap.entries()]
        .map(([label, v]) => ({ label, pnl: v.pnl, trades: v.trades }))
        .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)),
      note: shadowOps.length
        ? "SHADOW hypothetical cumulative P&L from Investment Memory (not real money)."
        : "NO_DATA — no shadow operations recorded",
    };
  } catch (error) {
    shadow = {
      ...shadow,
      note: error instanceof Error ? `SHADOW: ${error.message}` : "SHADOW: unavailable",
    };
  }

  const multi = await loadMultiBenchmarkReturns();
  const benchmarks = multi.series.map((series) =>
    toBenchmarkRow(series, computeBenchmarkAnalytics(paper.periodReturns, series.returns)),
  );
  const primaryAnalytics = computeBenchmarkAnalytics(paper.periodReturns, multi.primary.returns);
  const benchmark = toBenchmarkRow(multi.primary, primaryAnalytics);

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    paper,
    shadow,
    benchmark,
    benchmarks,
    multiBenchmarkNote: multi.note,
  };
}
