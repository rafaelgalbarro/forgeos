import { describe, expect, it } from "vitest";
import { gatherScreener } from "@/lib/investment/screener-gather";
import { inspectScreenerFieldAvailability } from "@/lib/investment/screener-field-availability";
import { getAuditTimeline } from "@/lib/investment/audit-timeline";
import { evaluateStrategiesOffline } from "@/lib/investment/strategy-evaluation";
import { getPerformanceSnapshot } from "@/lib/investment/performance-snapshot";
import { getCommitteeReplaySnapshot } from "@/lib/investment/committee-replay";
import { getCommitteePanelSnapshot } from "@/lib/investment/committee-panel-snapshot";
import { COMMITTEE_SEATS, matchCommitteeSeat } from "@/lib/investment/committee-agents";
import { getRiskAlertsSnapshot } from "@/lib/investment/risk-alerts-snapshot";
import { getPaperShadowComparison } from "@/lib/investment/paper-shadow-comparison";
import { loadBenchmarkReturns, computeBenchmarkAnalytics, loadMultiBenchmarkReturns } from "@/lib/investment/benchmark-returns-loader";
import { evaluateStrategyReadinessHarness } from "@/lib/investment/strategy-readiness-harness";
import { resolvePortfolioMonitorProvider } from "@/lib/investment/portfolio-monitor-provider-factory";
import { getInvestmentSettingsSnapshot } from "@/lib/investment/settings-snapshot";
import { getIbkrMarketDataCapability } from "@/lib/investment/ibkr-market-data-capability";
import {
  brokerDataSourceForConnection,
  honestBrokerDataSource,
} from "@/lib/investment/dashboard-snapshot.types";
import { runStrategyBacktest } from "@/lib/investment/backtest-runner";
import { runWalkForwardBacktest } from "@/lib/investment/walk-forward-backtest";
import { probeGather } from "@/lib/investment/probe-gather";

describe("investment backlog helpers", () => {
  it("screener gather returns empty when no providers configured", async () => {
    const snap = await gatherScreener(["AAPL"], {});
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.empty).toBe(true);
    expect(snap.result).toBeNull();
    expect(snap.providersConfigured).toBe(0);
  });

  it("screener field availability stays NO_DATA without inventing assetClass/liquidity", () => {
    const fields = inspectScreenerFieldAvailability([]);
    expect(fields.assetClassExposed).toBe(false);
    expect(fields.liquidityExposed).toBe(false);
    expect(fields.note).toContain("NO_DATA");
  });

  it("audit timeline stays read-only ANALYSIS_ONLY and supports filters", async () => {
    const snap = await getAuditTimeline({ limit: 10 });
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(Array.isArray(snap.items)).toBe(true);
  });

  it("offline strategy evaluation is DEMO and NOT_READY", () => {
    const snap = evaluateStrategiesOffline({ symbol: "DEMO", regime: "bullish" });
    expect(snap.dataLabel).toBe("DEMO");
    expect(snap.strategyReadiness).toBe("NOT_READY");
    expect(snap.autonomousLive).toBe("LOCKED");
    expect(snap.orderExecution).toBe("disabled");
  });

  it("performance snapshot never enables live trading and labels PAPER/SHADOW/benchmark", async () => {
    const snap = await getPerformanceSnapshot();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.paper.label).toBe("PAPER");
    expect(snap.shadow.label).toBe("SHADOW");
    expect(["MI", "NO_DATA"]).toContain(snap.benchmark.label);
    expect(Array.isArray(snap.benchmarks)).toBe(true);
    expect(Array.isArray(snap.paper.bySymbol)).toBe(true);
    expect(Array.isArray(snap.shadow.byStrategy)).toBe(true);
  }, 60_000);

  it("benchmark loader stays NO_DATA without symbol/providers", async () => {
    const snap = await loadBenchmarkReturns({});
    expect(snap.label).toBe("NO_DATA");
    expect(snap.returnCount).toBe(0);
    const analytics = computeBenchmarkAnalytics([0.01, -0.02], []);
    expect(analytics.beta).toBeNull();
    expect(analytics.alpha).toBeNull();
    expect(analytics.correlation).toBeNull();
  });

  it("multi-benchmark loader stays graceful NO_DATA without symbols", async () => {
    const snap = await loadMultiBenchmarkReturns({});
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.primary.label).toBe("NO_DATA");
    expect(snap.series).toEqual([]);
  });

  it("extended analytics computes corr/TE/IR when history exists", () => {
    const analytics = computeBenchmarkAnalytics(
      [0.01, 0.02, -0.01, 0.015],
      [0.008, 0.018, -0.005, 0.01],
    );
    expect(analytics.beta).not.toBeNull();
    expect(analytics.correlation).not.toBeNull();
    expect(analytics.trackingError).not.toBeNull();
    expect(analytics.informationRatio).not.toBeNull();
  });

  it("committee replay is read-only ANALYSIS_ONLY", async () => {
    const snap = await getCommitteeReplaySnapshot(10);
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(typeof snap.totalUnfiltered).toBe("number");
  });

  it("committee replay analytics filter stays ANALYSIS_ONLY", async () => {
    const snap = await getCommitteeReplaySnapshot({ analytics: "present", limit: 10 });
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    for (const entry of snap.entries) {
      expect(entry.portfolioAnalyticsSummary).toBeTruthy();
    }
  });

  it("committee agent seats map ecosystem aliases without inventing scores", () => {
    expect(COMMITTEE_SEATS).toHaveLength(11);
    expect(matchCommitteeSeat("Institutional Flows Analyst")?.id).toBe("flow");
    expect(matchCommitteeSeat("Options Desk")?.id).toBe("options");
    expect(matchCommitteeSeat("specialty-macro")?.id).toBe("macro");
    expect(matchCommitteeSeat("Unknown Desk")).toBeNull();
  });

  it("committee panel lists all seats and stays ANALYSIS_ONLY", async () => {
    const panel = await getCommitteePanelSnapshot({ limit: 10 });
    expect(panel.mode).toBe("ANALYSIS_ONLY");
    expect(panel.orderExecution).toBe("disabled");
    expect(panel.liveTradingEnabled).toBe(false);
    expect(panel.agents).toHaveLength(11);
    expect(panel.agents.map((a) => a.label)).toEqual([
      "Macro Analyst",
      "Fundamental Analyst",
      "Technical Analyst",
      "Quant Analyst",
      "Sentiment Analyst",
      "News Analyst",
      "Flow Analyst",
      "Options Analyst",
      "Risk Manager",
      "Portfolio Manager",
      "Chief Investment Officer",
    ]);
    expect(panel.consenso.title).toBe("Consenso");
    expect(panel.disenso.title).toBe("Disenso");
    expect(panel.minorityReport.title).toBe("Minority Report");
    expect(panel.replay.mode).toBe("ANALYSIS_ONLY");
    for (const agent of panel.agents) {
      if (agent.state === "NO_DATA") {
        expect(agent.score).toBeNull();
        expect(agent.confidence).toBeNull();
      }
    }
  });

  it("risk alerts are dry-run and never enable live trading", async () => {
    const snap = await getRiskAlertsSnapshot();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(["DEMO", "IBKR_LIVE_READ_ONLY", "NO_DATA"]).toContain(snap.monitorLabel);
    for (const alert of snap.alerts) {
      expect(alert.dryRun).toBe(true);
    }
  }, 30_000);

  it("portfolio monitor factory labels DEMO without IBKR key", () => {
    const resolved = resolvePortfolioMonitorProvider({});
    expect(resolved.label).toBe("DEMO");
  });

  it("portfolio monitor factory prefers IBKR when key present", () => {
    const resolved = resolvePortfolioMonitorProvider({ IBKR_INTERNAL_API_KEY: "test" });
    expect(resolved.label).toBe("IBKR_LIVE_READ_ONLY");
  });

  it("paper vs shadow comparison stays ANALYSIS_ONLY", async () => {
    const snap = await getPaperShadowComparison();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.paper.label).toBe("PAPER");
    expect(snap.shadow.label).toBe("SHADOW");
  }, 60_000);

  it("backtest runner stays ANALYSIS_ONLY DEMO and never enables orders", async () => {
    const snap = await runStrategyBacktest({ symbol: "DEMO", regime: "bullish", env: {} });
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.strategyReadiness).toBe("NOT_READY");
    expect(snap.autonomousLive).toBe("LOCKED");
    expect(snap.dataLabel).toBe("DEMO");
    expect(snap.results.length).toBeGreaterThan(0);
  });

  it("walk-forward report stays ANALYSIS_ONLY with DEMO label", async () => {
    const snap = await runWalkForwardBacktest({
      symbol: "DEMO",
      regime: "bullish",
      windowSize: 4,
      stepSize: 2,
      env: {},
    });
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.strategyReadiness).toBe("NOT_READY");
    expect(snap.dataLabel).toBe("DEMO");
    expect(snap.windowCount).toBeGreaterThan(0);
    expect(snap.equityCurve.length).toBe(snap.windowCount);
    expect(snap.equityCurve[0]?.equity).toBeGreaterThan(0);
  });

  it("settings snapshot never exposes secret values", () => {
    const snap = getInvestmentSettingsSnapshot({
      FINNHUB_API_KEY: "super-secret-key",
      LIVE_TRADING_ENABLED: "false",
    });
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.ibkrReadOnly).toBe(true);
    expect(snap.autonomousLive).toBe("LOCKED");
    const finnhub = snap.keyPresence.find((k) => k.envName === "FINNHUB_API_KEY");
    expect(finnhub?.present).toBe(true);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain("super-secret-key");
    expect(snap.ibkrMarketData.status).toBe("READ_ONLY_ROUTE");
  });

  it("IBKR market-data capability documents read-only history route", () => {
    const snap = getIbkrMarketDataCapability();
    expect(snap.status).toBe("READ_ONLY_ROUTE");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.availableReadPaths).toContain("/api/ibkr/history");
    expect(snap.note).toContain("reqHistoricalData");
  });

  it("strategy readiness harness never unlocks GO_LIVE", async () => {
    const snap = await evaluateStrategyReadinessHarness();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.autonomousLive).toBe("LOCKED");
    expect(snap.goLiveDecision).toBe("NOT_READY_FOR_LIVE");
    expect(snap.unlockEligible).toBe(false);
    expect(snap.sampleGates.some((g) => g.id === "SR-NO-LIVE-UNLOCK")).toBe(true);
    expect(snap.sampleGates.some((g) => g.id === "SR-PAPER-SESSIONS")).toBe(true);
    expect(snap.sampleGates.some((g) => g.id === "SR-SHADOW-DAYS")).toBe(true);
  }, 60_000);

  it("probe gather returns counts only and never secrets", async () => {
    const snap = await probeGather(["AAPL"], { FINNHUB_API_KEY: "super-secret-key" });
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.autonomousLive).toBe("LOCKED");
    expect(typeof snap.counts.marketSnapshots).toBe("number");
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain("super-secret-key");
  });

  it("dashboard broker dataSource is never IBKR_LIVE_READ_ONLY while disconnected", () => {
    expect(brokerDataSourceForConnection(true)).toBe("IBKR_LIVE_READ_ONLY");
    expect(brokerDataSourceForConnection(false)).toBe("UNAVAILABLE");
    expect(honestBrokerDataSource("IBKR_LIVE_READ_ONLY", false)).toBe("UNAVAILABLE");
    expect(honestBrokerDataSource("IBKR_LIVE_READ_ONLY", true)).toBe("IBKR_LIVE_READ_ONLY");
    expect(honestBrokerDataSource("DEMO", false)).toBe("DEMO");
    expect(honestBrokerDataSource("CACHE", false)).toBe("CACHE");
    expect(honestBrokerDataSource(undefined, false)).toBe("UNAVAILABLE");
  });
});
