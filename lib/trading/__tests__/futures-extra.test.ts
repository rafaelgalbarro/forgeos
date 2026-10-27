import { describe, expect, it } from "vitest";
import { evaluateFundingReversal, evaluateRsi2Trend, evaluateSeasonal22 } from "@/lib/trading/crypto/strategies/futures-extra";

const bars = (n: number, f: (i: number) => number, tf = 3600, t0 = 1_700_000_000) =>
  Array.from({ length: n }, (_, i) => ({ time: t0 + i * tf, open: f(i - 1), high: Math.max(f(i), f(i - 1)) + 1, low: Math.min(f(i), f(i - 1)) - 1, close: f(i), volume: 1 }));

describe("futures extra strategies", () => {
  it("seasonal fires only at 22:00 UTC on BTC/ETH/SOL", () => {
    const b = bars(100, (i) => 100 + i);
    const at22 = new Date(Date.UTC(2026, 9, 27, 22, 5));
    expect(evaluateSeasonal22("XBTEUR", b, at22)?.direction).toBe("BUY");
    expect(evaluateSeasonal22("ADAEUR", b, at22)).toBeNull();
    expect(evaluateSeasonal22("XBTEUR", b, new Date(Date.UTC(2026, 9, 27, 21, 5)))).toBeNull();
  });
  it("RSI2 trend: dip in uptrend → BUY with stop below and small target above", () => {
    const b = bars(300, (i) => (i < 297 ? 100 + i * 0.5 : 100 + 296 * 0.5 - (i - 296) * 6));
    const s = evaluateRsi2Trend("RSI2_TREND_1H", b, 3600, new Date((b[299]!.time + 3600) * 1000));
    expect(s?.direction).toBe("BUY");
    expect(s!.stopLoss).toBeLessThan(s!.entry);
    expect(s!.takeProfit).toBeGreaterThan(s!.entry);
  });
  it("funding reversal is contrarian", () => {
    const b = bars(100, (i) => 100 + i);
    const now = new Date((b[99]!.time + 3600) * 1000);
    expect(evaluateFundingReversal(b, 0.0005, now)?.direction).toBe("SELL");
    expect(evaluateFundingReversal(b, -0.0005, now)?.direction).toBe("BUY");
    expect(evaluateFundingReversal(b, 0.00001, now)).toBeNull();
  });
});
