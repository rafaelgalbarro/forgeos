import type { EconomicIndicator, MarketIntelligenceRequest } from "../../domain";
import { createStubEconomicProvider } from "./shared";

type Env = Record<string, string | undefined>;

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

export type TextFetcher = (url: string, init?: RequestInit) => Promise<string>;

function createDefaultTextFetcher(timeoutMs = 8_000): TextFetcher {
  return async (url, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * ECB Statistical Data Warehouse EUR/USD exchange rate (public SDMX) when ECB_ENABLED.
 * Returns [] when disabled or parse fails — never invents FX values.
 */
export function createEcbEconomicFetcher(options?: {
  readonly env?: Env;
  readonly textFetcher?: TextFetcher;
}): (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]> {
  const env = options?.env ?? process.env;
  const textFetcher = options?.textFetcher ?? createDefaultTextFetcher();

  return async () => {
    if (!isTruthy(env.ECB_ENABLED)) return [];
    try {
      const url =
        "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A" +
        "?lastNObservations=1&format=csvdata";
      const csv = await textFetcher(url);
      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      // CSV header + data row; OBS_VALUE is typically last numeric column
      const dataLine = lines.find((l) => !l.startsWith("KEY") && !l.startsWith("FREQ") && /\d/.test(l));
      if (!dataLine) return [];
      const parts = dataLine.split(",");
      const value = Number(parts[parts.length - 1]);
      const period = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) ?? "NO_DATA";
      if (!Number.isFinite(value)) return [];
      return [
        {
          key: "EURUSD",
          label: "ECB EUR/USD reference",
          value,
          unit: "USD per EUR",
          period,
          providerId: "ecb",
        },
      ];
    } catch {
      return [];
    }
  };
}

export function createEcbProvider(options?: {
  readonly fetcher?: (request: MarketIntelligenceRequest) => Promise<readonly EconomicIndicator[]>;
  readonly env?: Env;
  readonly textFetcher?: TextFetcher;
}) {
  const fetcher =
    options?.fetcher ??
    createEcbEconomicFetcher({
      env: options?.env,
      textFetcher: options?.textFetcher,
    });
  return createStubEconomicProvider({ id: "ecb", kind: "economic", displayName: "ECB" }, fetcher);
}
