import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dateAtLocal } from "@/lib/trading/exchange-hours";

describe("US premarket (STOCKS_EXECUTION_PREMARKET)", () => {
  let tmp: string;
  let prevCwd: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-premarket-"));
    fs.mkdirSync(path.join(tmp, ".forgeos", "cache"), { recursive: true });
    process.chdir(tmp);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("STOCKS_EXECUTION_PREMARKET defaults false and blocks live assert", async () => {
    const {
      isStocksExecutionPremarketEnabled,
      assertStocksExecutionAllowed,
      __resetStocksExecutionGateForTests,
    } = await import("@/lib/trading/stocks-execution-gate");
    __resetStocksExecutionGateForTests();
    expect(isStocksExecutionPremarketEnabled()).toBe(false);
    expect(() =>
      assertStocksExecutionAllowed({ side: "BUY", symbol: "AAPL", premarket: true }),
    ).toThrow(/STOCKS_EXECUTION_PREMARKET=false/);
  });

  it("switch true from .env.local without restart", async () => {
    fs.writeFileSync(
      path.join(tmp, ".env.local"),
      "STOCKS_EXECUTION_ENABLED=true\nSTOCKS_EXECUTION_US=true\nSTOCKS_EXECUTION_PREMARKET=true\n",
      "utf8",
    );
    const {
      isStocksExecutionPremarketEnabled,
      assertStocksExecutionAllowed,
      __resetStocksExecutionGateForTests,
    } = await import("@/lib/trading/stocks-execution-gate");
    __resetStocksExecutionGateForTests();
    expect(isStocksExecutionPremarketEnabled()).toBe(true);
    expect(() =>
      assertStocksExecutionAllowed({ side: "BUY", symbol: "AAPL", premarket: true }),
    ).not.toThrow();
  });

  it("rejects prior-close-like quotes; accepts fresh IBKR book", async () => {
    const { isUsablePremarketQuote } = await import("@/lib/trading/us-premarket");
    const now = Date.now();
    expect(
      isUsablePremarketQuote({
        price: 100,
        previousClose: 100,
        volume: 0,
        updatedAt: new Date(now - 2 * 60 * 60_000).toISOString(),
        quoteRoute: "EODHD-REALTIME",
      }).ok,
    ).toBe(false);

    expect(
      isUsablePremarketQuote({
        price: 101.2,
        previousClose: 100,
        bid: 101.1,
        ask: 101.3,
        volume: 250_000,
        updatedAt: new Date(now).toISOString(),
        quoteRoute: "IBKR-SMART",
      }).ok,
    ).toBe(true);
  });

  it("live gates: spread < 0.3%, volume, and 15m cutoff", async () => {
    const {
      assertPremarketLiveGates,
      isUsPremarketNoEntryCutoff,
      premarketSpreadPct,
      PREMARKET_MAX_SPREAD_PCT,
    } = await import("@/lib/trading/us-premarket");

    expect(premarketSpreadPct(100, 100.2)!).toBeLessThan(PREMARKET_MAX_SPREAD_PCT);
    expect(premarketSpreadPct(100, 100.5)!).toBeGreaterThanOrEqual(PREMARKET_MAX_SPREAD_PCT);

    // 08:00 ET weekday — inside premarket, not cutoff
    const am = dateAtLocal("America/New_York", 2026, 10, 13, 8, 0);
    expect(() =>
      assertPremarketLiveGates({ bid: 100, ask: 100.2, volume: 200_000, at: am }),
    ).not.toThrow();

    expect(() =>
      assertPremarketLiveGates({ bid: 100, ask: 100.5, volume: 200_000, at: am }),
    ).toThrow(/spread/i);

    expect(() =>
      assertPremarketLiveGates({ bid: 100, ask: 100.2, volume: 1_000, at: am }),
    ).toThrow(/volumen/i);

    const cutoff = dateAtLocal("America/New_York", 2026, 10, 13, 9, 20);
    expect(isUsPremarketNoEntryCutoff(cutoff)).toBe(true);
    expect(() =>
      assertPremarketLiveGates({ bid: 100, ask: 100.2, volume: 200_000, at: cutoff }),
    ).toThrow(/15m|últimos/i);
  });

  it("shadow metrics: live ready only after 20 improving closed signals", async () => {
    const {
      __resetPremarketShadowForTests,
      recordPremarketShadowSignal,
      resolvePremarketShadowAtOpen,
      resolvePremarketShadowAtClose,
      getPremarketLiveReadiness,
      isPremarketLiveReady,
    } = await import("@/lib/trading/us-premarket");
    __resetPremarketShadowForTests();

    expect(isPremarketLiveReady()).toBe(false);

    for (let i = 0; i < 20; i += 1) {
      recordPremarketShadowSignal({
        ticker: `T${i}`,
        strategy: "GAP",
        entryPremarket: 100,
      });
    }

    const openMarks = new Map<string, number>();
    const closeMarks = new Map<string, number>();
    for (let i = 0; i < 20; i += 1) {
      openMarks.set(`T${i}`, 101); // premarket bought cheaper → +1% at open
      closeMarks.set(`T${i}`, 103); // close 103: PM entry +3%, regular entry +~2%
    }

    const nearClose = dateAtLocal("America/New_York", 2026, 10, 13, 16, 5);
    resolvePremarketShadowAtOpen(openMarks, nearClose);
    resolvePremarketShadowAtClose(closeMarks, nearClose);

    const ready = getPremarketLiveReadiness();
    expect(ready.resolvedClose).toBe(20);
    expect(ready.improved).toBe(20);
    expect(ready.ready).toBe(true);
  });
});
