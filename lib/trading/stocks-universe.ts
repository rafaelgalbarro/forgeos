/**
 * USA stocks cycle universe — EODHD screener ∩ allowedTickers, momentum ranked.
 */

import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import {
  getBatchQuotes,
  isEodhdConfigured,
  screenerUsGainers,
} from "@/lib/market-data/eodhd";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import { isAlpacaCryptoTicker, isAlpacaForexTicker } from "@/lib/brokers/alpaca-pairs";

export const MAX_STOCKS_CYCLE_TICKERS = 20;
const MIN_VOLUME = 500_000;
const MIN_PRICE = 5;
const MAX_PRICE = 500;

export type StocksUniverseResult = {
  tickers: string[];
  source: "eodhd-screener" | "eodhd-quotes" | "allowed-fallback";
  scanned: number;
  momentum: Array<{ symbol: string; changePct: number }>;
};

function stockAllowedSet(): Set<string> {
  return new Set(
    (TRADING_CONFIG.allowedTickers as readonly string[])
      .map((t) => t.trim().toUpperCase())
      .filter((t) => {
        if (!t) return false;
        if (isIbkrCryptoTicker(t) || isAlpacaCryptoTicker(t) || isAlpacaForexTicker(t)) {
          return false;
        }
        return true;
      }),
  );
}

/** Dynamic USA stocks universe for Cycle 1. */
export async function resolveStocksCycleUniverse(): Promise<StocksUniverseResult> {
  const allowed = stockAllowedSet();
  const momentum: Array<{ symbol: string; changePct: number }> = [];

  const screener = await screenerUsGainers({
    minVolume: MIN_VOLUME,
    minPrice: MIN_PRICE,
    maxPrice: MAX_PRICE,
    limit: 120,
  });

  const fromScreener = screener
    .filter((r) => allowed.has(r.symbol))
    .sort((a, b) => b.changePct - a.changePct);

  if (fromScreener.length > 0) {
    const tickers = fromScreener.slice(0, MAX_STOCKS_CYCLE_TICKERS).map((r) => {
      momentum.push({ symbol: r.symbol, changePct: r.changePct });
      return r.symbol;
    });
    console.log(
      `[StocksUniverse] EODHD screener ${screener.length} → allowed ${fromScreener.length} → cycle ${tickers.length}`,
    );
    return {
      tickers,
      source: "eodhd-screener",
      scanned: screener.length,
      momentum,
    };
  }

  if (isEodhdConfigured()) {
    const pool = [...allowed];
    const quotes = await getBatchQuotes(pool);
    const ranked = pool
      .map((sym) => {
        const q = quotes.get(sym);
        if (!q || !(q.price >= MIN_PRICE && q.price <= MAX_PRICE)) return null;
        if (q.volume > 0 && q.volume < MIN_VOLUME) return null;
        return { symbol: sym, changePct: q.changePercentage, price: q.price, volume: q.volume };
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => b.changePct - a.changePct);

    const tickers = ranked.slice(0, MAX_STOCKS_CYCLE_TICKERS).map((r) => {
      momentum.push({ symbol: r.symbol, changePct: r.changePct });
      return r.symbol;
    });

    if (tickers.length > 0) {
      console.log(`[StocksUniverse] EODHD quotes fallback → ${tickers.length} tickers`);
      return {
        tickers,
        source: "eodhd-quotes",
        scanned: pool.length,
        momentum,
      };
    }
  }

  const fallback = [...allowed].slice(0, MAX_STOCKS_CYCLE_TICKERS);
  console.log(`[StocksUniverse] allowedTickers fallback → ${fallback.length} tickers`);
  return {
    tickers: fallback,
    source: "allowed-fallback",
    scanned: allowed.size,
    momentum: fallback.map((symbol) => ({ symbol, changePct: 0 })),
  };
}
