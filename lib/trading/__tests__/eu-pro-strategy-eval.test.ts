import { describe, expect, it } from "vitest";
import { dateAtLocal } from "@/lib/trading/exchange-hours";
import { getEquityStrategySession } from "@/lib/trading/equity-strategy-session";
import { evaluateEuEligibleStrategies } from "@/lib/trading/eu-pro-strategy-eval";

describe("eu-pro-strategy-eval", () => {
  it("SAN 13:30 Madrid Wed — all EU_STRATEGY_IDS evaluated", () => {
    const at = dateAtLocal("Europe/Madrid", 2026, 10, 14, 13, 30);
    const session = getEquityStrategySession("SAN", at);
    expect(session.regularSessionOpen).toBe(true);
    expect(session.eligibleStrategyIds.length).toBe(3);

    const { evaluated, hits } = evaluateEuEligibleStrategies({
      eligibleIds: session.eligibleStrategyIds,
      euLocal: true,
      phase: session.strategyPhase,
      price: 4.2,
      change1d: 1.2,
      relVol: 1.1,
      ema9: 4.15,
      ema20: 4.0,
      ema21: 4.05,
      ema50: 3.9,
      resistance: 4.3,
      support: 4.0,
      dayLow: 4.05,
      rsiVal: 52,
      reversalCandles: [],
    });

    expect(evaluated).toEqual([
      "EU_APERTURA_BREAKOUT",
      "EU_EMA21_PULLBACK",
      "EU_TREND_CONTINUATION",
    ]);
    expect(evaluated.length).toBe(3);
    expect(hits.some((h) => h.id === "EU_TREND_CONTINUATION")).toBe(true);
  });
});
