import { describe, expect, it } from "vitest";
import {
  FOREX_PAIRS,
  FOREX_MAX_UNITS,
  buildSlTpFromPips,
  clampForexUnits,
  getForexPair,
  getForexSessionSnapshot,
  pipSize,
  positionUnitsForRisk,
  priceToPips,
  spreadPips,
} from "@/lib/investment/forex";

describe("forex config — pairs & IBKR shape", () => {
  it("exposes exactly 9 IDEALPRO CASH pairs", () => {
    expect(FOREX_PAIRS).toHaveLength(9);
    for (const p of FOREX_PAIRS) {
      expect(p.secType).toBe("CASH");
      expect(p.exchange).toBe("IDEALPRO");
      expect(p.symbol.length).toBeGreaterThan(0);
      expect(p.currency.length).toBeGreaterThan(0);
    }
  });

  it("maps USDJPY to symbol USD / currency JPY", () => {
    const p = getForexPair("USDJPY");
    expect(p?.symbol).toBe("USD");
    expect(p?.currency).toBe("JPY");
    expect(p?.jpyQuoted).toBe(true);
    expect(pipSize(p!)).toBe(0.01);
  });

  it("maps EURUSD pip size to 0.0001", () => {
    expect(pipSize("EURUSD")).toBe(0.0001);
  });
});

describe("forex pip math", () => {
  it("converts EURUSD move to pips", () => {
    expect(priceToPips("EURUSD", 1.085, 1.087)).toBeCloseTo(20, 5);
  });

  it("converts USDJPY move to pips", () => {
    expect(priceToPips("USDJPY", 150.0, 150.2)).toBeCloseTo(20, 5);
  });

  it("builds BUY SL/TP with 20/40 pips", () => {
    const levels = buildSlTpFromPips({
      pair: "EURUSD",
      side: "BUY",
      entry: 1.1,
      stopPips: 20,
      tpPips: 40,
    });
    expect(levels).not.toBeNull();
    expect(levels!.stopLoss).toBeCloseTo(1.098, 5);
    expect(levels!.takeProfit).toBeCloseTo(1.104, 5);
    expect(levels!.riskReward).toBe(2);
  });

  it("sizes EURUSD with (risk/stopPips)*10000 then floors to 25k", () => {
    const pair = getForexPair("EURUSD")!;
    const sized = positionUnitsForRisk({
      nav: 750,
      riskPct: 1,
      stopPips: 20,
      pair,
      midPrice: 1.1,
    });
    expect(sized).not.toBeNull();
    expect(sized!.riskAmount).toBeCloseTo(7.5, 5);
    expect(sized!.rawUnits).toBe(3_750);
    expect(sized!.units).toBe(25_000);
  });

  it("caps units at 25k even on large NAV (never 500k broker ceiling)", () => {
    const pair = getForexPair("EURUSD")!;
    const sized = positionUnitsForRisk({
      nav: 100_000,
      riskPct: 2,
      stopPips: 20,
      pair,
      midPrice: 1.1,
    });
    expect(sized).not.toBeNull();
    expect(sized!.rawUnits).toBeGreaterThan(FOREX_MAX_UNITS);
    expect(sized!.units).toBe(FOREX_MAX_UNITS);
  });

  it("clampForexUnits floors to 25k and never exceeds 25k", () => {
    expect(clampForexUnits(3_750)).toBe(25_000);
    expect(clampForexUnits(5_000_000)).toBe(25_000);
    expect(clampForexUnits(25_000)).toBe(25_000);
  });

  it("measures spread in pips", () => {
    expect(spreadPips("EURUSD", 1.1000, 1.1002)).toBeCloseTo(2, 5);
  });
});

describe("forex sessions (Madrid)", () => {
  it("returns a snapshot with boolean flags", () => {
    const snap = getForexSessionSnapshot(new Date("2026-08-14T10:00:00.000Z"));
    expect(typeof snap.tradingWindowActive).toBe("boolean");
    expect(typeof snap.highLiquidity).toBe("boolean");
    expect(snap.label.length).toBeGreaterThan(0);
  });
});
