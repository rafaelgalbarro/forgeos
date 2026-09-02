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
 * Official Polygon aggregates + ticker details when POLYGON_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents quotes.
 */
export function createPolygonMarketFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.POLYGON_API_KEY, "polygon");
    } catch {
      return [];
    }

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();

    for (const symbol of request.symbols.slice(0, 8)) {
      try {
        const to = new Date();
        const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
        const fromStr = from.toISOString().slice(0, 10);
        const toStr = to.toISOString().slice(0, 10);
        const aggUrl =
          `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${fromStr}/${toStr}` +
          `?adjusted=true&sort=asc&limit=60&apiKey=${encodeURIComponent(apiKey)}`;
        const agg = (await jsonFetcher(aggUrl)) as {
          results?: Array<{ t?: number; o?: number; h?: number; l?: number; c?: number; v?: number }>;
        };
        const results = Array.isArray(agg.results) ? agg.results : [];
        if (results.length === 0) continue;

        const points: TimeSeriesPoint[] = [];
        for (const row of results) {
          const open = asNumber(row.o);
          const high = asNumber(row.h);
          const low = asNumber(row.l);
          const close = asNumber(row.c);
          const volume = asNumber(row.v);
          if (open == null || high == null || low == null || close == null) continue;
          points.push({
            timestamp: new Date(Number(row.t) || Date.now()).toISOString(),
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
          const detailUrl =
            `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}` +
            `?apiKey=${encodeURIComponent(apiKey)}`;
          const detail = (await jsonFetcher(detailUrl)) as {
            results?: { type?: string; market?: string };
          };
          assetClass = mapVendorAssetClass(detail.results?.type ?? detail.results?.market);
        } catch {
          assetClass = undefined;
        }

        const last = points[points.length - 1]!;
        snapshots.push({
          symbol,
          providerId: "polygon",
          capturedAt,
          assetClass,
          quote: {
            symbol,
            price: last.close,
            currency: "USD",
            timestamp: last.timestamp,
            providerId: "polygon",
          },
          timeSeries: {
            symbol,
            interval: "1d",
            points,
            providerId: "polygon",
          },
        });
      } catch {
        /* isolate per-symbol — engine collects provider-level errors separately if thrown */
      }
    }

    return snapshots;
  };
}

export function createPolygonProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createPolygonMarketFetcher({
      apiKey: options?.apiKey,
      env: options?.env,
      jsonFetcher: options?.jsonFetcher,
    });
  return createStubMarketProvider({ id: "polygon", kind: "market", displayName: "Polygon" }, fetcher);
}

/**
 * Official Polygon ticker news when POLYGON_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents headlines.
 */
export function createPolygonNewsFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.POLYGON_API_KEY, "polygon");
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
          `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(symbol)}` +
          `&limit=${limit}&apiKey=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(url)) as {
          results?: Array<{
            id?: string;
            title?: string;
            description?: string;
            article_url?: string;
            published_utc?: string;
            publisher?: { name?: string };
            tickers?: string[];
          }>;
        };
        if (!Array.isArray(body.results)) continue;
        for (const row of body.results.slice(0, limit)) {
          if (!row.title || !row.article_url) continue;
          items.push({
            id: `polygon-news-${row.id ?? items.length}`,
            title: row.title,
            summary: row.description,
            url: row.article_url,
            publishedAt: row.published_utc ?? new Date().toISOString(),
            source: row.publisher?.name ?? "polygon",
            providerId: "polygon",
            symbols: row.tickers?.length ? row.tickers.slice(0, 4) : [symbol],
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

export function createPolygonNewsProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly NewsItem[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubNewsProvider(
    { id: "polygon", kind: "news", displayName: "Polygon News" },
    options?.fetcher ??
      createPolygonNewsFetcher({
        apiKey: options?.apiKey,
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}
