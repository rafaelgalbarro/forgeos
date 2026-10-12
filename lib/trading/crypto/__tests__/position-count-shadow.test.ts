/**
 * D.1 — shadow journal opens must NEVER inflate CRYPTO_LIVE_MAX_POSITIONS.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(async () => undefined),
}));

describe("position count ignores shadow + dust", () => {
  let tmp: string;
  let prevCwd: string;
  let prevRoot: string | undefined;
  let prevMax: string | undefined;

  beforeEach(() => {
    prevCwd = process.cwd();
    prevRoot = process.env.FORGEOS_ROOT;
    prevMax = process.env.CRYPTO_LIVE_MAX_POSITIONS;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-pos-"));
    fs.mkdirSync(path.join(tmp, ".forgeos", "journal"), { recursive: true });
    process.env.FORGEOS_ROOT = tmp;
    process.env.CRYPTO_LIVE_MAX_POSITIONS = "2";
    process.chdir(tmp);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevRoot === undefined) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
    if (prevMax === undefined) delete process.env.CRYPTO_LIVE_MAX_POSITIONS;
    else process.env.CRYPTO_LIVE_MAX_POSITIONS = prevMax;
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("3 open shadow journal entries → openCount / position limit count = 0", async () => {
    const { appendCryptoJournal, journalOpenCryptoPairs, listOpenCryptoJournal } =
      await import("@/lib/trading/crypto/journal-crypto");
    const { beginCryptoCycleReservation, getCryptoSlotReservation } = await import(
      "@/lib/trading/crypto/slot-reservation"
    );
    const { journalOpenCryptoSymbols } = await import("@/lib/trading/forgeos-owned");
    const { confirmedLiveOpenPairs, isDustKrakenBalance } = await import(
      "@/lib/trading/crypto/position-filters"
    );

    for (const pair of ["XBTEUR", "ETHEUR", "SOLEUR"]) {
      appendCryptoJournal({
        at: new Date().toISOString(),
        strategy: "TREND_PULLBACK_1H",
        pair,
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
        shadow: true,
        open: true,
        signalKey: `SHADOW|${pair}|1`,
      });
    }

    expect(listOpenCryptoJournal({ shadow: true })).toHaveLength(3);
    expect(journalOpenCryptoPairs().size).toBe(0);
    expect(journalOpenCryptoSymbols().size).toBe(0);

    // No Kraken balances → confirmed live = 0
    const confirmed = confirmedLiveOpenPairs([], journalOpenCryptoPairs());
    expect(confirmed.size).toBe(0);

    beginCryptoCycleReservation(1000, confirmed);
    const snap = getCryptoSlotReservation().snapshot();
    expect(snap.open).toBe(0);

    const reserved = await getCryptoSlotReservation().tryReserve({
      symbol: "ALGOEUR",
      notionalEur: 25,
      maxPositions: 2,
    });
    expect(reserved.ok).toBe(true);

    // Dust residual must not count (notional < €1 and/or qty < ordermin)
    expect(isDustKrakenBalance(0.000134, 0.5, 0.0001)).toBe(true);
    expect(isDustKrakenBalance(0.00005, 0.00005 * 90_000, 0.0001)).toBe(true);
    expect(isDustKrakenBalance(0.0000000079, 0.001, 0.01)).toBe(true);
  });

  it("live journal + meaningful balance counts; dust foreign does not", async () => {
    const { appendCryptoJournal, journalOpenCryptoPairs } = await import(
      "@/lib/trading/crypto/journal-crypto"
    );
    const { beginCryptoCycleReservation, getCryptoSlotReservation } = await import(
      "@/lib/trading/crypto/slot-reservation"
    );
    const { confirmedLiveOpenPairs } = await import(
      "@/lib/trading/crypto/position-filters"
    );
    const { markForeignOrphanPair, clearForeignOrphanPairs } = await import(
      "@/lib/trading/crypto/foreign-orphans"
    );

    clearForeignOrphanPairs();
    appendCryptoJournal({
      at: new Date().toISOString(),
      strategy: "TREND_PULLBACK_1H",
      pair: "ALGOEUR",
      regime: "ALCISTA",
      side: "BUY",
      entry: 0.2,
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
      signalKey: "LIVE|ALGOEUR|1",
      qty: 200,
    });

    const balances = [
      { symbol: "ALGOEUR", qty: 200, marketValueEur: 40 },
      { symbol: "XBTEUR", qty: 0.000134, marketValueEur: 0.5 }, // dust
      { symbol: "SOLEUR", qty: 0.0000000079, marketValueEur: 0.000001 },
    ];
    markForeignOrphanPair("XBTEUR");

    const confirmed = confirmedLiveOpenPairs(balances, journalOpenCryptoPairs());
    expect([...confirmed]).toEqual(["ALGOEUR"]);

    beginCryptoCycleReservation(500, confirmed);
    expect(getCryptoSlotReservation().snapshot().open).toBe(1);
  });
});

describe("market data staleness", () => {
  it("flags stale 5m bars and BTC price age", async () => {
    const {
      setBars,
      setTicker,
      getMarketDataAges,
      isMarketDataStale,
    } = await import("@/lib/brokers/kraken/market-store");

    const now = Date.now();
    // Fresh 5m candle so only BTC price age trips the watchdog
    setBars("ETHEUR", "5", [
      { time: Math.floor(now / 1000) - 60, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ]);
    setTicker("ETHEUR", {
      bid: 1,
      ask: 1,
      last: 1,
      mid: 1,
      volume24h: 0,
      vwap: 0,
      high24h: 0,
      low24h: 0,
      changePct24h: 0,
      updatedAt: now - 10_000,
    });
    setBars("XBTEUR", "60", [
      { time: Math.floor(now / 1000) - 3600, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ]);
    setTicker("XBTEUR", {
      bid: 1,
      ask: 1,
      last: 1,
      mid: 1,
      volume24h: 0,
      vwap: 0,
      high24h: 0,
      low24h: 0,
      changePct24h: 0,
      updatedAt: now - 20 * 60_000, // 20 min — BTC stale
    });

    const ages = getMarketDataAges(["ETHEUR", "XBTEUR"], now);
    const check = isMarketDataStale(ages, { bar5MaxMs: 3 * 60_000, btcMaxMs: 15 * 60_000 });
    expect(check.stale).toBe(true);
    expect(check.reason).toMatch(/BTC|price|60m/i);
  });
});
