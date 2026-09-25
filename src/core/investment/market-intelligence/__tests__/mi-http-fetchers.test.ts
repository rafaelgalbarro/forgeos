import { describe, expect, it } from "vitest";
import { createPolygonMarketFetcher } from "../infrastructure/adapters/polygon";
import { createFinnhubMarketFetcher } from "../infrastructure/adapters/finnhub";
import { createAlphaVantageMarketFetcher } from "../infrastructure/adapters/alpha-vantage";
import { createFmpMarketFetcher } from "../infrastructure/adapters/fmp";
import { createTwelveDataMarketFetcher } from "../infrastructure/adapters/twelve-data";
import { createYahooMarketFetcher } from "../infrastructure/adapters/yahoo-finance";
import { createNewsApiNewsFetcher } from "../infrastructure/adapters/news-api";
import { createFredEconomicFetcher } from "../infrastructure/adapters/fred";
import { createEcbEconomicFetcher } from "../infrastructure/adapters/ecb";
import { createRssNewsFetcher } from "../infrastructure/adapters/rss";
import { createFinnhubSentimentFetcher, createFinnhubNewsFetcher } from "../infrastructure/adapters/finnhub";
import { createAlphaVantageSentimentFetcher, createAlphaVantageNewsFetcher, createAlphaVantageEconomicFetcher } from "../infrastructure/adapters/alpha-vantage";
import { createFmpNewsFetcher } from "../infrastructure/adapters/fmp";
import { createPolygonNewsFetcher } from "../infrastructure/adapters/polygon";
import { createWorldBankEconomicFetcher } from "../infrastructure/adapters/worldbank";
import { mapVendorAssetClass } from "../infrastructure/adapters/http-shared";
import { createProviderRegistryFromEnv } from "../infrastructure/provider-registry";

describe("MI market HTTP fetchers", () => {
  it("returns empty when API key is missing (never invents quotes)", async () => {
    const polygon = createPolygonMarketFetcher({ env: {}, jsonFetcher: async () => ({}) });
    const finnhub = createFinnhubMarketFetcher({ env: {}, jsonFetcher: async () => ({}) });
    const alpha = createAlphaVantageMarketFetcher({ env: {}, jsonFetcher: async () => ({}) });
    const fmp = createFmpMarketFetcher({ env: {}, jsonFetcher: async () => ({}) });
    const twelve = createTwelveDataMarketFetcher({ env: {}, jsonFetcher: async () => ({}) });
    const yahoo = createYahooMarketFetcher({ env: {}, jsonFetcher: async () => ({}) });
    await expect(polygon({ symbols: ["AAPL"] })).resolves.toEqual([]);
    await expect(finnhub({ symbols: ["AAPL"] })).resolves.toEqual([]);
    await expect(alpha({ symbols: ["AAPL"] })).resolves.toEqual([]);
    await expect(fmp({ symbols: ["AAPL"] })).resolves.toEqual([]);
    await expect(twelve({ symbols: ["AAPL"] })).resolves.toEqual([]);
    await expect(yahoo({ symbols: ["AAPL"] })).resolves.toEqual([]);
  });

  it("maps polygon aggregates into snapshots with volume and assetClass", async () => {
    const fetcher = createPolygonMarketFetcher({
      apiKey: "test-key",
      jsonFetcher: async (url) => {
        if (url.includes("/v3/reference/tickers/")) {
          return { results: { type: "CS", market: "stocks" } };
        }
        return {
          results: [
            { t: Date.parse("2026-07-01"), o: 1, h: 2, l: 0.5, c: 1.5, v: 1000 },
            { t: Date.parse("2026-07-02"), o: 1.5, h: 2.5, l: 1.2, c: 2, v: 2000 },
          ],
        };
      },
    });
    const snaps = await fetcher({ symbols: ["AAPL"] });
    expect(snaps).toHaveLength(1);
    expect(snaps[0]?.quote?.price).toBe(2);
    expect(snaps[0]?.assetClass).toBe("equity");
    expect(snaps[0]?.timeSeries?.points.at(-1)?.volume).toBe(2000);
  });

  it("maps FMP historical rows into snapshots", async () => {
    const fetcher = createFmpMarketFetcher({
      apiKey: "test-key",
      jsonFetcher: async (url) => {
        if (url.includes("/profile")) return [{ isEtf: false }];
        return {
          historical: [
            { date: "2026-07-02", open: 2, high: 3, low: 1, close: 2.5, volume: 50 },
            { date: "2026-07-01", open: 1, high: 2, low: 0.5, close: 1.5, volume: 40 },
          ],
        };
      },
    });
    const snaps = await fetcher({ symbols: ["AAPL"] });
    expect(snaps).toHaveLength(1);
    expect(snaps[0]?.quote?.price).toBe(2.5);
    expect(snaps[0]?.timeSeries?.points).toHaveLength(2);
  });

  it("registers market providers when env keys present", () => {
    const set = createProviderRegistryFromEnv({
      POLYGON_API_KEY: "x",
      FINNHUB_API_KEY: "y",
      ALPHA_VANTAGE_API_KEY: "z",
      FMP_API_KEY: "f",
      TWELVE_DATA_API_KEY: "t",
      YAHOO_FINANCE_ENABLED: "true",
    });
    expect(set.marketProviders.map((p) => p.meta.id).sort()).toEqual([
      "alpha-vantage",
      "finnhub",
      "fmp",
      "polygon",
      "twelve-data",
      "yahoo-finance",
    ]);
  });

  it("maps vendor asset classes without inventing unknown types as equity", () => {
    expect(mapVendorAssetClass("ETF")).toBe("etf");
    expect(mapVendorAssetClass("CS")).toBe("equity");
    expect(mapVendorAssetClass(undefined)).toBeUndefined();
  });
});

describe("MI news/economic/sentiment HTTP fetchers", () => {
  it("returns empty when keys/flags unset", async () => {
    await expect(
      createNewsApiNewsFetcher({ env: {} })({ symbols: ["AAPL"] }),
    ).resolves.toEqual([]);
    await expect(createFredEconomicFetcher({ env: {} })({ symbols: [] })).resolves.toEqual([]);
    await expect(createEcbEconomicFetcher({ env: {} })({ symbols: [] })).resolves.toEqual([]);
    await expect(createRssNewsFetcher({ env: {} })({ symbols: [] })).resolves.toEqual([]);
  });

  it("parses NewsAPI articles when key present", async () => {
    const fetcher = createNewsApiNewsFetcher({
      apiKey: "k",
      jsonFetcher: async () => ({
        status: "ok",
        articles: [
          {
            title: "Markets rally",
            url: "https://example.com/a",
            publishedAt: "2026-08-01T00:00:00Z",
            source: { name: "Example" },
          },
        ],
      }),
    });
    const items = await fetcher({ symbols: ["AAPL"], limitNewsItems: 5 });
    expect(items).toHaveLength(1);
    expect(items[0]?.providerId).toBe("newsapi");
  });

  it("parses FRED observation when key present", async () => {
    const fetcher = createFredEconomicFetcher({
      apiKey: "k",
      jsonFetcher: async () => ({
        observations: [{ date: "2026-01-01", value: "3.5" }],
      }),
    });
    const rows = await fetcher({ symbols: [], economicKeys: ["FEDFUNDS"] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBe(3.5);
  });

  it("parses RSS items when feed URLs set", async () => {
    const fetcher = createRssNewsFetcher({
      env: { RSS_FEED_URLS: "https://example.com/feed.xml" },
      textFetcher: async () =>
        `<?xml version="1.0"?><rss><channel><item><title>Hello</title><link>https://example.com/1</link><pubDate>Mon, 03 Aug 2026 12:00:00 GMT</pubDate></item></channel></rss>`,
    });
    const items = await fetcher({ symbols: [], limitNewsItems: 5 });
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Hello");
  });

  it("uses Finnhub vendor news-sentiment when key present", async () => {
    const fetcher = createFinnhubSentimentFetcher({
      apiKey: "k",
      jsonFetcher: async () => ({
        companyNewsScore: 0.7,
        sentiment: { bullishPercent: 0.6, bearishPercent: 0.2 },
      }),
    });
    const rows = await fetcher({ symbols: ["AAPL"] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.providerId).toBe("finnhub");
    expect(rows[0]?.score).toBeCloseTo(0.4);
    expect(rows[0]?.rationale).toContain("Finnhub news-sentiment");
  });

  it("uses Alpha Vantage NEWS_SENTIMENT when key present", async () => {
    const fetcher = createAlphaVantageSentimentFetcher({
      apiKey: "k",
      jsonFetcher: async () => ({
        feed: [
          {
            title: "Markets rise",
            overall_sentiment_score: "0.25",
            overall_sentiment_label: "Somewhat-Bullish",
            time_published: "20260801T120000",
            url: "https://example.com/x",
          },
        ],
      }),
    });
    const rows = await fetcher({ symbols: ["MSFT"] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.providerId).toBe("alpha-vantage");
    expect(rows[0]?.score).toBeCloseTo(0.25);
  });

  it("vendor sentiment returns empty without keys", async () => {
    await expect(createFinnhubSentimentFetcher({ env: {} })({ symbols: ["AAPL"] })).resolves.toEqual(
      [],
    );
    await expect(
      createAlphaVantageSentimentFetcher({ env: {} })({ symbols: ["AAPL"] }),
    ).resolves.toEqual([]);
  });

  it("parses Finnhub company-news when key present", async () => {
    const fetcher = createFinnhubNewsFetcher({
      apiKey: "k",
      jsonFetcher: async () => [
        {
          id: 1,
          headline: "AAPL announces product",
          summary: "Details",
          url: "https://example.com/fh",
          datetime: 1_722_000_000,
          source: "Finnhub",
        },
      ],
    });
    const items = await fetcher({ symbols: ["AAPL"], limitNewsItems: 5 });
    expect(items).toHaveLength(1);
    expect(items[0]?.providerId).toBe("finnhub");
    expect(items[0]?.title).toContain("AAPL");
  });

  it("Finnhub company-news returns empty without key", async () => {
    await expect(createFinnhubNewsFetcher({ env: {} })({ symbols: ["AAPL"] })).resolves.toEqual([]);
  });

  it("registers Finnhub news provider when key present", () => {
    const set = createProviderRegistryFromEnv({ FINNHUB_API_KEY: "k" });
    expect(set.newsProviders.some((p) => p.meta.id === "finnhub")).toBe(true);
    expect(set.marketProviders.some((p) => p.meta.id === "finnhub")).toBe(true);
  });

  it("parses Polygon / FMP / Alpha Vantage news when keys present", async () => {
    const polygon = createPolygonNewsFetcher({
      apiKey: "k",
      jsonFetcher: async () => ({
        results: [
          {
            id: "1",
            title: "Poly headline",
            article_url: "https://example.com/p",
            published_utc: "2026-08-01T00:00:00Z",
            publisher: { name: "Poly" },
            tickers: ["AAPL"],
          },
        ],
      }),
    });
    const fmp = createFmpNewsFetcher({
      apiKey: "k",
      jsonFetcher: async () => [
        {
          title: "FMP headline",
          url: "https://example.com/f",
          publishedDate: "2026-08-01T00:00:00Z",
          site: "FMP",
        },
      ],
    });
    const av = createAlphaVantageNewsFetcher({
      apiKey: "k",
      jsonFetcher: async () => ({
        feed: [
          {
            title: "AV headline",
            url: "https://example.com/a",
            time_published: "20260801T120000",
            source: "AV",
          },
        ],
      }),
    });
    await expect(polygon({ symbols: ["AAPL"] })).resolves.toHaveLength(1);
    await expect(fmp({ symbols: ["AAPL"] })).resolves.toHaveLength(1);
    await expect(av({ symbols: ["AAPL"] })).resolves.toHaveLength(1);
  });

  it("registers Polygon/FMP/AV news when keys present", () => {
    expect(
      createProviderRegistryFromEnv({ POLYGON_API_KEY: "k" }).newsProviders.some(
        (p) => p.meta.id === "polygon",
      ),
    ).toBe(true);
    expect(
      createProviderRegistryFromEnv({ FMP_API_KEY: "k" }).newsProviders.some((p) => p.meta.id === "fmp"),
    ).toBe(true);
    expect(
      createProviderRegistryFromEnv({ ALPHA_VANTAGE_API_KEY: "k" }).newsProviders.some(
        (p) => p.meta.id === "alpha-vantage",
      ),
    ).toBe(true);
  });

  it("World Bank returns empty when disabled", async () => {
    await expect(createWorldBankEconomicFetcher({ env: {} })({ symbols: [] })).resolves.toEqual([]);
  });

  it("parses World Bank indicator when enabled", async () => {
    const fetcher = createWorldBankEconomicFetcher({
      env: { WORLDBANK_ENABLED: "true", WORLDBANK_COUNTRY: "USA" },
      jsonFetcher: async () => [
        { page: 1 },
        [{ value: 2.5, date: "2024" }],
      ],
    });
    const rows = await fetcher({ symbols: [], economicKeys: ["FP.CPI.TOTL.ZG"] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.providerId).toBe("worldbank");
    expect(rows[0]?.value).toBe(2.5);
  });

  it("Alpha Vantage economic returns empty without key", async () => {
    await expect(createAlphaVantageEconomicFetcher({ env: {} })({ symbols: [] })).resolves.toEqual([]);
  });

  it("registers World Bank / AV economic when enabled", () => {
    expect(
      createProviderRegistryFromEnv({ WORLDBANK_ENABLED: "true" }).economicProviders.some(
        (p) => p.meta.id === "worldbank",
      ),
    ).toBe(true);
    expect(
      createProviderRegistryFromEnv({ ALPHA_VANTAGE_API_KEY: "k" }).economicProviders.some(
        (p) => p.meta.id === "alpha-vantage",
      ),
    ).toBe(true);
  });
});
