import { describe, expect, it } from "vitest";
import {
  annualDividendTotals,
  consecutiveRisingDividendYears,
  nextQuarterStartIso,
  passesValueScreen,
} from "@/lib/investment/long-term-portfolio";
import type { YahooFundamentals } from "@/lib/market-data/yahoo-finance";

function fund(partial: Partial<YahooFundamentals>): YahooFundamentals {
  return {
    symbol: "TEST",
    trailingPE: null,
    priceToBook: null,
    returnOnEquity: null,
    debtToEquity: null,
    dividendYield: null,
    dividendRate: null,
    recommendationKey: null,
    recommendationMean: null,
    marketCap: null,
    repurchaseOfStock: null,
    modulesPresent: [],
    modulesMissing: [],
    ...partial,
  };
}

describe("long-term portfolio helpers", () => {
  it("nextQuarterStartIso advances to next quarter boundary", () => {
    expect(nextQuarterStartIso(new Date("2026-02-10T12:00:00Z"))).toBe(
      new Date(Date.UTC(2026, 3, 1)).toISOString(),
    );
    expect(nextQuarterStartIso(new Date("2026-11-01T00:00:00Z"))).toBe(
      new Date(Date.UTC(2027, 0, 1)).toISOString(),
    );
  });

  it("counts consecutive rising dividend years", () => {
    const annual = annualDividendTotals([
      { type: "dividend", date: "2019-03-01T00:00:00.000Z", amount: 1 },
      { type: "dividend", date: "2019-09-01T00:00:00.000Z", amount: 1 },
      { type: "dividend", date: "2020-03-01T00:00:00.000Z", amount: 2.1 },
      { type: "dividend", date: "2021-03-01T00:00:00.000Z", amount: 2.3 },
      { type: "dividend", date: "2022-03-01T00:00:00.000Z", amount: 2.5 },
      { type: "dividend", date: "2023-03-01T00:00:00.000Z", amount: 2.7 },
      { type: "dividend", date: "2024-03-01T00:00:00.000Z", amount: 3.0 },
      { type: "dividend", date: "2025-03-01T00:00:00.000Z", amount: 3.2 },
    ]);
    expect(consecutiveRisingDividendYears(annual)).toBeGreaterThanOrEqual(5);
  });

  it("passesValueScreen enforces Phase L criteria", () => {
    expect(
      passesValueScreen(
        fund({
          trailingPE: 12,
          priceToBook: 1.2,
          returnOnEquity: 0.18,
          debtToEquity: 0.4,
        }),
      ).passes,
    ).toBe(true);

    expect(
      passesValueScreen(
        fund({
          trailingPE: 20,
          priceToBook: 1.2,
          returnOnEquity: 0.18,
          debtToEquity: 0.4,
        }),
      ).passes,
    ).toBe(false);

    expect(passesValueScreen(fund({ trailingPE: 10 })).missingFields).toContain("P/B");
  });
});
