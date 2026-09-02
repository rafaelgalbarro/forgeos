import "server-only";

import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
} from "@/src/core/investment/paper-trading";
import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
} from "@/src/core/investment/server";

export type PaperShadowCompareRow = {
  readonly signalId: string;
  readonly symbol: string;
  readonly shadowPnl: number | null;
  readonly paperPnl: number | null;
  readonly pnlDelta: number | null;
  readonly slippageDeltaBps: number | null;
  readonly fillPriceDelta: number | null;
  readonly note: string;
};

export type PaperShadowComparisonSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly paper: {
    readonly label: "PAPER";
    readonly tradeCount: number;
    readonly totalPnl: number | null;
  };
  readonly shadow: {
    readonly label: "SHADOW";
    readonly operationCount: number;
    readonly hypotheticalPnl: number | null;
  };
  readonly rows: readonly PaperShadowCompareRow[];
  readonly matchedCount: number;
  readonly note: string;
};

/**
 * Side-by-side PAPER vs SHADOW comparative report.
 * Uses paper trades + shadow simulated_operation memory only — no invented prices.
 */
export async function getPaperShadowComparison(): Promise<PaperShadowComparisonSnapshot> {
  let paperTradeCount = 0;
  let paperTotalPnl: number | null = null;
  const paperBySignal = new Map<string, number>();

  try {
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: createPaperTradingConfigFromEnv(),
    });
    const dash = await orchestrator.getDashboardModel();
    paperTradeCount = dash.recentTrades.length;
    let sum = 0;
    for (const trade of dash.recentTrades) {
      const pnl = Number(trade.pnl ?? 0);
      if (!Number.isFinite(pnl)) continue;
      sum += pnl;
      // Prefer signalId when paper trade carries it (signal-level join with shadow).
      if (typeof trade.signalId === "string" && trade.signalId.trim()) {
        paperBySignal.set(trade.signalId.trim(), pnl);
      }
      paperBySignal.set(trade.tradeId, pnl);
      const bySymbol = paperBySignal.get(`symbol:${trade.symbol}`);
      paperBySignal.set(
        `symbol:${trade.symbol}`,
        (typeof bySymbol === "number" ? bySymbol : 0) + pnl,
      );
    }
    paperTotalPnl = paperTradeCount ? sum : null;
  } catch {
    /* keep defaults */
  }

  const rows: PaperShadowCompareRow[] = [];
  let shadowPnlSum = 0;
  let shadowCount = 0;

  try {
    const memory = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const records = await memory.queryDecisionHistory({ kind: "simulated_operation", limit: 500 });
    for (const record of records) {
      if (!record.payload || typeof record.payload !== "object") continue;
      const payload = record.payload as {
        mode?: string;
        signalId?: string;
        estimatedPnl?: number;
        hypotheticalOrder?: { symbol?: string };
        paperDifference?: {
          pnlDelta?: number;
          slippageDeltaBps?: number;
          fillPriceDelta?: number;
        } | null;
      };
      if (payload.mode !== "shadow") continue;
      shadowCount += 1;
      const estimated = Number(payload.estimatedPnl ?? 0);
      if (Number.isFinite(estimated)) shadowPnlSum += estimated;
      const signalId = String(payload.signalId ?? record.id);
      const symbol = payload.hypotheticalOrder?.symbol ?? record.indexes.symbol ?? "NO_DATA";
      const paperPnl =
        paperBySignal.get(signalId) ??
        paperBySignal.get(`symbol:${symbol}`) ??
        null;
      const diff = payload.paperDifference ?? null;
      rows.push({
        signalId,
        symbol,
        shadowPnl: Number.isFinite(estimated) ? estimated : null,
        paperPnl,
        pnlDelta: diff && typeof diff.pnlDelta === "number" ? diff.pnlDelta : null,
        slippageDeltaBps:
          diff && typeof diff.slippageDeltaBps === "number" ? diff.slippageDeltaBps : null,
        fillPriceDelta:
          diff && typeof diff.fillPriceDelta === "number" ? diff.fillPriceDelta : null,
        note: diff
          ? "Matched paperDifference on shadow payload"
          : paperPnl != null && paperBySignal.has(signalId)
            ? "PAPER matched by signalId"
            : paperPnl != null
              ? "PAPER symbol aggregate present; signalId join NO_DATA"
              : "SHADOW only — no paper match",
      });
    }
  } catch {
    /* empty */
  }

  const matchedCount = rows.filter((r) => r.pnlDelta != null || r.paperPnl != null).length;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    paper: { label: "PAPER", tradeCount: paperTradeCount, totalPnl: paperTotalPnl },
    shadow: {
      label: "SHADOW",
      operationCount: shadowCount,
      hypotheticalPnl: shadowCount ? shadowPnlSum : null,
    },
    rows,
    matchedCount,
    note:
      rows.length || paperTradeCount
        ? "PAPER vs SHADOW comparative report — hypothetical diffs only; zero real orders"
        : "NO_DATA — no paper trades or shadow operations",
  };
}
