import type {
  EconomicProvider,
  MarketProvider,
  NewsProvider,
  ProviderContext,
  SentimentProvider,
} from "../domain/contracts";
import type { MarketIntelligenceRequest, MarketIntelligenceResult, ProviderError, ProviderHealth } from "../domain/types";
import { ensureSerializableOutput, ensureSentimentSignal } from "../domain/types";

export interface MarketIntelligenceEngineDeps {
  readonly marketProviders?: readonly MarketProvider[];
  readonly newsProviders?: readonly NewsProvider[];
  readonly economicProviders?: readonly EconomicProvider[];
  readonly sentimentProviders?: readonly SentimentProvider[];
  readonly clock?: () => string;
}

export class MarketIntelligenceEngine {
  private readonly marketProviders: readonly MarketProvider[];
  private readonly newsProviders: readonly NewsProvider[];
  private readonly economicProviders: readonly EconomicProvider[];
  private readonly sentimentProviders: readonly SentimentProvider[];
  private readonly clock: () => string;

  constructor(deps: MarketIntelligenceEngineDeps = {}) {
    this.marketProviders = deps.marketProviders ?? [];
    this.newsProviders = deps.newsProviders ?? [];
    this.economicProviders = deps.economicProviders ?? [];
    this.sentimentProviders = deps.sentimentProviders ?? [];
    this.clock = deps.clock ?? (() => new Date().toISOString());
  }

  async gather(request: MarketIntelligenceRequest): Promise<MarketIntelligenceResult> {
    const now = this.clock();
    const context: ProviderContext = { nowIso: now };
    const health: ProviderHealth[] = [];
    const errors: ProviderError[] = [];

    const snapshots = (
      await this.collect(this.marketProviders, "market", context, health, errors, (provider) =>
        provider.fetchMarketSnapshots(request, context),
      )
    ).flat();
    const indicators = (
      await this.collect(this.economicProviders, "economic", context, health, errors, (provider) =>
        provider.fetchEconomicIndicators(request, context),
      )
    ).flat();
    const news = (
      await this.collect(this.newsProviders, "news", context, health, errors, (provider) =>
        provider.fetchNews(request, context),
      )
    ).flat();
    const sentiment = (
      await this.collect(this.sentimentProviders, "sentiment", context, health, errors, (provider) =>
        provider.fetchSentimentSignals(request, context),
      )
    )
      .flat()
      .map(ensureSentimentSignal);

    const providersUsed = Array.from(
      new Set([
        ...snapshots.map((x) => x.providerId),
        ...indicators.map((x) => x.providerId),
        ...news.map((x) => x.providerId),
        ...sentiment.map((x) => x.providerId),
      ]),
    );

    const result: MarketIntelligenceResult = {
      generatedAt: now,
      request: {
        symbols: [...request.symbols],
        interval: request.interval,
        from: request.from,
        to: request.to,
        economicKeys: request.economicKeys ? [...request.economicKeys] : undefined,
        limitNewsItems: request.limitNewsItems,
      },
      marketSnapshots: snapshots,
      economicIndicators: indicators,
      news,
      sentiment,
      providersUsed,
      health,
      errors,
    };

    return ensureSerializableOutput(result);
  }

  private async collect<TProvider extends { readonly meta: { readonly id: string } }, TValue>(
    providers: readonly TProvider[],
    kind: ProviderHealth["kind"],
    context: ProviderContext,
    health: ProviderHealth[],
    errors: ProviderError[],
    operation: (provider: TProvider) => Promise<readonly TValue[]>,
  ): Promise<readonly (readonly TValue[])[]> {
    if (providers.length === 0) {
      health.push({
        providerId: "none-configured",
        kind,
        ok: false,
        message: "No provider configured for this capability",
      });
      return [];
    }

    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          const value = await operation(provider);
          health.push({ providerId: provider.meta.id, kind, ok: true });
          return value;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown provider failure";
          health.push({ providerId: provider.meta.id, kind, ok: false, message });
          errors.push({ providerId: provider.meta.id, kind, message });
          return [] as readonly TValue[];
        }
      }),
    );

    return results;
  }
}
