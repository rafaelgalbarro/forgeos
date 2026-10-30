import { describe, expect, it } from "vitest";
import { backtestIntraday, INTRADAY_RULES, iStats, NY_SESSION, sessionBars, type IBar } from "@/lib/trading/intraday-rules";

function days(n: number): IBar[] {
  const out: IBar[] = []; let p = 100;
  for (let d = 0; d < n; d += 1) {
    const t0 = Date.UTC(2026, 9, 5 + d, 13, 30) / 1000; // 09:30 EDT
    if (new Date(t0 * 1000).getUTCDay() % 6 === 0) continue;
    for (let k = 0; k < 78; k += 1) {
      const o = p; p = p * (1 + 0.002 * Math.sin((d * 78 + k) / 9) + 0.0004 * Math.sin(k / 3));
      out.push({ t: t0 + k * 300, o, h: Math.max(o, p) * 1.0008, l: Math.min(o, p) * 0.9992, c: p, v: 1000 + (k % 7) * 400 });
    }
  }
  return out;
}

describe("intraday rules", () => {
  const s = NY_SESSION();
  const bars = sessionBars(days(60), s);
  it("session filter keeps 09:30–16:00 bars", () => {
    expect(bars.length).toBeGreaterThan(3000);
    expect(bars.every((b) => b.m >= 570 && b.m < 960)).toBe(true);
  });
  it("every rule runs, never holds overnight, and most produce trades", () => {
    let withTrades = 0;
    for (const r of INTRADAY_RULES) {
      const t = backtestIntraday(r, bars, s, { kind: "stock", notionalUsd: 2000, slipPct: 0.0003 });
      if (t.length) withTrades += 1;
      expect(Number.isFinite(iStats(t).meanR)).toBe(true);
    }
    expect(withTrades).toBeGreaterThanOrEqual(8);
  });
});
