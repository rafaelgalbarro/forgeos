import { afterEach, describe, expect, it, vi } from "vitest";

describe("AA: Kraken Futures public payload ({result:'success', ...})", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loadInstruments reads PF_* rows when result is the string 'success'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "success",
        instruments: [
          { symbol: "PF_ETHUSD", tradeable: true, tickSize: 0.1, contractSize: 1, contractValueTradePrecision: 3 },
          { symbol: "PI_XBTUSD", tradeable: true },
        ],
      }),
    } as Response);
    const { KrakenFuturesAdapter } = await import("@/lib/brokers/kraken-futures/adapter");
    const meta = await new KrakenFuturesAdapter().getInstrument("PF_ETHUSD");
    expect(meta?.tickSize).toBe(0.1);
    expect(meta?.contractValueTradePrecision).toBe(3);
  });
});
