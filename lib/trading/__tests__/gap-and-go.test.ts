import { describe, expect, it } from "vitest";
import { gapVariants, nyMinutes, simulateGapDay, type Bar5 } from "@/lib/trading/gap-and-go";

// 2026-10-28 (EDT, UTC-4): 09:30 ET = 13:30 UTC
const open = Date.UTC(2026, 9, 28, 13, 30) / 1000;
const bar = (k: number, o: number, h: number, l: number, c: number, v = 100_000): Bar5 => ({ t: open + k * 300, o, h, l, c, v });

describe("gap & go", () => {
  it("09:30 ET maps to 570 minutes", () => {
    expect(nyMinutes(open)).toBe(570);
  });
  it("ORB5 breakout reaching 2R is a winner after costs", () => {
    const v = gapVariants().find((x) => x.id === "GAP10_ORB5_R2")!;
    const bars = [bar(0, 10, 10.5, 9.9, 10.4), bar(1, 10.4, 10.6, 10.35, 10.55), bar(2, 10.55, 12.0, 10.5, 11.9), bar(3, 11.9, 12, 11.8, 11.9)];
    const t = simulateGapDay({ day: "2026-10-28", code: "XYZ", gapPct: 0.2, hasNews: true, bars, v });
    expect(t?.reason).toBe("TP");
    expect(t!.netPct).toBeGreaterThan(5);
  });
  it("breakout that fails hits the opening-range low", () => {
    const v = gapVariants().find((x) => x.id === "GAP10_ORB5_R2")!;
    const bars = [bar(0, 10, 10.5, 9.9, 10.4), bar(1, 10.4, 10.6, 10.35, 10.45), bar(2, 10.45, 10.5, 9.8, 9.85), bar(3, 9.85, 9.9, 9.7, 9.8)];
    const t = simulateGapDay({ day: "2026-10-28", code: "XYZ", gapPct: 0.2, hasNews: false, bars, v });
    expect(t?.reason).toBe("SL");
    expect(t!.r).toBeLessThan(-1);
  });
  it("news-only variant skips gaps without news", () => {
    const v = gapVariants().find((x) => x.id === "GAP10_ORB5_R2_NEWS")!;
    const bars = [bar(0, 10, 10.5, 9.9, 10.4), bar(1, 10.4, 10.6, 10.35, 10.55), bar(2, 10.55, 12, 10.5, 11.9)];
    expect(simulateGapDay({ day: "d", code: "X", gapPct: 0.2, hasNews: false, bars, v })).toBeNull();
  });
});
