import { describe, expect, it } from "vitest";
import {
  parseKrakenFuturesAccountsPayload,
  unwrapKrakenFuturesPrivatePayload,
} from "@/lib/brokers/kraken-futures/adapter";

const REAL_FLEX = {
  type: "multiCollateralMarginAccount",
  initialMargin: 0,
  initialMarginWithOrders: 0,
  maintenanceMargin: 0,
  balanceValue: 56.1445,
  portfolioValue: 56.1445,
  collateralValue: 56.1445,
  pnl: 0,
  unrealizedFunding: 0,
  totalUnrealized: 0,
  totalUnrealizedAsMargin: 0,
  availableMargin: 56.1445,
  marginEquity: 56.1445,
  excludedCollateralValue: 0,
  currencies: {
    EUR: {
      quantity: 50,
      value: 56.1445,
      collateral: 56.1445,
      available: 50,
      excludedCollateral: 0,
    },
  },
};

describe("unwrapKrakenFuturesPrivatePayload", () => {
  it("keeps top-level accounts when result is success string", () => {
    const payload = unwrapKrakenFuturesPrivatePayload<Record<string, unknown>>({
      result: "success",
      accounts: { flex: REAL_FLEX },
      serverTime: "2026-10-19T12:00:00.000Z",
    });
    expect(payload.accounts).toBeDefined();
    expect((payload.accounts as { flex: unknown }).flex).toEqual(REAL_FLEX);
  });
});

describe("parseKrakenFuturesAccountsPayload", () => {
  it("reads flex from real Kraken GET /accounts object shape", () => {
    const body = unwrapKrakenFuturesPrivatePayload<Record<string, unknown>>({
      result: "success",
      accounts: {
        cash: {
          type: "cashAccount",
          portfolioValue: 10,
        },
        fi_xbtusd: {
          type: "marginAccount",
          currency: "xbt",
          availableMargin: 999,
          portfolioValue: 999,
        },
        fi_ethusd: {
          type: "marginAccount",
          currency: "eth",
          availableMargin: 888,
        },
        flex: REAL_FLEX,
      },
      serverTime: "2026-10-19T12:00:00.000Z",
    });
    const acct = parseKrakenFuturesAccountsPayload(body);
    expect(acct.flexAccount).toBe(true);
    expect(acct.currency).toBe("USD");
    expect(acct.availableMargin).toBeCloseTo(56.1445, 4);
    expect(acct.balanceValue).toBeCloseTo(56.1445, 4);
  });

  it("finds multiCollateralMarginAccount when flex key is absent", () => {
    const acct = parseKrakenFuturesAccountsPayload({
      accounts: {
        cash: { type: "cashAccount", availableMargin: 0 },
        mc: REAL_FLEX,
      },
    });
    expect(acct.availableMargin).toBeCloseTo(56.1445, 4);
    expect(acct.currency).toBe("USD");
  });

  it("does not fall back to cash or fi_* margin accounts", () => {
    const acct = parseKrakenFuturesAccountsPayload({
      accounts: {
        cash: { type: "cashAccount", availableMargin: 10, portfolioValue: 10 },
        fi_solusd: {
          type: "marginAccount",
          currency: "sol",
          availableMargin: 42,
          portfolioValue: 42,
        },
      },
    });
    expect(acct.flexAccount).toBe(false);
    expect(acct.availableMargin).toBe(0);
  });

  it("supports legacy array-shaped accounts with flex entry only", () => {
    const acct = parseKrakenFuturesAccountsPayload({
      accounts: [REAL_FLEX],
    });
    expect(acct.availableMargin).toBeCloseTo(56.1445, 4);
    expect(acct.flexAccount).toBe(true);
  });
});
