import { describe, expect, it } from "vitest";
import { parseKrakenFuturesAccountsPayload } from "@/lib/brokers/kraken-futures/adapter";

describe("parseKrakenFuturesAccountsPayload", () => {
  it("reads flex margin from object-keyed accounts (Kraken API shape)", () => {
    const acct = parseKrakenFuturesAccountsPayload({
      accounts: {
        flex: {
          type: "multiCollateralMarginAccount",
          availableMargin: 55.8585,
          portfolioValue: 55.8585,
          currency: "EUR",
        },
        cash: {
          type: "cashAccount",
          availableMargin: 0,
          portfolioValue: 10,
        },
      },
    });
    expect(acct.flexAccount).toBe(true);
    expect(acct.availableMargin).toBeCloseTo(55.8585, 4);
    expect(acct.balanceValue).toBeCloseTo(55.8585, 4);
  });

  it("still supports legacy array-shaped accounts", () => {
    const acct = parseKrakenFuturesAccountsPayload({
      accounts: [
        {
          type: "multiCollateralMarginAccount",
          availableMargin: 12,
          portfolioValue: 12,
          currency: "USD",
        },
      ],
    });
    expect(acct.availableMargin).toBe(12);
  });
});
