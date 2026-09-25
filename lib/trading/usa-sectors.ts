/**
 * Curated USA equities universe by sector — shared by stocks cycle + market APIs.
 */

export const USA_SECTOR_TECHNOLOGY = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "META", "TSLA", "AVGO", "ORCL", "ADBE", "CRM",
  "AMD", "INTC", "QCOM", "TXN", "NOW", "SNOW", "PLTR", "COIN", "MSTR", "SMCI",
  "ARM", "AMAT", "LRCX", "KLAC", "MRVL",
] as const;

export const USA_SECTOR_FINANCIALS = [
  "JPM", "BAC", "GS", "MS", "WFC", "BLK", "SCHW", "C", "AXP", "V",
  "MA", "PYPL", "SQ", "HOOD", "SOFI",
] as const;

export const USA_SECTOR_HEALTHCARE = [
  "LLY", "UNH", "JNJ", "ABBV", "MRK", "PFE", "AMGN", "GILD", "MRNA", "ISRG",
] as const;

export const USA_SECTOR_CONSUMER = [
  "AMZN", "WMT", "COST", "TGT", "HD", "NKE", "SBUX", "MCD", "CMG", "ULTA",
] as const;

export const USA_SECTOR_ENERGY = [
  "XOM", "CVX", "COP", "SLB", "OXY", "MPC", "PSX", "VLO",
] as const;

export const USA_SECTOR_ETFS = [
  "SPY", "QQQ", "IWM", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLC",
  "XLY", "XLP", "XLB", "XLRE", "XLU", "TQQQ", "SQQQ", "VXX", "UVXY", "ARKK",
] as const;

export const USA_SECTOR_CRYPTO_ETFS = [
  "IBIT", "FETH", "BITO", "ARKB", "GBTC", "ETHA", "BITB",
] as const;

export const USA_SECTOR_MACRO = [
  "GLD", "SLV", "USO", "TLT", "HYG",
] as const;

export type UsaSectorName =
  | "Technology"
  | "Financials"
  | "Healthcare"
  | "Consumer"
  | "Energy"
  | "ETFs"
  | "Crypto ETFs"
  | "Macro";

export const USA_SECTORS: Record<UsaSectorName, readonly string[]> = {
  Technology: USA_SECTOR_TECHNOLOGY,
  Financials: USA_SECTOR_FINANCIALS,
  Healthcare: USA_SECTOR_HEALTHCARE,
  Consumer: USA_SECTOR_CONSUMER,
  Energy: USA_SECTOR_ENERGY,
  ETFs: USA_SECTOR_ETFS,
  "Crypto ETFs": USA_SECTOR_CRYPTO_ETFS,
  Macro: USA_SECTOR_MACRO,
};

/** Flat curated list (~100 tickers). */
export const USA_CURATED_UNIVERSE: readonly string[] = [
  ...USA_SECTOR_TECHNOLOGY,
  ...USA_SECTOR_FINANCIALS,
  ...USA_SECTOR_HEALTHCARE,
  ...USA_SECTOR_CONSUMER,
  ...USA_SECTOR_ENERGY,
  ...USA_SECTOR_ETFS,
  ...USA_SECTOR_CRYPTO_ETFS,
  ...USA_SECTOR_MACRO,
];

const SYMBOL_TO_SECTOR = new Map<string, UsaSectorName>();
for (const [name, tickers] of Object.entries(USA_SECTORS) as Array<[UsaSectorName, readonly string[]]>) {
  for (const t of tickers) SYMBOL_TO_SECTOR.set(t, name);
}

export function sectorForSymbol(symbol: string): UsaSectorName | null {
  return SYMBOL_TO_SECTOR.get(symbol.trim().toUpperCase()) ?? null;
}

/** Sector ETF → priority names for rotation agent. */
export const SECTOR_ROTATION_MAP = {
  XLK: ["NVDA", "AAPL", "MSFT", "AMD"] as const,
  XLF: ["JPM", "BAC", "GS"] as const,
  XLE: ["XOM", "CVX"] as const,
} as const;

export const DEFENSIVE_TICKERS = ["GLD", "TLT", "SPY"] as const;
