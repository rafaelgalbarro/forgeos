import type { EconomicProvider, MarketProvider, NewsProvider, SentimentProvider } from "../domain";
import {
  createAlphaVantageEconomicProvider,
  createAlphaVantageNewsProvider,
  createAlphaVantageProvider,
  createAlphaVantageSentimentProvider,
} from "./adapters/alpha-vantage";
import { createEcbProvider } from "./adapters/ecb";
import {
  createFinnhubNewsProvider,
  createFinnhubProvider,
  createFinnhubSentimentProvider,
} from "./adapters/finnhub";
import { createFmpNewsProvider, createFmpProvider } from "./adapters/fmp";
import { createFredProvider } from "./adapters/fred";
import { createNewsApiProvider } from "./adapters/news-api";
import { createPolygonNewsProvider, createPolygonProvider } from "./adapters/polygon";
import { createRssProvider } from "./adapters/rss";
import { createTwelveDataProvider } from "./adapters/twelve-data";
import { createWorldBankProvider } from "./adapters/worldbank";
import { createYahooFinanceProvider } from "./adapters/yahoo-finance";

export interface MarketIntelligenceProviderSet {
  readonly marketProviders: readonly MarketProvider[];
  readonly newsProviders: readonly NewsProvider[];
  readonly economicProviders: readonly EconomicProvider[];
  readonly sentimentProviders: readonly SentimentProvider[];
}

type Env = Record<string, string | undefined>;

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isEnabled(providerId: string, env: Env): boolean {
  const explicitList = env.FORGEOS_MARKET_PROVIDERS;
  if (explicitList) {
    const enabled = explicitList
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    return enabled.includes(providerId);
  }

  switch (providerId) {
    case "alpha-vantage":
      return Boolean(env.ALPHA_VANTAGE_API_KEY);
    case "polygon":
      return Boolean(env.POLYGON_API_KEY);
    case "finnhub":
      return Boolean(env.FINNHUB_API_KEY);
    case "fmp":
      return Boolean(env.FMP_API_KEY);
    case "twelve-data":
      return Boolean(env.TWELVE_DATA_API_KEY);
    case "newsapi":
      return Boolean(env.NEWSAPI_KEY);
    case "fred":
      return Boolean(env.FRED_API_KEY);
    case "ecb":
      return isTruthy(env.ECB_ENABLED);
    case "worldbank":
      return isTruthy(env.WORLDBANK_ENABLED);
    case "yahoo-finance":
      return isTruthy(env.YAHOO_FINANCE_ENABLED);
    case "rss":
      return Boolean(env.RSS_FEED_URLS);
    default:
      return false;
  }
}

/**
 * Build MI provider set from env.
 * Market/news/economic adapters use official HTTP fetchers when keys/flags exist.
 * Missing keys → provider not registered (or returns [] from fetcher). Never invents quotes.
 */
export function createProviderRegistryFromEnv(env: Env = process.env): MarketIntelligenceProviderSet {
  const marketProviders: MarketProvider[] = [];
  const newsProviders: NewsProvider[] = [];
  const economicProviders: EconomicProvider[] = [];
  const sentimentProviders: SentimentProvider[] = [];

  if (isEnabled("alpha-vantage", env)) {
    marketProviders.push(createAlphaVantageProvider({ env }));
    newsProviders.push(createAlphaVantageNewsProvider({ env }));
    sentimentProviders.push(createAlphaVantageSentimentProvider({ env }));
    economicProviders.push(createAlphaVantageEconomicProvider({ env }));
  }
  if (isEnabled("polygon", env)) {
    marketProviders.push(createPolygonProvider({ env }));
    newsProviders.push(createPolygonNewsProvider({ env }));
  }
  if (isEnabled("finnhub", env)) {
    marketProviders.push(createFinnhubProvider({ env }));
    newsProviders.push(createFinnhubNewsProvider({ env }));
    sentimentProviders.push(createFinnhubSentimentProvider({ env }));
  }
  if (isEnabled("fmp", env)) {
    marketProviders.push(createFmpProvider({ env }));
    newsProviders.push(createFmpNewsProvider({ env }));
  }
  if (isEnabled("twelve-data", env)) marketProviders.push(createTwelveDataProvider({ env }));

  if (isEnabled("newsapi", env)) {
    const provider = createNewsApiProvider({ env });
    newsProviders.push(provider.news);
    // Headline heuristic remains as supplemental when NewsAPI key exists
    sentimentProviders.push(provider.sentiment);
  }

  if (isEnabled("fred", env)) economicProviders.push(createFredProvider({ env }));
  if (isEnabled("ecb", env)) economicProviders.push(createEcbProvider({ env }));
  if (isEnabled("worldbank", env)) economicProviders.push(createWorldBankProvider({ env }));

  if (isEnabled("yahoo-finance", env)) {
    const provider = createYahooFinanceProvider({ env });
    marketProviders.push(provider.market);
    newsProviders.push(provider.news);
    sentimentProviders.push(provider.sentiment);
  }

  if (isEnabled("rss", env)) {
    const provider = createRssProvider({ env });
    newsProviders.push(provider.news);
    sentimentProviders.push(provider.sentiment);
  }

  return {
    marketProviders,
    newsProviders,
    economicProviders,
    sentimentProviders,
  };
}
