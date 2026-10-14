/**
 * Inherited / delisted / closed junk — never price via FMP or auto-trade / monitor.
 */

const PERMANENT_SKIP_TICKERS = new Set([
  "BURU",
  "FLYX",
  "GPUS",
  "RECX",
  "IVPR",
  "INND",
  "RWAX",
  "APLT.CVR",
  "CGBSF",
  "APTX.OLD",
  "CAN",
]);

export function listPermanentSkipTickers(): string[] {
  return [...PERMANENT_SKIP_TICKERS].sort();
}

/** Corporate-action / orphan suffixes — never manage or count in risk. */
export function isOrphanTickerSuffix(ticker: string): boolean {
  const t = String(ticker ?? "").trim().toUpperCase();
  return (
    t.endsWith(".OLD") ||
    t.endsWith(".CVR") ||
    t.endsWith(".RT") ||
    t.endsWith(".WS")
  );
}

export function shouldSkipUntradeableTicker(ticker: string, price?: number): boolean {
  const t = String(ticker ?? "").trim().toUpperCase();
  if (!t) return true;
  if (PERMANENT_SKIP_TICKERS.has(t)) return true;
  if (isOrphanTickerSuffix(t)) return true;
  if (price != null && Number.isFinite(price) && price <= 0) return true;
  return false;
}
