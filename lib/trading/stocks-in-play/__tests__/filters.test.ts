import { describe, expect, it } from "vitest";
import {
  isAllowedUsListingExchange,
  isExcludedTickerSuffix,
  passesHardScreenerRow,
  passesHardSymbolRules,
} from "@/lib/trading/stocks-in-play/filters";

describe("stocks-in-play hard filters", () => {
  it("rejects OTC and W/R/U suffix tickers", () => {
    expect(isExcludedTickerSuffix("ABCDW")).toBe(true);
    expect(passesHardSymbolRules("VWAGY").ok).toBe(false);
    expect(isAllowedUsListingExchange("PINK")).toBe(false);
  });

  it("enforces spread <= 0.3%", () => {
    const r = passesHardScreenerRow(
      {
        symbol: "TEST",
        eodhdCode: "TEST.US",
        exchange: "NYSE",
        changePct: 5,
        volume: 2_000_000,
        avgVolume: 2_000_000,
        price: 25,
        marketCap: 500_000_000,
      },
      { spreadPct: 0.35 },
    );
    expect(r.ok).toBe(false);
  });
});
