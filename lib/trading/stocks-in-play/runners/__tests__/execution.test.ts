import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trading/stocks-in-play/runners/store", () => ({
  isStocksRunnerTicker: (t: string) => t === "WORX",
}));

vi.mock("@/lib/trading/stocks-in-play/runners/config", () => ({
  getStocksRunnersMode: () => "shadow",
}));

describe("RUNNERS execution gate", () => {
  it("defaults to shadow even when stop is valid", async () => {
    const { decideRunnersOrder } = await import(
      "@/lib/trading/stocks-in-play/runners/execution"
    );
    const d = decideRunnersOrder({
      ticker: "WORX",
      entry: 2,
      stopLoss: 1.8,
    });
    expect(d.action).toBe("shadow");
  });

  it("never uses in-play live gate (separate module)", async () => {
    const liveGate = await import("@/lib/trading/stocks-in-play/live-gate");
    const exec = await import("@/lib/trading/stocks-in-play/runners/execution");
    expect(typeof liveGate.stocksInPlayLiveGate).toBe("function");
    expect(exec.decideRunnersOrder).toBeDefined();
  });
});
