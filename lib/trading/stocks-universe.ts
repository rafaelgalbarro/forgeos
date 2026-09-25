/**
 * Stocks cycle universe — phase-aware ADRs / USA equities only (IBKR EU retail).
 *
 * US ETFs stay in usa-sectors as indicators (sector rotation / regime) — never ordered.
 * Crypto / forex never enter this universe.
 */

import "server-only";

import { screenerUsGainers, getBatchQuotes } from "@/lib/market-data/eodhd";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import {
  isAlpacaCryptoTicker,
  isAlpacaForexTicker,
  toAlpacaCryptoPairId,
} from "@/lib/brokers/alpaca-pairs";
import {
  USA_CURATED_UNIVERSE,
  USA_EXECUTABLE_EQUITIES,
  isIbkrExecutableEquity,
  isIbkrNonExecutableUsEtf,
} from "@/lib/trading/usa-sectors";
import { fetchCapitalSnapshot, pickIbkrAccountWithMostUsd } from "@/lib/trading/capital";
import { isIbkrNonTradable } from "@/lib/trading/ibkr-non-tradable";
import {
  getCurrentTradingPhase,
  type ForgeTradingPhase,
} from "@/lib/trading/cycle-schedule";

/** Final tickers analyzed per stocks cycle. */
export const MAX_STOCKS_CYCLE_TICKERS = 50;
const MIN_VOLUME = 500_000;
const MIN_PRICE = 5;
const MAX_PRICE = 500;

/** European ADRs / dual-listed — EUROPA phase (08:00–14:00 Madrid). */
export const EUROPE_ADR_CYCLE = [
  "ASML", "SAP", "SHEL", "BP", "GSK", "AZN", "NVO", "UL", "SNY", "NGG",
  "BBVA", "SAN", "TEF", "ING", "DB", "ERIC", "NOK", "STM", "PHG", "DEO",
  "BUD", "CRH", "SPOT", "ARM", "LVMUY", "NESN", "RHHBY", "ADDYY", "DANOY",
  "SIEGY", "VWAGY",
] as const;

/** Asian / EM ADRs — ASIA phase (01:00–08:00 Madrid). */
export const ASIA_ADR_CYCLE = [
  "TSM", "SONY", "BABA", "JD", "BIDU", "NIO", "SE", "GRAB", "MELI",
  "IBN", "HDB", "WIT", "TCEHY",
] as const;

/** @deprecated use USA_EXECUTABLE_EQUITIES */
export const QUALITY_USA_STOCKS_FALLBACK = USA_EXECUTABLE_EQUITIES.slice(0, 20);

export type StocksUniverseResult = {
  tickers: string[];
  source: string;
  phase: ForgeTradingPhase;
  scanned: number;
  momentum: Array<{ symbol: string; changePct: number }>;
  capitalFilter?: { available: number; excluded: string[]; included: string[] };
  indicatorEtfsExcluded?: string[];
};

/** Equity/ADR eligible for stocks-cycle IBKR orders (not ETF, not crypto/FX). */
export function isUsStockTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (isIbkrCryptoTicker(t)) return false;
  if (isAlpacaCryptoTicker(t)) return false;
  if (isAlpacaForexTicker(t)) return false;
  if (toAlpacaCryptoPairId(t)) return false;
  if (isIbkrNonExecutableUsEtf(t)) return false;
  if (!isIbkrExecutableEquity(t)) return false;
  if (isIbkrNonTradable(t)) return false;
  return true;
}

function phaseSeedTickers(phase: ForgeTradingPhase): string[] {
  switch (phase) {
    case "EUROPA":
      return [...EUROPE_ADR_CYCLE];
    case "ASIA":
      return [...ASIA_ADR_CYCLE];
    case "PRE_MARKET":
    case "USA_REGULAR":
      return [...USA_EXECUTABLE_EQUITIES];
    case "CLOSED":
    default:
      return [];
  }
}

async function filterByAffordableCapital(
  tickers: string[],
  priceHint?: Map<string, number>,
): Promise<{ tickers: string[]; available: number; excluded: string[]; included: string[] }> {
  let available = 0;
  try {
    const richest = await pickIbkrAccountWithMostUsd();
    if (richest.cashUSD > 0) {
      available = richest.cashUSD;
    } else {
      const cap = await fetchCapitalSnapshot();
      available = Math.max(0, cap.cashUSD);
    }
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
    const px = priceHint?.get(symbol) ?? quotes.get(symbol)?.price ?? 0;
    if (!(px > 0)) {
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

  console.log(
    `[Universe] Filtrando por cashUSD $${available.toFixed(0)}: excluidos ${excludedDetail.slice(0, 8).join(", ") || "ninguno"}, incluidos ${includedDetail.slice(0, 8).join(", ") || "ninguno"}`,
  );

  return {
    tickers: [...affordable],
    available,
    excluded: expensive,
    included: affordable,
  };
}

function finalize(
  tickers: string[],
  phase: ForgeTradingPhase,
  source: string,
  scanned: number,
  changeBySymbol: Map<string, number>,
  capitalFilter?: StocksUniverseResult["capitalFilter"],
): StocksUniverseResult {
  const clean = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(isUsStockTicker))];
  const ranked = clean
    .map((symbol) => ({
      symbol,
      changePct: changeBySymbol.get(symbol) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const limited = ranked.slice(0, MAX_STOCKS_CYCLE_TICKERS);
  const out = limited.map((r) => r.symbol);

  console.log(
    `[StocksUniverse] phase=${phase} source=${source} → ${out.length} equities/ADRs ` +
      `(ETFs/crypto/forex excluded)`,
  );

  return {
    tickers: out,
    source,
    phase,
    scanned,
    momentum: limited,
    capitalFilter,
    indicatorEtfsExcluded: USA_CURATED_UNIVERSE.filter(isIbkrNonExecutableUsEtf).slice(0, 50),
  };
}

export async function resolveStocksCycleUniverse(): Promise<StocksUniverseResult> {
  const phase = getCurrentTradingPhase();
  const seed = phaseSeedTickers(phase).filter(isUsStockTicker);
  const changeBySymbol = new Map<string, number>();
  const priceBySymbol = new Map<string, number>();

  if (phase === "CLOSED" || seed.length === 0) {
    return finalize([], phase, "closed", 0, changeBySymbol);
  }

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
  }

  for (const row of screener) {
    if (!isUsStockTicker(row.symbol)) continue;
    changeBySymbol.set(row.symbol, row.changePct);
    if (row.price > 0) priceBySymbol.set(row.symbol, row.price);
  }

  const union = new Set<string>(seed);

  // PRE_MARKET / USA_REGULAR: merge top movers (stocks only)
  if (phase === "PRE_MARKET" || phase === "USA_REGULAR") {
    for (const row of screener) {
      if (isUsStockTicker(row.symbol)) union.add(row.symbol);
    }
  }

  // EUROPA / ASIA: keep phase ADRs; enrich momentum from screener when present
  for (const t of seed) {
    if (!changeBySymbol.has(t)) changeBySymbol.set(t, 0);
  }

  const filtered = await filterByAffordableCapital([...union], priceBySymbol);

  return finalize(
    filtered.tickers,
    phase,
    phase === "PRE_MARKET" || phase === "USA_REGULAR"
      ? "phase+eodhd-movers"
      : `phase-${phase.toLowerCase()}`,
    screener.length,
    changeBySymbol,
    {
      available: filtered.available,
      excluded: filtered.excluded,
      included: filtered.included.slice(0, 20),
    },
  );
}
