/**
 * Trading-cycle universe — allowedTickers quality pool + IBKR/EODHD momentum ranking.
 */

import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { readMultiScannerResults } from "@/lib/market-data/scanner-store";
import { getBatchQuotes } from "@/lib/market-data/eodhd";
import {
  ensureDailyUniverse,
  getDailyUniverse,
  getDailyMarketUniverse,
  type DailyTicker,
} from "@/lib/investment/market-daily-universe";
import { isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import { regionalFocusTickersMadrid } from "@/src/core/trading/strategies/pro-strategies";
import {
  getTradingCycleIntervalMs,
  selectTickersForOpenMarkets,
} from "@/src/core/trading/market-session";

const DEFAULT_CYCLE_LIMIT = 400;
/** Max tickers from automatic background cycles. */
export const MAX_QUALITY_UNIVERSE = 20;

function allowedSet(): Set<string> {
  return new Set((TRADING_CONFIG.allowedTickers as readonly string[]).map((t) => t.toUpperCase()));
}

function filterAllowed(symbols: readonly string[]): string[] {
  const allowed = allowedSet();
  return symbols.map((s) => s.trim().toUpperCase()).filter((sym) => allowed.has(sym));
}

function sortByDailyMomentum(symbols: readonly string[], dailyRows: DailyTicker[]): string[] {
  const changeBySymbol = new Map(
    dailyRows.map((t) => [t.symbol.toUpperCase(), t.changePct ?? 0]),
  );
  return [...symbols].sort(
    (a, b) => (changeBySymbol.get(b) ?? 0) - (changeBySymbol.get(a) ?? 0),
  );
}

async function sortByEodhdMomentum(symbols: readonly string[]): Promise<string[]> {
  if (symbols.length === 0) return [];
  const quotes = await getBatchQuotes(symbols);
  return [...symbols].sort((a, b) => {
    const cb = quotes.get(b)?.changePercentage ?? 0;
    const ca = quotes.get(a)?.changePercentage ?? 0;
    return cb - ca;
  });
}

/** Scanner tickers that passed phase 2/3 (today's opportunity pool). */
export function getScannerCandidateTickers(): string[] {
  const snap = readMultiScannerResults();
  if (!snap) return [];
  const fromOpps = (snap.opportunities ?? [])
    .filter((o) => o.side === "BUY" || o.side === "SELL")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((o) => o.ticker.trim().toUpperCase());
  const fromPhases = (snap.phases ?? [])
    .filter((p) => p.phase >= 2 && p.ticker)
    .map((p) => p.ticker.trim().toUpperCase());
  return filterAllowed([...new Set([...fromOpps, ...fromPhases].filter(Boolean))]);
}

export function isTickerAllowedForTrading(ticker: string): boolean {
  const id = ticker.trim().toUpperCase();
  if (!id) return false;
  if (isIbkrCryptoTicker(id)) return true;
  const daily = getDailyUniverse();
  if ((daily?.excludedEarnings ?? []).includes(id)) return false;
  if (allowedSet().has(id)) return true;
  return getScannerCandidateTickers().includes(id);
}

export type CycleUniverseResult = {
  tickers: string[];
  source: "daily-top100" | "scanner" | "allowedTickers";
  scannedAt: string | null;
  universeSize: number;
};

function resolveFromCache(limit: number): CycleUniverseResult {
  const cap = Math.max(1, Math.min(limit, MAX_QUALITY_UNIVERSE));
  const allowed = allowedSet();
  const regional = regionalFocusTickersMadrid();
  const daily = getDailyUniverse() ?? getDailyMarketUniverse();
  const dailyRows = daily?.tickers ?? [];
  const dailySymbols = dailyRows.map((t) => t.symbol.toUpperCase());

  if (dailySymbols.length > 0) {
    // IBKR scanner = momentum signal — execute only allowedTickers ∩ momentum
    const momentumRanked = sortByDailyMomentum(
      filterAllowed(dailySymbols),
      dailyRows,
    );
    const regionalAllowed = filterAllowed(regional);
    let combined = [...new Set([...regionalAllowed, ...momentumRanked])];
    const selected = selectTickersForOpenMarkets(combined);
    combined = (selected.tickers.length > 0 ? selected.tickers : combined).slice(0, cap);

    if (combined.length === 0) {
      combined = [...allowed].slice(0, cap);
    }

    console.log(
      `[Universe] daily-top100 momentum=${dailySymbols.length} allowed=${momentumRanked.length} cycle=${combined.length}`,
    );

    return {
      tickers: combined,
      source: "daily-top100",
      scannedAt: daily?.generatedAt ?? null,
      universeSize: daily?.screenerCount ?? daily?.tickers.length ?? 0,
    };
  }

  const snap = readMultiScannerResults();
  const ranked = (snap?.opportunities ?? [])
    .filter((o) => (o.side === "BUY" || o.side === "SELL") && o.ticker)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const fromScanner = filterAllowed(
    [...new Set(ranked.map((o) => o.ticker.trim().toUpperCase()))],
  ).slice(0, cap);

  if (fromScanner.length > 0) {
    return {
      tickers: fromScanner,
      source: "scanner",
      scannedAt: snap?.scannedAt ?? null,
      universeSize: snap?.universeSize ?? 0,
    };
  }

  return {
    tickers: [...allowed].slice(0, cap),
    source: "allowedTickers",
    scannedAt: snap?.scannedAt ?? null,
    universeSize: snap?.universeSize ?? 0,
  };
}

/** Sync read of current universe (may be empty until ensure/refresh). */
export function resolveTradingCycleTickers(limit = DEFAULT_CYCLE_LIMIT): CycleUniverseResult {
  return resolveFromCache(limit);
}

/** Loads daily universe then returns allowedTickers pool sorted by EODHD change_p. */
export async function resolveTradingCycleTickersAsync(
  limit = DEFAULT_CYCLE_LIMIT,
): Promise<CycleUniverseResult> {
  try {
    await ensureDailyUniverse();
  } catch (err) {
    console.warn(
      "[Universe] ensureDailyUniverse failed:",
      err instanceof Error ? err.message : err,
    );
  }
  const result = resolveFromCache(limit);

  if (result.tickers.length > 1) {
    try {
      result.tickers = (await sortByEodhdMomentum(result.tickers)).slice(
        0,
        MAX_QUALITY_UNIVERSE,
      );
    } catch (err) {
      console.warn(
        "[Universe] EODHD momentum sort failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    `[Universe] Ciclo source=${result.source} tickers=${result.tickers.length} universe=${result.universeSize} intervalMs=${getTradingCycleIntervalMs()}`,
  );
  return result;
}
