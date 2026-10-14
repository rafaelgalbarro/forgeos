import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetEodhdWsStoreForTests,
  patchEodhdWsQuote,
} from "@/lib/market-data/eodhd-ws-store";
import { __resetEodhdWsQcForTests } from "@/lib/market-data/eodhd-ws-qc";

const evaluateMock = vi.fn();

vi.mock("@/lib/market-data/eodhd-ws-qc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market-data/eodhd-ws-qc")>();
  return {
    ...actual,
    evaluateEodhdWsQuality: (...args: unknown[]) => evaluateMock(...args),
  };
});

vi.mock("@/lib/market-data/eodhd", () => ({
  getQuote: vi.fn(async () => ({
    previousClose: 98,
    price: 50,
    updatedAt: new Date().toISOString(),
  })),
}));

vi.mock("@/lib/trading/exchange-hours", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trading/exchange-hours")>();
  return {
    ...actual,
    isUsEodhdWsSession: () => true,
  };
});

describe("US equity live price (EODHD WS + 1m QC)", () => {
  beforeEach(() => {
    __resetEodhdWsStoreForTests();
    __resetEodhdWsQcForTests();
    evaluateMock.mockReset();
  });

  it("maps stale QC to STALE skip", async () => {
    evaluateMock.mockResolvedValue({
      symbol: "AAPL",
      ok: false,
      code: "STALE",
      reason: "AAPL: WS stale",
      checkedAt: new Date().toISOString(),
    });

    const { resolveUsEquityLivePrice } = await import("@/lib/trading/us-equity-live-price");
    const r = await resolveUsEquityLivePrice("AAPL");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STALE");
  });

  it("maps 1m divergence QC to QC_FAIL skip", async () => {
    evaluateMock.mockResolvedValue({
      symbol: "AAPL",
      ok: false,
      code: "DIVERGENCE_1M",
      reason: "AAPL: WS vs 1m >1%",
      checkedAt: new Date().toISOString(),
    });

    const { resolveUsEquityLivePrice } = await import("@/lib/trading/us-equity-live-price");
    const r = await resolveUsEquityLivePrice("AAPL");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("QC_FAIL");
  });

  it("returns EODHD-WS snapshot when QC passes", async () => {
    const now = Date.now();
    patchEodhdWsQuote("AAPL", {
      bid: 100,
      ask: 100.2,
      last: 100.1,
      quoteUpdatedAtMs: now,
      tradeUpdatedAtMs: now,
      extendedHours: false,
    });

    evaluateMock.mockResolvedValue({
      symbol: "AAPL",
      ok: true,
      code: "OK",
      reason: "ok",
      checkedAt: new Date().toISOString(),
    });

    const { resolveUsEquityLivePrice } = await import("@/lib/trading/us-equity-live-price");
    const r = await resolveUsEquityLivePrice("AAPL");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snap.quoteRoute).toBe("EODHD-WS");
      expect(r.snap.currentPrice).toBeCloseTo(100.1, 2);
      expect(r.snap.previousClose).toBe(98);
    }
  });
});
