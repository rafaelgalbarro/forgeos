import { describe, expect, it } from "vitest";
import { dateAtLocal } from "@/lib/trading/exchange-hours";
import { planStocksCycleUniverse } from "@/lib/trading/stocks-cycle-focus";

describe("stocks-cycle-focus", () => {
  it("13:36 Madrid overlap — alternates EU vs US premarket", () => {
    const at = dateAtLocal("Europe/Madrid", 2026, 10, 14, 13, 36);
    const even = planStocksCycleUniverse(at, 0);
    const odd = planStocksCycleUniverse(at, 1);

    expect(even.includeEu).toBe(true);
    expect(even.includeUsPremarketAnalysis).toBe(false);
    expect(even.overlapFocus).toBe("EU");

    expect(odd.includeEu).toBe(false);
    expect(odd.includeUsPremarketAnalysis).toBe(true);
    expect(odd.overlapFocus).toBe("US_PREMARKET");
  });
});
