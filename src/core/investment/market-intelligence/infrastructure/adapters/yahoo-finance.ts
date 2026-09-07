import type {
  MarketIntelligenceRequest,
  MarketSnapshot,
  NewsItem,
  SentimentSignal,
  TimeSeriesPoint,
} from "../../domain";
import { createDefaultJsonFetcher, type JsonFetcher } from "./http-shared";
import { createStubMarketProvider, createStubNewsProvider, createStubSentimentProvider } from "./shared";

type Env = Record<string, string | undefined>;

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Yahoo Finance chart API (public) when YAHOO_FINANCE_ENABLED is truthy.
 * No API key — returns [] when disabled or HTTP fails. Never invents quotes.
 */
export function createYahooMarketFetcher(options?: {
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    if (!isTruthy(env.YAHOO_FINANCE_ENABLED)) {
      return [];
    }

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();

    for (const symbol of request.symbols.slice(0, 8)) {
      try {
        const url =
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
          `?interval=1d&range=3mo`;
        const body = (await jsonFetcher(url, {
          headers: { "User-Agent": "ForgeOS-MarketIntelligence/1.0" },
        })) as {
          chart?: {
            result?: Array<{
              meta?: { currency?: string; instrumentType?: string; regularMarketPrice?: number };
              timestamp?: number[];
              indicators?: {
                quote?: Array<{
                  open?: Array<number | null>;
                  high?: Array<number | null>;
                  low?: Array<number | null>;
                  close?: Array<number | null>;
                  volume?: Array<number | null>;
                }>;
              };
            }>;
          };
        };
        const result = body.chart?.result?.[0];
        const quoteBlock = result?.indicators?.quote?.[0];
        const timestamps = result?.timestamp ?? [];
        if (!result || !quoteBlock || timestamps.length === 0) continue;

        const points: TimeSeriesPoint[] = [];
        for (let i = 0; i < timestamps.length; i += 1) {
          const open = asNumber(quoteBlock.open?.[i]);
          const high = asNumber(quoteBlock.high?.[i]);
          const low = asNumber(quoteBlock.low?.[i]);
          const close = asNumber(quoteBlock.close?.[i]);
          const volume = asNumber(quoteBlock.volume?.[i]);
          if (open == null || high == null || low == null || close == null) continue;
          points.push({
            timestamp: new Date((timestamps[i] ?? 0) * 1000).toISOString(),
            open,
            high,
            low,
            close,
            volume: volume ?? undefined,
          });
        }
        if (points.length === 0) continue;

        const last = points[points.length - 1]!;
        const price = asNumber(result.meta?.regularMarketPrice) ?? last.close;
        const instrumentType = result.meta?.instrumentType;
        const assetClass =
          typeof instrumentType === "string" ? instrumentType.toLowerCase() : undefined;

        snapshots.push({
          symbol,
          providerId: "yahoo-finance",
          capturedAt,
          assetClass,
          quote: {
            symbol,
            price,
            currency: result.meta?.currency ?? "USD",
            timestamp: last.timestamp,
            providerId: "yahoo-finance",
          },
          timeSeries: { symbol, interval: "1d", points, providerId: "yahoo-finance" },
        });
      } catch {
        /* per-symbol isolate */
      }
    }

    return snapshots;
  };
}

/** Yahoo has no official free news API in this adapter — stay empty (NO_DATA). */
export function createYahooNewsFetcher(): (
  request: MarketIntelligenceRequest,
) => Promise<readonly NewsItem[]> {
  return async () => [];
}

/** No official Yahoo sentiment endpoint — stay empty (NO_DATA). */
export function createYahooSentimentFetcher(): (
  request: MarketIntelligenceRequest,
) => Promise<readonly SentimentSignal[]> {
  return async () => [];
}

export function createYahooFinanceProvider(options?: {
  readonly marketFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>;
  readonly newsFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly sentimentFetcher?: (request: MarketIntelligenceRequest) => Promise<readonly SentimentSignal[]>;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const env = options?.env ?? process.env;
  return {
    market: createStubMarketProvider(
      { id: "yahoo-finance", kind: "market", displayName: "Yahoo Finance" },
      options?.marketFetcher ?? createYahooMarketFetcher({ env, jsonFetcher: options?.jsonFetcher }),
    ),
    news: createStubNewsProvider(
      { id: "yahoo-finance", kind: "news", displayName: "Yahoo Finance News" },
      options?.newsFetcher ?? createYahooNewsFetcher(),
    ),
    sentiment: createStubSentimentProvider(
      { id: "yahoo-finance", kind: "sentiment", displayName: "Yahoo Finance Sentiment" },
      options?.sentimentFetcher ?? createYahooSentimentFetcher(),
    ),
  };
}
