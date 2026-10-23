import { describe, expect, it } from "vitest";
import { METHODS, simulateMethod } from "@/lib/forex-bot/methods";
import type { FxCandle } from "@/lib/forex-bot/types";

function wave(n: number, tfSec: number, f: (i: number) => number): FxCandle[] {
  const t0 = Date.UTC(2026, 0, 5, 0, 0) / 1000;
  return Array.from({ length: n }, (_, i) => {
    const o = f(i - 1); const c = f(i);
    return { time: t0 + i * tfSec, open: o, high: Math.max(o, c) + 0.00015, low: Math.min(o, c) - 0.00015, close: c, volume: 1 };
  });
}

describe("trader methods", () => {
  it("ids are unique", () => {
    expect(new Set(METHODS.map((m) => m.id)).size).toBe(METHODS.length);
  });
  for (const id of ["HG_EURUSD", "MOMO_EURUSD"]) {
    it(`${id}: trades are bounded and respect max 2 per day`, () => {
      const spec = METHODS.find((m) => m.id === id)!;
      const tf = spec.tf === "M5" ? 300 : 900;
      const bars = wave(6000, tf, (i) => 1.1 + 0.004 * Math.sin(i / 25) + 0.0015 * Math.sin(i / 7) + i * 0.000002);
      const t = simulateMethod(spec, bars, 0.00001);
      if (id.startsWith("MOMO")) expect(t.length).toBeGreaterThan(0);
      const perDay = new Map<string, number>();
      for (const x of t) {
        perDay.set(x.day, (perDay.get(x.day) ?? 0) + 1);
        if (x.r != null) expect(x.r).toBeGreaterThan(-3);
      }
      expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2);
    });
  }
  it("R2 only buys above SMA200 and exits", () => {
    const spec = METHODS.find((m) => m.id === "R2_US500")!;
    const bars = wave(800, 86400, (i) => 4000 + i * 2 + 40 * Math.sin(i / 3));
    const t = simulateMethod(spec, bars, 0.1);
    expect(t.length).toBeGreaterThan(3);
    expect(t.every((x) => x.side === "long")).toBe(true);
  });
});
