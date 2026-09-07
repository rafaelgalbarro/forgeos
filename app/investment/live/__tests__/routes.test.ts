import { describe, expect, it } from "vitest";

describe("investment live route", () => {
  it("exports page component", async () => {
    const mod = await import("../page");
    expect(typeof mod.default).toBe("function");
  }, 30_000);

  it("exports loading and error boundaries", async () => {
    const loading = await import("../loading");
    const error = await import("../error");
    expect(typeof loading.default).toBe("function");
    expect(typeof error.default).toBe("function");
  });

  it("live snapshot API stays read-only and locked by default", async () => {
    const prevLive = process.env.LIVE_TRADING_ENABLED;
    const prevReadOnly = process.env.IBKR_READ_ONLY;
    const prevMode = process.env.TRADING_MODE;
    process.env.LIVE_TRADING_ENABLED = "false";
    process.env.IBKR_READ_ONLY = "true";
    process.env.TRADING_MODE = "ANALYSIS_ONLY";
    try {
      const route = await import("../../../api/investment/live/route");
      expect(typeof route.GET).toBe("function");
      const response = await route.GET();
      const body = await response.json();
      expect(body.orderExecution).toBe("disabled");
      expect(body.mode).toBe("ANALYSIS_ONLY");
      expect(body.safety.liveTradingEnabled).toBe(false);
      expect(body.safety.ibkrReadOnly).toBe(true);
      expect(body.safety.state).toBe("LOCKED");
      expect(body.safety.autonomousLock).toBe("LOCKED");
      expect(body.operations.ordersSubmitted).toBe(0);
      expect(Array.isArray(body.candidates)).toBe(true);
      expect(body.systemState).toBeTruthy();
      expect(body.brokerState).toBeTruthy();
      expect(body.strategyReadiness?.goLiveDecision).toBe("NOT_READY_FOR_LIVE");
      expect(body.strategyReadiness?.unlockEligible).toBe(false);
      expect(Array.isArray(body.strategyReadiness?.gates)).toBe(true);
      expect(body.goLiveUnlock?.blocked).toBe(true);
      expect(body.goLiveUnlock?.buttonEnabled).toBe(false);
      expect(body.goLiveUnlock?.liveTradingEnabled).toBe(false);
    } finally {
      if (prevLive === undefined) delete process.env.LIVE_TRADING_ENABLED;
      else process.env.LIVE_TRADING_ENABLED = prevLive;
      if (prevReadOnly === undefined) delete process.env.IBKR_READ_ONLY;
      else process.env.IBKR_READ_ONLY = prevReadOnly;
      if (prevMode === undefined) delete process.env.TRADING_MODE;
      else process.env.TRADING_MODE = prevMode;
    }
  }, 30_000);

  it("Live Trading remains reachable under Strategies section", async () => {
    const nav = await import("@/components/investment/InvestmentWorkspaceNav");
    expect(typeof nav.InvestmentWorkspaceNav).toBe("function");
    const strategies = nav.INVESTMENT_NAV_LINKS.find((l) => l.id === "strategies");
    expect(strategies?.href).toBe("/investment/strategies");
    const livePage = await import("../page");
    expect(typeof livePage.default).toBe("function");
  });
});
