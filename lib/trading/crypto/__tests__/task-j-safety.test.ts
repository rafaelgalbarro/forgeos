import { describe, expect, it, vi } from "vitest";
import {
  applyStopDistanceCap,
  shadowExitFeesEur,
  shadowSimQty,
  isShadowStatsValid,
} from "@/lib/trading/crypto/signal-guards";
import { passesCostFilter } from "@/lib/trading/crypto/strategies/index";
import type { CryptoStrategySignal } from "@/lib/trading/crypto/strategies/types";
import { isLegacyOrphanTicker } from "@/lib/trading/forgeos-owned";
import { isOrphanTickerSuffix } from "@/src/core/trading/untradeable-tickers";

vi.mock("@/lib/trading/crypto/config", () => ({
  cryptoLiveMaxNotionalEur: () => 10,
}));

vi.mock("@/lib/trading/crypto/fee-schedule", () => ({
  getMakerFeePct: () => 0.004,
  getTakerFeePct: () => 0.008,
}));

function buySig(partial: Partial<CryptoStrategySignal>): CryptoStrategySignal {
  return {
    strategyId: "VWAP_BOUNCE_5M",
    direction: "BUY",
    confidence: 0.7,
    reasoning: "test",
    entry: 100_000,
    stopLoss: 98_800,
    takeProfit: 101_200,
    expectedMovePct: 0.012,
    maxHoldMs: 3600_000,
    atr: 500,
    stopLossPct: 0.012,
    riskR: 1200,
    ...partial,
  };
}

describe("Task J crypto safety", () => {
  it("technical stop at -14% → entry discarded", () => {
    const sig = buySig({
      entry: 100,
      stopLoss: 86,
      atr: 1,
    });
    expect(applyStopDistanceCap(sig)).toBeNull();
  });

  it("shadow 10€ XBTEUR -1.2% move → PnL ≈ -0.24€ incl fees", () => {
    const entry = 100_000;
    const exit = entry * (1 - 0.012);
    const qty = shadowSimQty(entry);
    expect(qty * entry).toBeCloseTo(10, 2);
    const fees = shadowExitFeesEur({
      entry,
      exit,
      qty,
      pair: "XBTEUR",
      exitReason: "STOP_LOSS",
    });
    const net = (exit - entry) * qty - fees;
    expect(net).toBeGreaterThan(-0.35);
    expect(net).toBeLessThan(-0.15);
  });

  it("target < 3× real cost → entry discarded", () => {
    const sig = buySig({ expectedMovePct: 0.01 });
    expect(passesCostFilter(sig, 0.0005)).toBe(false);
  });

  it("legacy shadow PnL hundreds of € invalid for stats", () => {
    expect(
      isShadowStatsValid({
        shadow: true,
        side: "SELL",
        netPnlEur: -857,
        netPct: -8570,
      }),
    ).toBe(false);
  });

  it(".OLD / .CVR / .RT / .WS → orphan", () => {
    for (const sym of ["APTX.OLD", "APLT.CVR", "FOO.RT", "BAR.WS"]) {
      expect(isOrphanTickerSuffix(sym)).toBe(true);
      expect(isLegacyOrphanTicker(sym)).toBe(true);
    }
  });
});
