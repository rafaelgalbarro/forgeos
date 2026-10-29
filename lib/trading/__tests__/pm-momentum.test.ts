import { describe, expect, it } from "vitest";
import { pmVariants, simulatePm } from "@/lib/trading/pm-momentum";
import type { Bar5 } from "@/lib/trading/gap-and-go";

// 2026-10-28 EDT: 08:00 ET = 12:00 UTC
const t8 = Date.UTC(2026, 9, 28, 12, 0) / 1000;
const b = (k: number, o: number, h: number, l: number, c: number, v = 50_000): Bar5 => ({ t: t8 - 3600 + k * 300, o, h, l, c, v });

describe("pm momentum", () => {
  it("buys at 08:00 a stock up 12% and takes +2%", () => {
    const v = pmVariants().find((x) => x.id === "PM8h_10_AT_TP2_SL1.5_X935")!;
    const bars: Bar5[] = [];
    for (let k = 0; k < 12; k += 1) bars.push(b(k, 11, 11.3, 10.9, 11.2)); // 07:00–07:55, prev close 10 → +12%
    bars.push(b(12, 11.2, 11.6, 11.15, 11.5)); // 08:00 bar: reaches +2% from 11.2*1.003
    const t = simulatePm({ day: "d", code: "X", prevClose: 10, bars, v });
    expect(t?.reason).toBe("TP");
    expect(t!.netPct).toBeGreaterThan(0);
  });
  it("skips stocks below the threshold", () => {
    const v = pmVariants().find((x) => x.id === "PM8h_10_AT_TP2_SL1.5_X935")!;
    const bars = Array.from({ length: 13 }, (_, k) => b(k, 10.3, 10.4, 10.2, 10.3));
    expect(simulatePm({ day: "d", code: "X", prevClose: 10, bars, v })).toBeNull();
  });
});
