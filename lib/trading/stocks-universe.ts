/**
 * USA stocks cycle universe — EODHD screener ∩ allowedTickers, momentum ranked.
 */

import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { screenerUsGainers } from "@/lib/market-data/eodhd";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import {
  isAlpacaCryptoTicker,
  isAlpacaForexTicker,
  toAlpacaCryptoPairId,
} from "@/lib/brokers/alpaca-pairs";

export const MAX_STOCKS_CYCLE_TICKERS = 20;
const MIN_SCREENER_TICKERS = 5;
const MIN_VOLUME = 500_000;
const MIN_PRICE = 5;
const MAX_PRICE = 500;

/** Fixed quality USA equities when EODHD screener is unavailable or too thin. */
export const QUALITY_USA_STOCKS_FALLBACK = [
  "SPY",
  "QQQ",
  "IWM",
  "ARKK",
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMZN",
  "GOOGL",
  "META",
  "IBIT",
  "GLD",
  "TLT",
  "TQQQ",
  "SQQQ",
  "VXX",
  "BITO",
  "FETH",
  "ARKB",
] as const;

export type StocksUniverseResult = {
  tickers: string[];
  source: "eodhd-screener" | "quality-fallback";
  scanned: number;
  momentum: Array<{ symbol: string; changePct: number }>;
};

/** Exclude crypto, forex, and any non-equity ticker from the stocks cycle. */
export function isUsStockTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (isIbkrCryptoTicker(t)) return false;
  if (isAlpacaCryptoTicker(t)) return false;
  if (isAlpacaForexTicker(t)) return false;
  if (toAlpacaCryptoPairId(t)) return false;
  return true;
}

function stockAllowedSet(): Set<string> {
  return new Set(
    (TRADING_CONFIG.allowedTickers as readonly string[])
      .map((t) => t.trim().toUpperCase())
      .filter(isUsStockTicker),
  );
}

function qualityFallbackUniverse(): StocksUniverseResult {
  const tickers = QUALITY_USA_STOCKS_FALLBACK.filter(isUsStockTicker).slice(
    0,
    MAX_STOCKS_CYCLE_TICKERS,
  );

  console.log(`[StocksUniverse] quality fallback → ${tickers.length} tickers`);
  return {
    tickers: [...tickers],
    source: "quality-fallback",
    scanned: QUALITY_USA_STOCKS_FALLBACK.length,
    momentum: tickers.map((symbol) => ({ symbol, changePct: 0 })),
  };
}

/** Dynamic USA stocks universe for Cycle 1. */
export async function resolveStocksCycleUniverse(): Promise<StocksUniverseResult> {
  const allowed = stockAllowedSet();
  const momentum: Array<{ symbol: string; changePct: number }> = [];

  let screener: Awaited<ReturnType<typeof screenerUsGainers>> = [];
  try {
    screener = await screenerUsGainers({
      minVolume: MIN_VOLUME,
      minPrice: MIN_PRICE,
      maxPrice: MAX_PRICE,
      limit: 120,
    });
  } catch (err) {
    console.warn(
      "[StocksUniverse] EODHD screener error:",
      err instanceof Error ? err.message : err,
    );
    return qualityFallbackUniverse();
  }

  const fromScreener = screener
    .filter((r) => isUsStockTicker(r.symbol) && allowed.has(r.symbol))
    .sort((a, b) => b.changePct - a.changePct);

  if (fromScreener.length < MIN_SCREENER_TICKERS) {
    console.log(
      `[StocksUniverse] screener ${screener.length} → allowed ${fromScreener.length} (<${MIN_SCREENER_TICKERS}) — quality fallback`,
    );
    return qualityFallbackUniverse();
  }

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
