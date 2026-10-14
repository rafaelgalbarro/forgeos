/**
 * Futures venue: WS tick → candles → shared engine state (simulated WS).
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  FUTURES_ENGINE_STATE_FILE,
  readFuturesEngineState,
  writeFuturesEngineState,
} from "@/lib/trading/crypto/futures-engine-state";
import { __testIngestFuturesWsMessage } from "@/lib/brokers/kraken-futures/ws-client";
import {
  getBars,
  getTicker,
  isMarketDataStale,
  getMarketDataAges,
} from "@/lib/brokers/kraken/market-store";

describe("futures engine cycle plumbing", () => {
  beforeEach(() => {
    try {
      if (fs.existsSync(FUTURES_ENGINE_STATE_FILE)) fs.unlinkSync(FUTURES_ENGINE_STATE_FILE);
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    try {
      if (fs.existsSync(FUTURES_ENGINE_STATE_FILE)) fs.unlinkSync(FUTURES_ENGINE_STATE_FILE);
    } catch {
      /* ignore */
    }
  });

  it("simulated WS ticker builds spot XBTEUR 5m bar and fresh tick", () => {
    const now = Math.floor(Date.now() / 1000);
    __testIngestFuturesWsMessage(
      JSON.stringify({
        feed: "ticker",
        product_id: "PF_XBTUSD",
        bid: 95000,
        ask: 95010,
        markPrice: 95005,
      }),
    );
    const t = getTicker("XBTEUR");
    expect(t?.mid).toBeGreaterThan(0);
    expect(getBars("XBTEUR", "5").length).toBeGreaterThan(0);
    const ages = getMarketDataAges(["XBTEUR"], Date.now());
    const stale = isMarketDataStale(ages, { tickMaxMs: 7 * 60_000 });
    expect(stale.stale).toBe(false);
    void now;
  });

  it("fresh tick ignores old 5m bar write age", () => {
    const ages = [
      {
        pair: "XBTEUR",
        bar5AgeMs: 297_000,
        bar60AgeMs: -1,
        priceAgeMs: 30_000,
        candle5LagMs: 297_000,
      },
    ];
    const check = isMarketDataStale(ages, { tickMaxMs: 7 * 60_000 });
    expect(check.stale).toBe(false);
    const staleTick = isMarketDataStale(
      [{ ...ages[0]!, priceAgeMs: 8 * 60_000 }],
      { tickMaxMs: 7 * 60_000 },
    );
    expect(staleTick.stale).toBe(true);
  });

  it("writes shared state file for diagnostics", () => {
    writeFuturesEngineState({
      started: true,
      shadowMode: false,
      leverageCap: 1,
      availableMargin: 55.85,
      balanceValue: 55.85,
      currency: "EUR",
      lastCycleAt: new Date().toISOString(),
      lastMarginFetchAt: new Date().toISOString(),
      ws: { connected: true, symbols: ["PF_XBTUSD"] },
      lastCycle: {
        symbols: 10,
        dataAgeMs: 12_000,
        signals: 2,
        orders: 0,
        shadow: 1,
      },
    });
    const s = readFuturesEngineState();
    expect(s?.availableMargin).toBeCloseTo(55.85);
    expect(s?.ws.connected).toBe(true);
    expect(fs.existsSync(FUTURES_ENGINE_STATE_FILE)).toBe(true);
    expect(path.basename(FUTURES_ENGINE_STATE_FILE)).toBe(
      "kraken-futures-engine-state.json",
    );
  });
});
