/**
 * Stocks cycle universe — phase/window-aware:
 * - European local EUR equities 09:00–17:30 Madrid → account U15513057
 * - US equities / ADRs 15:30–22:00 Madrid → account U24225949
 */

import "server-only";

import { screenerUsGainers } from "@/lib/market-data/eodhd";
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
import { isIbkrNonTradable } from "@/lib/trading/ibkr-non-tradable";
import {
  getCurrentTradingPhase,
  isEuropeanEquityOrderWindow,
  isUsListedEquityOrderWindow,
  type ForgeTradingPhase,
} from "@/lib/trading/cycle-schedule";
import {
  europeEurSeedSymbols,
  isEuropeanEurEquity,
} from "@/lib/trading/europe-equities";
import { loadStocksOpportunityScan } from "@/lib/trading/stocks/scan-store";

/** Final tickers analyzed per stocks cycle. */
export const MAX_STOCKS_CYCLE_TICKERS = 50;
const MIN_VOLUME = 500_000;
const MIN_PRICE = 2;
/** No hard $500 cap — cash + risk sizing bound max price. */
const SCREEN_MAX_PRICE = 50_000;

/** @deprecated European ADRs — prefer local EUR listings in europe-equities. */
export const EUROPE_ADR_CYCLE = [
  "ASML", "SAP", "SHEL", "BP", "GSK", "AZN", "NVO", "UL", "SNY", "NGG",
  "BBVA", "SAN", "TEF", "ING", "DB", "ERIC", "NOK", "STM", "PHG", "DEO",
] as const;

/** Asian / EM ADRs — ASIA phase (US-listed; only 15:30–22:00). */
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
  indicatorEtfsExcluded?: string[];
};

/** Equity eligible for stocks-cycle IBKR orders (US or EU local, not ETF/crypto/FX). */
export function isUsStockTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  if (!t) return false;
  if (isIbkrCryptoTicker(t)) return false;
  if (isAlpacaCryptoTicker(t)) return false;
  if (isAlpacaForexTicker(t)) return false;
  if (toAlpacaCryptoPairId(t)) return false;
  if (isIbkrNonExecutableUsEtf(t)) return false;
  if (isEuropeanEurEquity(t)) return true;
  if (!isIbkrExecutableEquity(t)) return false;
  if (isIbkrNonTradable(t)) return false;
  return true;
}

function finalize(
  tickers: string[],
  phase: ForgeTradingPhase,
  source: string,
  scanned: number,
  changeBySymbol: Map<string, number>,
  preferFirst?: string[],
): StocksUniverseResult {
  const clean = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(isUsStockTicker))];
  const preferred = (preferFirst ?? [])
    .map((t) => t.trim().toUpperCase())
    .filter(isUsStockTicker);
  const preferredSet = new Set(preferred);

  const byMomentum = (symbols: string[]) =>
    [...symbols]
      .map((symbol) => ({
        symbol,
        changePct: changeBySymbol.get(symbol) ?? 0,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const preferredRanked = byMomentum(preferred.filter((s) => clean.includes(s)));
  const restRanked = byMomentum(clean.filter((s) => !preferredSet.has(s)));
  const limited = [...preferredRanked, ...restRanked].slice(0, MAX_STOCKS_CYCLE_TICKERS);
  const out = limited.map((r) => r.symbol);

  console.log(
    `[StocksUniverse] phase=${phase} source=${source} → ${out.length} equities ` +
      `(EU EUR + US; ETFs/crypto/forex excluded)`,
  );

  return {
    tickers: out,
    source,
    phase,
    scanned,
    momentum: limited,
    indicatorEtfsExcluded: USA_CURATED_UNIVERSE.filter(isIbkrNonExecutableUsEtf).slice(0, 50),
  };
}

/**
 * Resolve up to 50 equities for analysis based on Madrid order windows.
 * Prefers last opportunity-scan selected/top when fresh (<20 min).
 */
export async function resolveStocksCycleUniverse(): Promise<StocksUniverseResult> {
  const phase = getCurrentTradingPhase();
  const euOpen = isEuropeanEquityOrderWindow();
  const usOpen = isUsListedEquityOrderWindow();
  const changeBySymbol = new Map<string, number>();

  if (!euOpen && !usOpen) {
    return finalize([], phase, "outside-equity-windows", 0, changeBySymbol);
  }

  const scan = loadStocksOpportunityScan();
  const scanAgeMs = scan ? Date.now() - Date.parse(scan.at) : Number.POSITIVE_INFINITY;
  const scanFresh = Number.isFinite(scanAgeMs) && scanAgeMs >= 0 && scanAgeMs < 20 * 60 * 1000;
  const scanPrefer: string[] = [];
  if (scanFresh && scan) {
    for (const o of [...scan.selected, ...scan.top10]) {
      if (o.market === "US" && !usOpen) continue;
      if (o.market === "EU" && !euOpen) continue;
      if (!isUsStockTicker(o.symbol)) continue;
      scanPrefer.push(o.symbol);
      changeBySymbol.set(o.symbol, o.expectedMovePct);
    }
  }

  const seed: string[] = [...scanPrefer];
  if (euOpen) seed.push(...europeEurSeedSymbols());
  if (usOpen) seed.push(...USA_EXECUTABLE_EQUITIES);

  let screener: Awaited<ReturnType<typeof screenerUsGainers>> = [];
  if (usOpen) {
    try {
      screener = await screenerUsGainers({
        minVolume: MIN_VOLUME,
        minPrice: MIN_PRICE,
        maxPrice: SCREEN_MAX_PRICE,
        limit: 50,
      });
    } catch (err) {
      console.warn(
        "[StocksUniverse] EODHD screener error:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  for (const row of screener) {
    if (isUsStockTicker(row.symbol) && !isEuropeanEurEquity(row.symbol)) {
      changeBySymbol.set(row.symbol, row.changePct);
    }
  }

  const union = new Set<string>(seed.filter(isUsStockTicker));
  if (usOpen) {
    for (const row of screener) {
      if (isUsStockTicker(row.symbol) && !isEuropeanEurEquity(row.symbol)) {
        union.add(row.symbol);
      }
    }
  }

  for (const t of seed) {
    if (!changeBySymbol.has(t)) changeBySymbol.set(t, 0);
  }

  const sourceParts = [
    scanFresh ? "opp-scan" : null,
    euOpen ? "eu-eur" : null,
    usOpen ? "us-adr" : null,
  ].filter(Boolean);

  return finalize(
    [...union],
    phase,
    sourceParts.join("+") || `phase-${phase.toLowerCase()}`,
    screener.length + (scanFresh ? scan?.analyzed ?? 0 : 0),
    changeBySymbol,
    scanPrefer.length ? scanPrefer : seed,
  );
}
