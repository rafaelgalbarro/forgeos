/**
 * European local equities (EUR) — IBKR primary exchanges + EODHD suffixes.
 * Routed to EUR cash account (default U15513057).
 */

import "server-only";

export const IBKR_EUR_STOCKS_ACCOUNT_DEFAULT = "U15513057";
export const IBKR_USD_STOCKS_ACCOUNT_DEFAULT = "U24225949";

/** IBKR primaryExchange codes for EU venues. */
export type EuPrimaryExchange = "BM" | "IBIS" | "AEB" | "SBF" | "BVME";

export type EuEquitySpec = {
  /** IBKR symbol (local listing). */
  symbol: string;
  primaryExchange: EuPrimaryExchange;
  currency: "EUR";
  /** EODHD ticker e.g. IBE.MC */
  eodhd: string;
  venue: "Madrid" | "Xetra" | "Amsterdam" | "Paris" | "Milan";
};

/**
 * Liquid EU names for EUROPA session (09:00–17:30 Madrid).
 * Symbols are local IBKR tickers (not US ADRs).
 */
export const EUROPE_EUR_EQUITIES: readonly EuEquitySpec[] = [
  // Spain BM
  { symbol: "SAN", primaryExchange: "BM", currency: "EUR", eodhd: "SAN.MC", venue: "Madrid" },
  { symbol: "BBVA", primaryExchange: "BM", currency: "EUR", eodhd: "BBVA.MC", venue: "Madrid" },
  { symbol: "ITX", primaryExchange: "BM", currency: "EUR", eodhd: "ITX.MC", venue: "Madrid" },
  { symbol: "IBE", primaryExchange: "BM", currency: "EUR", eodhd: "IBE.MC", venue: "Madrid" },
  { symbol: "TEF", primaryExchange: "BM", currency: "EUR", eodhd: "TEF.MC", venue: "Madrid" },
  { symbol: "REP", primaryExchange: "BM", currency: "EUR", eodhd: "REP.MC", venue: "Madrid" },
  { symbol: "AENA", primaryExchange: "BM", currency: "EUR", eodhd: "AENA.MC", venue: "Madrid" },
  { symbol: "AMS", primaryExchange: "BM", currency: "EUR", eodhd: "AMS.MC", venue: "Madrid" },
  { symbol: "IAG", primaryExchange: "BM", currency: "EUR", eodhd: "IAG.MC", venue: "Madrid" },
  { symbol: "FER", primaryExchange: "BM", currency: "EUR", eodhd: "FER.MC", venue: "Madrid" },
  // Germany IBIS (Xetra)
  { symbol: "SAP", primaryExchange: "IBIS", currency: "EUR", eodhd: "SAP.XETRA", venue: "Xetra" },
  { symbol: "SIE", primaryExchange: "IBIS", currency: "EUR", eodhd: "SIE.XETRA", venue: "Xetra" },
  { symbol: "ALV", primaryExchange: "IBIS", currency: "EUR", eodhd: "ALV.XETRA", venue: "Xetra" },
  { symbol: "DTE", primaryExchange: "IBIS", currency: "EUR", eodhd: "DTE.XETRA", venue: "Xetra" },
  { symbol: "BAS", primaryExchange: "IBIS", currency: "EUR", eodhd: "BAS.XETRA", venue: "Xetra" },
  { symbol: "BMW", primaryExchange: "IBIS", currency: "EUR", eodhd: "BMW.XETRA", venue: "Xetra" },
  { symbol: "MBG", primaryExchange: "IBIS", currency: "EUR", eodhd: "MBG.XETRA", venue: "Xetra" },
  // Netherlands AEB
  { symbol: "ASML", primaryExchange: "AEB", currency: "EUR", eodhd: "ASML.AS", venue: "Amsterdam" },
  { symbol: "INGA", primaryExchange: "AEB", currency: "EUR", eodhd: "INGA.AS", venue: "Amsterdam" },
  { symbol: "ADYEN", primaryExchange: "AEB", currency: "EUR", eodhd: "ADYEN.AS", venue: "Amsterdam" },
  { symbol: "PHIA", primaryExchange: "AEB", currency: "EUR", eodhd: "PHIA.AS", venue: "Amsterdam" },
  // France SBF
  { symbol: "MC", primaryExchange: "SBF", currency: "EUR", eodhd: "MC.PA", venue: "Paris" },
  { symbol: "OR", primaryExchange: "SBF", currency: "EUR", eodhd: "OR.PA", venue: "Paris" },
  { symbol: "TTE", primaryExchange: "SBF", currency: "EUR", eodhd: "TTE.PA", venue: "Paris" },
  { symbol: "BNP", primaryExchange: "SBF", currency: "EUR", eodhd: "BNP.PA", venue: "Paris" },
  { symbol: "AIR", primaryExchange: "SBF", currency: "EUR", eodhd: "AIR.PA", venue: "Paris" },
  // Italy BVME
  { symbol: "ENEL", primaryExchange: "BVME", currency: "EUR", eodhd: "ENEL.MI", venue: "Milan" },
  { symbol: "ISP", primaryExchange: "BVME", currency: "EUR", eodhd: "ISP.MI", venue: "Milan" },
  { symbol: "UCG", primaryExchange: "BVME", currency: "EUR", eodhd: "UCG.MI", venue: "Milan" },
  { symbol: "ENI", primaryExchange: "BVME", currency: "EUR", eodhd: "ENI.MI", venue: "Milan" },
] as const;

/** Prefer first listing when symbol collides (SAN BM before SAN SBF). */
const BY_SYMBOL = new Map<string, EuEquitySpec>();
for (const row of EUROPE_EUR_EQUITIES) {
  if (!BY_SYMBOL.has(row.symbol)) BY_SYMBOL.set(row.symbol, row);
}

export function isEuropeanEurEquity(symbol: string): boolean {
  return BY_SYMBOL.has(symbol.trim().toUpperCase());
}

export function getEuropeanEurEquity(symbol: string): EuEquitySpec | null {
  return BY_SYMBOL.get(symbol.trim().toUpperCase()) ?? null;
}

export function europeEurSeedSymbols(): string[] {
  // Unique IBKR symbols preferring Spanish/German/NL first occurrence
  return [...BY_SYMBOL.keys()];
}

export function ibkrEurStocksAccountId(): string {
  return (
    process.env.IBKR_EUR_STOCKS_ACCOUNT_ID?.trim() ||
    process.env.IBKR_EU_ACCOUNT_ID?.trim() ||
    IBKR_EUR_STOCKS_ACCOUNT_DEFAULT
  );
}

export function ibkrUsdStocksAccountId(): string {
  return (
    process.env.IBKR_USD_STOCKS_ACCOUNT_ID?.trim() ||
    process.env.IBKR_ACCOUNT_ID?.trim() ||
    IBKR_USD_STOCKS_ACCOUNT_DEFAULT
  );
}

/** Max open stock positions per IBKR account. */
export function stocksMaxPositionsPerAccount(): number {
  const n = Number(process.env.STOCKS_MAX_POSITIONS_PER_ACCOUNT ?? 5);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}
