import "server-only";

import {
  createProviderRegistryFromEnv,
  type MarketIntelligenceProviderSet,
} from "@/src/core/investment/market-intelligence/infrastructure/provider-registry";

export type ProviderStatusRow = {
  readonly id: string;
  readonly provider: string;
  readonly kind: "market" | "news" | "economic" | "sentiment";
  readonly status: "CONFIGURED" | "NOT_CONFIGURED" | "OK" | "ERROR";
  readonly configured: boolean;
  readonly lastSuccess: string | null;
  readonly latencyMs: number | null;
  readonly dataTypes: readonly string[];
  readonly errors: readonly string[];
  readonly note: string;
};

export type ProviderCatalogStatusRow = Omit<ProviderStatusRow, "kind"> & {
  readonly kinds: readonly ProviderStatusRow["kind"][];
};

export type MarketIntelligenceStatusSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly marketProviders: readonly ProviderStatusRow[];
  readonly newsProviders: readonly ProviderStatusRow[];
  readonly economicProviders: readonly ProviderStatusRow[];
  readonly sentimentProviders: readonly ProviderStatusRow[];
  readonly providers: readonly ProviderCatalogStatusRow[];
  readonly totalKnown: number;
  readonly totalConfigured: number;
  readonly note: string;
  readonly assetClassesSupported: readonly string[];
  readonly tradeGate: "NO_TRADE_ON_DELAYED_OR_STALE";
};

const PROVIDER_CATALOG = [
  { id: "alpha-vantage", provider: "Alpha Vantage", kinds: ["market", "news", "economic", "sentiment"], dataTypes: ["quotes", "bars", "news", "economic", "sentiment"] },
  { id: "polygon", provider: "Polygon", kinds: ["market", "news"], dataTypes: ["quotes", "bars", "news"] },
  { id: "finnhub", provider: "Finnhub", kinds: ["market", "news", "sentiment"], dataTypes: ["quotes", "news", "sentiment"] },
  { id: "fmp", provider: "Financial Modeling Prep", kinds: ["market", "news"], dataTypes: ["quotes", "bars", "news"] },
  { id: "twelve-data", provider: "Twelve Data", kinds: ["market"], dataTypes: ["quotes", "bars"] },
  { id: "newsapi", provider: "NewsAPI", kinds: ["news", "sentiment"], dataTypes: ["news", "sentiment"] },
  { id: "fred", provider: "FRED", kinds: ["economic"], dataTypes: ["economic"] },
  { id: "ecb", provider: "European Central Bank", kinds: ["economic"], dataTypes: ["economic", "foreign-exchange"] },
  { id: "worldbank", provider: "World Bank", kinds: ["economic"], dataTypes: ["economic"] },
  { id: "yahoo-finance", provider: "Yahoo Finance", kinds: ["market", "news", "sentiment"], dataTypes: ["quotes", "bars", "news", "sentiment"] },
  { id: "rss", provider: "RSS", kinds: ["news", "sentiment"], dataTypes: ["news", "sentiment"] },
] as const satisfies readonly {
  readonly id: string;
  readonly provider: string;
  readonly kinds: readonly ProviderStatusRow["kind"][];
  readonly dataTypes: readonly string[];
}[];

function rowsFrom(
  providers: ReadonlyArray<{ readonly meta: { readonly id: string; readonly displayName?: string } }>,
  kind: ProviderStatusRow["kind"],
): ProviderStatusRow[] {
  return providers.map((p) => {
    const known = PROVIDER_CATALOG.find((entry) => entry.id === p.meta.id);
    return {
      id: p.meta.id,
      provider: known?.provider ?? p.meta.displayName ?? p.meta.id,
      kind,
      status: "CONFIGURED" as const,
      configured: true,
      lastSuccess: null,
      latencyMs: null,
      dataTypes: known?.dataTypes ?? [kind],
      errors: [],
      note: "Configured via env; run probe gather for operational results",
    };
  });
}

/**
 * Read-only MI status — no market fetches, no invented quotes.
 * Lists providers enabled by existing env registry only.
 */
export function getMarketIntelligenceStatus(
  env: NodeJS.ProcessEnv = process.env,
): MarketIntelligenceStatusSnapshot {
  const set: MarketIntelligenceProviderSet = createProviderRegistryFromEnv(env);
  const marketProviders = rowsFrom(set.marketProviders, "market");
  const newsProviders = rowsFrom(set.newsProviders, "news");
  const economicProviders = rowsFrom(set.economicProviders, "economic");
  const sentimentProviders = rowsFrom(set.sentimentProviders, "sentiment");
  const configuredIds = new Set(
    [...marketProviders, ...newsProviders, ...economicProviders, ...sentimentProviders].map(
      (provider) => provider.id,
    ),
  );
  const providers: ProviderCatalogStatusRow[] = PROVIDER_CATALOG.map((provider) => {
    const configured = configuredIds.has(provider.id);
    return {
      id: provider.id,
      provider: provider.provider,
      kinds: provider.kinds,
      status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
      configured,
      lastSuccess: null,
      latencyMs: null,
      dataTypes: provider.dataTypes,
      errors: [],
      note: configured
        ? "Configured via env; operational health is established by gather probes"
        : "Enable with the documented API key, flag, or feed URL",
    };
  });
  const totalConfigured = providers.filter((provider) => provider.configured).length;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    marketProviders,
    newsProviders,
    economicProviders,
    sentimentProviders,
    providers,
    totalKnown: providers.length,
    totalConfigured,
    note:
      totalConfigured === 0
        ? "No Market Intelligence providers configured — set API keys / enable flags in env. DEMO not fabricated."
        : "Provider registry loaded from env. Quote/news fetches run only on explicit gather requests.",
    assetClassesSupported: [
      "stocks",
      "ETF",
      "forex",
      "futures",
      "options",
      "bonds",
      "commodities",
      "indices",
    ],
    tradeGate: "NO_TRADE_ON_DELAYED_OR_STALE",
  };
}
