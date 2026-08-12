import { describe, expect, it } from "vitest";
import type { AlphaOpportunity } from "@/src/core/investment/alpha-engine/domain/types";
import {
  buildOpportunityCenterFromAlpha,
  directionToSide,
  isHighQualityAlpha,
  mapAlphaToOpportunityCenterItem,
  OPPORTUNITY_CENTER_NO_DATA,
  OPPORTUNITY_QUALITY_FILTER,
  sortOpportunityCenterItems,
  type OpportunityCenterItem,
} from "@/lib/investment/opportunity-center";
import { researchDossierHref } from "@/lib/investment/research/deep-links";

function stubAlpha(overrides: Partial<AlphaOpportunity> & Pick<AlphaOpportunity, "id" | "asset" | "grade">): AlphaOpportunity {
  return {
    market: "stocks",
    direction: "long",
    strategy: "momentum",
    strategiesAgreeing: ["momentum"],
    agentsAgreeing: ["technical-analyst"],
    timeHorizon: "swing",
    entryEstimated: 100,
    stop: 95,
    target: 110,
    expectedReturnPct: 10,
    expectedRiskPct: 5,
    spread: 0.05,
    estimatedSlippage: 0.01,
    liquidity: 0.7,
    dataQuality: "fresh",
    confidence: 0.8,
    evidence: ["momentum: breakout confirmed", "news: earnings beat"],
    sources: ["opportunity-scanner"],
    portfolioImpact: "R:R ~2",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    detectedAt: new Date().toISOString(),
    score: 82,
    scoreBreakdown: {
      signalQuality: 80,
      strategyConsensus: 70,
      agentConsensus: 60,
      marketContext: 75,
      risk: 70,
      liquidity: 70,
      spread: 80,
      portfolioCorrelation: 70,
      valuation: 50,
      trend: 75,
      fundamentals: 55,
      news: 70,
      macro: 50,
      sentiment: 45,
      dataFreshness: 85,
      total: 82,
    },
    status: "top",
    whyDetected: "momentum on AAPL",
    risks: ["event"],
    thesisInvalidation: ["stop"],
    acceptOrRejectReason: "Accepted grade A",
    rejectReasons: [],
    escalateToCommittee: true,
    escalateToRisk: true,
    analysisOnly: true,
    orderExecution: "disabled",
    ...overrides,
  };
}

describe("opportunity center mapping", () => {
  it("maps direction to BUY/SELL/HOLD", () => {
    expect(directionToSide("long")).toBe("BUY");
    expect(directionToSide("short")).toBe("SELL");
    expect(directionToSide("neutral")).toBe("HOLD");
  });

  it("quality filter accepts only A+/A", () => {
    expect(isHighQualityAlpha(stubAlpha({ id: "1", asset: "AAPL", grade: "A" }))).toBe(true);
    expect(isHighQualityAlpha(stubAlpha({ id: "2", asset: "MSFT", grade: "A+" }))).toBe(true);
    expect(isHighQualityAlpha(stubAlpha({ id: "3", asset: "X", grade: "B", status: "ranked" }))).toBe(false);
    expect(OPPORTUNITY_QUALITY_FILTER.grades).toEqual(["A+", "A"]);
  });

  it("maps wired fields and keeps NO_DATA for missing probability/capital/volatility", () => {
    const item = mapAlphaToOpportunityCenterItem(
      stubAlpha({ id: "alpha-1", asset: "AAPL", grade: "A" }),
    );
    expect(item).not.toBeNull();
    expect(item!.activo).toBe("AAPL");
    expect(item!.researchHref).toBe(researchDossierHref("AAPL"));
    expect(item!.researchHref).toBe("/investment/research?symbol=AAPL");
    expect(item!.side).toBe("BUY");
    expect(item!.stopLoss).toBe(95);
    expect(item!.takeProfit).toBe(110);
    expect(item!.ratioRiesgoBeneficio).toBe(2);
    expect(item!.probabilidad).toBe(OPPORTUNITY_CENTER_NO_DATA);
    expect(item!.capitalRecomendado).toBe(OPPORTUNITY_CENTER_NO_DATA);
    expect(item!.volatilidad).toBe(OPPORTUNITY_CENTER_NO_DATA);
    expect(item!.details.find((d) => d.id === "minority")?.status).toBe("NO_DATA");
    expect(item!.details.find((d) => d.id === "resumen")?.status).toBe("wired");
    expect(item!.orderExecution).toBe("disabled");
  });

  it("rejects non A+/A when mapping", () => {
    expect(
      mapAlphaToOpportunityCenterItem(stubAlpha({ id: "b", asset: "X", grade: "B", status: "ranked" })),
    ).toBeNull();
  });

  it("sorts by confianza / rentabilidad / riesgo / liquidez / score", () => {
    const a = mapAlphaToOpportunityCenterItem(
      stubAlpha({ id: "a", asset: "A", grade: "A", confidence: 0.9, score: 70, expectedReturnPct: 5, expectedRiskPct: 8, liquidity: 0.4 }),
    )!;
    const b = mapAlphaToOpportunityCenterItem(
      stubAlpha({ id: "b", asset: "B", grade: "A+", confidence: 0.7, score: 90, expectedReturnPct: 12, expectedRiskPct: 3, liquidity: 0.9 }),
    )!;
    const items: OpportunityCenterItem[] = [a, b];

    expect(sortOpportunityCenterItems(items, "mayor_confianza")[0]!.id).toBe("a");
    expect(sortOpportunityCenterItems(items, "mayor_rentabilidad")[0]!.id).toBe("b");
    expect(sortOpportunityCenterItems(items, "menor_riesgo")[0]!.id).toBe("b");
    expect(sortOpportunityCenterItems(items, "mayor_liquidez")[0]!.id).toBe("b");
    expect(sortOpportunityCenterItems(items, "mayor_score")[0]!.id).toBe("b");
  });

  it("buildOpportunityCenterFromAlpha filters to A+/A only", () => {
    const list = buildOpportunityCenterFromAlpha(
      [
        stubAlpha({ id: "1", asset: "AAPL", grade: "A" }),
        stubAlpha({ id: "2", asset: "BAD", grade: "C", status: "ranked" }),
      ],
      null,
    );
    expect(list).toHaveLength(1);
    expect(list[0]!.activo).toBe("AAPL");
  });
});
