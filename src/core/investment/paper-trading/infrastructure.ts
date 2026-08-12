import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import type {
  PaperBrokerStateSnapshot,
  PaperClosedTrade,
  PaperOrderSnapshot,
  PaperPositionSnapshot,
  PaperTradingCertificationReport,
  PaperTradingPerformanceReport,
} from "./domain";
import {
  averageMetric,
  buildEquityCurve,
  computeMaxDrawdownPct,
  computeSharpe,
  computeSortino,
  groupPnlBy,
} from "./metrics";

export interface PaperBrokerPort {
  connect(reconnect?: boolean): Promise<{ connected: boolean; liveTradingEnabled: boolean }>;
  getState(): Promise<PaperBrokerStateSnapshot>;
  createOrder(payload: Record<string, unknown>): Promise<PaperOrderSnapshot>;
  applyEvent(orderId: string, payload: Record<string, unknown>): Promise<{ order: PaperOrderSnapshot }>;
  getBrokerCertificationReport(): Promise<Record<string, unknown>>;
}

function asOrder(raw: Record<string, unknown>): PaperOrderSnapshot {
  const metrics = (raw.metrics ?? {}) as Record<string, unknown>;
  const events = Array.isArray(raw.events) ? raw.events : [];
  return {
    id: String(raw.id),
    orderId: Number(raw.orderId ?? 0),
    symbol: String(raw.symbol ?? "UNKNOWN"),
    side: raw.side === "SELL" ? "SELL" : "BUY",
    intent: (raw.intent as PaperOrderSnapshot["intent"]) ?? "ENTRY",
    quantity: Number(raw.quantity ?? 0),
    remainingQuantity: Number(raw.remainingQuantity ?? 0),
    status: (raw.status as PaperOrderSnapshot["status"]) ?? "PENDING",
    sessionTag: String(raw.sessionTag ?? "session-default"),
    regimeTag: String(raw.regimeTag ?? "regime-unknown"),
    metrics: {
      expectedPrice: Number(metrics.expectedPrice ?? 0),
      executedPrice: metrics.executedPrice == null ? null : Number(metrics.executedPrice),
      slippage: metrics.slippage == null ? null : Number(metrics.slippage),
      commission: Number(metrics.commission ?? 0),
      latencyMs: Number(metrics.latencyMs ?? 0),
      mae: Number(metrics.mae ?? 0),
      mfe: Number(metrics.mfe ?? 0),
      pnl: Number(metrics.pnl ?? 0),
      exitReason: metrics.exitReason == null ? null : String(metrics.exitReason),
    },
    events: events.map((event) => {
      const e = event as Record<string, unknown>;
      return { type: String(e.type ?? "UNKNOWN"), at: String(e.at ?? "") };
    }),
  };
}

function asClosedTrade(raw: Record<string, unknown>): PaperClosedTrade {
  const signalId =
    typeof raw.signalId === "string" && raw.signalId.trim() ? raw.signalId.trim() : undefined;
  return {
    tradeId: String(raw.tradeId),
    symbol: String(raw.symbol),
    quantity: Number(raw.quantity ?? 0),
    entryPrice: Number(raw.entryPrice ?? 0),
    exitPrice: Number(raw.exitPrice ?? 0),
    pnl: Number(raw.pnl ?? 0),
    commission: Number(raw.commission ?? 0),
    mae: Number(raw.mae ?? 0),
    mfe: Number(raw.mfe ?? 0),
    latencyMs: Number(raw.latencyMs ?? 0),
    sessionTag: String(raw.sessionTag ?? "session-default"),
    regimeTag: String(raw.regimeTag ?? "regime-unknown"),
    exitReason: raw.exitReason == null ? null : String(raw.exitReason),
    closedAt: String(raw.closedAt ?? new Date().toISOString()),
    ...(signalId ? { signalId } : {}),
  };
}

export function createBrokerPaperPort(brokerEngine: BrokerEngine): PaperBrokerPort {
  return {
    async connect(reconnect = false) {
      const status = await brokerEngine.request<{ connected: boolean; liveTradingEnabled: boolean }>({
        path: reconnect ? "/api/paper-trading/reconnect" : "/api/ibkr/connect",
        method: "POST",
        body: "{}",
      });
      return {
        connected: Boolean(status.connected),
        liveTradingEnabled: Boolean(status.liveTradingEnabled),
      };
    },

    async getState() {
      const state = await brokerEngine.request<{
        connected: boolean;
        orders: Record<string, unknown>[];
        closedTrades: Record<string, unknown>[];
        positions: Record<string, { quantity: number; averageCost: number; realizedPnl: number }>;
        journal: Array<{ type: string; at: string; detail?: Record<string, unknown> }>;
      }>({
        path: "/api/paper-trading/state",
        method: "GET",
      });

      const positions: PaperPositionSnapshot[] = Object.entries(state.positions ?? {})
        .filter(([, pos]) => pos.quantity !== 0)
        .map(([symbol, pos]) => ({
          symbol,
          quantity: pos.quantity,
          averageCost: pos.averageCost,
          realizedPnl: pos.realizedPnl,
        }));

      return {
        connected: Boolean(state.connected),
        orders: (state.orders ?? []).map((order) => asOrder(order)),
        closedTrades: (state.closedTrades ?? []).map((trade) => asClosedTrade(trade)),
        positions,
        journal: state.journal ?? [],
      };
    },

    async createOrder(payload) {
      const order = await brokerEngine.request<Record<string, unknown>>({
        path: "/api/paper-trading/orders",
        method: "POST",
        body: JSON.stringify(payload),
      });
      return asOrder(order);
    },

    async applyEvent(orderId, payload) {
      const result = await brokerEngine.request<{ order: Record<string, unknown> }>({
        path: `/api/paper-trading/orders/${orderId}/events`,
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { order: asOrder(result.order) };
    },

    async getBrokerCertificationReport() {
      return brokerEngine.request<Record<string, unknown>>({
        path: "/api/paper-trading/certification-report",
        method: "GET",
      });
    },
  };
}

export function buildInstitutionalCertificationReport(args: {
  readonly closedTrades: readonly PaperClosedTrade[];
  readonly orders: readonly PaperOrderSnapshot[];
  readonly windowDays: number;
  readonly minimumClosedTrades: number;
  readonly riskFreeRate: number;
  readonly startingEquity: number;
  readonly now?: Date;
}): PaperTradingCertificationReport {
  const to = args.now ?? new Date();
  const from = new Date(to.getTime() - args.windowDays * 24 * 60 * 60 * 1000);
  const windowSkewMs = 5 * 60 * 1000;
  const inWindow = args.closedTrades.filter((trade) => {
    const closedAt = new Date(trade.closedAt).getTime();
    return closedAt >= from.getTime() - windowSkewMs && closedAt <= to.getTime() + windowSkewMs;
  });
  const sessions = new Set(inWindow.map((trade) => trade.sessionTag));
  const regimes = new Set(inWindow.map((trade) => trade.regimeTag));
  const totalPnl = inWindow.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = inWindow.filter((trade) => trade.pnl > 0).length;
  const { periodReturns } = buildEquityCurve(inWindow, args.startingEquity);
  const { equityCurve } = buildEquityCurve(inWindow, args.startingEquity);
  const oldestTrade = inWindow.length > 0 ? [...inWindow].sort((a, b) => a.closedAt.localeCompare(b.closedAt))[0] : null;
  const evaluationDaysExact = oldestTrade
    ? (to.getTime() - new Date(oldestTrade.closedAt).getTime()) / (24 * 60 * 60 * 1000)
    : 0;
  const evaluationDaysCovered = Math.floor(evaluationDaysExact);
  const slippageSamples = args.orders
    .map((order) => order.metrics.slippage)
    .filter((value): value is number => value !== null);
  const averageSlippage =
    slippageSamples.length === 0
      ? 0
      : slippageSamples.reduce((sum, value) => sum + value, 0) / slippageSamples.length;

  const gates = {
    minimumClosedTrades: {
      required: args.minimumClosedTrades,
      actual: inWindow.length,
      passed: inWindow.length >= args.minimumClosedTrades,
    },
    minimumEvaluationDays: {
      required: args.windowDays,
      actual: evaluationDaysCovered,
      passed: evaluationDaysExact + windowSkewMs / (24 * 60 * 60 * 1000) >= args.windowDays,
    },
    multipleSessions: {
      required: 2,
      actual: sessions.size,
      passed: sessions.size >= 2,
    },
    multipleRegimes: {
      required: 2,
      actual: regimes.size,
      passed: regimes.size >= 2,
    },
  };

  return {
    type: "PaperTradingCertificationReport",
    generatedAt: to.toISOString(),
    tradingMode: "paper",
    liveTradingEnabled: false,
    evaluationWindow: { days: args.windowDays, from: from.toISOString(), to: to.toISOString() },
    gates,
    performance: {
      totalPnl,
      averagePnl: inWindow.length === 0 ? 0 : totalPnl / inWindow.length,
      winRate: inWindow.length === 0 ? 0 : wins / inWindow.length,
      averageLatencyMs: averageMetric(inWindow, (t) => t.latencyMs),
      averageSlippage,
      averageCommission: averageMetric(inWindow, (t) => t.commission),
      averageMae: averageMetric(inWindow, (t) => t.mae),
      averageMfe: averageMetric(inWindow, (t) => t.mfe),
      sharpe: computeSharpe(periodReturns, args.riskFreeRate),
      sortino: computeSortino(periodReturns, args.riskFreeRate),
      maxDrawdownPct: computeMaxDrawdownPct(equityCurve),
    },
    certified:
      gates.minimumClosedTrades.passed &&
      gates.minimumEvaluationDays.passed &&
      gates.multipleSessions.passed &&
      gates.multipleRegimes.passed,
    closedTrades: inWindow,
  };
}

export function buildPerformanceReport(args: {
  readonly state: PaperBrokerStateSnapshot;
  readonly startingEquity: number;
  readonly riskFreeRate: number;
  readonly now?: Date;
}): PaperTradingPerformanceReport {
  const trades = args.state.closedTrades;
  const { equityCurve, periodReturns } = buildEquityCurve(trades, args.startingEquity);
  const endingEquity = equityCurve[equityCurve.length - 1] ?? args.startingEquity;
  const totalPnl = endingEquity - args.startingEquity;
  const realizedPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const openOrders = args.state.orders.filter(
    (order) => !["FILLED", "CANCELED", "REJECTED", "EXPIRED", "REPLACED"].includes(order.status),
  );
  const slippageSamples = args.state.orders
    .map((order) => order.metrics.slippage)
    .filter((value): value is number => value !== null);

  return {
    type: "PaperTradingPerformanceReport",
    generatedAt: (args.now ?? new Date()).toISOString(),
    tradingMode: "paper",
    liveTradingEnabled: false,
    startingEquity: args.startingEquity,
    endingEquity,
    totalPnl,
    realizedPnl,
    winRate: trades.length === 0 ? 0 : wins / trades.length,
    tradeCount: trades.length,
    openOrderCount: openOrders.length,
    openPositionCount: args.state.positions.length,
    averageLatencyMs: averageMetric(trades, (t) => t.latencyMs),
    averageSlippage:
      slippageSamples.length === 0
        ? 0
        : slippageSamples.reduce((sum, value) => sum + value, 0) / slippageSamples.length,
    averageCommission: averageMetric(trades, (t) => t.commission),
    averageMae: averageMetric(trades, (t) => t.mae),
    averageMfe: averageMetric(trades, (t) => t.mfe),
    sharpe: computeSharpe(periodReturns, args.riskFreeRate),
    sortino: computeSortino(periodReturns, args.riskFreeRate),
    maxDrawdownPct: computeMaxDrawdownPct(equityCurve),
    equityCurve,
    periodReturns,
    bySession: groupPnlBy(trades, "sessionTag").map((row) => ({
      sessionTag: row.tag,
      pnl: row.pnl,
      trades: row.trades,
    })),
    byRegime: groupPnlBy(trades, "regimeTag").map((row) => ({
      regimeTag: row.tag,
      pnl: row.pnl,
      trades: row.trades,
    })),
  };
}
