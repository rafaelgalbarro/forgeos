import { describe, expect, it } from "vitest";
import {
  compoundMaxDrawdownPct,
  findLimitBuyFill,
  netPnlPctFromPrices,
  priorRange,
  simulateLongTrade,
  BT_MAKER,
  BT_TAKER,
} from "@/lib/trading/crypto/backtest-core";
import type { Bar } from "@/lib/brokers/kraken/market-store";

function bar(t: number, o: number, h: number, l: number, c: number): Bar {
  return { time: t, open: o, high: h, low: l, close: c, volume: 1 };
}

describe("backtest-core PnL", () => {
  it("+2% move → net ≈ +2% − maker − taker", () => {
    const entry = 100;
    const exit = 102;
    const net = netPnlPctFromPrices(entry, exit);
    const expected = (0.02 - BT_MAKER - BT_TAKER) * 100;
    expect(net).toBeCloseTo(expected, 6);
  });

  it("−3% stop → net ≈ −3% − fees", () => {
    const entry = 100;
    const exit = 97;
    const net = netPnlPctFromPrices(entry, exit);
    expect(net).toBeCloseTo((-0.03 - BT_MAKER - BT_TAKER) * 100, 6);
  });

  it("compound MaxDD capped at 100% and uses equity curve", () => {
    // Three −50% trades on compound: 100→50→25→12.5 → DD=87.5% from peak 100
    const dd = compoundMaxDrawdownPct([-50, -50, -50]);
    expect(dd).toBeGreaterThan(80);
    expect(dd).toBeLessThanOrEqual(100);
    // Additive bug would give 150 — must not
    expect(dd).toBeLessThan(100.0001);
  });

  it("simulateLongTrade: TP hit yields ~+2% gross before fees", () => {
    const bars: Bar[] = [
      bar(1, 100, 100.5, 99.5, 100),
      bar(2, 100, 100.2, 99.8, 100.1), // entry open
      bar(3, 100.1, 103, 100, 102), // hits TP 102
    ];
    const fill = simulateLongTrade({
      bars,
      entryBarIndex: 1,
      entryPrice: 100,
      stopLoss: 97,
      takeProfit: 102,
      maxBars: 10,
    });
    expect(fill).not.toBeNull();
    expect(fill!.exitKind).toBe("take_profit");
    expect(fill!.grossPct).toBeCloseTo(2, 5);
    expect(fill!.netPct).toBeCloseTo((0.02 - BT_MAKER - BT_TAKER) * 100, 5);
  });

  it("simulateLongTrade: stop hit yields ~−3% gross", () => {
    const bars: Bar[] = [
      bar(1, 100, 100.5, 99.5, 100),
      bar(2, 100, 100.2, 99.8, 100),
      bar(3, 100, 100.1, 96.5, 97),
    ];
    const fill = simulateLongTrade({
      bars,
      entryBarIndex: 1,
      entryPrice: 100,
      stopLoss: 97,
      takeProfit: 105,
      maxBars: 10,
    });
    expect(fill!.exitKind).toBe("stop");
    expect(fill!.grossPct).toBeCloseTo(-3, 5);
  });

  it("RANGE_GRID priorRange excludes signal bar; limit fills later", () => {
    const bars: Bar[] = [];
    for (let i = 0; i < 100; i++) {
      bars.push(bar(i * 900, 10, 10.1, 9.9, 10));
    }
    bars[10]!.high = 12;
    bars[20]!.low = 8;
    const sig = 50;
    const range = priorRange(bars, sig, 96);
    expect(range).not.toBeNull();
    expect(range!.hi).toBe(12);
    expect(range!.lo).toBe(8);
    // signal bar itself at high 15 must not enter range
    bars[sig]!.high = 15;
    const range2 = priorRange(bars, sig, 96);
    expect(range2!.hi).toBe(12);

    const limit = 8 + (12 - 8) / 3;
    // no fill until a later bar dips to limit
    bars[sig + 1]!.low = 9.5;
    expect(findLimitBuyFill(bars, sig, limit, 5)).toBeNull();
    bars[sig + 2]!.low = limit - 0.01;
    const fill = findLimitBuyFill(bars, sig, limit, 5);
    expect(fill?.entryBarIndex).toBe(sig + 2);
    expect(fill?.entryPrice).toBe(limit);
  });
});
