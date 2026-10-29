import { describe, expect, it } from "vitest";
import { backtestF40, evaluateF40, F40_RULES, f40Indicators } from "@/lib/forex-bot/forum40";
import type { FxCandle } from "@/lib/forex-bot/types";

function series(n: number): FxCandle[] {
  const t0 = Date.UTC(2026, 0, 5, 0, 0) / 1000;
  let p = 1.1;
  return Array.from({ length: n }, (_, i) => {
    const o = p;
    p = 1.1 + 0.02 * Math.sin(i / 37) + 0.008 * Math.sin(i / 7) + i * 0.000002;
    return { time: t0 + i * 3600, open: o, high: Math.max(o, p) + 0.0004, low: Math.min(o, p) - 0.0004, close: p, volume: 100 };
  });
}

describe("forum40 rules", () => {
  const bars = series(3000);
  it("every rule runs and returns bounded R", () => {
    for (const r of F40_RULES) {
      const t = backtestF40(r, bars, "H1", 0.0001);
      for (const q of t) expect(q.r).toBeGreaterThan(-1.6);
      expect(() => evaluateF40(r, "EUR_USD", "H1", bars, 0.0001)).not.toThrow();
    }
  });
  it("most rules produce trades on an oscillating series", () => {
    const withTrades = F40_RULES.filter((r) => backtestF40(r, bars, "H1", 0.0001).length > 0);
    expect(withTrades.length).toBeGreaterThanOrEqual(15);
  });
  it("indicators have the right length", () => {
    const x = f40Indicators(bars);
    expect(x.ao.length).toBe(bars.length);
    expect(x.adx.adx.filter((v) => v != null).length).toBeGreaterThan(2000);
  });
});
