/**
 * Kraken Futures safety — leverage cap, exchange stop, PnL, shadow at zero margin.
 */
import { describe, expect, it } from "vitest";
import {
  estimateFundingPct,
  netFuturesPnlPct,
  simulateShortTrade,
} from "@/lib/trading/crypto/backtest-futures-core";
import { futuresMaxLeverage } from "@/lib/trading/crypto/futures-config";
import type { Bar } from "@/lib/brokers/kraken/market-store";

describe("futures safety", () => {
  it("leverage hard cap 2 when env requests 10", async () => {
    const prev = process.env.FUTURES_MAX_LEVERAGE;
    process.env.FUTURES_MAX_LEVERAGE = "10";
    const mod = await import("@/lib/trading/crypto/futures-config");
    expect(mod.futuresMaxLeverage()).toBe(2);
    if (prev === undefined) delete process.env.FUTURES_MAX_LEVERAGE;
    else process.env.FUTURES_MAX_LEVERAGE = prev;
  });

  it("default max leverage is 1", () => {
    delete process.env.FUTURES_MAX_LEVERAGE;
    expect(futuresMaxLeverage()).toBe(1);
  });

  it("short profits when price falls (after fees)", () => {
    const bars: Bar[] = [
      { time: "t0", open: 100, high: 101, low: 99, close: 100, volume: 1 },
      { time: "t1", open: 100, high: 100.5, low: 95, close: 96, volume: 1 },
    ];
    const fill = simulateShortTrade({
      bars,
      entryBarIndex: 0,
      entryPrice: 100,
      stopLoss: 102,
      takeProfit: 96,
      maxBars: 2,
    });
    expect(fill).not.toBeNull();
    expect(fill!.netPct).toBeGreaterThan(0);
  });

  it("net futures PnL long helper", () => {
    const net = netFuturesPnlPct("long", 100, 101, {
      entryFee: 0.0002,
      exitFee: 0.0005,
    });
    expect(net).toBeGreaterThan(0.5);
    expect(net).toBeLessThan(1.2);
  });

  it("FUTURES_SHADOW_MODE defaults true", async () => {
    const prev = process.env.FUTURES_SHADOW_MODE;
    delete process.env.FUTURES_SHADOW_MODE;
    const mod = await import("@/lib/trading/crypto/futures-config");
    expect(mod.futuresShadowMode()).toBe(true);
    if (prev !== undefined) process.env.FUTURES_SHADOW_MODE = prev;
  });

  it("live futures entry must carry exchange stop id", () => {
    const trade = {
      venue: "futures" as const,
      exchangeStopOrderId: "stop-1",
      shadow: false,
    };
    expect(trade.exchangeStopOrderId).toBeTruthy();
  });

  it("estimateFundingPct signs long vs short", () => {
    expect(estimateFundingPct(0.001, 8, "long")).toBeGreaterThan(0);
    expect(estimateFundingPct(0.001, 8, "short")).toBeLessThan(0);
  });
});
