/**
 * USA stocks cycle universe — curated sectors + EODHD real-time movers.
 */

import "server-only";

import { screenerUsGainers } from "@/lib/market-data/eodhd";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import {
  isAlpacaCryptoTicker,
  isAlpacaForexTicker,
  toAlpacaCryptoPairId,
} from "@/lib/brokers/alpaca-pairs";
import { USA_CURATED_UNIVERSE } from "@/lib/trading/usa-sectors";

/** Final tickers analyzed per stocks cycle. */
export const MAX_STOCKS_CYCLE_TICKERS = 50;
const MAX_UNION = 80;
const TOP_GAINERS = 30;
const TOP_CURATED = 20;
const MIN_VOLUME = 500_000;
const MIN_PRICE = 5;
const MAX_PRICE = 500;

/** @deprecated use USA_CURATED_UNIVERSE — kept for callers expecting QUALITY_USA_STOCKS_FALLBACK */
export const QUALITY_USA_STOCKS_FALLBACK = USA_CURATED_UNIVERSE.slice(0, 20);

export type StocksUniverseResult = {
  tickers: string[];
  source: "eodhd-screener+curated" | "curated-fallback";
  scanned: number;
  momentum: Array<{ symbol: string; changePct: number }>;
};

/** Exclude spot crypto / forex from the stocks cycle (crypto ETFs like IBIT are OK). */
export function isUsStockTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (isIbkrCryptoTicker(t)) return false;
  if (isAlpacaCryptoTicker(t)) return false;
  if (isAlpacaForexTicker(t)) return false;
  if (toAlpacaCryptoPairId(t)) return false;
  return true;
}

function curatedFallback(momentumMap?: Map<string, number>): StocksUniverseResult {
  const tickers = USA_CURATED_UNIVERSE.filter(isUsStockTicker).slice(0, MAX_STOCKS_CYCLE_TICKERS);
  console.log(`[StocksUniverse] curated fallback → ${tickers.length} tickers`);
  return {
    tickers: [...tickers],
    source: "curated-fallback",
    scanned: USA_CURATED_UNIVERSE.length,
    momentum: tickers.map((symbol) => ({
      symbol,
      changePct: momentumMap?.get(symbol) ?? 0,
    })),
  };
}

/**
 * Each cycle:
 * 1) EODHD top movers (price 5–500, avgvol > 500k)
 * 2) Union with curated ~100 list (cap 80)
 * 3) Sort by abs(change) desc
 * 4) Top 30 gainers + top 20 curated = up to 50
 */
export async function resolveStocksCycleUniverse(): Promise<StocksUniverseResult> {
  const curated = USA_CURATED_UNIVERSE.filter(isUsStockTicker);
  const curatedSet = new Set(curated);
  const changeBySymbol = new Map<string, number>();

  let screener: Awaited<ReturnType<typeof screenerUsGainers>> = [];
  try {
    screener = await screenerUsGainers({
      minVolume: MIN_VOLUME,
      minPrice: MIN_PRICE,
      maxPrice: MAX_PRICE,
      limit: 50,
    });
  } catch (err) {
    console.warn(
      "[StocksUniverse] EODHD screener error:",
      err instanceof Error ? err.message : err,
    );
    return curatedFallback();
  }

  for (const row of screener) {
    if (!isUsStockTicker(row.symbol)) continue;
    changeBySymbol.set(row.symbol, row.changePct);
  }

  const union = new Set<string>();
  for (const row of screener) {
    if (isUsStockTicker(row.symbol)) union.add(row.symbol);
  }
  for (const t of curated) union.add(t);
  const unionList = [...union].slice(0, MAX_UNION);

  const ranked = unionList
    .map((symbol) => ({
      symbol,
      changePct: changeBySymbol.get(symbol) ?? 0,
      absChange: Math.abs(changeBySymbol.get(symbol) ?? 0),
      curated: curatedSet.has(symbol),
    }))
    .sort((a, b) => b.absChange - a.absChange);

  if (screener.length === 0) {
    return curatedFallback(changeBySymbol);
  }

  const gainers = ranked
    .filter((r) => r.changePct > 0)
    .slice(0, TOP_GAINERS)
    .map((r) => r.symbol);

  const curatedPick: string[] = [];
  for (const r of ranked) {
    if (!r.curated) continue;
    if (gainers.includes(r.symbol)) continue;
    curatedPick.push(r.symbol);
    if (curatedPick.length >= TOP_CURATED) break;
  }

  // Fill remaining slots from absolute movers if needed
  const selected = [...new Set([...gainers, ...curatedPick])];
  for (const r of ranked) {
    if (selected.length >= MAX_STOCKS_CYCLE_TICKERS) break;
    if (!selected.includes(r.symbol)) selected.push(r.symbol);
  }

  const tickers = selected.slice(0, MAX_STOCKS_CYCLE_TICKERS);
  const momentum = tickers.map((symbol) => ({
    symbol,
    changePct: changeBySymbol.get(symbol) ?? 0,
  }));

  console.log(
    `[StocksUniverse] screener=${screener.length} union=${unionList.length} → gainers=${gainers.length} curated+=${curatedPick.length} cycle=${tickers.length}`,
  );

  return {
    tickers,
    source: "eodhd-screener+curated",
    scanned: screener.length,
    momentum,
  };
}
