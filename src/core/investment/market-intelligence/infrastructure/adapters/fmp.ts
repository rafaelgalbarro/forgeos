import type { MarketIntelligenceRequest, MarketSnapshot, NewsItem, TimeSeriesPoint } from "../../domain";
import {
  createDefaultJsonFetcher,
  mapVendorAssetClass,
  requireApiKey,
  type JsonFetcher,
} from "./http-shared";
import { createStubMarketProvider, createStubNewsProvider } from "./shared";

type Env = Record<string, string | undefined>;

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Official Financial Modeling Prep historical daily when FMP_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents quotes.
 */
export function createFmpMarketFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.FMP_API_KEY, "fmp");
    } catch {
      return [];
    }

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();

    for (const symbol of request.symbols.slice(0, 8)) {
      try {
        const histUrl =
          `https://financialmodelingprep.com/stable/historical-price-eod/full` +
          `?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(histUrl)) as
          | { historical?: Array<Record<string, unknown>>; symbol?: string }
          | Array<Record<string, unknown>>;

        const rows = Array.isArray(body)
          ? body
          : Array.isArray(body.historical)
            ? body.historical
            : [];
        if (rows.length === 0) continue;

        const points: TimeSeriesPoint[] = [];
        // FMP typically returns newest-first — reverse for chronological series
        const chronological = [...rows].reverse().slice(-60);
        for (const row of chronological) {
          const open = asNumber(row.open);
          const high = asNumber(row.high);
          const low = asNumber(row.low);
          const close = asNumber(row.close);
          const volume = asNumber(row.volume);
          const date = typeof row.date === "string" ? row.date : null;
          if (open == null || high == null || low == null || close == null || !date) continue;
          points.push({
            timestamp: date.includes("T") ? date : `${date}T00:00:00.000Z`,
            open,
            high,
            low,
            close,
            volume: volume ?? undefined,
          });
        }
        if (points.length === 0) continue;

        let assetClass: string | undefined;
        try {
          const profileUrl =
            `https://financialmodelingprep.com/stable/profile` +
            `?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
          const profile = (await jsonFetcher(profileUrl)) as
            | Array<{ isEtf?: boolean; isFund?: boolean; sector?: string }>
            | { isEtf?: boolean };
          const first = Array.isArray(profile) ? profile[0] : profile;
          if (first?.isEtf) assetClass = "etf";
          else if (first && "isFund" in first && first.isFund) assetClass = "etf";
          else assetClass = mapVendorAssetClass("equity");
        } catch {
          assetClass = undefined;
        }

        const last = points[points.length - 1]!;
        snapshots.push({
          symbol,
          providerId: "fmp",
          capturedAt,
          assetClass,
          quote: {
            symbol,
            price: last.close,
            currency: "USD",
            timestamp: last.timestamp,
            providerId: "fmp",
          },
          timeSeries: { symbol, interval: "1d", points, providerId: "fmp" },
        });
      } catch {
        /* per-symbol isolate */
      }
    }

    return snapshots;
  };
}

export function createFmpProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createFmpMarketFetcher({
      apiKey: options?.apiKey,
      env: options?.env,
      jsonFetcher: options?.jsonFetcher,
    });
  return createStubMarketProvider({ id: "fmp", kind: "market", displayName: "FMP" }, fetcher);
}

/**
 * Official FMP stock news when FMP_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents headlines.
 */
export function createFmpNewsFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.FMP_API_KEY, "fmp");
    } catch {
      return [];
    }

    const symbols = request.symbols.slice(0, 4);
    if (symbols.length === 0) return [];
    const limit = Math.min(Math.max(request.limitNewsItems ?? 8, 1), 20);
    const items: NewsItem[] = [];

    for (const symbol of symbols) {
      try {
        const url =
          `https://financialmodelingprep.com/stable/news/stock` +
          `?symbols=${encodeURIComponent(symbol)}&limit=${limit}` +
          `&apikey=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(url)) as Array<{
          title?: string;
          text?: string;
          url?: string;
          publishedDate?: string;
          site?: string;
          symbol?: string;
        }>;
        if (!Array.isArray(body)) continue;
        for (const row of body.slice(0, limit)) {
          if (!row.title || !row.url) continue;
          items.push({
            id: `fmp-news-${symbol}-${items.length}-${row.url.slice(0, 40)}`,
            title: row.title,
            summary: row.text,
            url: row.url,
            publishedAt: row.publishedDate ?? new Date().toISOString(),
            source: row.site ?? "fmp",
            providerId: "fmp",
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

export function createFmpNewsProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubNewsProvider(
    { id: "fmp", kind: "news", displayName: "FMP Stock News" },
    options?.fetcher ??
      createFmpNewsFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}
