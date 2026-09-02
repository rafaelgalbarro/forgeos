import { describe, expect, it } from "vitest";
import { createInvestmentAnalysisService, type InvestmentDecision } from "..";

describe("Investment Brain no-order contract", () => {
  it("exposes analysis methods only", () => {
    const service = createInvestmentAnalysisService();
    expect(typeof service.analyze).toBe("function");
    expect(typeof service.generateReport).toBe("function");
    expect("placeOrder" in service).toBe(false);
    expect("executeOrder" in service).toBe(false);
    expect("sendOrder" in service).toBe(false);
  });

  it("returns only recommendation payload fields", () => {
    const sampleDecision: InvestmentDecision = {
      recommendation: "hold",
      confidence: 0.66,
      reasoning: ["Signal conflict indicates wait-and-see setup."],
      risks: ["Liquidity remains uneven across sectors."],
      evidence: ["Market breadth at 52% with neutral momentum."],
      usedSources: ["market-dashboard"],
    };

    const keys = Object.keys(sampleDecision).sort();
    expect(keys).toEqual([
      "confidence",
      "evidence",
      "reasoning",
      "recommendation",
      "risks",
      "usedSources",
    ]);
  });
});
