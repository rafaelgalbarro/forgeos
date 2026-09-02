import type { EconomicIndicator, MarketIntelligenceRequest } from "../../domain";
import {
  createDefaultJsonFetcher,
  requireApiKey,
  type JsonFetcher,
} from "./http-shared";
import { createStubEconomicProvider } from "./shared";

type Env = Record<string, string | undefined>;

const DEFAULT_SERIES = ["GDP", "UNRATE", "CPIAUCSL", "FEDFUNDS"] as const;

/**
 * Official FRED series observations when FRED_API_KEY is set.
 * Returns [] when key missing or HTTP fails — never invents macro values.
 */
export function createFredEconomicFetcher(options?: {
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    let apiKey: string;
    try {
      apiKey = requireApiKey(options?.apiKey ?? env.FRED_API_KEY, "fred");
    } catch {
      return [];
    }

    const keys =
      request.economicKeys?.length && request.economicKeys.length > 0
        ? request.economicKeys.slice(0, 6)
        : [...DEFAULT_SERIES];

    const out: EconomicIndicator[] = [];
    for (const key of keys) {
      try {
        const url =
          `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=${encodeURIComponent(key)}&api_key=${encodeURIComponent(apiKey)}` +
          `&file_type=json&sort_order=desc&limit=1`;
        const body = (await jsonFetcher(url)) as {
          observations?: Array<{ date?: string; value?: string }>;
        };
        const obs = body.observations?.[0];
        const value = Number(obs?.value);
        if (!obs?.date || !Number.isFinite(value)) continue;
        out.push({
          key,
          label: key,
          value,
          period: obs.date,
          providerId: "fred",
        });
      } catch {
        /* per-series isolate */
      }
    }
    return out;
  };
}

export function createFredProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]>;
  readonly apiKey?: string;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createFredEconomicFetcher({
      apiKey: options?.apiKey,
      env: options?.env,
      jsonFetcher: options?.jsonFetcher,
    });
  return createStubEconomicProvider({ id: "fred", kind: "economic", displayName: "FRED" }, fetcher);
}
