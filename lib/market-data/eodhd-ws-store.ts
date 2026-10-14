/**
 * In-memory last bid/ask/last from EODHD US WebSocket (quotes + trades).
 */

import "server-only";

export type EodhdWsMarketStatus = "open" | "closed" | "extended hours";

export type EodhdWsQuote = {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  bidSize?: number;
  askSize?: number;
  lastSize?: number;
  updatedAt: string;
  updatedAtMs: number;
  /** From trade `ms` when present; inferred from session clock otherwise. */
  extendedHours: boolean;
  marketStatus?: EodhdWsMarketStatus;
  quoteUpdatedAtMs: number;
  tradeUpdatedAtMs?: number;
};

const quotes = new Map<string, EodhdWsQuote>();

function normalizeSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  const dot = s.indexOf(".");
  return dot > 0 ? s.slice(0, dot) : s;
}

export function getEodhdWsQuote(ticker: string): EodhdWsQuote | null {
  const key = normalizeSymbol(ticker);
  const hit = quotes.get(key);
  return hit ? { ...hit } : null;
}

export function listEodhdWsSymbols(): string[] {
  return [...quotes.keys()];
}

export function patchEodhdWsQuote(
  ticker: string,
  patch: Partial<Omit<EodhdWsQuote, "symbol">> & { symbol?: string },
): EodhdWsQuote {
  const symbol = normalizeSymbol(patch.symbol ?? ticker);
  const prev = quotes.get(symbol);
  const nowMs = Date.now();
  const quoteUpdatedAtMs = patch.quoteUpdatedAtMs ?? prev?.quoteUpdatedAtMs ?? nowMs;
  const tradeUpdatedAtMs = patch.tradeUpdatedAtMs ?? prev?.tradeUpdatedAtMs;

  const bid = patch.bid ?? prev?.bid ?? 0;
  const ask = patch.ask ?? prev?.ask ?? 0;
  const last = patch.last ?? prev?.last ?? 0;
  const updatedAtMs = Math.max(
    quoteUpdatedAtMs,
    tradeUpdatedAtMs ?? 0,
    prev?.updatedAtMs ?? 0,
  );

  const row: EodhdWsQuote = {
    symbol,
    bid: bid > 0 ? bid : prev?.bid ?? 0,
    ask: ask > 0 ? ask : prev?.ask ?? 0,
    last: last > 0 ? last : prev?.last ?? 0,
    bidSize: patch.bidSize ?? prev?.bidSize,
    askSize: patch.askSize ?? prev?.askSize,
    lastSize: patch.lastSize ?? prev?.lastSize,
    updatedAt: new Date(updatedAtMs).toISOString(),
    updatedAtMs,
    extendedHours: patch.extendedHours ?? prev?.extendedHours ?? false,
    marketStatus: patch.marketStatus ?? prev?.marketStatus,
    quoteUpdatedAtMs,
    tradeUpdatedAtMs,
  };
  quotes.set(symbol, row);
  return { ...row };
}

/** Test helper — clear store. */
export function __resetEodhdWsStoreForTests(): void {
  quotes.clear();
}
