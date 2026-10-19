import { describe, expect, it } from "vitest";
import { composeEodhdWsSubscriptionList } from "@/lib/trading/stocks-in-play/ws-subscriptions";

describe("in-play WS subscription split", () => {
  it("prioritizes fixed then in-play; runners last", () => {
    const picked = composeEodhdWsSubscriptionList({
      pendingPremarket: ["PEND1"],
      fixedUniverse: ["AAPL", "MSFT"],
      inPlay: ["IP1"],
      cycleCandidates: ["RUN1", "C1"],
      runners: ["RUN1"],
      max: 6,
    });
    expect(picked).toEqual(["PEND1", "AAPL", "MSFT", "IP1", "C1", "RUN1"]);
  });
});
