import type { MarketIntelligenceRequest, MarketSnapshot, TimeSeriesPoint } from "../../domain";
import {
  createDefaultJsonFetcher,
  requireApiKey,
  type JsonFetcher,
} from "./http-shared";
import { createStubMarketProvider } from "./shared";

type Env = Record<string, string | undefined>;

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Official Twelve Data time series when TWELVE_DATA_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents quotes.
 */
export function createTwelveDataMarketFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.TWELVE_DATA_API_KEY, "twelve-data");
    } catch {
      return [];
    }

    const snapshots: MarketSnapshot[] = [];
    const capturedAt = new Date().toISOString();

    for (const symbol of request.symbols.slice(0, 8)) {
      try {
        const url =
          `https://api.twelvedata.com/time_series` +
          `?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=60` +
          `&apikey=${encodeURIComponent(apiKey)}`;
        const body = (await jsonFetcher(url)) as {
          status?: string;
          values?: Array<Record<string, string>>;
          meta?: { type?: string; currency?: string };
        };
        if (body.status === "error" || !Array.isArray(body.values) || body.values.length === 0) {
          continue;
        }

        const chronological = [...body.values].reverse();
        const points: TimeSeriesPoint[] = [];
        for (const row of chronological) {
          const open = asNumber(row.open);
          const high = asNumber(row.high);
          const low = asNumber(row.low);
          const close = asNumber(row.close);
          const volume = asNumber(row.volume);
          const datetime = row.datetime;
          if (open == null || high == null || low == null || close == null || !datetime) continue;
          points.push({
            timestamp: datetime.includes("T") ? datetime : `${datetime}T00:00:00.000Z`,
            open,
            high,
            low,
            close,
            volume: volume ?? undefined,
          });
        }
        if (points.length === 0) continue;

        const last = points[points.length - 1]!;
        const typeRaw = body.meta?.type;
        const assetClass =
          typeof typeRaw === "string" && typeRaw.trim()
            ? typeRaw.trim().toLowerCase()
            : undefined;

        snapshots.push({
          symbol,
          providerId: "twelve-data",
          capturedAt,
          assetClass,
          quote: {
            symbol,
            price: last.close,
            currency: body.meta?.currency ?? "USD",
            timestamp: last.timestamp,
            providerId: "twelve-data",
          },
          timeSeries: { symbol, interval: "1d", points, providerId: "twelve-data" },
        });
      } catch {
        /* per-symbol isolate */
      }
    }

    return snapshots;
  };
}

export function createTwelveDataProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly MarketSnapshot[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createTwelveDataMarketFetcher({
      apiKey: options?.apiKey,
      env: options?.env,
      jsonFetcher: options?.jsonFetcher,
    });
  return createStubMarketProvider(
    { id: "twelve-data", kind: "market", displayName: "TwelveData" },
    fetcher,
  );
}
