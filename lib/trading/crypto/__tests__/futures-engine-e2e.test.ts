/**
 * Simulated WS → candle → live order path (mocked exchange).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enterWithExchangeStop = vi.fn(async () => ({
  orderId: "entry-1",
  stopOrderId: "stop-1",
}));

vi.mock("@/lib/brokers/kraken-futures", () => ({
  isKrakenFuturesConfigured: () => true,
  getKrakenFuturesAdapter: () => ({
    getAccount: async () => ({
      availableMargin: 55.85,
      balanceValue: 55.85,
      currency: "EUR",
    }),
    getFees: async () => ({
      makerPct: 0.0002,
      takerPct: 0.0005,
      source: "default" as const,
    }),
    getQuote: async () => ({
      mid: 95_000,
      bid: 94_990,
      ask: 95_010,
      mark: 95_005,
      fundingRate: 0,
    }),
    sizeForNotionalEur: async () => ({ size: 0.001, price: 95_000 }),
    sizeForNotionalEurDetailed: async () => ({
      ok: true as const,
      symbol: "PF_XBTUSD",
      size: 0.001,
      price: 95_000,
      notionalUsd: 95,
    }),
    getInstrument: async () => ({
      symbol: "PF_XBTUSD",
      tickSize: 0.5,
      contractSize: 1,
      contractValueTradePrecision: 4,
      tradeable: true,
      base: "XBT",
      quote: "USD",
      minSize: 0.0001,
    }),
    setLeverage: vi.fn(async () => undefined),
    enterWithExchangeStop,
    cancelOrder: vi.fn(async () => undefined),
    getOpenPositions: async () => [],
  }),
  spotPairToPfSymbol: (pair: string) =>
    pair === "XBTEUR" ? "PF_XBTUSD" : null,
}));

vi.mock("@/lib/trading/crypto/futures-config", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/crypto/futures-config")>();
  return {
    ...actual,
    futuresShadowMode: () => false,
    isFuturesStrategyLive: () => true,
  };
});

vi.mock("@/lib/trading/crypto/futures-backtest-gate", () => ({
  futuresLiveGateForStrategy: () => ({ ok: true }),
}));

const mockSignal = {
  strategyId: "RS_VS_BTC_1H" as const,
  direction: "BUY" as const,
  confidence: 0.8,
  entry: 95_000,
  stopLoss: 93_000,
  takeProfit: 98_000,
  expectedMovePct: 2,
  maxHoldMs: 3600_000,
  atr: 100,
  stopLossPct: 0.02,
  riskR: 100,
  reasoning: "test",
  candleTime: 1,
};

vi.mock("@/lib/trading/crypto/futures-strategy-eval", () => ({
  evaluateFuturesStrategiesForPair: () => [mockSignal],
}));

vi.mock("@/lib/trading/crypto/strategies", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/crypto/strategies")>();
  return {
    ...actual,
    rankSignals: (sigs: Array<typeof mockSignal & { pair?: string }>) =>
      sigs.map((s) => ({
        ...s,
        pair: s.pair ?? "XBTEUR",
        score: 90,
        shadow: false,
        spreadPct: 0.0005,
        signalKey: "XBTEUR|RS",
      })),
    strategyReliabilityMap: () => new Map(),
  };
});

vi.mock("@/lib/notifications/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(async () => undefined),
}));

vi.mock("@/lib/brokers/kraken/universe", () => ({
  getKrakenUniversePairs: async () => ["XBTEUR"],
}));

vi.mock("@/lib/brokers/kraken-futures/market-sync", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/brokers/kraken-futures/market-sync")>();
  return {
    ...actual,
    backfillFuturesUniverse: vi.fn(async () => undefined),
  };
});

describe("futures engine e2e (simulated WS)", () => {
  let tmp: string;
  let prevCache: string | undefined;
  let prevRoot: string | undefined;

  beforeEach(() => {
    enterWithExchangeStop.mockClear();
    prevCache = process.env.FORGEOS_CACHE_DIR;
    prevRoot = process.env.FORGEOS_ROOT;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-fut-e2e-"));
    fs.mkdirSync(path.join(tmp, ".forgeos", "journal"), { recursive: true });
    process.env.FORGEOS_CACHE_DIR = path.join(tmp, ".forgeos", "cache");
    process.env.FORGEOS_ROOT = tmp;
    vi.resetModules();
  });

  afterEach(() => {
    if (prevCache === undefined) delete process.env.FORGEOS_CACHE_DIR;
    else process.env.FORGEOS_CACHE_DIR = prevCache;
    if (prevRoot === undefined) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("WS tick → cycle → enterWithExchangeStop", async () => {
    vi.stubGlobal("WebSocket", undefined);
    const { __testIngestFuturesWsMessage } = await import(
      "@/lib/brokers/kraken-futures/ws-client"
    );
    __testIngestFuturesWsMessage(
      JSON.stringify({
        feed: "ticker",
        product_id: "PF_XBTUSD",
        bid: 95000,
        ask: 95010,
        markPrice: 95005,
      }),
    );

    const { runKrakenFuturesAnalysisCycle } = await import(
      "@/lib/trading/crypto/futures-engine"
    );
    const result = await runKrakenFuturesAnalysisCycle();
    expect(result.executed.length).toBeGreaterThan(0);
    expect(enterWithExchangeStop).toHaveBeenCalled();
    const args = enterWithExchangeStop.mock.calls[0]?.[0] as {
      stopPrice: number;
    };
    expect(args.stopPrice).toBe(93_000);
  });
});
