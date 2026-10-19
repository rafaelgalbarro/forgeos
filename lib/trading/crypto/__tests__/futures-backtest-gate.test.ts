import { describe, expect, it } from "vitest";
import {
  evaluateOosLiveEligibility,
  futuresLiveGateForStrategy,
  gateKey,
  profitFactorFromNetPcts,
} from "@/lib/trading/crypto/futures-backtest-gate";

describe("futures backtest live gate", () => {
  it("requires ≥20 OOS trades, positive mean, PF > 1.2", () => {
    const badN = evaluateOosLiveEligibility({
      oosTrades: 19,
      meanNetPct: 0.5,
      profitFactor: 2,
    });
    expect(badN.eligible).toBe(false);

    const badPf = evaluateOosLiveEligibility({
      oosTrades: 25,
      meanNetPct: 0.2,
      profitFactor: 1.1,
    });
    expect(badPf.eligible).toBe(false);

    const ok = evaluateOosLiveEligibility({
      oosTrades: 25,
      meanNetPct: 0.2,
      profitFactor: 1.3,
    });
    expect(ok.eligible).toBe(true);
  });

  it("profit factor sums wins over losses", () => {
    expect(profitFactorFromNetPcts([1, 1, -1])).toBeCloseTo(2);
  });

  it("blocks live when no persisted report", () => {
    expect(futuresLiveGateForStrategy("VWAP_BOUNCE_5M", "long").ok).toBe(false);
    expect(gateKey("VWAP_BOUNCE_5M_SHORT", "short")).toBe(
      "VWAP_BOUNCE_5M_SHORT|short",
    );
  });
});
