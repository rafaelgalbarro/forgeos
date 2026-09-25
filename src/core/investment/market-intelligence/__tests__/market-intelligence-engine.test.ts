import { describe, expect, it } from "vitest";
import type {
  EconomicProvider,
  MarketProvider,
  NewsProvider,
  SentimentProvider,
} from "../domain";
import { MarketIntelligenceEngine } from "../application";
import { createProviderRegistryFromEnv } from "../infrastructure";

function marketProvider(
  id: string,
  impl: MarketProvider["fetchMarketSnapshots"],
): MarketProvider {
  return {
    meta: { id, kind: "market", displayName: id },
    fetchMarketSnapshots: impl,
  };
}

function newsProvider(id: string, impl: NewsProvider["fetchNews"]): NewsProvider {
  return {
    meta: { id, kind: "news", displayName: id },
    fetchNews: impl,
  };
}

function economicProvider(
  id: string,
  impl: EconomicProvider["fetchEconomicIndicators"],
): EconomicProvider {
  return {
    meta: { id, kind: "economic", displayName: id },
    fetchEconomicIndicators: impl,
  };
}

function sentimentProvider(
  id: string,
  impl: SentimentProvider["fetchSentimentSignals"],
): SentimentProvider {
  return {
    meta: { id, kind: "sentiment", displayName: id },
    fetchSentimentSignals: impl,
  };
}

describe("MarketIntelligenceEngine", () => {
  it("works in single-provider mode", async () => {
    const engine = new MarketIntelligenceEngine({
      marketProviders: [
        marketProvider("alpha-vantage", async (request, context) =>
          request.symbols.map((symbol) => ({
            symbol,
            capturedAt: context.nowIso,
            providerId: "alpha-vantage",
            quote: {
              symbol,
              currency: "USD",
              price: 123.45,
              timestamp: context.nowIso,
              providerId: "alpha-vantage",
            },
          })),
        ),
      ],
      clock: () => "2026-07-30T10:00:00.000Z",
    });

    const result = await engine.gather({ symbols: ["AAPL"] });
    expect(result.marketSnapshots).toHaveLength(1);
    expect(result.marketSnapshots[0]?.quote?.price).toBe(123.45);
    expect(result.providersUsed).toEqual(["alpha-vantage"]);
    expect(result.errors).toHaveLength(0);
  });

  it("aggregates multiple providers", async () => {
    const engine = new MarketIntelligenceEngine({
      marketProviders: [
        marketProvider("polygon", async (request, context) => [
          {
            symbol: request.symbols[0] ?? "MSFT",
            capturedAt: context.nowIso,
            providerId: "polygon",
          },
        ]),
      ],
      newsProviders: [
        newsProvider("newsapi", async (_request, context) => [
          {
            id: "n-1",
            title: "Macro update",
            url: "https://example.com/news/1",
            source: "Example News",
            publishedAt: context.nowIso,
            providerId: "newsapi",
          },
        ]),
      ],
      economicProviders: [
        economicProvider("fred", async (_request) => [
          {
            key: "CPI",
            label: "Consumer Price Index",
            value: 2.4,
            period: "2026-06",
            providerId: "fred",
          },
        ]),
      ],
      sentimentProviders: [
        sentimentProvider("rss", async (_request, context) => [
          {
            signalId: "s-1",
            target: "AAPL",
            score: 0.3,
            confidence: 0.66,
            timestamp: context.nowIso,
            providerId: "rss",
          },
        ]),
      ],
    });

    const result = await engine.gather({ symbols: ["MSFT"], economicKeys: ["CPI"] });
    expect(result.marketSnapshots).toHaveLength(1);
    expect(result.news).toHaveLength(1);
    expect(result.economicIndicators).toHaveLength(1);
    expect(result.sentiment).toHaveLength(1);
    expect(result.providersUsed.sort()).toEqual(["fred", "newsapi", "polygon", "rss"].sort());
  });

  it("isolates provider failures", async () => {
    const engine = new MarketIntelligenceEngine({
      marketProviders: [
        marketProvider("failing-provider", async () => {
          throw new Error("network timeout");
        }),
        marketProvider("healthy-provider", async (_request, context) => [
          {
            symbol: "NVDA",
            capturedAt: context.nowIso,
            providerId: "healthy-provider",
          },
        ]),
      ],
    });

    const result = await engine.gather({ symbols: ["NVDA"] });
    expect(result.marketSnapshots).toHaveLength(1);
    expect(result.errors).toEqual([
      { providerId: "failing-provider", kind: "market", message: "network timeout" },
    ]);
    expect(
      result.health.some(
        (entry) => entry.providerId === "healthy-provider" && entry.kind === "market" && entry.ok,
      ),
    ).toBe(true);
  });

  it("keeps adapter contract compliance through registry", () => {
    const providers = createProviderRegistryFromEnv({
      FORGEOS_MARKET_PROVIDERS:
        "alpha-vantage,polygon,finnhub,fmp,twelve-data,newsapi,fred,ecb,yahoo-finance,rss",
    });

    expect(providers.marketProviders.map((provider) => provider.meta.id)).toEqual(
      expect.arrayContaining([
        "alpha-vantage",
        "polygon",
        "finnhub",
        "fmp",
        "twelve-data",
        "yahoo-finance",
      ]),
    );
    expect(providers.newsProviders.map((provider) => provider.meta.id)).toEqual(
      expect.arrayContaining(["newsapi", "rss", "yahoo-finance"]),
    );
    expect(providers.economicProviders.map((provider) => provider.meta.id)).toEqual(
      expect.arrayContaining(["fred", "ecb"]),
    );
    expect(providers.sentimentProviders.map((provider) => provider.meta.id)).toEqual(
      expect.arrayContaining([
        "newsapi",
        "rss",
        "yahoo-finance",
        "finnhub",
        "alpha-vantage",
      ]),
    );
  });
});
