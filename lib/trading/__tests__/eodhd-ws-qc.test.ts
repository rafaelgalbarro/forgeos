import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetEodhdWsQcForTests,
  EODHD_WS_VS_1M_MAX_PCT,
  evaluateEodhdWsQuality,
} from "@/lib/market-data/eodhd-ws-qc";
import {
  __resetEodhdWsStoreForTests,
  patchEodhdWsQuote,
} from "@/lib/market-data/eodhd-ws-store";

vi.mock("@/lib/trading/exchange-hours", () => ({
  isUsEodhdWsSession: () => true,
}));

describe("EODHD WS QC vs 1m candle", () => {
  beforeEach(() => {
    process.env.EODHD_API_KEY = "test-key";
    __resetEodhdWsStoreForTests();
    __resetEodhdWsQcForTests();
    vi.restoreAllMocks();
  });

  it("fails when WS mid vs 1m close differs >1%", async () => {
    const now = Date.now();
    patchEodhdWsQuote("AAPL", {
      bid: 100,
      ask: 100,
      last: 100,
      quoteUpdatedAtMs: now,
      tradeUpdatedAtMs: now,
      extendedHours: true,
    });

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{ close: 102 }],
    } as Response);

    const r = await evaluateEodhdWsQuality("AAPL", { alert: false });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("DIVERGENCE_1M");
    expect(r.divergencePct!).toBeGreaterThan(EODHD_WS_VS_1M_MAX_PCT);
  });

  it("passes when WS and 1m close agree within 1%", async () => {
    const now = Date.now();
    patchEodhdWsQuote("MSFT", {
      bid: 100,
      ask: 100.1,
      last: 100.05,
      quoteUpdatedAtMs: now,
      tradeUpdatedAtMs: now,
      extendedHours: false,
    });

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{ close: 100.02 }],
    } as Response);

    const r = await evaluateEodhdWsQuality("MSFT", { alert: false });
    expect(r.ok).toBe(true);
    expect(r.code).toBe("OK");
  });

  it("premarket: stale 1m candle (EODHD lag) does not block a fresh WS book", async () => {
    const now = Date.now();
    patchEodhdWsQuote("NVDA", {
      bid: 180,
      ask: 180.2,
      last: 180.1,
      quoteUpdatedAtMs: now,
      tradeUpdatedAtMs: now,
      extendedHours: true,
    });
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      // yesterday's last bar, 14 h old, 3% away
      json: async () => [{ close: 175, timestamp: Math.floor(now / 1000) - 14 * 3600 }],
    } as Response);

    const r = await evaluateEodhdWsQuality("NVDA", { alert: false });
    expect(r.ok).toBe(true);
    expect(r.reason).toMatch(/^ws-only/);
  });

  it("no 1m and wide spread still blocks", async () => {
    const now = Date.now();
    patchEodhdWsQuote("XYZ", {
      bid: 10,
      ask: 11,
      last: 10.5,
      quoteUpdatedAtMs: now,
      tradeUpdatedAtMs: now,
      extendedHours: true,
    });
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => [] } as Response);
    const r = await evaluateEodhdWsQuality("XYZ", { alert: false });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("NO_1M");
  });
});
