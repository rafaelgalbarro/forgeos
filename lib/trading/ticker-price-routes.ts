/**
 * IBKR price quote routes — native European first, NYSE/NASDAQ ADR fallback.
 */

export type TickerQuoteRoute = {
  readonly symbol: string;
  readonly exchange: string;
  readonly currency: string;
  readonly label: string;
};

const DEFAULT_SMART: TickerQuoteRoute = {
  symbol: "",
  exchange: "SMART",
  currency: "USD",
  label: "SMART",
};

/** Primary route + ADR / alternate exchange fallbacks per ticker. */
export const TICKER_QUOTE_ROUTES: Record<string, readonly TickerQuoteRoute[]> = {
  // Dual-listed — nativo EU primero, ADR USA como fallback
  SHEL: [
    { symbol: "SHEL", exchange: "LSE", currency: "GBP", label: "LSE" },
    { symbol: "SHEL", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" },
    { symbol: "SHEL", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  BP: [
    { symbol: "BP", exchange: "LSE", currency: "GBP", label: "LSE" },
    { symbol: "BP", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" },
    { symbol: "BP", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  ASML: [
    { symbol: "ASML", exchange: "AEB", currency: "EUR", label: "Euronext-Amsterdam" },
    { symbol: "ASML", exchange: "NASDAQ", currency: "USD", label: "NASDAQ-ADR" },
    { symbol: "ASML", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  SAP: [
    { symbol: "SAP", exchange: "XETRA", currency: "EUR", label: "XETRA" },
    { symbol: "SAP", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" },
    { symbol: "SAP", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  EZU: [{ symbol: "EZU", exchange: "SMART", currency: "USD", label: "US-ETF" }],
  VGK: [{ symbol: "VGK", exchange: "SMART", currency: "USD", label: "US-ETF" }],
};

export function quoteRoutesForTicker(ticker: string): readonly TickerQuoteRoute[] {
  const key = ticker.trim().toUpperCase();
  const chain = TICKER_QUOTE_ROUTES[key];
  if (chain?.length) return chain;
  return [{ ...DEFAULT_SMART, symbol: key }];
}

export const US_QUOTE_EXCHANGES = new Set([
  "SMART",
  "NYSE",
  "NASDAQ",
  "ARCA",
  "BATS",
  "ISLAND",
]);
