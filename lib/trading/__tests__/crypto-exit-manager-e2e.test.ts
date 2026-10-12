/**
 * E2E: simulated buy → exit manager registration → close on stop / target touch.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("crypto exit manager E2E", () => {
  let tmp: string;
  let prevCwd: string;
  let prevRoot: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-exit-e2e-"));
    prevCwd = process.cwd();
    prevRoot = process.env.FORGEOS_ROOT;
    process.chdir(tmp);
    process.env.FORGEOS_ROOT = tmp;
    fs.mkdirSync(path.join(tmp, ".forgeos", "cache"), { recursive: true });
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevRoot == null) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("simulated buy appears in exit registry and closes on stop + target", async () => {
    const {
      registerCryptoExitPosition,
      isExitRegistered,
      getTrailingState,
      purgeNonCryptoFromTrailingRegistry,
      evaluateRegisteredStopOrTarget,
      __resetTrailingRegistryMemoryForTests,
    } = await import("@/lib/trading/trailing-registry");

    __resetTrailingRegistryMemoryForTests();

    // Seed a stock/orphan that must be purged from crypto-trailing.json
    const cacheFile = path.join(tmp, ".forgeos", "cache", "crypto-trailing.json");
    fs.writeFileSync(
      cacheFile,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          symbols: {
            HYDC: {
              peak: 1,
              trailingActive: true,
              partialSold: false,
              updatedAt: new Date().toISOString(),
              entryPrice: 1,
              stopLoss: 0.9,
              takeProfit: 1.2,
              market: "stocks",
            },
            AAPL: {
              peak: 100,
              trailingActive: false,
              partialSold: false,
              updatedAt: new Date().toISOString(),
              entryPrice: 100,
              stopLoss: 95,
              takeProfit: 110,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    __resetTrailingRegistryMemoryForTests();
    const purged = purgeNonCryptoFromTrailingRegistry();
    expect(purged).toEqual(expect.arrayContaining(["HYDC", "AAPL"]));
    expect(getTrailingState("HYDC")).toBeNull();

    // Simulated real Kraken fill → same-step exit registration
    registerCryptoExitPosition({
      symbol: "ZROEUR",
      entryPrice: 100,
      stopLoss: 97,
      takeProfit: 104,
      qty: 10,
      strategy: "TREND_PULLBACK_1H",
      orderId: "SIM-1",
    });
    expect(isExitRegistered("ZROEUR")).toBe(true);
    const reg = getTrailingState("ZROEUR");
    expect(reg?.entryPrice).toBe(100);
    expect(reg?.stopLoss).toBe(97);
    expect(reg?.takeProfit).toBe(104);
    expect(reg?.market).toBe("crypto");

    // Stop touch
    expect(
      evaluateRegisteredStopOrTarget({ symbol: "ZROEUR", price: 96.5 }),
    ).toBe("STOP_LOSS");

    // Target touch
    expect(
      evaluateRegisteredStopOrTarget({ symbol: "ZROEUR", price: 104.5 }),
    ).toBe("TAKE_PROFIT");
  });

  it("cost filter: maker_maker vs maker_taker with account fees 0.40%/0.80%", async () => {
    const { __setFeeScheduleForTests } = await import(
      "@/lib/trading/crypto/fee-schedule"
    );
    __setFeeScheduleForTests({
      maker: 0.004,
      taker: 0.008,
      source: "cache",
    });
    const {
      estimateRoundTripCostPct,
      estimateFastRoundTripCostPct,
      passesCostFilter,
      strategyCostFilterMode,
    } = await import("@/lib/trading/crypto/strategies/index");

    expect(strategyCostFilterMode("MICRO_BREAKOUT_1M")).toBe("maker_maker");
    expect(strategyCostFilterMode("RANGE_GRID_15M")).toBe("maker_maker");
    expect(strategyCostFilterMode("TREND_PULLBACK_1H")).toBe("maker_taker");

    // maker+maker = 0.8% → min target 2.4%
    expect(estimateFastRoundTripCostPct(0)).toBeCloseTo(0.008, 6);
    expect(estimateRoundTripCostPct(0, "MICRO_BREAKOUT_1M") * 3).toBeCloseTo(
      0.024,
      6,
    );
    // maker+taker = 1.2% → min target 3.6%
    expect(estimateRoundTripCostPct(0, "TREND_PULLBACK_1H")).toBeCloseTo(
      0.012,
      6,
    );
    expect(estimateRoundTripCostPct(0, "TREND_PULLBACK_1H") * 3).toBeCloseTo(
      0.036,
      6,
    );

    expect(
      passesCostFilter(
        {
          strategyId: "MICRO_BREAKOUT_1M",
          direction: "BUY",
          confidence: 0.7,
          reasoning: "t",
          entry: 100,
          stopLoss: 99,
          takeProfit: 102.5,
          expectedMovePct: 0.024,
          maxHoldMs: 1,
          atr: 1,
          stopLossPct: 0.01,
          riskR: 1,
        },
        0,
      ),
    ).toBe(true);
    expect(
      passesCostFilter(
        {
          strategyId: "TREND_PULLBACK_1H",
          direction: "BUY",
          confidence: 0.7,
          reasoning: "t",
          entry: 100,
          stopLoss: 99,
          takeProfit: 103,
          expectedMovePct: 0.03,
          maxHoldMs: 1,
          atr: 1,
          stopLossPct: 0.01,
          riskR: 1,
        },
        0,
      ),
    ).toBe(false); // 3% < 3.6%
    expect(
      passesCostFilter(
        {
          strategyId: "TREND_PULLBACK_1H",
          direction: "BUY",
          confidence: 0.7,
          reasoning: "t",
          entry: 100,
          stopLoss: 99,
          takeProfit: 104,
          expectedMovePct: 0.037,
          maxHoldMs: 1,
          atr: 1,
          stopLossPct: 0.01,
          riskR: 1,
        },
        0,
      ),
    ).toBe(true);

    __setFeeScheduleForTests(null);
  });
});
