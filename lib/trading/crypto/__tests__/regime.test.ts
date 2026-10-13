import { describe, expect, it } from "vitest";
import {
  classifyRawRegime,
  pctChangeVsBarsAgo,
  type RegimeClassifyInputs,
} from "@/lib/trading/crypto/regime";

function base(over: Partial<RegimeClassifyInputs> = {}): RegimeClassifyInputs {
  return {
    ema20_4h: 100,
    ema50_4h: 100,
    ema200_1h: 100,
    price: 100,
    btcRet24hPct: 0,
    btcRet4hPct: 0,
    ...over,
  };
}

describe("classifyRawRegime decline_confirm", () => {
  it("ALCISTA when EMA20>EMA50 4h and price>EMA200 1h", () => {
    expect(
      classifyRawRegime(
        base({ ema20_4h: 110, ema50_4h: 100, ema200_1h: 90, price: 105 }),
        "decline_confirm",
      ),
    ).toBe("ALCISTA");
  });

  it("structural bear without live decline → LATERAL (not BAJISTA)", () => {
    expect(
      classifyRawRegime(
        base({
          ema20_4h: 90,
          ema50_4h: 100,
          ema200_1h: 110,
          price: 100,
          btcRet24hPct: 0.42,
          btcRet4hPct: 0.1,
        }),
        "decline_confirm",
      ),
    ).toBe("LATERAL");
  });

  it("structural bear + BTC 24h < -1.5% → BAJISTA", () => {
    expect(
      classifyRawRegime(
        base({
          ema20_4h: 90,
          ema50_4h: 100,
          ema200_1h: 110,
          price: 100,
          btcRet24hPct: -1.6,
          btcRet4hPct: 0,
        }),
        "decline_confirm",
      ),
    ).toBe("BAJISTA");
  });

  it("structural bear + BTC 4h < -1% → BAJISTA", () => {
    expect(
      classifyRawRegime(
        base({
          ema20_4h: 90,
          ema50_4h: 100,
          ema200_1h: 110,
          price: 100,
          btcRet24hPct: 0,
          btcRet4hPct: -1.1,
        }),
        "decline_confirm",
      ),
    ).toBe("BAJISTA");
  });

  it("legacy still flags BAJISTA on EMA alone", () => {
    expect(
      classifyRawRegime(
        base({
          ema20_4h: 90,
          ema50_4h: 100,
          ema200_1h: 110,
          price: 100,
          btcRet24hPct: 0.5,
          btcRet4hPct: 0.2,
        }),
        "legacy",
      ),
    ).toBe("BAJISTA");
  });
});

describe("pctChangeVsBarsAgo", () => {
  it("computes 24-bar return", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    // last=129, 24 ago=105 → (129-105)/105
    expect(pctChangeVsBarsAgo(closes, 24)).toBeCloseTo(((129 - 105) / 105) * 100, 6);
  });
});
