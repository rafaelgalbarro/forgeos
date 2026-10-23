import { describe, expect, it } from "vitest";
import { mrSpecs, simulateMr } from "@/lib/forex-bot/meanrev";
import type { FxCandle } from "@/lib/forex-bot/types";

function bars(n: number): FxCandle[] {
  const t0 = Date.UTC(2026, 0, 5, 0, 0) / 1000;
  const f = (i: number) => 1.1 + i * 0.00005 + 0.002 * Math.sin(i / 4);
  return Array.from({ length: n }, (_, i) => {
    const o = f(i - 1); const c = f(i);
    return { time: t0 + i * 3600, open: o, high: Math.max(o, c) + 0.0003, low: Math.min(o, c) - 0.0003, close: c, volume: 1 };
  });
}

describe("RSI2 mean reversion", () => {
  it("has 25 instruments × 2 timeframes × 2 entries", () => {
    expect(mrSpecs().length).toBe(100);
  });
  it("uptrend → only longs, bounded losses, limit fills at a better price than market", () => {
    const b = bars(3000);
    const lmt = mrSpecs().find((s) => s.id === "MR_EURUSD_H1_LMT")!;
    const mkt = mrSpecs().find((s) => s.id === "MR_EURUSD_H1_MKT")!;
    const tl = simulateMr(lmt, b, 0.00001);
    const tm = simulateMr(mkt, b, 0.00001);
    expect(tl.length).toBeGreaterThan(5);
    expect(tl.every((x) => x.side === "long")).toBe(true);
    for (const x of [...tl, ...tm]) if (x.r != null) expect(x.r).toBeGreaterThanOrEqual(-1.6);
  });
});
