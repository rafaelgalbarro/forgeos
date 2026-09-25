/**
 * Forex live quotes via EODHD real-time API.
 */

import "server-only";

import { FOREX_PAIRS, spreadPips, type ForexPairId } from "@/lib/investment/forex/config";
import { getBatchQuotes, getQuote, isEodhdConfigured } from "@/lib/market-data/eodhd";

export type EodhdForexRate = {
  pairId: string;
  display: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  changePct: number | null;
  source: "EODHD" | "NO_DATA";
  updatedAt: string;
};

const PAIR_DISPLAY: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCHF: "USD/CHF",
  USDCAD: "USD/CAD",
  EURGBP: "EUR/GBP",
  EURJPY: "EUR/JPY",
  GBPJPY: "GBP/JPY",
};

function emptyRate(pairId: string, now: string): EodhdForexRate {
  return {
    pairId,
    display: PAIR_DISPLAY[pairId] ?? pairId,
    bid: null,
    ask: null,
    mid: null,
    changePct: null,
    source: "NO_DATA",
    updatedAt: now,
  };
}

/** Fetch forex rates from EODHD real-time endpoint. */
export async function fetchEodhdForexRates(
  pairIds: readonly string[] = FOREX_PAIRS.map((p) => p.pairId),
): Promise<EodhdForexRate[]> {
  const now = new Date().toISOString();
  if (!isEodhdConfigured()) {
    return pairIds.map((id) => emptyRate(id.toUpperCase(), now));
  }

  const quotes = await getBatchQuotes(pairIds);
  return pairIds.map((rawId) => {
    const pairId = rawId.toUpperCase() as ForexPairId;
    const q = quotes.get(pairId);
    if (!q || !(q.price > 0)) return emptyRate(pairId, now);

    const spread = q.high > q.low ? (q.high - q.low) / 2 : q.price * 0.00005;
    const bid = q.price - spread;
    const ask = q.price + spread;
    const spreadPipsVal = spreadPips(pairId, bid, ask);

    return {
      pairId,
      display: PAIR_DISPLAY[pairId] ?? pairId,
      bid,
      ask,
      mid: q.price,
      changePct: q.changePercentage,
      source: "EODHD" as const,
      updatedAt: q.updatedAt || now,
    };
  });
}

export async function fetchEodhdForexQuote(pairId: string): Promise<EodhdForexRate> {
  const id = pairId.replace("/", "").toUpperCase();
  const rows = await fetchEodhdForexRates([id]);
  return rows[0] ?? emptyRate(id, new Date().toISOString());
}

export { getQuote as getEodhdForexQuoteSingle };
