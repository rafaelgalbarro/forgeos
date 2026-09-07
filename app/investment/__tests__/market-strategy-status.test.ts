import { describe, expect, it } from "vitest";
import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";
import { getStrategyCatalogSnapshot } from "@/lib/investment/strategy-catalog";

describe("investment MI + strategy status helpers", () => {
  it("returns ANALYSIS_ONLY MI status without inventing providers", () => {
    const status = getMarketIntelligenceStatus({});
    expect(status.mode).toBe("ANALYSIS_ONLY");
    expect(status.orderExecution).toBe("disabled");
    expect(status.totalConfigured).toBe(0);
    expect(status.totalKnown).toBeGreaterThanOrEqual(11);
    expect(status.providers.every((provider) => provider.status === "NOT_CONFIGURED")).toBe(true);
    expect(status.providers.find((provider) => provider.id === "ecb")?.dataTypes).toContain("economic");
    expect(status.tradeGate).toBe("NO_TRADE_ON_DELAYED_OR_STALE");
    expect(status.assetClassesSupported).toContain("stocks");
  });

  it("reports configured zero-key providers without hiding the remaining catalog", () => {
    const status = getMarketIntelligenceStatus({
      ECB_ENABLED: "true",
      WORLDBANK_ENABLED: "true",
      RSS_FEED_URLS: "https://www.federalreserve.gov/feeds/press_all.xml",
    });

    expect(status.totalConfigured).toBe(3);
    expect(status.providers.find((provider) => provider.id === "ecb")?.status).toBe("CONFIGURED");
    expect(status.providers.find((provider) => provider.id === "polygon")?.status).toBe(
      "NOT_CONFIGURED",
    );
    expect(status.economicProviders.map((provider) => provider.id)).toEqual(
      expect.arrayContaining(["ecb", "worldbank"]),
    );
    expect(status.newsProviders.some((provider) => provider.id === "rss")).toBe(true);
  });

  it("lists Strategy Engine catalog as NOT_READY / LOCKED", () => {
    const catalog = getStrategyCatalogSnapshot();
    expect(catalog.mode).toBe("ANALYSIS_ONLY");
    expect(catalog.orderExecution).toBe("disabled");
    expect(catalog.strategyReadiness).toBe("NOT_READY");
    expect(catalog.autonomousLive).toBe("LOCKED");
    expect(catalog.count).toBeGreaterThan(0);
    expect(catalog.strategies[0]?.strategyId).toBeTruthy();
  });
});
