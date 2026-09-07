import { describe, expect, it, beforeEach } from "vitest";
import {
  buildStrategyLabSnapshot,
  computeStrategyLabMetrics,
  demoTradeSamplesForStrategy,
  evaluateStrategyLabCertification,
  getStrategyLabVersionStore,
  proposeAiImprovements,
  resetStrategyLabVersionStoreForTests,
  runMonteCarloSimulation,
  STRATEGY_LAB_SECTIONS,
} from "@/src/core/investment/strategy-lab";

describe("Strategy Lab", () => {
  beforeEach(() => {
    resetStrategyLabVersionStoreForTests();
  });

  it("computes full metric suite from samples", () => {
    const trades = demoTradeSamplesForStrategy("momentum", 3);
    const metrics = computeStrategyLabMetrics(trades);
    expect(metrics.tradeCount).toBe(24);
    expect(typeof metrics.expectancy).toBe("number");
    expect(metrics.winRate === null || (metrics.winRate >= 0 && metrics.winRate <= 1)).toBe(true);
  });

  it("never allows live promotion in certification", () => {
    const metrics = computeStrategyLabMetrics(demoTradeSamplesForStrategy("trend-following"));
    const cert = evaluateStrategyLabCertification({
      strategyId: "trend-following",
      version: "1.0.0-lab",
      metrics,
      distinctSessions: 12,
      goLiveDecision: "NOT_READY_FOR_LIVE",
    });
    expect(cert.livePromotionAllowed).toBe(false);
    expect(cert.readiness).toBe("NOT_READY");
    expect(cert.criteria.some((c) => c.id === "SL08_GO_LIVE_GATE" && !c.passed)).toBe(true);
    expect(["FAIL", "INSUFFICIENT_SAMPLE", "BLOCKED_LIVE", "PASS"]).toContain(cert.verdict);
    // Even if metrics were strong, GO_LIVE gate keeps promotion blocked.
    expect(cert.livePromotionAllowed).toBe(false);
  });

  it("versions without overwriting history", () => {
    const store = getStrategyLabVersionStore();
    const metrics = computeStrategyLabMetrics(demoTradeSamplesForStrategy("value"));
    store.seedIfEmpty("value", "1.0.0", metrics);
    const v2 = store.commit({
      strategyId: "value",
      changeSummary: "tighten stops",
      metrics,
    });
    const list = store.list("value");
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((e) => e.status === "superseded")).toBe(true);
    expect(v2.productionMutable).toBe(false);
    expect(v2.version).not.toBe(list[0]?.version);
  });

  it("runs monte carlo without order path fields", () => {
    const mc = runMonteCarloSimulation({
      strategyId: "momentum",
      trades: demoTradeSamplesForStrategy("momentum"),
      simulations: 40,
    });
    expect(mc.simulations).toBe(40);
    expect(mc.medianFinalEquity).toBeGreaterThan(0);
    expect(JSON.stringify(mc)).not.toMatch(/placeOrder|submitOrder/);
  });

  it("AI improvements never mutate production", () => {
    const metrics = computeStrategyLabMetrics(demoTradeSamplesForStrategy("mean-reversion"));
    const imps = proposeAiImprovements("mean-reversion", metrics, "1.0.0-lab");
    expect(imps.length).toBeGreaterThan(0);
    expect(imps.every((i) => i.mutatesProduction === false)).toBe(true);
  });

  it("builds orchestrated snapshot with all sections and safety stamps", () => {
    const snap = buildStrategyLabSnapshot();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.goLive).toBe("NOT_READY_FOR_LIVE");
    expect(snap.productionMutation).toBe("forbidden");
    expect(snap.tradeDataLabel).toBe("DEMO");
    expect(snap.library.every((row) => row.metricsSource === "DEMO")).toBe(true);
    expect(snap.library.every((row) => row.metricsLabel === "INSUFFICIENT_SAMPLE")).toBe(true);
    expect(snap.library.every((row) => row.readiness === "NOT_READY")).toBe(true);
    expect(snap.ranking.every((row) => row.productionRankingEligible === false)).toBe(true);
    expect(snap.sections).toEqual([...STRATEGY_LAB_SECTIONS]);
    expect(snap.library.length).toBeGreaterThanOrEqual(10);
    expect(snap.ranking[0]?.rank).toBe(1);
    expect(snap.certifications.every((c) => c.livePromotionAllowed === false)).toBe(true);
    expect(snap.builder.mutatesCore).toBe(false);
    expect(snap.integrations.liveTrading).toMatch(/LOCKED/);
  });

  it("prefers PAPER trade source when provided", () => {
    const trades = demoTradeSamplesForStrategy("momentum");
    const snap = buildStrategyLabSnapshot({
      tradeSource: {
        label: "PAPER",
        byStrategy: new Map([["momentum", trades]]),
        distinctSessions: 3,
      },
    });
    expect(snap.tradeDataLabel).toBe("PAPER");
    expect(snap.distinctSessions).toBe(3);
    expect(snap.library.find((row) => row.strategyId === "momentum")?.metricsSource).toBe("PAPER");
    expect(
      snap.library.filter((row) => row.strategyId !== "momentum").every((row) => row.metricsSource === "DEMO"),
    ).toBe(true);
    expect(snap.integrations.paperTrading).toMatch(/paper closed trades/);
  });

  it("marks only adequate non-DEMO samples eligible for production ranking influence", () => {
    const trades = [
      ...demoTradeSamplesForStrategy("momentum"),
      ...demoTradeSamplesForStrategy("momentum", 2),
    ];
    const snap = buildStrategyLabSnapshot({
      tradeSource: {
        label: "PAPER",
        byStrategy: new Map([["momentum", trades]]),
        distinctSessions: 12,
      },
    });
    const momentum = snap.ranking.find((row) => row.strategyId === "momentum");

    expect(momentum?.metricsSource).toBe("PAPER");
    expect(momentum?.sampleSize).toBe(48);
    expect(momentum?.metricsLabel).toBe("PAPER");
    expect(momentum?.productionRankingEligible).toBe(true);
    expect(
      snap.ranking
        .filter((row) => row.metricsSource === "DEMO")
        .every((row) => row.productionRankingEligible === false),
    ).toBe(true);
  });
});
