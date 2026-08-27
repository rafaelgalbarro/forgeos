/**
 * IBKR market-data — primary live price source (free, no FMP rate limit).
 * GET /api/ibkr/price/{symbol} | /api/ibkr/market-data | /api/ibkr/quote
 * Cache TTL: 30 seconds.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";
import {
  getOrSetIbkrCached,
  ibkrCacheKey,
  peekIbkrCached,
  IBKR_PRICE_CACHE_TTL_MS,
} from "@/lib/trading/ibkr-cache";
import { IBKR_CRYPTO_SEC_TYPE } from "@/src/core/trading/crypto-ibkr";

const FETCH_TIMEOUT_MS = 12_000;

export type IbkrLivePrice = {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume?: number;
  exchange: string;
  currency: string;
  route: string;
};

function asPositive(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function fetchRouteQuote(
  symbol: string,
  exchange: string,
  currency: string,
  secType: string = "STK",
): Promise<{ price: number; bid?: number; ask?: number; volume?: number } | null> {
  const qs =
    `symbol=${encodeURIComponent(symbol)}` +
    `&exchange=${encodeURIComponent(exchange)}` +
    `&currency=${encodeURIComponent(currency)}` +
    `&secType=${secType}`;

  const paths = [
    `/api/ibkr/price/${encodeURIComponent(symbol)}?${qs.replace(/^symbol=[^&]*&/, "")}`,
    `/api/ibkr/market-data?${qs}`,
    `/api/ibkr/quote?${qs}`,
  ];

  for (const path of paths) {
    try {
      const raw = await ibkrServiceFetch<{
        currentPrice?: number;
        last?: number;
        mid?: number;
        close?: number;
        bid?: number;
        ask?: number;
        price?: number;
        volume?: number;
      }>(path, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const price = asPositive(
        raw?.currentPrice ?? raw?.price ?? raw?.last ?? raw?.mid ?? raw?.close,
      );
      if (price == null) continue;
      return {
        price,
        bid: asPositive(raw?.bid) ?? undefined,
        ask: asPositive(raw?.ask) ?? undefined,
        volume: asPositive(raw?.volume) ?? undefined,
      };
    } catch {
      /* try next path */
    }
  }
  return null;
}

/**
 * Live IBKR price for a ticker. null if IBKR has no quote (caller must not hit FMP HTTP).
 */
export async function getIbkrPrice(ticker: string): Promise<IbkrLivePrice | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;

  const routes = quoteRoutesForTicker(symbol);
  for (const route of routes) {
    const secType = route.exchange === "PAXOS" ? IBKR_CRYPTO_SEC_TYPE : "STK";
    const quote = await fetchRouteQuote(route.symbol, route.exchange, route.currency, secType);
    if (!quote || !(quote.price > 0)) continue;
    return {
      symbol,
      price: quote.price,
      bid: quote.bid,
      ask: quote.ask,
      volume: quote.volume,
      exchange: route.exchange,
      currency: route.currency,
      route: `IBKR-${route.label}`,
    };
  }
  return null;
}

/** Cached IBKR price (30s TTL). */
export async function getIbkrPriceCached(ticker: string): Promise<IbkrLivePrice | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  return getOrSetIbkrCached(
    ibkrCacheKey("ibkr-live-price", symbol),
    () => getIbkrPrice(symbol),
    IBKR_PRICE_CACHE_TTL_MS,
  );
}

/** Peek warm IBKR live-price cache without network. */
export function peekIbkrPriceCache(ticker: string): IbkrLivePrice | null {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const hit = peekIbkrCached<IbkrLivePrice>(ibkrCacheKey("ibkr-live-price", symbol));
  return hit?.value && hit.value.price > 0 ? hit.value : null;
}
