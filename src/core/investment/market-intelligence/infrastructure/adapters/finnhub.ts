import type {
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
import { createStubMarketProvider, createStubNewsProvider, createStubSentimentProvider } from "./shared";

type Env = Record<string, string | undefined>;

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Market snapshots via FMP profile + EOD light (Finnhub /stock/candle unavailable on free tier).
 * Returns [] when FMP not configured — never invents quotes.
 */
export function createFinnhubMarketFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  void options;

  return async (request) => {
    const { getQuote, getHistory, isFmpEnabled } = await import("@/lib/market-data/fmp");
    if (!isFmpEnabled()) return [];

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();

    for (const symbol of request.symbols.slice(0, 8)) {
      try {
        const quote = await getQuote(symbol);
        const price = quote?.price ?? null;
        if (price == null || price <= 0) continue;

        const hist = await getHistory(symbol, 30);
        const points: TimeSeriesPoint[] = hist.slice(-30).map((bar) => ({
          timestamp: `${bar.date}T00:00:00.000Z`,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        }));

        snapshots.push({
          symbol,
          providerId: "fmp",
          capturedAt,
          assetClass: undefined,
          quote: {
            symbol,
            price,
            currency: "USD",
            timestamp: capturedAt,
            providerId: "fmp",
          },
          timeSeries:
            points.length > 0
              ? { symbol, interval: "1d", points, providerId: "fmp" }
              : undefined,
        });
      } catch {
        /* per-symbol isolate */
      }
    }

    return snapshots;
  };
}

export function createFinnhubProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createFinnhubMarketFetcher({
      apiKey: options?.apiKey,
      env: options?.env,
      jsonFetcher: options?.jsonFetcher,
    });
  return createStubMarketProvider({ id: "finnhub", kind: "market", displayName: "Finnhub" }, fetcher);
}

/**
 * Official Finnhub news-sentiment endpoint when FINNHUB_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents scores.
 */
export function createFinnhubSentimentFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.FINNHUB_API_KEY, "finnhub");
    } catch {
      return [];
    }

    const out: SentimentSignal[] = [];
    const now = new Date().toISOString();
    for (const symbol of request.symbols.slice(0, 6)) {
      try {
        const url =
          `https://finnhub.io/api/v1/news-sentiment?symbol=${encodeURIComponent(symbol)}` +
          `&token=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(url)) as {
          companyNewsScore?: number;
          sentiment?: { bullishPercent?: number; bearishPercent?: number };
        };
        const bull = asNumber(body.sentiment?.bullishPercent);
        const bear = asNumber(body.sentiment?.bearishPercent);
        const company = asNumber(body.companyNewsScore);
        let score: number | null = null;
        if (bull != null && bear != null) score = bull - bear;
        else if (company != null) score = company * 2 - 1;
        if (score == null || !Number.isFinite(score)) continue;
        score = Math.max(-1, Math.min(1, score));
        out.push({
          signalId: `finnhub-sent-${symbol}`,
          target: symbol,
          score,
          confidence: 0.55,
          rationale: `Finnhub news-sentiment vendor feed (bull=${bull ?? "NO_DATA"} bear=${bear ?? "NO_DATA"})`,
          providerId: "finnhub",
          timestamp: now,
        });
      } catch {
        /* per-symbol isolate */
      }
    }
    return out;
  };
}

export function createFinnhubSentimentProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubSentimentProvider(
    { id: "finnhub", kind: "sentiment", displayName: "Finnhub Sentiment" },
    options?.fetcher ??
      createFinnhubSentimentFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}

/**
 * Official Finnhub company-news endpoint when FINNHUB_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents headlines.
 */
export function createFinnhubNewsFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.FINNHUB_API_KEY, "finnhub");
    } catch {
      return [];
    }

    const symbols = request.symbols.slice(0, 4);
    if (symbols.length === 0) return [];

    const limit = Math.min(Math.max(request.limitNewsItems ?? 8, 1), 20);
    const to = new Date();
    const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const items: NewsItem[] = [];

    for (const symbol of symbols) {
      try {
        const url =
          `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}` +
          `&from=${fromStr}&to=${toStr}&token=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(url)) as Array<{
          id?: number;
          headline?: string;
          summary?: string;
          url?: string;
          datetime?: number;
          source?: string;
        }>;
        if (!Array.isArray(body)) continue;
        for (const row of body.slice(0, limit)) {
          if (!row.headline || !row.url) continue;
          const publishedAt =
            typeof row.datetime === "number" && Number.isFinite(row.datetime)
              ? new Date(row.datetime * 1000).toISOString()
              : new Date().toISOString();
          items.push({
            id: `finnhub-news-${symbol}-${row.id ?? items.length}`,
            title: row.headline,
            summary: row.summary,
            url: row.url,
            publishedAt,
            source: row.source ?? "finnhub",
            providerId: "finnhub",
            symbols: [symbol],
          });
          if (items.length >= limit) return items;
        }
      } catch {
        /* per-symbol isolate */
      }
    }
    return items;
  };
}

export function createFinnhubNewsProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubNewsProvider(
    { id: "finnhub", kind: "news", displayName: "Finnhub Company News" },
    options?.fetcher ??
      createFinnhubNewsFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}
