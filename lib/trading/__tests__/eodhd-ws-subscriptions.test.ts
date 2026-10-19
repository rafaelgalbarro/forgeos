import { describe, expect, it } from "vitest";
import {
  EODHD_WS_MAX_TICKERS,
  pickEodhdWsSubscriptionTickers,
  __resetEodhdWsClientForTests,
} from "@/lib/market-data/eodhd-ws-client";
import { __resetPremarketShadowForTests } from "@/lib/trading/us-premarket";

describe("EODHD WS subscription cap", () => {
  it("caps at 45 US tickers (fixed universe + cycle candidates)", () => {
    __resetEodhdWsClientForTests();
    __resetPremarketShadowForTests();
    const candidates = Array.from({ length: 80 }, (_, i) => `T${i}`);
    const picked = pickEodhdWsSubscriptionTickers(candidates, EODHD_WS_MAX_TICKERS);
    expect(picked.length).toBe(45);
    expect(picked).toContain("AAPL");
  });

  it("excludes European EUR locals from WS subscription list", () => {
    const picked = pickEodhdWsSubscriptionTickers(["IBE", "AAPL", "SAN"]);
    expect(picked).toContain("AAPL");
    expect(picked).not.toContain("IBE");
    expect(picked).not.toContain("SAN");
  });
});
