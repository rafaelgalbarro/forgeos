import type {
  MarketIntelligenceRequest,
  MarketSnapshot,
  NewsItem,
  SentimentSignal,
  TimeSeriesPoint,
} from "../../domain";
import {
  createDefaultJsonFetcher,
  mapVendorAssetClass,
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
 * Official Finnhub quote + candle + profile when FINNHUB_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents quotes.
 */
export function createFinnhubMarketFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.FINNHUB_API_KEY, "finnhub");
    } catch {
      return [];
    }

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();
    const to = Math.floor(Date.now() / 1000);
    const from = to - 30 * 24 * 60 * 60;

    for (const symbol of request.symbols.slice(0, 8)) {
      try {
        const quoteUrl =
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}` +
          `&token=${encodeURIComponent(apiKey)}`;
        const quote = (await jsonFetcher(quoteUrl)) as { c?: number; t?: number };
        const price = asNumber(quote.c);
        if (price == null || price <= 0) continue;

        const candleUrl =
          `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}` +
          `&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(apiKey)}`;
        const candle = (await jsonFetcher(candleUrl)) as {
          s?: string;
          t?: number[];
          o?: number[];
          h?: number[];
          l?: number[];
          c?: number[];
          v?: number[];
        };

        const points: TimeSeriesPoint[] = [];
        if (candle.s === "ok" && Array.isArray(candle.c) && Array.isArray(candle.t)) {
          const n = candle.c.length;
          for (let i = 0; i < n; i += 1) {
            const open = asNumber(candle.o?.[i]);
            const high = asNumber(candle.h?.[i]);
            const low = asNumber(candle.l?.[i]);
            const close = asNumber(candle.c[i]);
            const volume = asNumber(candle.v?.[i]);
            if (open == null || high == null || low == null || close == null) continue;
            points.push({
              timestamp: new Date((candle.t[i] ?? 0) * 1000).toISOString(),
              open,
              high,
              low,
              close,
              volume: volume ?? undefined,
            });
          }
        }

        let assetClass: string | undefined;
        try {
          const profileUrl =
            `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}` +
            `&token=${encodeURIComponent(apiKey)}`;
          const profile = (await jsonFetcher(profileUrl)) as { type?: string; finnhubIndustry?: string };
          assetClass = mapVendorAssetClass(profile.type) ?? mapVendorAssetClass(profile.finnhubIndustry);
        } catch {
          assetClass = undefined;
        }

        snapshots.push({
          symbol,
          providerId: "finnhub",
          capturedAt,
          assetClass,
          quote: {
            symbol,
            price,
            currency: "USD",
            timestamp: quote.t ? new Date(quote.t * 1000).toISOString() : capturedAt,
            providerId: "finnhub",
          },
          timeSeries:
            points.length > 0
              ? { symbol, interval: "1d", points, providerId: "finnhub" }
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
