import type {
  EconomicIndicator,
  MarketIntelligenceRequest,
  MarketSnapshot,
  NewsItem,
  ProviderKind,
  SentimentSignal,
} from "./types";

export interface ProviderContext {
  readonly nowIso: string;
}

export interface ProviderMetadata {
  readonly id: string;
  readonly kind: ProviderKind;
  readonly displayName: string;
}

export interface MarketProvider {
  readonly meta: ProviderMetadata & { readonly kind: "market" };
  fetchMarketSnapshots(
    request: MarketIntelligenceRequest,
    context: ProviderContext,
  ): Promise<readonly MarketSnapshot[]>;
}

export interface NewsProvider {
  readonly meta: ProviderMetadata & { readonly kind: "news" };
  fetchNews(request: MarketIntelligenceRequest, context: ProviderContext): Promise<readonly NewsItem[]>;
}

export interface EconomicProvider {
  readonly meta: ProviderMetadata & { readonly kind: "economic" };
  fetchEconomicIndicators(
    request: MarketIntelligenceRequest,
    context: ProviderContext,
  ): Promise<readonly EconomicIndicator[]>;
}

export interface SentimentProvider {
  readonly meta: ProviderMetadata & { readonly kind: "sentiment" };
  fetchSentimentSignals(
    request: MarketIntelligenceRequest,
    context: ProviderContext,
  ): Promise<readonly SentimentSignal[]>;
}
