import type { EconomicIndicator, MarketIntelligenceRequest } from "../../domain";
import { createDefaultJsonFetcher, type JsonFetcher } from "./http-shared";
import { createStubEconomicProvider } from "./shared";

type Env = Record<string, string | undefined>;

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

const DEFAULT_INDICATORS = [
  { id: "NY.GDP.MKTP.CD", label: "GDP (current US$)" },
  { id: "FP.CPI.TOTL.ZG", label: "Inflation (CPI %)" },
  { id: "SL.UEM.TOTL.ZS", label: "Unemployment (%)" },
] as const;

/**
 * World Bank Indicators API (public) when WORLDBANK_ENABLED.
 * Returns [] when disabled or HTTP fails — never invents macro values.
 */
export function createWorldBankEconomicFetcher(options?: {
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]> {
  const env = options?.env ?? process.env;
  const jsonFetcher = options?.jsonFetcher ?? createDefaultJsonFetcher();

  return async (request) => {
    if (!isTruthy(env.WORLDBANK_ENABLED)) return [];

    const country = (env.WORLDBANK_COUNTRY ?? "USA").trim().toUpperCase() || "USA";
    const keys =
      request.economicKeys?.length && request.economicKeys.length > 0
        ? request.economicKeys.slice(0, 4).map((k) => ({ id: k, label: k }))
        : [...DEFAULT_INDICATORS];

    const out: EconomicIndicator[] = [];
    for (const key of keys) {
      try {
        const url =
          `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}` +
          `/indicator/${encodeURIComponent(key.id)}?format=json&per_page=1&mrnev=1`;
        const body = (await jsonFetcher(url)) as unknown;
        if (!Array.isArray(body) || body.length < 2 || !Array.isArray(body[1])) continue;
        const row = body[1][0] as { value?: number | null; date?: string };
        const value = Number(row?.value);
        if (!row?.date || !Number.isFinite(value)) continue;
        out.push({
          key: key.id,
          label: key.label,
          value,
          period: row.date,
          providerId: "worldbank",
        });
      } catch {
        /* per-indicator isolate */
      }
    }
    return out;
  };
}

export function createWorldBankProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]>;
  readonly env?: Env;
  readonly jsonFetcher?: JsonFetcher;
}) {
  return createStubEconomicProvider(
    { id: "worldbank", kind: "economic", displayName: "World Bank" },
    options?.fetcher ??
      createWorldBankEconomicFetcher({
        env: options?.env,
        jsonFetcher: options?.jsonFetcher,
      }),
  );
}
