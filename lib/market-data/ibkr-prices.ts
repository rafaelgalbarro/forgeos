/**
 * IBKR market-data — primary live price source (free, no FMP rate limit).
 * GET {IBKR_SERVICE_URL}/api/ibkr/market-data?symbol=AAPL
 * Returns null when IBKR has no quote — never calls FMP.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";
import { getOrSetIbkrCached, ibkrCacheKey, peekIbkrCached } from "@/lib/trading/ibkr-cache";
import { IBKR_CRYPTO_SEC_TYPE } from "@/src/core/trading/crypto-ibkr";

const FETCH_TIMEOUT_MS = 12_000;

export type IbkrLivePrice = {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
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
): Promise<{ price: number; bid?: number; ask?: number } | null> {
  const qs =
    `symbol=${encodeURIComponent(symbol)}` +
    `&exchange=${encodeURIComponent(exchange)}` +
    `&currency=${encodeURIComponent(currency)}` +
    `&secType=${secType}`;

  const paths = [`/api/ibkr/market-data?${qs}`, `/api/ibkr/quote?${qs}`];

  for (const path of paths) {
    try {
      const raw = await ibkrServiceFetch<{
        currentPrice?: number;
        last?: number;
        mid?: number;
        bid?: number;
        ask?: number;
        price?: number;
      }>(path, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const price = asPositive(raw?.currentPrice ?? raw?.last ?? raw?.mid ?? raw?.price);
      if (price == null) continue;
      return {
        price,
        bid: asPositive(raw?.bid) ?? undefined,
        ask: asPositive(raw?.ask) ?? undefined,
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
      exchange: route.exchange,
      currency: route.currency,
      route: `IBKR-${route.label}`,
    };
  }
  return null;
}

/** Cached IBKR price (5 min TTL via IBKR read cache). */
export async function getIbkrPriceCached(ticker: string): Promise<IbkrLivePrice | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  return getOrSetIbkrCached(ibkrCacheKey("ibkr-live-price", symbol), () => getIbkrPrice(symbol));
}

/** Peek warm IBKR live-price cache without network. */
export function peekIbkrPriceCache(ticker: string): IbkrLivePrice | null {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const hit = peekIbkrCached<IbkrLivePrice>(ibkrCacheKey("ibkr-live-price", symbol));
  return hit?.value && hit.value.price > 0 ? hit.value : null;
}
