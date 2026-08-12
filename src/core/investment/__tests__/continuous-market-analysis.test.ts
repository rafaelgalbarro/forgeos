import { describe, expect, it, beforeEach } from "vitest";
import {
  createDefaultAgentEcosystem,
  runAgentEcosystem,
  AGENT_MARKETS,
  AGENT_SPECIALTIES,
} from "../agent-ecosystem";
import type { InvestmentAnalysisContext } from "../domain/types";
import {
  ContinuousAnalysisRuntime,
  resetContinuousAnalysisRuntimeForTests,
} from "../continuous-analysis";
import {
  getStrategyActivationStore,
  resetStrategyActivationStoreForTests,
  createDefaultStrategyEngine,
  STRATEGY_IDS,
} from "../strategy";

const baseContext: InvestmentAnalysisContext = {
  asOf: "2026-08-04T00:00:00.000Z",
  symbol: "AAPL",
  market: { price: 190, volatility: 0.22, trend: 0.12 },
  signals: {
    macro: 0.2,
    fundamental: 0.3,
    technical: 0.25,
    quant: 0.15,
    news: -0.05,
    risk: -0.1,
    portfolioFit: 0.2,
    sentiment: 0.1,
    earnings: 0.18,
    institutionalFlows: 0.05,
    volatilitySpecialty: -0.05,
    correlations: 0,
    liquidity: 0.2,
    execution: 0.1,
  },
  notes: ["test"],
  marketDesk: "usa-equities",
};

describe("agent ecosystem", () => {
  it("registers specialty and market agents", () => {
    const registry = createDefaultAgentEcosystem({ cryptoAllowed: false });
    expect(registry.size()).toBeGreaterThanOrEqual(
      AGENT_SPECIALTIES.length + AGENT_MARKETS.length,
    );
    const specialties = registry.listRunners({ category: "specialty" });
    expect(specialties.length).toBe(AGENT_SPECIALTIES.length);
    const crypto = registry.get("market-crypto");
    expect(crypto?.definition.softDisabled).toBe(true);
  });

  it("runs agents into CIO committee with enriched decision fields", async () => {
    const result = await runAgentEcosystem({
      context: baseContext,
      marketDesk: "usa-equities",
    });
    expect(result.mode).toBe("ANALYSIS_ONLY");
    expect(result.orderExecution).toBe("disabled");
    expect(result.liveTradingEnabled).toBe(false);
    expect(result.autonomousLive).toBe("LOCKED");
    expect(result.conclusions.length).toBeGreaterThan(10);
    expect(result.committee.action).toMatch(/BUY|SELL|HOLD|REDUCE|EXIT/);
    expect(result.committee.explanation.length).toBeGreaterThan(10);
    expect(result.committee.risks.length).toBeGreaterThan(0);
    expect(result.committee.sourcesUsed.length).toBeGreaterThan(0);
    expect(result.committee.evidence.length).toBeGreaterThan(0);
    expect(result.committee.expectedPortfolioImpact.length).toBeGreaterThan(0);
    expect(result.committee.timeHorizon).toBeTruthy();
  });
});

describe("strategy activation", () => {
  beforeEach(() => {
    resetStrategyActivationStoreForTests();
  });

  it("defaults enabled and can disable", () => {
    const store = getStrategyActivationStore();
    expect(store.isEnabled("momentum")).toBe(true);
    store.setEnabled("momentum", false);
    expect(store.isEnabled("momentum")).toBe(false);
  });

  it("analyzeEnabled skips disabled strategies", () => {
    const engine = createDefaultStrategyEngine();
    const store = getStrategyActivationStore();
    store.setEnabled("momentum", false);
    const ctx = {
      symbol: "AAPL",
      price: 100,
      regime: "bullish" as const,
      capturedAt: "2026-08-04T00:00:00.000Z",
      returns: [0.01, 0.02],
    };
    const all = engine.analyzeAll(ctx);
    const enabled = engine.analyzeEnabled(ctx, (id) => store.isEnabled(id));
    expect(all.length).toBe(STRATEGY_IDS.length);
    expect(enabled.length).toBe(STRATEGY_IDS.length - 1);
    expect(enabled.some((a) => a.strategyId === "momentum")).toBe(false);
  });
});

describe("continuous analysis runtime", () => {
  beforeEach(() => {
    resetContinuousAnalysisRuntimeForTests();
    resetStrategyActivationStoreForTests();
  });

  it("runs an analysis-only cycle with scanner rows", async () => {
    const runtime = new ContinuousAnalysisRuntime({
      symbols: ["AAPL", "MSFT"],
      marketDesk: "usa-equities",
      pollIntervalMs: 60_000,
    });
    const result = await runtime.runCycle();
    expect(result.mode).toBe("ANALYSIS_ONLY");
    expect(result.orderExecution).toBe("disabled");
    expect(result.liveTradingEnabled).toBe(false);
    expect(result.autonomousLive).toBe("LOCKED");
    expect(result.goLive).toBe("NOT_READY_FOR_LIVE");
    expect(result.ibkrReadOnly).toBe(true);
    expect(result.miDataQuality).toBe("stub-signals");
    expect(result.symbolsScanned).toBe(2);
    expect(result.accepted.length + result.discarded.length).toBe(2);
    for (const row of [...result.accepted, ...result.discarded]) {
      expect(row.dataQuality).toBe("DEMO");
      expect(row.evidence).toContain("PRICE_QUALITY: DEMO · NO LIVE PRICE");
    }
    const snap = runtime.getSnapshot();
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.goLive).toBe("NOT_READY_FOR_LIVE");
  });

  it("refuses start when LIVE_TRADING_ENABLED=true", () => {
    const prev = process.env.LIVE_TRADING_ENABLED;
    process.env.LIVE_TRADING_ENABLED = "true";
    try {
      const runtime = new ContinuousAnalysisRuntime({ symbols: ["AAPL"] });
      const snap = runtime.start();
      expect(snap.status).toBe("error");
      expect(snap.lastError).toMatch(/LIVE_TRADING_ENABLED/);
    } finally {
      if (prev === undefined) delete process.env.LIVE_TRADING_ENABLED;
      else process.env.LIVE_TRADING_ENABLED = prev;
    }
  });
});
