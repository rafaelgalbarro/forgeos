/**
 * Trading-cycle universe — IBKR scanner primary; MarketScanner optional overlay.
 */

import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { readMultiScannerResults } from "@/lib/market-data/scanner-store";
import {
  ensureDailyUniverse,
  getDailyUniverse,
  getDailyMarketUniverse,
} from "@/lib/investment/market-daily-universe";
import { IBKR_CRYPTO_TICKERS, isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import { regionalFocusTickersMadrid } from "@/src/core/trading/strategies/pro-strategies";
import {
  getTradingCycleIntervalMs,
  selectTickersForOpenMarkets,
} from "@/src/core/trading/market-session";

const DEFAULT_CYCLE_LIMIT = 400;

function allowedSet(): Set<string> {
  return new Set((TRADING_CONFIG.allowedTickers as readonly string[]).map((t) => t.toUpperCase()));
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
  return [...new Set([...fromOpps, ...fromPhases].filter(Boolean))];
}

export function isTickerAllowedForTrading(ticker: string): boolean {
  const id = ticker.trim().toUpperCase();
  if (!id) return false;
  if (isIbkrCryptoTicker(id)) return true;
  const daily = getDailyUniverse();
  if ((daily?.excludedEarnings ?? []).includes(id)) return false;
  if ((daily?.tickers ?? []).some((t) => t.symbol === id)) return true;
  if (allowedSet().has(id)) return true;
  return getScannerCandidateTickers().includes(id);
}

export type CycleUniverseResult = {
  tickers: string[];
  source: "daily-top100" | "scanner" | "allowedTickers";
  scannedAt: string | null;
  universeSize: number;
};

function withCrypto(tickers: readonly string[], cap: number): string[] {
  return [...new Set([...IBKR_CRYPTO_TICKERS, ...tickers])].slice(0, Math.max(cap, IBKR_CRYPTO_TICKERS.length));
}

function resolveFromCache(limit: number): CycleUniverseResult {
  const cap = Math.max(1, Math.min(limit, 400));
  const regional = regionalFocusTickersMadrid();
  const daily = getDailyUniverse() ?? getDailyMarketUniverse();
  const fromDaily = (daily?.tickers ?? []).slice(0, cap).map((t) => t.symbol.toUpperCase());
  if (fromDaily.length > 0) {
    const combined = [...new Set([...regional, ...fromDaily])];
    const selected = selectTickersForOpenMarkets(combined);
    const tickers = withCrypto(selected.tickers.length > 0 ? selected.tickers : combined, cap);
    return {
      tickers,
      source: "daily-top100",
      scannedAt: daily?.generatedAt ?? null,
      universeSize: daily?.screenerCount ?? daily?.tickers.length ?? 0,
    };
  }

  const snap = readMultiScannerResults();
  const ranked = (snap?.opportunities ?? [])
    .filter((o) => (o.side === "BUY" || o.side === "SELL") && o.ticker)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const fromScanner = [...new Set(ranked.map((o) => o.ticker.trim().toUpperCase()))].slice(0, cap);

  if (fromScanner.length > 0) {
    return {
      tickers: withCrypto(fromScanner, cap),
      source: "scanner",
      scannedAt: snap?.scannedAt ?? null,
      universeSize: snap?.universeSize ?? 0,
    };
  }

  return {
    tickers: withCrypto(
      (TRADING_CONFIG.allowedTickers as readonly string[]).slice(0, cap).map((t) => t.toUpperCase()),
      cap,
    ),
    source: "allowedTickers",
    scannedAt: snap?.scannedAt ?? null,
    universeSize: snap?.universeSize ?? 0,
  };
}

/** Sync read of current universe (may be empty until ensure/refresh). */
export function resolveTradingCycleTickers(limit = DEFAULT_CYCLE_LIMIT): CycleUniverseResult {
  return resolveFromCache(limit);
}

/** Prefer FMP daily TOP100 — loads screener immediately if cache empty. */
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
  console.log(
    `[Universe] Ciclo source=${result.source} tickers=${result.tickers.length} universe=${result.universeSize} intervalMs=${getTradingCycleIntervalMs()}`,
  );
  return result;
}
