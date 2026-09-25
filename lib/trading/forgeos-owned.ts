/**
 * ForgeOS-owned positions — ExitManager must only manage these.
 * Orphan IBKR leftovers (PTPI, NCNA, …) are never auto-sold.
 */

import "server-only";

import { loadTradingState } from "@/src/core/trading/trading-state-store";

/** Known legacy / non-ForgeOS holdings permanently excluded from ExitManager. */
export const LEGACY_ORPHAN_TICKERS: ReadonlySet<string> = new Set([
  "PTPI",
  "NCNA",
  "GNLN",
  "CGBSF",
  "BURU",
  "FLYX",
  "GPUS",
  "INND",
  "RWAX",
  "RECX",
  "IVPR",
  "APTX.OLD",
  "APLT.CVR",
  "APLT",
  "APTX",
]);

export function isLegacyOrphanTicker(symbol: string): boolean {
  return LEGACY_ORPHAN_TICKERS.has(symbol.trim().toUpperCase());
}

/** True if TradingEngine / PositionMonitor registered this ticker as ForgeOS-opened. */
export function isForgeOsOpenedPosition(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  if (!t || isLegacyOrphanTicker(t)) return false;
  const { monitoredPositions } = loadTradingState();
  return monitoredPositions.some((p) => p.ticker.toUpperCase() === t && (p.shares ?? 0) !== 0);
}

export function filterForgeOsManagedSymbols<T extends { symbol: string }>(rows: T[]): T[] {
  return rows.filter((r) => isForgeOsOpenedPosition(r.symbol));
}
