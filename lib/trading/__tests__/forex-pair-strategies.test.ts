import { describe, expect, it } from "vitest";
import { backtestSpec, choosePairStrategy, computeIndicators, signalAt, specGrid, specStats } from "@/lib/forex-bot/pair-strategies";
import type { FxCandle } from "@/lib/forex-bot/types";

function series(n: number, f: (i: number) => number): FxCandle[] {
  const t0 = Date.UTC(2026, 0, 5, 0, 0) / 1000; // Monday
  return Array.from({ length: n }, (_, i) => {
    const c = f(i);
    const o = f(i - 1);
    return { time: t0 + i * 900, open: o, high: Math.max(o, c) + 0.0003, low: Math.min(o, c) - 0.0003, close: c, volume: 100 };
  });
}

describe("forex per-pair strategies", () => {
  it("grid has unique ids", () => {
    const g = specGrid();
    expect(new Set(g.map((s) => s.id)).size).toBe(g.length);
    expect(g.length).toBeGreaterThanOrEqual(20);
  });

  it("EMA cross fires long in an uptrend after a dip", () => {
    // long uptrend, a pullback that pushes EMA9 below EMA21, then recovery → bullish cross above EMA200
    const bars = series(600, (i) => 1.1 + i * 0.0002 + (i > 540 && i < 560 ? -(i - 540) * 0.0008 : i >= 560 ? -0.016 + (i - 560) * 0.0012 : 0));
    const ind = computeIndicators(bars);
    const s = specGrid().find((x) => x.family === "EMA_CROSS" && x.p.fast === 9)!;
    const sides = bars.map((_, i) => signalAt(s, ind, i)).filter(Boolean);
    expect(sides).toContain("long");
    expect(sides).not.toContain("short");
  });

  it("backtest returns R multiples bounded by stop/target", () => {
    const bars = series(4000, (i) => 1.1 + 0.01 * Math.sin(i / 40) + i * 0.00001);
    const ind = computeIndicators(bars);
    for (const s of specGrid().slice(0, 6)) {
      const t = backtestSpec(s, ind, "EUR_USD", 1);
      for (const x of t) {
        expect(x.r).toBeLessThanOrEqual(s.rr + 0.01);
        expect(x.r).toBeGreaterThanOrEqual(-1.5);
      }
      const st = specStats(t);
      expect(st.trades).toBe(t.length);
    }
  });

  it("choice reports a reason when nothing qualifies", () => {
    const flat = series(3000, () => 1.1);
    const c = choosePairStrategy("EUR_USD", flat, 1);
    expect(c.liveEligible).toBe(false);
    expect(c.reason.length).toBeGreaterThan(0);
  });
});
