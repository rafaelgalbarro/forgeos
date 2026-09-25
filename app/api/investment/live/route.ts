import { NextResponse } from "next/server";
import { buildLiveTradingDashboardReadModel } from "@/lib/investment/live-trading-snapshot";

/**
 * GET /api/investment/live — Investment OS LIVE control snapshot.
 * Read-only. Never flips env. Never submits or cancels orders.
 */
export async function GET() {
  try {
    const snapshot = await buildLiveTradingDashboardReadModel();
    return NextResponse.json({
      ...snapshot,
      orderExecution: "disabled",
      mode: "ANALYSIS_ONLY",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live trading snapshot failed";
    return NextResponse.json(
      {
        error: message,
        orderExecution: "disabled",
        mode: "ANALYSIS_ONLY",
        safety: {
          liveTradingEnabled: false,
          ibkrReadOnly: true,
          tradingMode: "ANALYSIS_ONLY",
          mode: "ANALYSIS_ONLY",
          state: "LOCKED",
          autonomousLock: "LOCKED",
          emergencyStop: false,
          blockNewEntries: true,
          reduceOnly: true,
          executionDisconnected: true,
        },
        systemState: {
          tradingMode: "ANALYSIS_ONLY",
          autonomousLock: "LOCKED",
          dataFreshness: "NO_DATA",
          haltReason: message,
          blockNewEntries: true,
        },
        brokerState: {
          connected: false,
          healthOk: null,
          accountsMasked: [],
          nextValidId: "NO_DATA",
          error: message,
        },
        aiState: {
          brain: "NO_DATA",
          committee: "NO_DATA",
          ensembleStrategies: 0,
          analysisLoop: "unavailable",
          detail: message,
        },
        candidates: [],
        activeSignals: [],
        approvals: [],
        openOrders: [],
        positions: [],
        readiness: [],
        dailyRisk: {
          dailyPnl: null,
          maxLoss: null,
          drawdown: null,
          usedRisk: null,
          dayOrders: null,
          newPositions: null,
          exposure: null,
          remainingLimits: "NO_DATA",
          note: "NO_DATA",
        },
        profitability: {
          dailyPnl: null,
          unrealizedPnl: null,
          realizedPnl: null,
          note: "NO_DATA",
        },
        operations: {
          openOrders: 0,
          positions: 0,
          opportunities: 0,
          noTradeCount: 0,
          ordersSubmitted: 0,
        },
        limits: {
          maxOrderNotionalEur: 50,
          maxNewExposureDailyEur: 100,
          maxOpenPositions: 2,
          maxTradesPerDay: 3,
          maxDailyLossPct: 0.25,
          maxConsecutiveLosses: 2,
        },
        circuitBreakers: [],
        auditLog: [],
        history: [],
        systemPerformance: {
          snapshotLatencyMs: null,
          symbolsScanned: 0,
          stagesOk: false,
          note: "Snapshot unavailable — surface remains LOCKED",
        },
        badges: ["ANALYSIS_ONLY", "AUTONOMOUS_LIVE_LOCKED", "LOCKED", "LIVE_LOCKED", "ordersSubmitted=0"],
        note: "Snapshot unavailable — surface remains LOCKED · DO NOT UNLOCK",
        strategyReadiness: {
          goLiveDecision: "NOT_READY_FOR_LIVE",
          overallSample: "NO_DATA",
          unlockEligible: false,
          paperClosedTrades: 0,
          paperSessions: 0,
          shadowOps: 0,
          shadowDays: 0,
          gates: [],
          note: "NO_DATA — snapshot unavailable",
        },
        goLiveUnlock: {
          blocked: true,
          buttonEnabled: false,
          reason: "Snapshot unavailable — GO_LIVE remains blocked",
          certificationPass: false,
          liveTradingEnabled: false,
          autonomousLive: "LOCKED",
          note: "Human GO_LIVE control disabled — never sets LIVE_TRADING_ENABLED=true",
        },
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
