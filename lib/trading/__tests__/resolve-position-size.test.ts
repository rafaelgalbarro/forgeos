import { describe, expect, it, afterEach } from "vitest";
import { resolvePositionSize } from "@/src/core/trading/trading-engine";

describe("resolvePositionSize low capital", () => {
  const prevFrac = process.env.IBKR_FRACTIONAL_ENABLED;

  afterEach(() => {
    if (prevFrac === undefined) delete process.env.IBKR_FRACTIONAL_ENABLED;
    else process.env.IBKR_FRACTIONAL_ENABLED = prevFrac;
  });

  it("143.39$ cash @ 131.26$ → 1 share (C case 12/10)", () => {
    process.env.IBKR_FRACTIONAL_ENABLED = "false";
    const r = resolvePositionSize(
      { cashUSD: 143.39, availableFunds: 143.39, navUSD: 143.39 },
      131.26,
      0.84,
      { stopLossPrice: 131.26 * 0.98 }, // ~2% technical stop → ≤3% NAV
    );
    expect(r.qty).toBe(1);
    expect(r.usableCash).toBeCloseTo(143.39 * 0.8, 2);
  });

  it("100$ cash @ 131.26$ → 0 without fractional", () => {
    process.env.IBKR_FRACTIONAL_ENABLED = "false";
    const r = resolvePositionSize(
      { cashUSD: 100, availableFunds: 100, navUSD: 100 },
      131.26,
      0.84,
      { stopLossPrice: 131.26 * 0.98 },
    );
    expect(r.qty).toBe(0);
    expect(r.reason).toMatch(/95% cash|utilizable|precio/i);
  });

  it("100$ cash @ 131.26$ → fraction when IBKR_FRACTIONAL_ENABLED", () => {
    process.env.IBKR_FRACTIONAL_ENABLED = "true";
    const r = resolvePositionSize(
      { cashUSD: 100, availableFunds: 100, navUSD: 100 },
      131.26,
      0.84,
      { stopLossPrice: 131.26 * 0.99 },
    );
    expect(r.qty).toBeGreaterThan(0);
    expect(r.fractional).toBe(true);
    expect(r.qty * 131.26).toBeGreaterThanOrEqual(25);
    expect(r.qty * 131.26).toBeLessThanOrEqual(100 * 0.95);
  });

  it("143$ cash @ 200$ → fractional ~143/200 when IBKR_FRACTIONAL_ENABLED", () => {
    process.env.IBKR_FRACTIONAL_ENABLED = "true";
    const r = resolvePositionSize(
      { cashUSD: 143, availableFunds: 143, navUSD: 143 },
      200,
      0.75,
      { stopLossPrice: 200 * 0.98 },
    );
    expect(r.fractional).toBe(true);
    expect(r.qty).toBeGreaterThan(0.2);
    expect(r.qty).toBeLessThan(1);
    expect(r.qty * 200).toBeGreaterThanOrEqual(25);
    expect(r.qty * 200).toBeLessThanOrEqual(143 * 0.95);
    expect(r.reason).toMatch(/IBKR_FRACTIONAL|fracción/i);
  });

  it("blocks 1-share fallback when stop loss > 3% NAV", () => {
    process.env.IBKR_FRACTIONAL_ENABLED = "false";
    const r = resolvePositionSize(
      { cashUSD: 143.39, availableFunds: 143.39, navUSD: 143.39 },
      131.26,
      0.84,
      { stopLossPrice: 131.26 * 0.9 }, // ~10% stop on 1 share ≈ 9% NAV
    );
    expect(r.qty).toBe(0);
    expect(r.limitingRule).toBe("stop_nav");
  });
});
