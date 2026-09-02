import { describe, expect, it } from "vitest";
import {
  createInvestmentAnalysisService,
  ensureInvestmentDecision,
  ensureInvestmentReport,
  type MarketSignal,
  type MarketSnapshot,
  type PortfolioSnapshot,
} from "..";

function fixtureMarketSnapshot(): MarketSnapshot {
  return {
    capturedAt: "2026-07-30T09:00:00.000Z",
    regime: "transition",
    volatilityIndex: 48,
    liquidityIndex: 62,
    breadthIndex: 55,
    macroSignals: ["inflation easing", "earnings revision stable"],
    sources: ["macro-desk", "rates-monitor"],
  };
}

function fixturePortfolioSnapshot(): PortfolioSnapshot {
  return {
    capturedAt: "2026-07-30T09:00:00.000Z",
    baseCurrency: "USD",
    totalValue: 2500000,
    cashRatioPct: 12,
    positions: [
      {
        symbol: "NVDA",
        sector: "Technology",
        weightPct: 22,
        unrealizedPnlPct: 17,
        volatilityPct: 31,
        conviction: "high",
        thesis: "AI infrastructure demand remains resilient.",
      },
      {
        symbol: "XLP",
        sector: "Consumer Staples",
        weightPct: 14,
        unrealizedPnlPct: 4,
        volatilityPct: 13,
        conviction: "medium",
        thesis: "Defensive cashflow profile offsets macro drawdown risk.",
      },
    ],
    constraints: {
      maxSinglePositionPct: 25,
      maxDrawdownPct: 18,
      minCashPct: 8,
    },
    sources: ["portfolio-risk-engine"],
  };
}

function fixtureSignals(): readonly MarketSignal[] {
  return [
    {
      id: "sig-1",
      name: "Earnings Momentum",
      direction: "positive",
      strength: 0.72,
      timeframe: "3m",
      evidence: ["22/30 tracked names beat guidance midpoint."],
      source: "equity-research-feed",
    },
    {
      id: "sig-2",
      name: "Credit Spreads",
      direction: "negative",
      strength: 0.35,
      timeframe: "1m",
      evidence: ["HY spread widened by 24bps week-over-week."],
      source: "credit-monitor",
    },
  ];
}

describe("Investment Brain serialization", () => {
  it("produces a JSON-serializable investment decision", () => {
    const service = createInvestmentAnalysisService();
    const decision = service.analyze({
      marketSnapshot: fixtureMarketSnapshot(),
      portfolioSnapshot: fixturePortfolioSnapshot(),
      signals: fixtureSignals(),
    });

    ensureInvestmentDecision(decision);
    const serialized = JSON.stringify(decision);
    const parsed = JSON.parse(serialized) as typeof decision;

    expect(parsed.recommendation).toBe(decision.recommendation);
    expect(parsed.confidence).toBe(decision.confidence);
    expect(parsed.usedSources.length).toBeGreaterThan(0);
  });

  it("produces a JSON-serializable investment report", () => {
    const service = createInvestmentAnalysisService();
    const report = service.generateReport({
      marketSnapshot: fixtureMarketSnapshot(),
      portfolioSnapshot: fixturePortfolioSnapshot(),
      signals: fixtureSignals(),
    });

    ensureInvestmentReport(report);
    const serialized = JSON.stringify(report);
    const parsed = JSON.parse(serialized) as typeof report;

    expect(parsed.generatedAt).toBe(report.generatedAt);
    expect(parsed.decision.reasoning.length).toBeGreaterThan(0);
    expect(parsed.allocationProposal.adjustments.length).toBe(
      report.allocationProposal.adjustments.length,
    );
  });
});
