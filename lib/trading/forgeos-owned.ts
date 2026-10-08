/**
 * ForgeOS-owned positions — ExitManager must only manage these.
 * Orphan IBKR leftovers (PTPI, NCNA, …) are never auto-sold.
 * Kraken: only symbols with an open BUY in the trade journal.
 */

import "server-only";

import { readJournalTrades } from "@/lib/trading/journal/trades";
import { journalOpenCryptoPairs } from "@/lib/trading/crypto/journal-crypto";
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

function normSym(symbol: string): string {
  return symbol.trim().toUpperCase().replace("/", "");
}

/**
 * Crypto symbols ForgeOS opened (journal BUY without later SELL).
 * Used so Kraken ExitManager never touches manual user balances.
 */
export function journalOpenCryptoSymbols(): Set<string> {
  const open = new Set<string>();
  const trades = readJournalTrades(8000);
  for (const t of trades) {
    if (t.market !== "crypto" || t.shadow) continue;
    const sym = normSym(t.ticker);
    if (!sym) continue;
    if (t.side === "BUY") open.add(sym);
    if (t.side === "SELL") open.delete(sym);
  }
  for (const p of journalOpenCryptoPairs()) open.add(normSym(p));
  return open;
}

export function isJournalOpenCryptoPosition(symbol: string): boolean {
  const t = normSym(symbol);
  if (!t || isLegacyOrphanTicker(t)) return false;
  const open = journalOpenCryptoSymbols();
  if (open.has(t)) return true;
  // Match base (ETH) vs pair (ETHEUR) either direction
  for (const s of open) {
    const sBase = s.replace(/EUR$/, "").replace(/^XBT$/, "BTC");
    const tBase = t.replace(/EUR$/, "").replace(/^XBT$/, "BTC");
    if (sBase === tBase || s === t) return true;
  }
  return false;
}

/** True if TradingEngine / PositionMonitor registered this ticker as ForgeOS-opened. */
export function isForgeOsOpenedPosition(symbol: string): boolean {
  const t = normSym(symbol);
  if (!t || isLegacyOrphanTicker(t)) return false;
  const { monitoredPositions } = loadTradingState();
  if (monitoredPositions.some((p) => normSym(p.ticker) === t && (p.shares ?? 0) !== 0)) {
    return true;
  }
  return isJournalOpenCryptoPosition(t);
}

export function filterForgeOsManagedSymbols<T extends { symbol: string }>(rows: T[]): T[] {
  return rows.filter((r) => isForgeOsOpenedPosition(r.symbol));
}

/** Kraken-only: journal open trades (never other Kraken balances). */
export function filterJournalOpenCryptoSymbols<T extends { symbol: string }>(rows: T[]): T[] {
  return rows.filter((r) => isJournalOpenCryptoPosition(r.symbol));
}
