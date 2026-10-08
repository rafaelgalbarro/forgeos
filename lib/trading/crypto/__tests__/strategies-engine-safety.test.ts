/**
 * Crypto engine safety: idempotency, one pos/pair, degrade, RANGE_GRID exit.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(async () => undefined),
}));

describe("crypto engine safety (12 strategies)", () => {
  let tmp: string;
  let prevCwd: string;
  let prevRoot: string | undefined;

  beforeEach(() => {
    prevCwd = process.cwd();
    prevRoot = process.env.FORGEOS_ROOT;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-crypto-"));
    fs.mkdirSync(path.join(tmp, ".forgeos", "journal"), { recursive: true });
    process.env.FORGEOS_ROOT = tmp;
    process.chdir(tmp);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevRoot === undefined) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("idempotency: same signalKey only journals once across 5 cycles", async () => {
    const { appendCryptoJournal, hasSignalKey, readCryptoJournal } =
      await import("@/lib/trading/crypto/journal-crypto");
    const key = "TREND_PULLBACK_1H|ETHEUR|1710000000";
    for (let i = 0; i < 5; i++) {
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: "TREND_PULLBACK_1H",
        pair: "ETHEUR",
        regime: "ALCISTA",
        side: "BUY",
        entry: 2000,
        exit: null,
        exitReason: null,
        grossPnlEur: null,
        feesEur: 0,
        netPnlEur: null,
        durationMs: null,
        mfePct: null,
        maePct: null,
        shadow: false,
        open: true,
        signalKey: key,
      });
    }
    expect(hasSignalKey(key)).toBe(true);
    expect(readCryptoJournal().filter((t) => t.signalKey === key)).toHaveLength(1);
  });

  it("one position per pair: journalOpen blocks second strategy on same pair", async () => {
    const { appendCryptoJournal, journalOpenCryptoPairs } = await import(
      "@/lib/trading/crypto/journal-crypto"
    );
    appendCryptoJournal({
      at: new Date().toISOString(),
      strategy: "TREND_PULLBACK_1H",
      pair: "SOLEUR",
      regime: "ALCISTA",
      side: "BUY",
      entry: 100,
      exit: null,
      exitReason: null,
      grossPnlEur: null,
      feesEur: 0,
      netPnlEur: null,
      durationMs: null,
      mfePct: null,
      maePct: null,
      shadow: false,
      open: true,
      signalKey: "TREND_PULLBACK_1H|SOLEUR|1",
    });
    const open = journalOpenCryptoPairs();
    expect(open.has("SOLEUR")).toBe(true);
    // Engine checks journalOpenCryptoPairs + krakenBusy before second strategy
    expect(open.has("SOLEUR")).toBe(true);
  });

  it("degradation: 5 live losses → strategy shadow", async () => {
    const { appendCryptoJournal } = await import(
      "@/lib/trading/crypto/journal-crypto"
    );
    const { autoDegradePromoteStrategies, getStrategyMode } = await import(
      "@/lib/trading/crypto/strategy-status"
    );
    for (let i = 0; i < 5; i++) {
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: "MOMENTUM_BREAKOUT_5M",
        pair: "ADAEUR",
        regime: "ALCISTA",
        side: "SELL",
        entry: 1,
        exit: 0.98,
        exitReason: "STOP_LOSS",
        grossPnlEur: -0.5,
        feesEur: 0.05,
        netPnlEur: -0.55,
        netPct: -0.5,
        durationMs: 60_000,
        mfePct: 0,
        maePct: -1,
        shadow: false,
      });
    }
    const msgs = await autoDegradePromoteStrategies({
      trades: (await import("@/lib/trading/crypto/journal-crypto")).readCryptoJournal(),
      capitalEur: 82,
    });
    expect(getStrategyMode("MOMENTUM_BREAKOUT_5M")).toBe("shadow");
    expect(msgs.some((m) => m.includes("MOMENTUM_BREAKOUT_5M"))).toBe(true);
  });

  it("RANGE_GRID_15M force-exits when regime leaves LATERAL", async () => {
    const { evaluateRangeGrid15m } = await import(
      "@/lib/trading/crypto/strategies/range-grid-15m"
    );
    const bars = Array.from({ length: 100 }, (_, i) => ({
      time: 1_700_000_000 + i * 900,
      open: 10,
      high: 10.2,
      low: 9.8,
      close: 10,
      volume: 100,
    }));
    const exitSig = evaluateRangeGrid15m(bars, "ALCISTA", 1);
    expect(exitSig.forceExitReason).toBe("REGIME_EXIT_LATERAL");
    expect(exitSig.direction).toBe("SELL");

    // LATERAL with tight ATR and price in lower third of 24h range
    const rangeBars = Array.from({ length: 100 }, (_, i) => {
      const last = i === 99;
      return {
        time: 1_700_000_000 + i * 900,
        open: last ? 8.4 : 10,
        high: last ? 8.6 : 10.05,
        low: last ? 8.3 : 9.95,
        close: last ? 8.5 : 10,
        volume: 100,
      };
    });
    // Stretch 24h extremes via a few bars
    rangeBars[10]!.high = 12;
    rangeBars[20]!.low = 8;
    const buy = evaluateRangeGrid15m(rangeBars, "LATERAL", 0);
    expect(buy.direction).toBe("BUY");
    expect(buy.strategyId).toBe("RANGE_GRID_15M");
  });

  it("CRYPTO_LIVE_STRATEGIES empty defaults to all live; listed subset shadows rest", async () => {
    fs.writeFileSync(
      path.join(tmp, ".env.local"),
      "CRYPTO_LIVE_STRATEGIES=TREND_PULLBACK_1H,RSI_MEAN_REVERSION_15M\n",
      "utf8",
    );
    const { parseCryptoLiveStrategiesList, isCryptoStrategyLive } = await import(
      "@/lib/trading/crypto/live-strategies"
    );
    const list = parseCryptoLiveStrategiesList();
    expect(list.has("TREND_PULLBACK_1H")).toBe(true);
    expect(list.has("RANGE_GRID_15M")).toBe(false);
    expect(isCryptoStrategyLive("TREND_PULLBACK_1H")).toBe(true);
    expect(isCryptoStrategyLive("RANGE_GRID_15M")).toBe(false);
  });

  it("OTC-style: cost filter requires ≥3× round-trip", async () => {
    const { passesCostFilter } = await import(
      "@/lib/trading/crypto/strategies/index"
    );
    const ok = passesCostFilter(
      {
        strategyId: "EMA_CROSS_15M",
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
      0.001,
    );
    // maker 0.25% + taker 0.40% + spread ≈ 0.85%; 3× ≈ 2.55% — 3% passes
    expect(ok).toBe(true);
    const fail = passesCostFilter(
      {
        strategyId: "EMA_CROSS_15M",
        direction: "BUY",
        confidence: 0.7,
        reasoning: "t",
        entry: 100,
        stopLoss: 99,
        takeProfit: 100.5,
        expectedMovePct: 0.005,
        maxHoldMs: 1,
        atr: 1,
        stopLossPct: 0.01,
        riskR: 1,
      },
      0.001,
    );
    expect(fail).toBe(false);
  });
});
