import { describe, expect, it } from "vitest";
import { ibkrCostGate, ibkrRoundTripCostPct } from "@/lib/trading/costs/ibkr-stock-costs";

describe("IBKR stock cost gate", () => {
  it("1 share of SMCI ($33) costs ~2% round trip and is blocked", () => {
    expect(ibkrRoundTripCostPct("USD", 1, 33)).toBeCloseTo(2, 5);
    expect(ibkrCostGate({ ccy: "USD", shares: 1, price: 33, targetPrice: 35 }).ok).toBe(false);
  });
  it("TEF 44 × €3.22 (~€2 per side) is blocked", () => {
    const g = ibkrCostGate({ ccy: "EUR", shares: 44, price: 3.22, targetPrice: 3.41 });
    expect(g.costPct).toBeGreaterThan(2.5);
    expect(g.ok).toBe(false);
  });
  it("a $300 US order with a +6% target passes", () => {
    expect(ibkrCostGate({ ccy: "USD", shares: 3, price: 100, targetPrice: 106 }).ok).toBe(true);
  });
  it("a €450 EU order passes", () => {
    expect(ibkrCostGate({ ccy: "EUR", shares: 10, price: 45, targetPrice: 47.7 }).ok).toBe(true);
  });
});
