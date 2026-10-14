import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetEodhdWsStoreForTests } from "@/lib/market-data/eodhd-ws-store";

const getQuoteMock = vi.fn();
const readModeMock = vi.fn(() => "auto" as const);

vi.mock("@/lib/market-data/eodhd", () => ({
  getQuote: (...args: unknown[]) => getQuoteMock(...args),
}));

vi.mock("@/lib/trading/stocks-execution-gate", () => ({
  readEnvLocalKey: (key: string) => (key === "US_PRICE_SOURCE" ? readModeMock() : undefined),
}));

vi.mock("@/lib/trading/exchange-hours", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/trading/exchange-hours")>();
  return {
    ...actual,
    isUsEodhdWsSession: () => true,
    isUsPremarketSession: () => false,
  };
});

describe("resolveUsRegularSessionPrice", () => {
  beforeEach(() => {
    __resetEodhdWsStoreForTests();
    getQuoteMock.mockReset();
    readModeMock.mockReturnValue("auto");
  });

  it("uses EODHD REST in RTH when WS store is empty", async () => {
    getQuoteMock.mockResolvedValue({
      symbol: "AAPL",
      price: 171.25,
      previousClose: 170,
      change: 1.25,
      changePercentage: 0.7,
      open: 170.5,
      high: 172,
      low: 170,
      volume: 1_000_000,
      high52w: 200,
      low52w: 150,
      source: "EODHD",
      updatedAt: new Date().toISOString(),
    });

    const { resolveUsRegularSessionPrice } = await import("@/lib/trading/us-equity-live-price");
    const r = await resolveUsRegularSessionPrice("AAPL");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe("rest");
      expect(r.snap.currentPrice).toBe(171.25);
      expect(r.snap.quoteRoute).toBe("EODHD-REST");
    }
  });
});
