import type { PortfolioAnalyticsInput, PortfolioAnalyticsPosition } from "../domain/portfolio-analytics";
import { closesToPeriodReturns } from "../market-intelligence/infrastructure/adapters/http-shared";
import { MarketIntelligenceEngine } from "../market-intelligence/application/market-intelligence-engine";
import { createProviderRegistryFromEnv } from "../market-intelligence/infrastructure/provider-registry";

type AccountTag = { value: string; currency: string };
type AccountMap = Record<string, Record<string, AccountTag>>;
type BrokerPosition = {
  symbol: string;
  position: number;
  avgCost: number;
  currency: string;
};

export interface PortfolioAnalyticsDataProvider {
  loadSnapshot(): Promise<PortfolioAnalyticsInput>;
}

export type PortfolioAnalyticsHttpFetcher = <T>(path: string) => Promise<T>;

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPosition(source: BrokerPosition): PortfolioAnalyticsPosition {
  return {
    symbol: source.symbol || "UNKNOWN",
    quantity: Number(source.position || 0),
    averageCost: Number(source.avgCost || 0),
    marketPrice: null,
    currency: source.currency || "UNKNOWN",
    sector: "UNKNOWN",
    industry: "UNKNOWN",
    country: "UNKNOWN",
    beta: null,
    returnsSeries: [],
  };
}

/**
 * Read-only HTTP fetcher for normalized portfolio snapshots.
 * Does not import Interactive Brokers SDKs; composition root may inject broker adapter fetch.
 */
export function createDefaultPortfolioAnalyticsHttpFetcher(): PortfolioAnalyticsHttpFetcher {
  const baseUrl = process.env.IBKR_SERVICE_URL ?? "http://127.0.0.1:8002";
  return async <T>(path: string): Promise<T> => {
    const apiKey = process.env.IBKR_INTERNAL_API_KEY;
    if (!apiKey) {
      throw new Error("Falta IBKR_INTERNAL_API_KEY en el servidor de ForgeOS");
    }
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": apiKey,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = (body as { detail?: unknown }).detail;
      let message = `Broker service error ${response.status}`;
      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      } else if (detail && typeof detail === "object" && "error" in detail) {
        message = String((detail as { error: unknown }).error);
      }
      throw new Error(message);
    }
    return body as T;
  };
}

/**
 * Optional MI enrichment: attach returnsSeries when a configured market provider
 * returns time series for the symbol. Never invents series — empty stays empty.
 */
async function enrichPositionsWithMiReturns(
  positions: readonly PortfolioAnalyticsPosition[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  positions: PortfolioAnalyticsPosition[];
  portfolioReturns: number[];
  benchmarkReturns: number[];
  enrichmentNote: string;
}> {
  const registry = createProviderRegistryFromEnv(env);
  if (registry.marketProviders.length === 0 || positions.length === 0) {
    return {
      positions: [...positions],
      portfolioReturns: [],
      benchmarkReturns: [],
      enrichmentNote: "NO_DATA — no MI market providers for return-series enrichment",
    };
  }

  const symbols = [...new Set(positions.map((p) => p.symbol).filter((s) => s && s !== "UNKNOWN"))].slice(
    0,
    8,
  );
  if (symbols.length === 0) {
    return {
      positions: [...positions],
      portfolioReturns: [],
      benchmarkReturns: [],
      enrichmentNote: "NO_DATA — no position symbols to enrich",
    };
  }

  try {
    const engine = new MarketIntelligenceEngine({
      marketProviders: registry.marketProviders,
      newsProviders: [],
      economicProviders: [],
      sentimentProviders: [],
    });
    const result = await engine.gather({ symbols });
    const bySymbol = new Map(
      result.marketSnapshots.map((s) => [s.symbol.toUpperCase(), s] as const),
    );

    const enriched = positions.map((pos) => {
      const snap = bySymbol.get(pos.symbol.toUpperCase());
      const closes = snap?.timeSeries?.points.map((p) => p.close) ?? [];
      const returnsSeries = closesToPeriodReturns(closes);
      const lastClose = closes.length ? closes[closes.length - 1]! : null;
      return {
        ...pos,
        marketPrice: lastClose != null && Number.isFinite(lastClose) ? lastClose : pos.marketPrice,
        returnsSeries,
      };
    });

    const withSeries = enriched.filter((p) => p.returnsSeries.length >= 2);
    let portfolioReturns: number[] = [];
    if (withSeries.length > 0) {
      const minLen = Math.min(...withSeries.map((p) => p.returnsSeries.length));
      const weights = withSeries.map((p) => Math.abs(p.quantity * (p.marketPrice ?? p.averageCost)));
      const weightSum = weights.reduce((s, w) => s + w, 0) || 1;
      for (let i = 0; i < minLen; i += 1) {
        let r = 0;
        for (let j = 0; j < withSeries.length; j += 1) {
          r += (weights[j]! / weightSum) * withSeries[j]!.returnsSeries[withSeries[j]!.returnsSeries.length - minLen + i]!;
        }
        portfolioReturns.push(r);
      }
    }

    const benchmarkSymbol = (env.FORGEOS_BENCHMARK_SYMBOL ?? "").trim().toUpperCase();
    let benchmarkReturns: number[] = [];
    if (benchmarkSymbol) {
      const benchSnap =
        bySymbol.get(benchmarkSymbol) ??
        (
          await engine.gather({ symbols: [benchmarkSymbol] })
        ).marketSnapshots.find((s) => s.symbol.toUpperCase() === benchmarkSymbol);
      const closes = benchSnap?.timeSeries?.points.map((p) => p.close) ?? [];
      benchmarkReturns = closesToPeriodReturns(closes);
    }

    return {
      positions: enriched,
      portfolioReturns,
      benchmarkReturns,
      enrichmentNote: withSeries.length
        ? `MI return series attached for ${withSeries.length}/${enriched.length} positions`
        : "NO_DATA — MI providers returned no usable time series for positions",
    };
  } catch (error) {
    return {
      positions: [...positions],
      portfolioReturns: [],
      benchmarkReturns: [],
      enrichmentNote:
        error instanceof Error
          ? `NO_DATA — MI enrichment failed (${error.message})`
          : "NO_DATA — MI enrichment failed",
    };
  }
}

export function createIbkrPortfolioAnalyticsProvider(
  fetcher: PortfolioAnalyticsHttpFetcher = createDefaultPortfolioAnalyticsHttpFetcher(),
  env: NodeJS.ProcessEnv = process.env,
): PortfolioAnalyticsDataProvider {
  return {
    async loadSnapshot() {
      const [positions, account] = await Promise.all([
        fetcher<BrokerPosition[]>("/api/ibkr/positions"),
        fetcher<AccountMap>("/api/ibkr/account"),
      ]);
      const firstAccount = Object.keys(account)[0];
      const cash =
        firstAccount && account[firstAccount]
          ? numberOrNull(account[firstAccount].TotalCashValue?.value)
          : null;
      const base = positions.map(toPosition);
      const enriched = await enrichPositionsWithMiReturns(base, env);
      return {
        asOf: new Date().toISOString(),
        baseCurrency:
          firstAccount && account[firstAccount]?.NetLiquidation?.currency
            ? account[firstAccount].NetLiquidation.currency
            : "UNKNOWN",
        positions: enriched.positions,
        cash,
        benchmarkReturns: enriched.benchmarkReturns,
        portfolioReturns: enriched.portfolioReturns,
        riskFreeRate: null,
      };
    },
  };
}

export function createUnknownPortfolioAnalyticsProvider(): PortfolioAnalyticsDataProvider {
  return {
    async loadSnapshot() {
      return {
        asOf: new Date().toISOString(),
        baseCurrency: "UNKNOWN",
        positions: [],
        cash: null,
        benchmarkReturns: [],
        portfolioReturns: [],
        riskFreeRate: null,
      };
    },
  };
}
