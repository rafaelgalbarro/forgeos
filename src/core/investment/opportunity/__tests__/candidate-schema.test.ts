import { describe, expect, it } from "vitest";
import {
  deserializeOpportunityCandidate,
  ensureOpportunityCandidate,
  serializeOpportunityCandidate,
  type OpportunityCandidate,
} from "../domain";

function sampleCandidate(overrides: Partial<OpportunityCandidate> = {}): OpportunityCandidate {
  return {
    id: "cand-1",
    instrument: {
      id: "stk-aapl",
      symbol: "AAPL",
      assetClass: "stocks",
      market: "NASDAQ",
      currency: "USD",
      sector: "Technology",
      region: "US",
    },
    detection: "breakout",
    direction: "long",
    timeframe: "1h",
    score: 72.5,
    confidence: 0.81,
    evidence: [{ code: "breakout_level", detail: "price above range", weight: 0.8 }],
    risk: {
      level: "medium",
      factors: ["false_breakout"],
      maxAdverseMovePct: 1.8,
      liquidityRisk: 0.2,
      eventRisk: 0.25,
    },
    entryZone: { from: 190.1, to: 191.2 },
    stop: 187.5,
    target: 196.0,
    marketRegime: "bullish",
    expiry: "2026-07-30T16:00:00.000Z",
    detectedAt: "2026-07-30T12:00:00.000Z",
    analysisOnly: true,
    orderExecution: "disabled",
    ...overrides,
  };
}

describe("OpportunityCandidate schema", () => {
  it("validates required institutional fields", () => {
    const candidate = ensureOpportunityCandidate(sampleCandidate());
    expect(candidate.score).toBe(72.5);
    expect(candidate.confidence).toBe(0.81);
    expect(candidate.evidence).toHaveLength(1);
    expect(candidate.risk.level).toBe("medium");
    expect(candidate.entryZone.from).toBeLessThan(candidate.entryZone.to);
    expect(candidate.stop).toBeLessThan(candidate.entryZone.from);
    expect(candidate.target).toBeGreaterThan(candidate.entryZone.to);
    expect(candidate.marketRegime).toBe("bullish");
    expect(candidate.expiry).toBeTruthy();
    expect(candidate.analysisOnly).toBe(true);
    expect(candidate.orderExecution).toBe("disabled");
  });

  it("round-trips through JSON serialization", () => {
    const original = ensureOpportunityCandidate(sampleCandidate());
    const raw = serializeOpportunityCandidate(original);
    const parsed = deserializeOpportunityCandidate(raw);
    expect(parsed).toEqual(original);
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("rejects non-analysis or order-enabled candidates", () => {
    expect(() =>
      ensureOpportunityCandidate(
        sampleCandidate({ analysisOnly: false as unknown as true }),
      ),
    ).toThrow(/analysisOnly/);
    expect(() =>
      ensureOpportunityCandidate(
        sampleCandidate({ orderExecution: "enabled" as unknown as "disabled" }),
      ),
    ).toThrow(/orderExecution/);
  });
});
