import { describe, expect, it } from "vitest";
import {
  getEuropeanEurEquity,
  resolveEuropeanContract,
  europeanQuoteRoutes,
  isEuropeanEurEquity,
} from "@/lib/trading/europe-equities";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";

describe("europe-equities contract resolve", () => {
  it("DTE resolves to Xetra/IBIS EUR — never DTE Energy / USD", () => {
    const c = resolveEuropeanContract("DTE");
    expect(c).not.toBeNull();
    expect(c!.primaryExchange).toBe("IBIS");
    expect(c!.currency).toBe("EUR");
    expect(c!.eodhd).toBe("DTE.XETRA");
    expect(c!.nameReject?.some((r) => /DTE ENERGY/i.test(r))).toBe(true);

    const routes = quoteRoutesForTicker("DTE");
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((r) => r.currency === "EUR")).toBe(true);
    expect(routes.every((r) => r.exchange !== "NYSE" && r.exchange !== "NASDAQ")).toBe(true);
    expect(routes.some((r) => r.exchange === "IBIS" || r.exchange === "SMART")).toBe(true);
  });

  it("TEF resolves to BME/BM EUR — never NYSE ADR", () => {
    const c = resolveEuropeanContract("TEF");
    expect(c).not.toBeNull();
    expect(c!.primaryExchange).toBe("BM");
    expect(c!.currency).toBe("EUR");
    expect(c!.eodhd).toBe("TEF.MC");

    const routes = quoteRoutesForTicker("TEF");
    expect(routes.every((r) => r.currency === "EUR")).toBe(true);
    expect(routes.every((r) => !/NYSE|NASDAQ/i.test(r.exchange + r.label))).toBe(true);
  });

  it("SAN/ITX/AENA/IBE are Spanish BM EUR", () => {
    for (const sym of ["SAN", "ITX", "AENA", "IBE", "BBVA"]) {
      expect(isEuropeanEurEquity(sym)).toBe(true);
      expect(getEuropeanEurEquity(sym)?.primaryExchange).toBe("BM");
      expect(europeanQuoteRoutes(sym).every((r) => r.currency === "EUR")).toBe(true);
    }
  });
});
