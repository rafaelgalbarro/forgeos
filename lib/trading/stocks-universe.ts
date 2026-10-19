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
import { isOtcPinkNonExecutable } from "@/lib/trading/otc-pink";
import {
  getCurrentTradingPhase,
  type ForgeTradingPhase,
} from "@/lib/trading/cycle-schedule";
import { bumpStocksCycleCounter } from "@/lib/trading/stocks-cycle-alternate";
import { planStocksCycleUniverse } from "@/lib/trading/stocks-cycle-focus";
import {
  europeEurSeedSymbols,
  isEuropeanEurEquity,
} from "@/lib/trading/europe-equities";
import { loadStocksOpportunityScan } from "@/lib/trading/stocks/scan-store";
import { inPlaySymbolSet } from "@/lib/trading/stocks-in-play/store";
import { runnersSymbolSet } from "@/lib/trading/stocks-in-play/runners/store";

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
  /** EU vs US premarket alternation when both sessions overlap. */
  universePlan?: string;
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
  if (isOtcPinkNonExecutable(t)) return false;
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
export async function resolveStocksCycleUniverse(at: Date = new Date()): Promise<StocksUniverseResult> {
  const phase = getCurrentTradingPhase(at);
  const cycleN = bumpStocksCycleCounter();
  const plan = planStocksCycleUniverse(at, cycleN);
  const euOpen = plan.includeEu;
  const usOpen = plan.includeUsRegular || plan.includeUsPremarketAnalysis;
  const changeBySymbol = new Map<string, number>();

  if (!euOpen && !usOpen) {
    return finalize([], phase, "outside-equity-windows", 0, changeBySymbol);
  }

  console.log(
    `[StocksUniverse] plan=${plan.label} phase=${phase} cycle#=${cycleN}` +
      (plan.overlapFocus ? ` overlapFocus=${plan.overlapFocus}` : ""),
  );

  const scan = loadStocksOpportunityScan();
  const scanAgeMs = scan ? Date.now() - Date.parse(scan.at) : Number.POSITIVE_INFINITY;
  const scanFresh = Number.isFinite(scanAgeMs) && scanAgeMs >= 0 && scanAgeMs < 20 * 60 * 1000;
  const scanPrefer: string[] = [];
  if (scanFresh && scan) {
    for (const o of [...scan.selected, ...scan.top10]) {
      if (o.market === "US" && !plan.includeUsRegular && !plan.includeUsPremarketAnalysis) continue;
      if (o.market === "EU" && !euOpen) continue;
      if (!isUsStockTicker(o.symbol)) continue;
      scanPrefer.push(o.symbol);
      changeBySymbol.set(o.symbol, o.expectedMovePct);
    }
  }

  const seed: string[] = [...scanPrefer];
  if (euOpen) seed.push(...europeEurSeedSymbols());
  if (plan.includeUsRegular || plan.includeUsPremarketAnalysis) {
    seed.push(...USA_EXECUTABLE_EQUITIES);
  }

  let screener: Awaited<ReturnType<typeof screenerUsGainers>> = [];
  if (plan.includeUsRegular || plan.includeUsPremarketAnalysis) {
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
  if (plan.includeUsRegular || plan.includeUsPremarketAnalysis) {
    for (const sym of inPlaySymbolSet(at)) {
      if (isUsStockTicker(sym) && !isEuropeanEurEquity(sym)) {
        union.add(sym);
        if (!changeBySymbol.has(sym)) changeBySymbol.set(sym, 0);
      }
    }
    for (const sym of runnersSymbolSet(at)) {
      if (isUsStockTicker(sym) && !isEuropeanEurEquity(sym)) {
        union.add(sym);
        if (!changeBySymbol.has(sym)) changeBySymbol.set(sym, 0);
      }
    }
    for (const row of screener) {
      if (isUsStockTicker(row.symbol) && !isEuropeanEurEquity(row.symbol)) {
        union.add(row.symbol);
      }
    }
  }

  for (const t of seed) {
    if (!changeBySymbol.has(t)) changeBySymbol.set(t, 0);
  }

  const inPlayN =
    plan.includeUsRegular || plan.includeUsPremarketAnalysis
      ? inPlaySymbolSet(at).size
      : 0;
  const runnersN =
    plan.includeUsRegular || plan.includeUsPremarketAnalysis
      ? runnersSymbolSet(at).size
      : 0;
  const sourceParts = [
    runnersN > 0 ? `runners-${runnersN}` : null,
    inPlayN > 0 ? `in-play-${inPlayN}` : null,
    scanFresh ? "opp-scan" : null,
    euOpen ? "eu-eur" : null,
    plan.includeUsPremarketAnalysis ? "us-premarket" : null,
    plan.includeUsRegular ? "us-regular" : null,
    plan.overlapFocus ? `alt-${plan.overlapFocus}` : null,
  ].filter(Boolean);

  const result = finalize(
    [...union],
    phase,
    sourceParts.join("+") || `phase-${phase.toLowerCase()}`,
    screener.length + (scanFresh ? scan?.analyzed ?? 0 : 0),
    changeBySymbol,
    scanPrefer.length
      ? scanPrefer
      : inPlayN > 0 || runnersN > 0
        ? [...inPlaySymbolSet(at), ...runnersSymbolSet(at), ...seed]
        : seed,
  );
  return { ...result, universePlan: plan.label };
}
