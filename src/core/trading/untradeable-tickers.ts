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

export function shouldSkipUntradeableTicker(ticker: string, price?: number): boolean {
  const t = String(ticker ?? "").trim().toUpperCase();
  if (!t) return true;
  if (PERMANENT_SKIP_TICKERS.has(t)) return true;
  if (t.endsWith(".OLD") || t.endsWith(".CVR")) return true;
  if (price != null && Number.isFinite(price) && price <= 0) return true;
  return false;
}
