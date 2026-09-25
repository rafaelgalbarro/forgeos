import { describe, expect, it } from "vitest";
import {
  ChiefInvestmentOfficer,
  FundamentalAnalyst,
  MacroAnalyst,
  NewsAnalyst,
  PortfolioManager,
  QuantAnalyst,
  RiskManager,
  TechnicalAnalyst,
} from "../application";
import type {
  InvestmentAgent,
  InvestmentAgentResult,
  InvestmentAnalysisContext,
  InvestmentCommitteeDecision,
} from "../domain";

const baseContext: InvestmentAnalysisContext = {
  asOf: "2026-07-30T00:00:00.000Z",
  symbol: "FORGE",
  market: {
    price: 100,
    volatility: 0.2,
    trend: 0.15,
  },
  signals: {
    macro: 0.4,
    fundamental: 0.5,
    technical: 0.2,
    quant: 0.3,
    news: -0.1,
    risk: -0.2,
    portfolioFit: 0.25,
  },
  notes: ["fixture-context"],
};

function buildAnalysts(): InvestmentAgent[] {
  return [
    new MacroAnalyst(),
    new FundamentalAnalyst(),
    new TechnicalAnalyst(),
    new QuantAnalyst(),
    new NewsAnalyst(),
    new RiskManager(),
    new PortfolioManager(),
  ];
}

describe("investment committee", () => {
  it("every agent implements analyze() and required fields", () => {
    const agents = buildAnalysts();

    for (const agent of agents) {
      const result = agent.analyze(baseContext) as InvestmentAgentResult;
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reasoning");
      expect(result).toHaveProperty("sources");
      expect(result.score).toHaveProperty("buy");
      expect(result.score).toHaveProperty("sell");
      expect(result.score).toHaveProperty("hold");
      expect(Array.isArray(result.sources)).toBe(true);
    }

    const cio = new ChiefInvestmentOfficer();
    const cioResult = cio.analyze({
      ...baseContext,
      subordinateResults: agents.map((agent) => agent.analyze(baseContext) as InvestmentAgentResult),
    });
    expect(cioResult).toHaveProperty("score");
    expect(cioResult).toHaveProperty("confidence");
    expect(cioResult).toHaveProperty("reasoning");
    expect(cioResult).toHaveProperty("sources");
  });

  it("CIO aggregates subordinate outputs without touching market data", () => {
    const cio = new ChiefInvestmentOfficer();
    const subordinateResults = buildAnalysts().map((agent) => agent.analyze(baseContext) as InvestmentAgentResult);

    const guardedContext: InvestmentAnalysisContext = {
      ...baseContext,
      get market() {
        throw new Error("CIO must not consume market data directly.");
      },
      subordinateResults,
    };

    expect(() => cio.analyze(guardedContext)).not.toThrow();
  });

  it("aggregation produces buy/sell/hold, confidence, and enriched metadata", () => {
    const cio = new ChiefInvestmentOfficer();
    const subordinateResults = buildAnalysts().map((agent) => agent.analyze(baseContext) as InvestmentAgentResult);
    const decision = cio.aggregate(subordinateResults);

    expect(decision.buy_score).toBeGreaterThanOrEqual(0);
    expect(decision.sell_score).toBeGreaterThanOrEqual(0);
    expect(decision.hold_score).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeGreaterThan(0);
    expect(["BUY", "SELL", "HOLD"]).toContain(decision.consensus);
    expect(["BUY", "SELL", "HOLD", "REDUCE", "EXIT"]).toContain(decision.action);
    expect(decision.explanation.length).toBeGreaterThan(0);
    expect(decision.risks.length).toBeGreaterThan(0);
    expect(decision.sourcesUsed.length).toBeGreaterThan(0);
    expect(decision.evidence.length).toBeGreaterThan(0);
    expect(decision.expectedPortfolioImpact.length).toBeGreaterThan(0);
    expect(decision.timeHorizon).toBeTruthy();
  });

  it("derives dissent and minority report under disagreement", () => {
    const cio = new ChiefInvestmentOfficer();
    const subordinateResults: InvestmentAgentResult[] = [
      {
        agent: "Macro Analyst",
        score: { buy: 0.8, sell: 0.1, hold: 0.1 },
        confidence: 0.8,
        reasoning: "pro-growth",
        sources: ["m1"],
      },
      {
        agent: "Fundamental Analyst",
        score: { buy: 0.7, sell: 0.2, hold: 0.1 },
        confidence: 0.85,
        reasoning: "undervalued",
        sources: ["f1"],
      },
      {
        agent: "Risk Manager",
        score: { buy: 0.1, sell: 0.8, hold: 0.1 },
        confidence: 0.9,
        reasoning: "downside skew",
        sources: ["r1"],
      },
    ];

    const decision = cio.aggregate(subordinateResults);
    expect(decision.dissent).toBeGreaterThan(0);
    expect(decision.minority_report.length).toBeGreaterThan(0);
  });

  it("committee decision stays JSON serializable", () => {
    const cio = new ChiefInvestmentOfficer();
    const subordinateResults = buildAnalysts().map((agent) => agent.analyze(baseContext) as InvestmentAgentResult);
    const decision = cio.aggregate(subordinateResults);

    const serialized = JSON.stringify(decision);
    const parsed = JSON.parse(serialized) as InvestmentCommitteeDecision;
    expect(parsed).toEqual(decision);
  });
});
