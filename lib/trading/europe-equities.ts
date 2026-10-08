/**
 * European local equities (EUR) — IBKR primary exchanges + EODHD suffixes.
 * Routed to EUR cash account (default U15513057).
 * Pure module (no server-only) — safe for price routes + unit tests.
 */

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
  /** Substrings expected in IBKR longName (contract verification). */
  nameHints: readonly string[];
  /** Substrings that must NOT appear (wrong company / ADR confusion). */
  nameReject?: readonly string[];
};

/**
 * Liquid EU names for EUROPA session (09:00–17:30 Madrid).
 * Symbols are local IBKR tickers (not US ADRs).
 */
export const EUROPE_EUR_EQUITIES: readonly EuEquitySpec[] = [
  // Spain BM
  { symbol: "SAN", primaryExchange: "BM", currency: "EUR", eodhd: "SAN.MC", venue: "Madrid", nameHints: ["SANTANDER", "BANCO SANTANDER"] },
  { symbol: "BBVA", primaryExchange: "BM", currency: "EUR", eodhd: "BBVA.MC", venue: "Madrid", nameHints: ["BBVA", "BILBAO"] },
  { symbol: "ITX", primaryExchange: "BM", currency: "EUR", eodhd: "ITX.MC", venue: "Madrid", nameHints: ["INDITEX"] },
  { symbol: "IBE", primaryExchange: "BM", currency: "EUR", eodhd: "IBE.MC", venue: "Madrid", nameHints: ["IBERDROLA"] },
  { symbol: "TEF", primaryExchange: "BM", currency: "EUR", eodhd: "TEF.MC", venue: "Madrid", nameHints: ["TELEFONICA", "TELEFÓNICA"], nameReject: ["NYSE"] },
  { symbol: "REP", primaryExchange: "BM", currency: "EUR", eodhd: "REP.MC", venue: "Madrid", nameHints: ["REPSOL"] },
  { symbol: "AENA", primaryExchange: "BM", currency: "EUR", eodhd: "AENA.MC", venue: "Madrid", nameHints: ["AENA"] },
  { symbol: "AMS", primaryExchange: "BM", currency: "EUR", eodhd: "AMS.MC", venue: "Madrid", nameHints: ["AMADEUS"] },
  { symbol: "IAG", primaryExchange: "BM", currency: "EUR", eodhd: "IAG.MC", venue: "Madrid", nameHints: ["IAG", "INTERNATIONAL AIRLINES"] },
  { symbol: "FER", primaryExchange: "BM", currency: "EUR", eodhd: "FER.MC", venue: "Madrid", nameHints: ["FERROVIAL"] },
  // Germany IBIS (Xetra) — DTE = Deutsche Telekom, NEVER DTE Energy
  { symbol: "SAP", primaryExchange: "IBIS", currency: "EUR", eodhd: "SAP.XETRA", venue: "Xetra", nameHints: ["SAP"] },
  { symbol: "SIE", primaryExchange: "IBIS", currency: "EUR", eodhd: "SIE.XETRA", venue: "Xetra", nameHints: ["SIEMENS"] },
  { symbol: "ALV", primaryExchange: "IBIS", currency: "EUR", eodhd: "ALV.XETRA", venue: "Xetra", nameHints: ["ALLIANZ"] },
  {
    symbol: "DTE",
    primaryExchange: "IBIS",
    currency: "EUR",
    eodhd: "DTE.XETRA",
    venue: "Xetra",
    nameHints: ["TELEKOM", "DEUTSCHE TELEKOM", "DT.TELEKOM"],
    nameReject: ["DTE ENERGY", "ENERGY CO", "DETROIT"],
  },
  { symbol: "BAS", primaryExchange: "IBIS", currency: "EUR", eodhd: "BAS.XETRA", venue: "Xetra", nameHints: ["BASF"] },
  { symbol: "BMW", primaryExchange: "IBIS", currency: "EUR", eodhd: "BMW.XETRA", venue: "Xetra", nameHints: ["BMW", "BAYERISCHE"] },
  { symbol: "MBG", primaryExchange: "IBIS", currency: "EUR", eodhd: "MBG.XETRA", venue: "Xetra", nameHints: ["MERCEDES"] },
  // Netherlands AEB
  { symbol: "ASML", primaryExchange: "AEB", currency: "EUR", eodhd: "ASML.AS", venue: "Amsterdam", nameHints: ["ASML"] },
  { symbol: "INGA", primaryExchange: "AEB", currency: "EUR", eodhd: "INGA.AS", venue: "Amsterdam", nameHints: ["ING"] },
  { symbol: "ADYEN", primaryExchange: "AEB", currency: "EUR", eodhd: "ADYEN.AS", venue: "Amsterdam", nameHints: ["ADYEN"] },
  { symbol: "PHIA", primaryExchange: "AEB", currency: "EUR", eodhd: "PHIA.AS", venue: "Amsterdam", nameHints: ["PHILIPS"] },
  // France SBF
  { symbol: "MC", primaryExchange: "SBF", currency: "EUR", eodhd: "MC.PA", venue: "Paris", nameHints: ["LVMH", "MOET", "HENNESSY"] },
  { symbol: "OR", primaryExchange: "SBF", currency: "EUR", eodhd: "OR.PA", venue: "Paris", nameHints: ["OREAL", "L'OREAL"] },
  { symbol: "TTE", primaryExchange: "SBF", currency: "EUR", eodhd: "TTE.PA", venue: "Paris", nameHints: ["TOTAL"] },
  { symbol: "BNP", primaryExchange: "SBF", currency: "EUR", eodhd: "BNP.PA", venue: "Paris", nameHints: ["BNP"] },
  { symbol: "AIR", primaryExchange: "SBF", currency: "EUR", eodhd: "AIR.PA", venue: "Paris", nameHints: ["AIRBUS"] },
  // Italy BVME
  { symbol: "ENEL", primaryExchange: "BVME", currency: "EUR", eodhd: "ENEL.MI", venue: "Milan", nameHints: ["ENEL"] },
  { symbol: "ISP", primaryExchange: "BVME", currency: "EUR", eodhd: "ISP.MI", venue: "Milan", nameHints: ["INTESA"] },
  { symbol: "UCG", primaryExchange: "BVME", currency: "EUR", eodhd: "UCG.MI", venue: "Milan", nameHints: ["UNICREDIT"] },
  { symbol: "ENI", primaryExchange: "BVME", currency: "EUR", eodhd: "ENI.MI", venue: "Milan", nameHints: ["ENI"] },
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

/** Pure resolve used by price/history/orders — never maps to US ADR. */
export function resolveEuropeanContract(symbol: string): {
  symbol: string;
  primaryExchange: EuPrimaryExchange;
  currency: "EUR";
  eodhd: string;
  venue: EuEquitySpec["venue"];
  nameHints: readonly string[];
  nameReject: readonly string[];
} | null {
  const spec = getEuropeanEurEquity(symbol);
  if (!spec) return null;
  return {
    symbol: spec.symbol,
    primaryExchange: spec.primaryExchange,
    currency: "EUR",
    eodhd: spec.eodhd,
    venue: spec.venue,
    nameHints: spec.nameHints,
    nameReject: spec.nameReject ?? [],
  };
}

/** IBKR quote routes — EUR local only (no NYSE ADR fallback). */
export function europeanQuoteRoutes(symbol: string): Array<{
  symbol: string;
  exchange: string;
  currency: "EUR";
  label: string;
  primaryExchange: EuPrimaryExchange;
}> {
  const c = resolveEuropeanContract(symbol);
  if (!c) return [];
  return [
    {
      symbol: c.symbol,
      exchange: "SMART",
      currency: "EUR",
      label: `${c.venue}-SMART`,
      primaryExchange: c.primaryExchange,
    },
    {
      symbol: c.symbol,
      exchange: c.primaryExchange,
      currency: "EUR",
      label: `${c.venue}-direct`,
      primaryExchange: c.primaryExchange,
    },
  ];
}
