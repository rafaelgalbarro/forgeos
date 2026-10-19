import { describe, expect, it, vi } from "vitest";
import { capInPlayShares, decideInPlayOrder } from "@/lib/trading/stocks-in-play/execution";
import { passesInPlayCostFilter } from "@/lib/trading/stocks-in-play/cost-gate";

vi.mock("@/lib/trading/stocks-in-play/store", () => ({
  isStocksInPlayTicker: (t: string) => t.toUpperCase() === "PLAY",
}));

vi.mock("@/lib/trading/journal/trades", () => ({
  readJournalTrades: () => [],
}));

vi.mock("@/lib/trading/stocks-in-play/config", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/trading/stocks-in-play/config")>();
  return {
    ...orig,
    getStocksInPlayMode: () => "shadow" as const,
  };
});

describe("in-play execution caps", () => {

  it("caps notional to $50 whole shares", () => {
    const r = capInPlayShares({ shares: 10, price: 20, fractional: false });
    expect(r.shares).toBe(2);
    expect(r.fractional).toBe(false);
  });

  it("cost filter requires 3× round-trip coverage", () => {
    const ok = passesInPlayCostFilter({
      entry: 20,
      target: 21.5,
      qty: 1,
      spreadPct: 0.1,
    });
    expect(ok.ok).toBe(true);
  });

  it("shadow mode never returns live_ok", () => {
    const d = decideInPlayOrder({
      ticker: "PLAY",
      entry: 20,
      target: 24,
      stopLoss: 19,
      shares: 1,
      spreadPct: 0.1,
    });
    expect(d.action).toBe("shadow");
  });
});
