import { describe, expect, it, beforeEach } from "vitest";
import {
  buildAlphaEngineSnapshot,
  buildPostTradeReview,
  canEscalateToCommittee,
  computeAlphaScore,
  evaluateAlphaHardGates,
  getAlphaDedupeStore,
  gradeFromScore,
  proposalFromReview,
  resetAlphaDedupeStoreForTests,
} from "@/src/core/investment/alpha-engine";

describe("Alpha Engine", () => {
  beforeEach(() => {
    resetAlphaDedupeStoreForTests();
  });

  it("computes 0–100 multi-factor score", () => {
    const score = computeAlphaScore({
      signalQuality: 0.9,
      strategyConsensus: 0.8,
      agentConsensus: 0.7,
      marketContext: 0.75,
      riskPenalty: 0.2,
      liquidity: 0.8,
      spreadQuality: 0.85,
      portfolioCorrelationFit: 0.7,
      valuation: 0.6,
      trend: 0.8,
      fundamentals: 0.55,
      news: 0.5,
      macro: 0.5,
      sentiment: 0.6,
      dataFreshness: 0.9,
    });
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.signalQuality).toBeGreaterThan(0);
  });

  it("only A+/A escalate to committee", () => {
    expect(canEscalateToCommittee("A+")).toBe(true);
    expect(canEscalateToCommittee("A")).toBe(true);
    expect(canEscalateToCommittee("B")).toBe(false);
    expect(canEscalateToCommittee("REJECTED")).toBe(false);
    expect(gradeFromScore(90, 0.8, false)).toBe("A+");
    expect(gradeFromScore(90, 0.8, true)).toBe("REJECTED");
  });

  it("hard-gates delayed data and missing bid/ask", () => {
    const reasons = evaluateAlphaHardGates({
      dataQuality: "delayed",
      bid: null,
      ask: null,
      spreadPct: 1,
      maxSpreadPct: 0.3,
      liquidity: 0.1,
      minLiquidity: 0.35,
      marketOpen: false,
      contractResolved: false,
      riskExceedsLimits: true,
      expired: true,
      duplicate: true,
      cooldownActive: true,
      openPositionConflict: true,
    });
    expect(reasons).toContain("delayed-data");
    expect(reasons).toContain("missing-bid-ask");
    expect(reasons).toContain("market-closed");
  });

  it("hard-gates synthetic and missing price data", () => {
    for (const dataQuality of ["demo", "missing", "fresh"] as const) {
      const reasons = evaluateAlphaHardGates({
        dataQuality,
        bid: null,
        ask: null,
        spreadPct: null,
        maxSpreadPct: 0.3,
        liquidity: null,
        minLiquidity: 0.35,
        marketOpen: false,
        contractResolved: true,
        riskExceedsLimits: false,
        expired: false,
        duplicate: false,
        cooldownActive: false,
        openPositionConflict: false,
      });
      expect(reasons).toContain("non-real-data");
    }
  });

  it("dedupes by asset+strategy with cooldown", () => {
    const store = getAlphaDedupeStore();
    expect(store.isDuplicateOrCooling("AAPL", "momentum")).toBe(false);
    store.mark("AAPL", "momentum");
    expect(store.isDuplicateOrCooling("AAPL", "momentum")).toBe(true);
  });

  it("builds snapshot without submitting orders", () => {
    const snap = buildAlphaEngineSnapshot();
    expect(snap.mode).toBe("ANALYSIS_ONLY");
    expect(snap.liveTradingEnabled).toBe(false);
    expect(snap.ordersSubmitted).toBe(0);
    expect(snap.orderExecution).toBe("disabled");
    expect(snap.ibkrReadOnly).toBe(true);
    expect(snap.alphaRanking.length).toBeGreaterThan(0);
    expect(snap.rejectedOpportunities.some((o) => o.grade === "REJECTED")).toBe(true);
    expect(snap.integrations.strategyLab).toBeTruthy();
    expect(snap.integrations.investmentCommittee).toMatch(/A\+\/A/);
    expect(snap.integrations.riskEngine).toMatch(/A\+\/A/);
    expect(JSON.stringify(snap)).not.toMatch(/placeOrder|submitOrder/);
    for (const o of snap.alphaRanking.filter((item) => item.dataQuality === "demo")) {
      expect(o.entryEstimated).toBeNull();
      expect(o.stop).toBeNull();
      expect(o.target).toBeNull();
      expect(o.expectedReturnPct).toBeNull();
      expect(o.rejectReasons).toContain("non-real-data");
      expect(o.evidence).toContain("NO LIVE PRICE");
    }
    for (const o of snap.topOpportunities) {
      expect(["A+", "A"]).toContain(o.grade);
      expect(o.escalateToCommittee).toBe(true);
      expect(o.orderExecution).toBe("disabled");
    }
  });

  it("learning proposals never mutate production", () => {
    const snap = buildAlphaEngineSnapshot();
    const opp = snap.alphaRanking[0]!;
    const review = buildPostTradeReview(opp, {
      opportunityId: opp.id,
      actualEntry: (opp.entryEstimated ?? 100) * 1.01,
      actualExit: (opp.target ?? 105) * 0.99,
      actualReturnPct: 1.2,
      actualRiskPct: 2,
      slippageBps: 4,
      closedAt: new Date().toISOString(),
    });
    const proposal = proposalFromReview(review);
    expect(review.mutatesProduction).toBe(false);
    expect(proposal.mutatesProduction).toBe(false);
    expect(proposal.mustRevalidateVia).toContain("backtesting");
    expect(proposal.mustRevalidateVia).toContain("certification");
  });
});
