import type {
  EconomicProvider,
  MarketProvider,
  NewsProvider,
  ProviderMetadata,
  SentimentProvider,
} from "../../domain";
import type { EconomicIndicator, MarketIntelligenceRequest, MarketSnapshot, NewsItem, SentimentSignal } from "../../domain";

export function createStubMarketProvider(
  meta: ProviderMetadata & { readonly kind: "market" },
  fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>,
): MarketProvider {
  return {
    meta,
    async fetchMarketSnapshots(request) {
      if (!fetcher) return [];
      return fetcher(request);
    },
  };
}

export function createStubNewsProvider(
  meta: ProviderMetadata & { readonly kind: "news" },
  fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>,
): NewsProvider {
  return {
    meta,
    async fetchNews(request) {
      if (!fetcher) return [];
      return fetcher(request);
    },
  };
}

export function createStubEconomicProvider(
  meta: ProviderMetadata & { readonly kind: "economic" },
  fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]>,
): EconomicProvider {
  return {
    meta,
    async fetchEconomicIndicators(request) {
      if (!fetcher) return [];
      return fetcher(request);
    },
  };
}

export function createStubSentimentProvider(
  meta: ProviderMetadata & { readonly kind: "sentiment" },
  fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]>,
): SentimentProvider {
  return {
    meta,
    async fetchSentimentSignals(request) {
      if (!fetcher) return [];
      return fetcher(request);
    },
  };
}
