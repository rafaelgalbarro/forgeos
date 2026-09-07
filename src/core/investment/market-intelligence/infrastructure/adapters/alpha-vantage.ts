import type {
  EconomicIndicator,
  MarketIntelligenceRequest,
  MarketSnapshot,
  NewsItem,
  SentimentSignal,
  TimeSeriesPoint,
} from "../../domain";
import {
  createDefaultJsonFetcher,
  requireApiKey,
  type JsonFetcher,
} from "./http-shared";
import {
  createStubEconomicProvider,
  createStubMarketProvider,
  createStubNewsProvider,
  createStubSentimentProvider,
} from "./shared";

type Env = Record<string, string | undefined>;

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Official Alpha Vantage TIME_SERIES_DAILY when ALPHA_VANTAGE_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents quotes.
 * assetClass is not provided by this endpoint → omitted (NO_DATA).
 */
export function createAlphaVantageMarketFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.ALPHA_VANTAGE_API_KEY, "alpha-vantage");
    } catch {
      return [];
    }

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();

    for (const symbol of request.symbols.slice(0, 5)) {
      try {
        const url =
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY` +
          `&symbol=${encodeURIComponent(symbol)}&outputsize=compact` +
          `&apikey=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(url)) as Record<string, unknown>;
        const series = body["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
        if (!series || typeof series !== "object") continue;

        const dates = Object.keys(series).sort();
        const points: TimeSeriesPoint[] = [];
        for (const date of dates.slice(-60)) {
          const row = series[date];
          if (!row) continue;
          const open = asNumber(row["1. open"]);
          const high = asNumber(row["2. high"]);
          const low = asNumber(row["3. low"]);
          const close = asNumber(row["4. close"]);
          const volume = asNumber(row["5. volume"]);
          if (open == null || high == null || low == null || close == null) continue;
          points.push({
            timestamp: `${date}T00:00:00.000Z`,
            open,
            high,
            low,
            close,
            volume: volume ?? undefined,
          });
        }
        if (points.length === 0) continue;

        const last = points[points.length - 1]!;
        snapshots.push({
          symbol,
          providerId: "alpha-vantage",
          capturedAt,
          quote: {
            symbol,
            price: last.close,
            currency: "USD",
            timestamp: last.timestamp,
            providerId: "alpha-vantage",
          },
          timeSeries: {
            symbol,
            interval: "1d",
            points,
            providerId: "alpha-vantage",
          },
        });
      } catch {
        /* per-symbol isolate */
      }
    }

    return snapshots;
  };
}

export function createAlphaVantageProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createAlphaVantageMarketFetcher({
      apiKey: options?.apiKey,
      env: options?.env,
      jsonFetcher: options?.jsonFetcher,
    });
  return createStubMarketProvider(
    { id: "alpha-vantage", kind: "market", displayName: "Alpha Vantage" },
    fetcher,
  );
}

/**
 * Official Alpha Vantage NEWS_SENTIMENT when ALPHA_VANTAGE_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents scores.
 */
export function createAlphaVantageSentimentFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.ALPHA_VANTAGE_API_KEY, "alpha-vantage");
    } catch {
      return [];
    }

    const tickers = request.symbols.slice(0, 3).join(",") || "AAPL";
    try {
      const url =
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
        `&tickers=${encodeURIComponent(tickers)}&limit=8` +
        `&apikey=${encodeURIComponent(apiKey)}`;
      const body = (await jsonFetcher(url)) as {
        feed?: Array<{
          title?: string;
          time_published?: string;
          overall_sentiment_score?: string | number;
          overall_sentiment_label?: string;
          url?: string;
        }>;
        Note?: string;
        Information?: string;
      };
      if (!Array.isArray(body.feed) || body.feed.length === 0) return [];

      return body.feed.slice(0, 8).map((item, index) => {
        const raw = Number(item.overall_sentiment_score);
        const score = Number.isFinite(raw) ? Math.max(-1, Math.min(1, raw)) : 0;
        const published = item.time_published
          ? `${item.time_published.slice(0, 4)}-${item.time_published.slice(4, 6)}-${item.time_published.slice(6, 8)}T${item.time_published.slice(9, 11) || "00"}:${item.time_published.slice(11, 13) || "00"}:00.000Z`
          : new Date().toISOString();
        return {
          signalId: `av-sent-${index}-${(item.url ?? item.title ?? String(index)).slice(0, 40)}`,
          target: request.symbols[0] ?? tickers.split(",")[0]!,
          score,
          confidence: 0.5,
          rationale: `Alpha Vantage NEWS_SENTIMENT (${item.overall_sentiment_label ?? "NO_DATA"}): ${(item.title ?? "").slice(0, 80)}`,
          providerId: "alpha-vantage",
          timestamp: published,
        };
      });
    } catch {
      return [];
    }
  };
}

export function createAlphaVantageSentimentProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubSentimentProvider(
    { id: "alpha-vantage", kind: "sentiment", displayName: "Alpha Vantage Sentiment" },
    options?.fetcher ??
      createAlphaVantageSentimentFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}

/**
 * Alpha Vantage NEWS_SENTIMENT feed mapped to NewsItem when ALPHA_VANTAGE_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents headlines.
 */
export function createAlphaVantageNewsFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.ALPHA_VANTAGE_API_KEY, "alpha-vantage");
    } catch {
      return [];
    }

    const tickers = request.symbols.slice(0, 3).join(",") || "AAPL";
    const limit = Math.min(Math.max(request.limitNewsItems ?? 8, 1), 20);
    try {
      const url =
        `https://www.alphavantage.co/query?function=NEWS_SENTIMENT` +
        `&tickers=${encodeURIComponent(tickers)}&limit=${limit}` +
        `&apikey=${encodeURIComponent(apiKey)}`;
      const body = (await jsonFetcher(url)) as {
        feed?: Array<{
          title?: string;
          summary?: string;
          url?: string;
          time_published?: string;
          source?: string;
        }>;
      };
      if (!Array.isArray(body.feed) || body.feed.length === 0) return [];
      return body.feed
        .filter((item) => item.title && item.url)
        .slice(0, limit)
        .map((item, index) => {
          const published = item.time_published
            ? `${item.time_published.slice(0, 4)}-${item.time_published.slice(4, 6)}-${item.time_published.slice(6, 8)}T${item.time_published.slice(9, 11) || "00"}:${item.time_published.slice(11, 13) || "00"}:00.000Z`
            : new Date().toISOString();
          return {
            id: `av-news-${index}-${(item.url ?? String(index)).slice(0, 40)}`,
            title: item.title!,
            summary: item.summary,
            url: item.url!,
            publishedAt: published,
            source: item.source ?? "alpha-vantage",
            providerId: "alpha-vantage",
            symbols: request.symbols.slice(0, 4),
          };
        });
    } catch {
      return [];
    }
  };
}

export function createAlphaVantageNewsProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubNewsProvider(
    { id: "alpha-vantage", kind: "news", displayName: "Alpha Vantage News" },
    options?.fetcher ??
      createAlphaVantageNewsFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}

const AV_ECONOMIC_DEFAULTS = [
  { function: "REAL_GDP", interval: "annual", key: "REAL_GDP" },
  { function: "TREASURY_YIELD", interval: "monthly", maturity: "10year", key: "TREASURY_10Y" },
  { function: "INFLATION", interval: "annual", key: "INFLATION" },
] as const;

/**
 * Alpha Vantage economic indicators when ALPHA_VANTAGE_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents macro values.
 */
export function createAlphaVantageEconomicFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async () => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.ALPHA_VANTAGE_API_KEY, "alpha-vantage");
    } catch {
      return [];
    }

    const out: EconomicIndicator[] = [];
    for (const series of AV_ECONOMIC_DEFAULTS) {
      try {
        let url =
          `https://www.alphavantage.co/query?function=${encodeURIComponent(series.function)}` +
          `&apikey=${encodeURIComponent(apiKey)}`;
        if ("interval" in series && series.interval) {
          url += `&interval=${encodeURIComponent(series.interval)}`;
        }
        if ("maturity" in series && series.maturity) {
          url += `&maturity=${encodeURIComponent(series.maturity)}`;
        }
        const body = (await jsonFetcher(url)) as {
          data?: Array<{ date?: string; value?: string }>;
          Note?: string;
        };
        const row = body.data?.[0];
        const value = Number(row?.value);
        if (!row?.date || !Number.isFinite(value)) continue;
        out.push({
          key: series.key,
          label: series.key,
          value,
          period: row.date,
          providerId: "alpha-vantage",
        });
      } catch {
        /* per-series isolate */
      }
    }
    return out;
  };
}

export function createAlphaVantageEconomicProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubEconomicProvider(
    { id: "alpha-vantage", kind: "economic", displayName: "Alpha Vantage Economic" },
    options?.fetcher ??
      createAlphaVantageEconomicFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}
