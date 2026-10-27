import { describe, expect, it } from "vitest";
import { killSwitchState } from "@/lib/forex-bot/killswitch";
import type { FxTrade } from "@/lib/forex-bot/types";

const t = (i: number, r: number, mode: FxTrade["mode"] = "live"): FxTrade => ({
  id: `x${i}`, strategy: "S", instrument: "EUR_USD", side: "long", units: 1000, entry: 1, stop: 0.99, takeProfit: 1.02,
  openedAt: new Date(Date.UTC(2026, 9, i)).toISOString(), closedAt: new Date(Date.UTC(2026, 9, i, 12)).toISOString(), mode, rMultiple: r, pnl: r,
});

describe("kill switch", () => {
  it("keeps a strategy with normal variance", () => {
    expect(killSwitchState([t(1, -1), t(2, -1), t(3, 1.5)], "S").demoted).toBe(false);
  });
  it("demotes after 4 real losses in a row", () => {
    expect(killSwitchState([t(1, 1), t(2, -1), t(3, -1), t(4, -1), t(5, -1)], "S").demoted).toBe(true);
  });
  it("revives when simulated trades after demotion reach +2R", () => {
    const tr = [t(1, -1), t(2, -1), t(3, -1), t(4, -1), t(6, 1.2, "shadow"), t(7, 1, "shadow")];
    expect(killSwitchState(tr, "S").demoted).toBe(false);
  });
});
