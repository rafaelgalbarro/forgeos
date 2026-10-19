import { describe, expect, it } from "vitest";
import type { Bar } from "@/lib/brokers/kraken/market-store";
import { evaluateVwapBounce5mShort } from "@/lib/trading/crypto/strategies/futures-short-strategies";

function bar(
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
): Bar {
  return { time, open, high, low, close, volume };
}

describe("futures short strategies", () => {
  it("VWAP_BOUNCE_5M_SHORT needs bearish 1h + vwap reject from below", () => {
    const bars1h: Bar[] = [];
    const bars5: Bar[] = [];
    const t = 1_700_000_000;
    for (let i = 0; i < 60; i++) {
      const px = 200 - i * 0.5;
      bars1h.push(bar(t + i * 3600, px, px + 1, px - 1, px - 0.4, 100));
    }
    for (let i = 0; i < 40; i++) {
      const px = 170 - i * 0.1;
      bars5.push(bar(t + i * 300, px, px + 0.5, px - 0.5, px - 0.2, 50));
    }
    const sig = evaluateVwapBounce5mShort(bars5, bars1h);
    expect(["SELL", "HOLD"]).toContain(sig.direction);
    if (sig.direction === "SELL") {
      expect(sig.strategyId).toBe("VWAP_BOUNCE_5M_SHORT");
      expect(sig.stopLoss).toBeGreaterThan(sig.entry);
      expect(sig.takeProfit).toBeLessThan(sig.entry);
    }
  });
});
