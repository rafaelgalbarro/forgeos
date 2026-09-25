import { describe, expect, it } from "vitest";
import {
  midFromBidAsk,
  resolveLimitPriceFromQuote,
  stockCurrentPrice,
} from "@/lib/trading/limit-price";

describe("live limit price", () => {
  it("uses mid when bid and ask exist", () => {
    expect(midFromBidAsk(10, 12)).toBe(11);
  });

  it("stocks prefer last as currentPrice, else mid", () => {
    expect(
      stockCurrentPrice({ bid: 10, ask: 12, last: 11.5, mid: 11 }),
    ).toBe(11.5);
    expect(
      stockCurrentPrice({ bid: 10, ask: 12, last: null, mid: 11 }),
    ).toBe(11);
  });

  it("FOREX BUY uses ask and SELL uses bid", () => {
    const quote = { bid: 1.084, ask: 1.086, last: 1.085, mid: 1.085 };
    expect(
      resolveLimitPriceFromQuote({ asset: "FOREX", side: "BUY", quote }),
    ).toBe(1.086);
    expect(
      resolveLimitPriceFromQuote({ asset: "FOREX", side: "SELL", quote }),
    ).toBe(1.084);
  });

  it("stocks ignore stale suggested when live last exists", () => {
    expect(
      resolveLimitPriceFromQuote({
        asset: "STK",
        side: "BUY",
        quote: { bid: 99, ask: 101, last: 100, mid: 100 },
        suggested: 90,
      }),
    ).toBe(100);
  });
});
