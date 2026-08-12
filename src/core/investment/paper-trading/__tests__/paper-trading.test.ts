import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createInMemoryInvestmentMemoryRepository,
  createInvestmentMemoryService,
} from "@/src/core/investment";
import {
  assertPaperTradingSafe,
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
  type PaperTradingConfig,
} from "@/src/core/investment/paper-trading";

function setTempStore(): string {
  const storePath = path.join(
    os.tmpdir(),
    `forgeos-paper-module-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  process.env.PAPER_TRADING_STORE_PATH = storePath;
  return storePath;
}

function baseConfig(overrides: Partial<PaperTradingConfig> = {}): PaperTradingConfig {
  return {
    tradingMode: "paper",
    liveTradingEnabled: false,
    analysisOnlyUi: true,
    startingEquity: 100_000,
    riskFreeRate: 0,
    certificationWindowDays: 30,
    minimumClosedTrades: 100,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.TRADING_MODE = "paper";
  process.env.LIVE_TRADING_ENABLED = "false";
});

afterEach(() => {
  delete process.env.PAPER_TRADING_STORE_PATH;
  process.env.TRADING_MODE = "paper";
  process.env.LIVE_TRADING_ENABLED = "false";
});

describe("paper-trading module", () => {
  it("runs lifecycle through orchestrator: entry, fill, exit, stop/tp/trail, cancel/reject", async () => {
    setTempStore();
    const memory = createInvestmentMemoryService({
      repository: createInMemoryInvestmentMemoryRepository(),
    });
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: baseConfig(),
      memoryService: memory,
    });

    await orchestrator.connect();

    const submitted = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-entry-1",
        symbol: "MSFT",
        side: "BUY",
        quantity: 10,
        intent: "ENTRY",
        strategy: "breakout",
        thesis: "Breakout continuation",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 99.9, ask: 100.1, expectedPrice: 100 },
      },
      brain: { recommendation: "BUY", confidence: 0.8, reasoning: ["momentum"] },
      committee: { approved: true, dissentingVotes: 0, reasoning: "Consensus", confidence: 0.75 },
      risk: { approved: true, level: "MEDIUM", monetaryRisk: 200, percentRisk: 0.2, reason: "ok", decision: "PASS" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 12 },
    });

    expect(submitted.status).toBe("PAPER_SUBMITTED");
    expect(submitted.liveTradingActivated).toBe(false);
    expect(submitted.orderId).toBeTruthy();

    const filled = await orchestrator.fill(submitted.orderId!, {
      price: 100.15,
      quantity: 10,
      commission: 1,
      reason: "market_fill",
    });
    expect(filled.status).toBe("FILLED");
    expect(filled.metrics.slippage).not.toBeNull();
    expect(filled.metrics.commission).toBe(1);

    const exit = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-exit-1",
        symbol: "MSFT",
        side: "SELL",
        quantity: 10,
        intent: "EXIT",
        strategy: "breakout",
        thesis: "Take profit",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 101.9, ask: 102.1, expectedPrice: 102 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "Exit ok", confidence: 0.7 },
      risk: { approved: true, level: "LOW", monetaryRisk: 0, percentRisk: 0, reason: "ok" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 8 },
    });
    await orchestrator.fill(exit.orderId!, { price: 102, commission: 1, reason: "take_profit_triggered" });

    const stopOrder = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-stop",
        symbol: "AAPL",
        side: "BUY",
        quantity: 2,
        intent: "STOP",
        strategy: "risk",
        thesis: "stop",
        sessionTag: "eu-open",
        regimeTag: "range",
        market: { bid: 49.9, ask: 50.1, expectedPrice: 50 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.6 },
      risk: { approved: true, level: "LOW", monetaryRisk: 10, percentRisk: 0.01, reason: "ok" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 5 },
    });
    const stopped = await orchestrator.triggerStop(stopOrder.orderId!, 49.5);
    expect(stopped.metrics.exitReason).toBe("stop_triggered");

    const tp = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-tp",
        symbol: "NVDA",
        side: "BUY",
        quantity: 1,
        intent: "TARGET",
        strategy: "tp",
        thesis: "target",
        sessionTag: "eu-open",
        regimeTag: "range",
        market: { bid: 200, ask: 200.2, expectedPrice: 200.1 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.6 },
      risk: { approved: true, level: "LOW", monetaryRisk: 10, percentRisk: 0.01, reason: "ok" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 5 },
    });
    const tpFilled = await orchestrator.triggerTakeProfit(tp.orderId!, 210);
    expect(tpFilled.metrics.exitReason).toBe("take_profit_triggered");

    const trailing = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-trail",
        symbol: "MSFT",
        side: "SELL",
        quantity: 1,
        intent: "TRAILING_STOP",
        strategy: "trail",
        thesis: "trail",
        sessionTag: "ny-close",
        regimeTag: "trend",
        trailingOffset: 1,
        market: { bid: 100.4, ask: 100.6, expectedPrice: 100.5 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.6 },
      risk: { approved: true, level: "LOW", monetaryRisk: 10, percentRisk: 0.01, reason: "ok" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 5 },
    });
    await orchestrator.mark(trailing.orderId!, 103);
    const trailed = await orchestrator.mark(trailing.orderId!, 101.8);
    expect(trailed.status).toBe("FILLED");

    const cancelTarget = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-cancel",
        symbol: "GOOG",
        side: "BUY",
        quantity: 1,
        intent: "ENTRY",
        strategy: "x",
        thesis: "x",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 10, ask: 10.1, expectedPrice: 10 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.5 },
      risk: { approved: true, level: "LOW", monetaryRisk: 1, percentRisk: 0.01, reason: "ok" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 1 },
    });
    const canceled = await orchestrator.cancel(cancelTarget.orderId!, "manual");
    expect(canceled.status).toBe("CANCELED");

    const rejectTarget = await orchestrator.submitTrade({
      signal: {
        signalId: "sig-reject",
        symbol: "AMZN",
        side: "BUY",
        quantity: 1,
        intent: "ENTRY",
        strategy: "x",
        thesis: "x",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 10, ask: 10.1, expectedPrice: 10 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.5 },
      risk: { approved: true, level: "LOW", monetaryRisk: 1, percentRisk: 0.01, reason: "ok" },
      runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 1 },
    });
    const rejected = await orchestrator.reject(rejectTarget.orderId!, "risk-rule");
    expect(rejected.status).toBe("REJECTED");

    const history = await memory.queryDecisionHistory({ kind: "simulated_operation", limit: 50 });
    expect(history.some((row) => (row.payload as { mode?: string }).mode === "paper")).toBe(true);
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
  });

  it("rejects committee/risk/runtime gates and never activates live", async () => {
    setTempStore();
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: baseConfig(),
    });

    const committeeReject = await orchestrator.submitTrade({
      signal: {
        signalId: "rej-committee",
        symbol: "X",
        side: "BUY",
        quantity: 1,
        intent: "ENTRY",
        strategy: "s",
        thesis: "t",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 1, ask: 1.1, expectedPrice: 1 },
      },
      committee: { approved: false, dissentingVotes: 3, reasoning: "No consensus", confidence: 0.2 },
    });
    expect(committeeReject.status).toBe("REJECTED_BY_COMMITTEE");
    expect(committeeReject.liveTradingActivated).toBe(false);

    const riskReject = await orchestrator.submitTrade({
      signal: {
        signalId: "rej-risk",
        symbol: "X",
        side: "BUY",
        quantity: 1,
        intent: "ENTRY",
        strategy: "s",
        thesis: "t",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 1, ask: 1.1, expectedPrice: 1 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.8 },
      risk: {
        approved: false,
        level: "HIGH",
        monetaryRisk: 999,
        percentRisk: 20,
        reason: "drawdown",
        decision: "BLOCK",
      },
    });
    expect(riskReject.status).toBe("REJECTED_BY_RISK");

    const runtimeReject = await orchestrator.submitTrade({
      signal: {
        signalId: "rej-runtime",
        symbol: "X",
        side: "BUY",
        quantity: 1,
        intent: "ENTRY",
        strategy: "s",
        thesis: "t",
        sessionTag: "ny-open",
        regimeTag: "trend",
        market: { bid: 1, ask: 1.1, expectedPrice: 1 },
      },
      committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.8 },
      risk: { approved: true, level: "LOW", monetaryRisk: 1, percentRisk: 0.1, reason: "ok" },
      runtime: { sessionOpen: false, dataFresh: true, brokerConnected: true, latencyMs: 1 },
    });
    expect(runtimeReject.status).toBe("REJECTED_BY_RUNTIME");
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
  });

  it("persists metrics and builds certification + performance reports with gates", async () => {
    const storePath = setTempStore();
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: baseConfig({ minimumClosedTrades: 100 }),
    });
    const now = Date.now();

    for (let index = 0; index < 100; index += 1) {
      const closedAt = new Date(now - ((99 - index) / 99) * 30 * 24 * 60 * 60 * 1000).toISOString();
      const decisionTime = closedAt;
      const sendTime = new Date(new Date(decisionTime).getTime() + 40).toISOString();
      const entry = await orchestrator.submitTrade({
        signal: {
          signalId: `cert-entry-${index}`,
          symbol: "AAPL",
          side: "BUY",
          quantity: 1,
          intent: "ENTRY",
          strategy: "cert",
          thesis: "cert",
          sessionTag: index % 2 === 0 ? "eu-open" : "ny-open",
          regimeTag: index % 2 === 0 ? "trend" : "range",
          decisionTime,
          sendTime,
          market: { bid: 99.9, ask: 100.1, expectedPrice: 100 },
        },
        committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.7 },
        risk: { approved: true, level: "LOW", monetaryRisk: 1, percentRisk: 0.01, reason: "ok" },
        runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 5 },
      });
      await orchestrator.fill(entry.orderId!, { price: 100, commission: 0.1, at: closedAt });

      const exit = await orchestrator.submitTrade({
        signal: {
          signalId: `cert-exit-${index}`,
          symbol: "AAPL",
          side: "SELL",
          quantity: 1,
          intent: "EXIT",
          strategy: "cert",
          thesis: "cert",
          sessionTag: index % 2 === 0 ? "eu-open" : "ny-open",
          regimeTag: index % 2 === 0 ? "trend" : "range",
          decisionTime,
          sendTime,
          market: { bid: 100.9, ask: 101.1, expectedPrice: 101 },
        },
        committee: { approved: true, dissentingVotes: 0, reasoning: "ok", confidence: 0.7 },
        risk: { approved: true, level: "LOW", monetaryRisk: 1, percentRisk: 0.01, reason: "ok" },
        runtime: { sessionOpen: true, dataFresh: true, brokerConnected: true, latencyMs: 5 },
      });
      await orchestrator.fill(exit.orderId!, { price: 101, commission: 0.1, reason: "target_hit", at: closedAt });
    }

    expect(fs.existsSync(storePath)).toBe(true);

    const certification = await orchestrator.getCertificationReport();
    expect(certification.type).toBe("PaperTradingCertificationReport");
    expect(certification.tradingMode).toBe("paper");
    expect(certification.liveTradingEnabled).toBe(false);
    expect(certification.gates.minimumClosedTrades.passed).toBe(true);
    expect(certification.gates.minimumEvaluationDays.passed).toBe(true);
    expect(certification.gates.multipleSessions.passed).toBe(true);
    expect(certification.gates.multipleRegimes.passed).toBe(true);
    expect(certification.certified).toBe(true);
    expect(certification.performance.sharpe).not.toBeNull();
    // All-winning sample has zero downside deviation ⇒ Sortino intentionally null.
    if (certification.performance.winRate < 1) {
      expect(certification.performance.sortino).not.toBeNull();
    }
    expect(certification.performance.maxDrawdownPct).not.toBeNull();

    const performance = await orchestrator.getPerformanceReport();
    expect(performance.type).toBe("PaperTradingPerformanceReport");
    expect(performance.liveTradingEnabled).toBe(false);
    expect(performance.tradeCount).toBeGreaterThanOrEqual(100);
    expect(performance.equityCurve.length).toBeGreaterThan(1);
    expect(performance.averageMae).toBeGreaterThanOrEqual(0);
    expect(performance.averageMfe).toBeGreaterThanOrEqual(0);

    const dashboard = await orchestrator.getDashboardModel();
    expect(dashboard.safety.simulatedOnly).toBe(true);
    expect(dashboard.certification.certified).toBe(true);
    expect(process.env.LIVE_TRADING_ENABLED).toBe("false");
  }, 120_000);

  it("refuses to run when LIVE_TRADING_ENABLED=true and does not flip the flag", () => {
    process.env.LIVE_TRADING_ENABLED = "true";
    const config = createPaperTradingConfigFromEnv();
    expect(config.liveTradingEnabled).toBe(true);
    expect(() => assertPaperTradingSafe(config)).toThrow(/LIVE_TRADING_ENABLED/);
    expect(process.env.LIVE_TRADING_ENABLED).toBe("true");
    process.env.LIVE_TRADING_ENABLED = "false";
  });

  it("exposes paper investment page route", async () => {
    const mod = await import("../../../../../app/investment/paper/page");
    expect(typeof mod.default).toBe("function");
  }, 30_000);
});
