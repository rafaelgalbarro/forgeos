/**
 * IBKR price quote routes — native European first, NYSE/NASDAQ ADR fallback.
 * Pure module (no server-only) — safe for shared imports.
 */

import { IBKR_CRYPTO_EXCHANGE, ibkrCryptoSymbol, isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";

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
    { symbol: "ASML", exchange: "AEX", currency: "EUR", label: "AEX-Amsterdam" },
    { symbol: "ASML", exchange: "AEB", currency: "EUR", label: "Euronext-Amsterdam" },
    { symbol: "ASML", exchange: "NASDAQ", currency: "USD", label: "NASDAQ-ADR" },
    { symbol: "ASML", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  SAP: [
    { symbol: "SAP", exchange: "XETRA", currency: "EUR", label: "XETRA" },
    { symbol: "SAP", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" },
    { symbol: "SAP", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  NESN: [
    { symbol: "NESN", exchange: "SWX", currency: "CHF", label: "SWX-Swiss" },
    { symbol: "NESN", exchange: "EBS", currency: "CHF", label: "EBS-Swiss" },
    { symbol: "NSRGY", exchange: "PINK", currency: "USD", label: "PINK-ADR" },
  ],
  LVMUY: [
    { symbol: "LVMUY", exchange: "PINK", currency: "USD", label: "PINK-ADR" },
    { symbol: "MC", exchange: "SBF", currency: "EUR", label: "Euronext-Paris" },
    { symbol: "LVMUY", exchange: "SMART", currency: "USD", label: "SMART-USD" },
  ],
  // Asia ADRs — USA listings (FMP Starter + IBKR SMART)
  BABA: [{ symbol: "BABA", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" }],
  NIO: [{ symbol: "NIO", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" }],
  JD: [{ symbol: "JD", exchange: "NASDAQ", currency: "USD", label: "NASDAQ-ADR" }],
  BIDU: [{ symbol: "BIDU", exchange: "NASDAQ", currency: "USD", label: "NASDAQ-ADR" }],
  TCEHY: [{ symbol: "TCEHY", exchange: "PINK", currency: "USD", label: "PINK-ADR" }],
  SE: [{ symbol: "SE", exchange: "NYSE", currency: "USD", label: "NYSE-ADR" }],
  GRAB: [{ symbol: "GRAB", exchange: "NASDAQ", currency: "USD", label: "NASDAQ-ADR" }],
  EZU: [{ symbol: "EZU", exchange: "SMART", currency: "USD", label: "US-ETF" }],
  VGK: [{ symbol: "VGK", exchange: "SMART", currency: "USD", label: "US-ETF" }],
};

export function quoteRoutesForTicker(ticker: string): readonly TickerQuoteRoute[] {
  const key = ticker.trim().toUpperCase();
  if (isIbkrCryptoTicker(key)) {
    const symbol = ibkrCryptoSymbol(key) ?? key;
    return [{ symbol, exchange: IBKR_CRYPTO_EXCHANGE, currency: "USD", label: "PAXOS-CRYPTO" }];
  }
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
  "PINK",
]);
