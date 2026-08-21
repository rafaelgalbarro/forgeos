/**
 * Inherited / delisted junk — never price via FMP or auto-trade / monitor.
 */

const PERMANENT_SKIP_TICKERS = new Set([
  "RWAX",
  "APLT.CVR",
  "CGBSF",
  "APTX.OLD",
  "IVPR",
  "INND",
]);

export function shouldSkipUntradeableTicker(ticker: string, price?: number): boolean {
  const t = String(ticker ?? "").trim().toUpperCase();
  if (!t) return true;
  if (PERMANENT_SKIP_TICKERS.has(t)) return true;
  if (t.endsWith(".OLD") || t.endsWith(".CVR")) return true;
  if (price != null && Number.isFinite(price) && price <= 0) return true;
  return false;
}
