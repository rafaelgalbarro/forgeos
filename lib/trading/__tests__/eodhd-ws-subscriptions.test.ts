import { describe, expect, it } from "vitest";
import {
  EODHD_WS_MAX_TICKERS,
  pickEodhdWsSubscriptionTickers,
  __resetEodhdWsClientForTests,
} from "@/lib/market-data/eodhd-ws-client";

describe("EODHD WS subscription cap", () => {
  it("caps at 50 tickers with shadow pending first", () => {
    __resetEodhdWsClientForTests();
    const candidates = Array.from({ length: 80 }, (_, i) => `T${i}`);
    const picked = pickEodhdWsSubscriptionTickers(candidates, EODHD_WS_MAX_TICKERS);
    expect(picked.length).toBe(50);
    expect(picked[0]).toBe("T0");
    expect(picked[49]).toBe("T49");
  });
});
