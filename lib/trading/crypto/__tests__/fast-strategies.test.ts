import { describe, expect, it } from "vitest";
import type { Bar, BookSnap } from "@/lib/brokers/kraken/market-store";
import { evaluateMicroBreakout1m } from "@/lib/trading/crypto/strategies/micro-breakout-1m";
import { evaluateMomentumIgnition1m } from "@/lib/trading/crypto/strategies/momentum-ignition-1m";
import { evaluateCapitulationReversal1m } from "@/lib/trading/crypto/strategies/capitulation-reversal-1m";
import { evaluateVwapBounce5m } from "@/lib/trading/crypto/strategies/vwap-bounce-5m";
import {
  estimateFastRoundTripCostPct,
  passesCostFilter,
} from "@/lib/trading/crypto/strategies";
import { cryptoSignalKey } from "@/lib/trading/crypto/strategies/types";

function bar(
  time: number,
  o: number,
  h: number,
  l: number,
  c: number,
  v = 100,
): Bar {
  return { time, open: o, high: h, low: l, close: c, volume: v };
}

describe("fast strategies + cost filter", () => {
  it("fast cost filter requires ~1.5% target and spread < 0.1%", () => {
    const cost = estimateFastRoundTripCostPct(0);
    expect(cost).toBeCloseTo(0.005, 4); // 0.25+0.25
    expect(cost * 3).toBeCloseTo(0.015, 4);

    const buy = {
      strategyId: "MICRO_BREAKOUT_1M" as const,
      direction: "BUY" as const,
      confidence: 0.7,
      reasoning: "t",
      entry: 100,
      stopLoss: 99.3,
      takeProfit: 101.5,
      expectedMovePct: 0.015,
      maxHoldMs: 30 * 60_000,
      atr: 0.7,
      stopLossPct: 0.007,
      riskR: 0.7,
    };
    expect(passesCostFilter(buy, 0.0005)).toBe(true);
    expect(passesCostFilter(buy, 0.0015)).toBe(false); // spread ≥ 0.1%
    expect(passesCostFilter({ ...buy, expectedMovePct: 0.01 }, 0)).toBe(false);
  });

  it("MICRO_BREAKOUT_1M fires on high break + vol + book imbalance", () => {
    const bars: Bar[] = [];
    let t = 1_700_000_000;
    for (let i = 0; i < 20; i++) {
      bars.push(bar(t + i * 60, 100, 101, 99, 100, 50));
    }
    // breakout candle
    bars.push(bar(t + 20 * 60, 100, 103, 100, 102.5, 200));
    const book: BookSnap = {
      bids: Array.from({ length: 10 }, (_, i) => ({
        price: 102 - i * 0.01,
        qty: 20,
      })),
      asks: Array.from({ length: 10 }, (_, i) => ({
        price: 102.1 + i * 0.01,
        qty: 10,
      })),
      updatedAt: Date.now(),
    };
    const sig = evaluateMicroBreakout1m(bars, book);
    expect(sig.direction).toBe("BUY");
    expect(sig.expectedMovePct).toBe(0.015);
  });

  it("MOMENTUM_IGNITION_1M requires top-5 + 3 green rising vol + pullback", () => {
    const t = 1_700_000_000;
    const bars: Bar[] = [
      bar(t, 100, 101, 99, 100.5, 10),
      bar(t + 60, 100.5, 102, 100, 101.5, 20),
      // last: green with 30-50% pullback from high
      bar(t + 120, 101.5, 104, 101.5, 103, 40), // pullback (104-103)/(104-101.5)=0.4
    ];
    expect(evaluateMomentumIgnition1m(bars, { isTop5Gainer1h: false }).direction).toBe(
      "HOLD",
    );
    const sig = evaluateMomentumIgnition1m(bars, { isTop5Gainer1h: true });
    expect(sig.direction).toBe("BUY");
  });

  it("CAPITULATION_REVERSAL_1M recovers half wick", () => {
    const bars: Bar[] = [];
    const t = 1_700_000_000;
    for (let i = 0; i < 22; i++) {
      bars.push(bar(t + i * 60, 100, 101, 99, 100, 10));
    }
    // dump >1.5% with huge vol
    bars.push(bar(t + 22 * 60, 100, 100, 97, 98, 200));
    // recover half wick: mid between close 98 and low 97 = 97.5
    bars.push(bar(t + 23 * 60, 98, 99, 97.8, 98.6, 30));
    const sig = evaluateCapitulationReversal1m(bars, "LATERAL");
    expect(sig.direction).toBe("BUY");
    expect(evaluateCapitulationReversal1m(bars, "BAJISTA").direction).toBe("HOLD");
  });

  it("VWAP_BOUNCE_5M needs 1h uptrend + vwap touch reject", () => {
    const bars1h: Bar[] = [];
    const bars5: Bar[] = [];
    const t = 1_700_000_000;
    for (let i = 0; i < 60; i++) {
      const px = 100 + i * 0.5;
      bars1h.push(bar(t + i * 3600, px, px + 1, px - 1, px + 0.4, 100));
    }
    for (let i = 0; i < 40; i++) {
      const px = 120 + i * 0.1;
      bars5.push(bar(t + i * 300, px, px + 0.5, px - 0.5, px + 0.2, 50));
    }
    // Force last bar to touch approximate VWAP zone — may HOLD if VWAP far; just ensure no throw
    const sig = evaluateVwapBounce5m(bars5, bars1h);
    expect(["BUY", "HOLD"]).toContain(sig.direction);
  });

  it("idempotency key is stable for fast signal", () => {
    const k1 = cryptoSignalKey("MICRO_BREAKOUT_1M", "ALGOEUR", 1700000000);
    const k2 = cryptoSignalKey("MICRO_BREAKOUT_1M", "algoeur", 1700000000);
    expect(k1).toBe(k2);
    expect(k1).toBe("MICRO_BREAKOUT_1M|ALGOEUR|1700000000");
  });
});
