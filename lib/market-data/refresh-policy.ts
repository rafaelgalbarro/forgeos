/**
 * Market-aware refresh TTLs / poll intervals (browser + server safe).
 * Open market → aggressive; closed / weekend → sparse.
 */

import { getUsMarketSession } from "@/src/core/trading/market-session";

export const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
export const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
export const FUNDAMENTALS_CACHE_TTL_MS = 60 * 60 * 1000;
export const BARS_CACHE_TTL_MS = 15 * 60 * 1000;

export const POLL_OPEN_MS = 5 * 60 * 1000;
export const POLL_CLOSED_MS = 30 * 60 * 1000;

export type DataRefreshPolicy = {
  readonly phase: string;
  readonly isWeekend: boolean;
  readonly isMarketOpen: boolean;
  /** Client poll interval for live dashboards. */
  readonly pollMs: number;
  /** In-memory snapshot TTL (opportunities / dashboard warm). */
  readonly snapshotTtlMs: number;
  /** Price quote TTL (Yahoo batch). */
  readonly priceTtlMs: number;
  /** Scanner: full universe vs top-N. */
  readonly scannerUniverseCap: number | null;
  /** Skip live enhanced / multi-phase scans (serve last Friday / disk). */
  readonly skipLiveScan: boolean;
};

function isWeekendSession(): boolean {
  const session = getUsMarketSession();
  return session.sessionLabel.toLowerCase().includes("fin de semana");
}

/**
 * Central policy for caches, polls, and scanner aggressiveness.
 */
export function getDataRefreshPolicy(now = new Date()): DataRefreshPolicy {
  void now;
  const session = getUsMarketSession();
  const weekend = isWeekendSession();
  const isMarketOpen = session.isTradeable && session.phase === "REGULAR";

  if (weekend) {
    return {
      phase: session.phase,
      isWeekend: true,
      isMarketOpen: false,
      pollMs: POLL_CLOSED_MS,
      snapshotTtlMs: POLL_CLOSED_MS,
      priceTtlMs: PRICE_CACHE_TTL_MS,
      scannerUniverseCap: 50,
      skipLiveScan: true,
    };
  }

  if (isMarketOpen) {
    return {
      phase: session.phase,
      isWeekend: false,
      isMarketOpen: true,
      pollMs: POLL_OPEN_MS,
      snapshotTtlMs: 60_000,
      priceTtlMs: PRICE_CACHE_TTL_MS,
      scannerUniverseCap: null,
      skipLiveScan: false,
    };
  }

  // Premarket / aftermarket / overnight closed
  return {
    phase: session.phase,
    isWeekend: false,
    isMarketOpen: false,
    pollMs: POLL_CLOSED_MS,
    snapshotTtlMs: 5 * 60 * 1000,
    priceTtlMs: PRICE_CACHE_TTL_MS,
    scannerUniverseCap: 50,
    skipLiveScan: session.phase === "CLOSED",
  };
}
