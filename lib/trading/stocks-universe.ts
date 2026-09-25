/**
 * USA stocks cycle universe — curated sectors + EODHD movers, filtered by capital.
 */

import "server-only";

import { screenerUsGainers, getBatchQuotes } from "@/lib/market-data/eodhd";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import {
  isAlpacaCryptoTicker,
  isAlpacaForexTicker,
  toAlpacaCryptoPairId,
} from "@/lib/brokers/alpaca-pairs";
import { USA_CURATED_UNIVERSE } from "@/lib/trading/usa-sectors";
import { fetchCapitalSnapshot } from "@/lib/trading/capital";

/** Final tickers analyzed per stocks cycle. */
export const MAX_STOCKS_CYCLE_TICKERS = 50;
const MAX_UNION = 80;
const TOP_GAINERS = 30;
const TOP_CURATED = 20;
const MIN_VOLUME = 500_000;
const MIN_PRICE = 5;
const MAX_PRICE = 500;

/** @deprecated use USA_CURATED_UNIVERSE */
export const QUALITY_USA_STOCKS_FALLBACK = USA_CURATED_UNIVERSE.slice(0, 20);

export type StocksUniverseResult = {
  tickers: string[];
  source: "eodhd-screener+curated" | "curated-fallback";
  scanned: number;
  momentum: Array<{ symbol: string; changePct: number }>;
  capitalFilter?: { available: number; excluded: string[]; included: string[] };
};

export function isUsStockTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (isIbkrCryptoTicker(t)) return false;
  if (isAlpacaCryptoTicker(t)) return false;
  if (isAlpacaForexTicker(t)) return false;
  if (toAlpacaCryptoPairId(t)) return false;
  return true;
}

async function filterByAffordableCapital(
  tickers: string[],
  priceHint?: Map<string, number>,
): Promise<{ tickers: string[]; available: number; excluded: string[]; included: string[] }> {
  let available = 0;
  try {
    const cap = await fetchCapitalSnapshot();
    available = Math.max(cap.availableFunds, cap.cashUSD, cap.cashEUR, cap.tradingCashUSD);
  } catch {
    available = 0;
  }

  if (!(available > 0)) {
    return { tickers, available: 0, excluded: [], included: tickers };
  }

  const maxPrice = available * 0.8;
  const needQuotes = tickers.filter((t) => !(priceHint?.get(t) && (priceHint.get(t) ?? 0) > 0));
  const quotes = needQuotes.length > 0 ? await getBatchQuotes(needQuotes) : new Map();

  const affordable: string[] = [];
  const expensive: string[] = [];
  const excludedDetail: string[] = [];
  const includedDetail: string[] = [];

  for (const symbol of tickers) {
    const px =
      priceHint?.get(symbol) ??
      quotes.get(symbol)?.price ??
      0;
    if (!(px > 0)) {
      // Unknown price — keep (will fail later if truly unaffordable)
      affordable.push(symbol);
      continue;
    }
    if (px > maxPrice) {
      expensive.push(symbol);
      excludedDetail.push(`${symbol}($${px.toFixed(0)})`);
    } else {
      affordable.push(symbol);
      includedDetail.push(`${symbol}($${px.toFixed(0)})`);
    }
  }

  // Affordable first, then expensive (won't buy but still analyzable if user wants — we DROP expensive)
  const ordered = [...affordable];

  console.log(
    `[Universe] Filtrando por capital $${available.toFixed(0)}: excluidos ${excludedDetail.slice(0, 8).join(", ") || "ninguno"}, incluidos ${includedDetail.slice(0, 8).join(", ") || "ninguno"}`,
  );

  return {
    tickers: ordered,
    available,
    excluded: expensive,
    included: affordable,
  };
}

function curatedFallback(momentumMap?: Map<string, number>): Promise<StocksUniverseResult> {
  const tickers = USA_CURATED_UNIVERSE.filter(isUsStockTicker).slice(0, MAX_STOCKS_CYCLE_TICKERS);
  return filterByAffordableCapital([...tickers]).then((f) => ({
    tickers: f.tickers.slice(0, MAX_STOCKS_CYCLE_TICKERS),
    source: "curated-fallback" as const,
    scanned: USA_CURATED_UNIVERSE.length,
    momentum: f.tickers.map((symbol) => ({
      symbol,
      changePct: momentumMap?.get(symbol) ?? 0,
    })),
    capitalFilter: {
      available: f.available,
      excluded: f.excluded,
      included: f.included.slice(0, 20),
    },
  }));
}

export async function resolveStocksCycleUniverse(): Promise<StocksUniverseResult> {
  const curated = USA_CURATED_UNIVERSE.filter(isUsStockTicker);
  const curatedSet = new Set(curated);
  const changeBySymbol = new Map<string, number>();
  const priceBySymbol = new Map<string, number>();

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
    if (row.price > 0) priceBySymbol.set(row.symbol, row.price);
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

  const selected = [...new Set([...gainers, ...curatedPick])];
  for (const r of ranked) {
    if (selected.length >= MAX_STOCKS_CYCLE_TICKERS) break;
    if (!selected.includes(r.symbol)) selected.push(r.symbol);
  }

  const filtered = await filterByAffordableCapital(
    selected.slice(0, MAX_STOCKS_CYCLE_TICKERS),
    priceBySymbol,
  );

  const tickers = filtered.tickers.slice(0, MAX_STOCKS_CYCLE_TICKERS);
  const momentum = tickers.map((symbol) => ({
    symbol,
    changePct: changeBySymbol.get(symbol) ?? 0,
  }));

  console.log(
    `[StocksUniverse] screener=${screener.length} → cycle=${tickers.length} (capital-filtered, excl=${filtered.excluded.length})`,
  );

  return {
    tickers,
    source: "eodhd-screener+curated",
    scanned: screener.length,
    momentum,
    capitalFilter: {
      available: filtered.available,
      excluded: filtered.excluded,
      included: filtered.included.slice(0, 20),
    },
  };
}
