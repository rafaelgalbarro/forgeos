/**
 * Trading-cycle universe — prefer multi-scanner top candidates over the static allowlist.
 */

import "server-only";

import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { readMultiScannerResults } from "@/lib/market-data/scanner-store";

const DEFAULT_CYCLE_LIMIT = 12;

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
  if (allowedSet().has(id)) return true;
  return getScannerCandidateTickers().includes(id);
}

export type CycleUniverseResult = {
  tickers: string[];
  source: "scanner" | "allowedTickers";
  scannedAt: string | null;
  universeSize: number;
};

/** Best BUY/SELL names from the 8000-ticker scanner; fallback to allowedTickers. */
export function resolveTradingCycleTickers(limit = DEFAULT_CYCLE_LIMIT): CycleUniverseResult {
  const cap = Math.max(1, Math.min(limit, 25));
  const snap = readMultiScannerResults();
  const ranked = (snap?.opportunities ?? [])
    .filter((o) => (o.side === "BUY" || o.side === "SELL") && o.ticker)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const fromScanner = [...new Set(ranked.map((o) => o.ticker.trim().toUpperCase()))].slice(0, cap);

  if (fromScanner.length > 0) {
    return {
      tickers: fromScanner,
      source: "scanner",
      scannedAt: snap?.scannedAt ?? null,
      universeSize: snap?.universeSize ?? 0,
    };
  }

  return {
    tickers: (TRADING_CONFIG.allowedTickers as readonly string[]).slice(0, cap).map((t) => t.toUpperCase()),
    source: "allowedTickers",
    scannedAt: snap?.scannedAt ?? null,
    universeSize: snap?.universeSize ?? 0,
  };
}
