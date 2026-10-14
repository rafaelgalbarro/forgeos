import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  computeUsableEurForLocalStockBuy,
  pickStockAccountCapitalFromMap,
} from "@/lib/trading/stock-account-capital";

describe("stock-account-capital", () => {
  const prevEurAcct = process.env.IBKR_EUR_STOCKS_ACCOUNT_ID;
  const prevUsdAcct = process.env.IBKR_USD_STOCKS_ACCOUNT_ID;

  beforeEach(() => {
    process.env.IBKR_EUR_STOCKS_ACCOUNT_ID = "U15513057";
    process.env.IBKR_USD_STOCKS_ACCOUNT_ID = "U24225949";
  });

  afterEach(() => {
    if (prevEurAcct === undefined) delete process.env.IBKR_EUR_STOCKS_ACCOUNT_ID;
    else process.env.IBKR_EUR_STOCKS_ACCOUNT_ID = prevEurAcct;
    if (prevUsdAcct === undefined) delete process.env.IBKR_USD_STOCKS_ACCOUNT_ID;
    else process.env.IBKR_USD_STOCKS_ACCOUNT_ID = prevUsdAcct;
  });

  it("EUR stock uses U15513057 EUR — never U24225949 USD", () => {
    const map = {
      U24225949: {
        CashBalance_USD: { value: "143.39", currency: "USD" },
        CashBalance_EUR: { value: "0", currency: "EUR" },
      },
      U15513057: {
        CashBalance_EUR: { value: "2000", currency: "EUR" },
        CashBalance_USD: { value: "-1811", currency: "USD" },
      },
    };
    const mc = pickStockAccountCapitalFromMap(map, "MC");
    expect(mc.accountId).toBe("U15513057");
    expect(mc.currency).toBe("EUR");
    expect(mc.cash).toBe(2000);
    expect(mc.usableCash).toBeGreaterThan(200);
    expect(mc.usableCash).toBeLessThan(2000);

    const aapl = pickStockAccountCapitalFromMap(map, "AAPL");
    expect(aapl.accountId).toBe("U24225949");
    expect(aapl.currency).toBe("USD");
    expect(aapl.cash).toBeCloseTo(143.39, 2);
  });

  it("computeUsableEurForLocalStockBuy haircuts USD loan", () => {
    const r = computeUsableEurForLocalStockBuy({
      cashEur: 2000,
      cashUsd: -1811,
    });
    expect(r.usableEur).toBeGreaterThan(250);
    expect(r.usableEur).toBeLessThan(400);
    expect(r.detail).toMatch(/préstamo USD/i);
  });

  it("AIR/MC discard sizing uses EUR account — not $143 US wallet", () => {
    const map = {
      U24225949: { CashBalance_USD: { value: "143.39" } },
      U15513057: {
        CashBalance_EUR: { value: "2000" },
        CashBalance_USD: { value: "-1811" },
      },
    };
    for (const sym of ["MC", "AIR"]) {
      const pick = pickStockAccountCapitalFromMap(map, sym);
      expect(pick.accountId).toBe("U15513057");
      expect(pick.currency).toBe("EUR");
      expect(pick.usableCash).toBeGreaterThan(143.39);
      expect(pick.detail).toMatch(/U15513057/);
    }
  });
});
