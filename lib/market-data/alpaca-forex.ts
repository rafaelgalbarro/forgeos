/**
 * Alpaca forex rates — v1beta3 latest/rates (paper/live data API).
 */

import "server-only";

import { ALPACA_FOREX_PAIRS } from "@/lib/brokers/alpaca-pairs";

const PAIR_DISPLAY: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCHF: "USD/CHF",
};

export type AlpacaForexRate = {
  pairId: string;
  display: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  source: "ALPACA" | "NO_DATA";
  updatedAt: string;
};

function alpacaDataBaseUrl(): string {
  return (process.env.ALPACA_DATA_URL ?? "https://data.alpaca.markets").replace(/\/$/, "");
}

export function isAlpacaConfigured(): boolean {
  return Boolean(process.env.ALPACA_API_KEY?.trim() && process.env.ALPACA_SECRET?.trim());
}

function alpacaHeaders(): Record<string, string> {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY?.trim() ?? "",
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET?.trim() ?? "",
  };
}

function emptyRate(pairId: string, now: string): AlpacaForexRate {
  return {
    pairId,
    display: PAIR_DISPLAY[pairId] ?? pairId,
    bid: null,
    ask: null,
    mid: null,
    source: "NO_DATA",
    updatedAt: now,
  };
}

/** GET /v1beta3/forex/latest/rates?currency_pairs=EUR/USD,... */
export async function fetchAlpacaForexRates(
  pairIds: readonly string[] = [...ALPACA_FOREX_PAIRS],
): Promise<AlpacaForexRate[]> {
  const now = new Date().toISOString();
  if (!isAlpacaConfigured()) {
    return pairIds.map((id) => emptyRate(id.toUpperCase(), now));
  }

  const currencyPairs = pairIds
    .map((id) => PAIR_DISPLAY[id.toUpperCase()] ?? id)
    .join(",");
  const url =
    `${alpacaDataBaseUrl()}/v1beta3/forex/latest/rates?currency_pairs=` +
    encodeURIComponent(currencyPairs);

  try {
    const res = await fetch(url, {
      headers: alpacaHeaders(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`[AlpacaFX] HTTP ${res.status} for forex rates`);
      return pairIds.map((id) => emptyRate(id.toUpperCase(), now));
    }
    const json = (await res.json()) as {
      rates?: Record<string, { bid?: number; ask?: number; mid?: number }>;
    };
    const rates = json.rates ?? {};
    return pairIds.map((rawId) => {
      const pairId = rawId.toUpperCase();
      const display = PAIR_DISPLAY[pairId] ?? pairId;
      const row = rates[display];
      if (!row) return emptyRate(pairId, now);
      const bid = Number(row.bid);
      const ask = Number(row.ask);
      const mid = Number(row.mid ?? (bid + ask) / 2);
      if (!(mid > 0)) return emptyRate(pairId, now);
      return {
        pairId,
        display,
        bid: Number.isFinite(bid) && bid > 0 ? bid : null,
        ask: Number.isFinite(ask) && ask > 0 ? ask : null,
        mid,
        source: "ALPACA" as const,
        updatedAt: now,
      };
    });
  } catch (err) {
    console.warn("[AlpacaFX] fetch failed:", err instanceof Error ? err.message : err);
    return pairIds.map((id) => emptyRate(id.toUpperCase(), now));
  }
}

export function alpacaPaperTradingUrl(): string {
  return (process.env.ALPACA_PAPER_URL ?? "https://paper-api.alpaca.markets").replace(/\/$/, "");
}
