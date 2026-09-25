/**
 * Curated USA equities universe by sector — shared by stocks cycle + market APIs.
 *
 * IBKR EU retail (España / PRIIPs): US-domiciled ETFs have no KID → INACTIVE.
 * Sector / macro / crypto ETFs stay in the universe as **indicators only**
 * (sector rotation, market regime) — never generate IBKR orders.
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

/** Indicator-only on IBKR EU (PRIIPs / no KID / complex products). */
export const USA_SECTOR_ETFS = [
  "SPY", "QQQ", "IWM", "DIA", "XLK", "XLF", "XLE", "XLV", "XLI", "XLC",
  "XLY", "XLP", "XLB", "XLRE", "XLU", "TQQQ", "SQQQ", "VXX", "UVXY", "ARKK",
] as const;

/** Indicator-only — crypto ETFs not tradable without crypto permissions / PRIIPs. */
export const USA_SECTOR_CRYPTO_ETFS = [
  "IBIT", "FETH", "BITO", "ARKB", "GBTC", "ETHA", "BITB",
] as const;

/** Indicator-only — commodities / rates / credit ETFs (US domicile). */
export const USA_SECTOR_MACRO = [
  "GLD", "SLV", "USO", "TLT", "HYG",
] as const;

/**
 * Extra US-listed regional / country ETFs used as indicators (Europe/Asia rotation).
 * Same PRIIPs block — never executable on IBKR EU retail.
 */
export const USA_SECTOR_REGIONAL_ETFS = [
  "EZU", "VGK", "IEUR", "FEZ", "BBEU", "HEZU", "FXI",
  "EWG", "EWU", "EWQ", "EWI", "EWP", "EWL", "EWN", "EWD",
  "EWJ", "EWA", "EWY", "EWT", "EWS", "EEM",
] as const;

/**
 * Explicit US ETF blocklist for IBKR EU retail orders.
 * Patterns XL* / EW* also match via {@link isIbkrNonExecutableUsEtf}.
 */
export const IBKR_NON_EXECUTABLE_US_ETFS: ReadonlySet<string> = new Set([
  ...USA_SECTOR_ETFS,
  ...USA_SECTOR_CRYPTO_ETFS,
  ...USA_SECTOR_MACRO,
  ...USA_SECTOR_REGIONAL_ETFS,
]);

export type UsaSectorName =
  | "Technology"
  | "Financials"
  | "Healthcare"
  | "Consumer"
  | "Energy"
  | "ETFs"
  | "Crypto ETFs"
  | "Macro"
  | "Regional ETFs";

export const USA_SECTORS: Record<UsaSectorName, readonly string[]> = {
  Technology: USA_SECTOR_TECHNOLOGY,
  Financials: USA_SECTOR_FINANCIALS,
  Healthcare: USA_SECTOR_HEALTHCARE,
  Consumer: USA_SECTOR_CONSUMER,
  Energy: USA_SECTOR_ENERGY,
  ETFs: USA_SECTOR_ETFS,
  "Crypto ETFs": USA_SECTOR_CRYPTO_ETFS,
  Macro: USA_SECTOR_MACRO,
  "Regional ETFs": USA_SECTOR_REGIONAL_ETFS,
};

/** Flat curated list — includes indicator ETFs (analysis) + executable equities. */
export const USA_CURATED_UNIVERSE: readonly string[] = [
  ...USA_SECTOR_TECHNOLOGY,
  ...USA_SECTOR_FINANCIALS,
  ...USA_SECTOR_HEALTHCARE,
  ...USA_SECTOR_CONSUMER,
  ...USA_SECTOR_ENERGY,
  ...USA_SECTOR_ETFS,
  ...USA_SECTOR_CRYPTO_ETFS,
  ...USA_SECTOR_MACRO,
  ...USA_SECTOR_REGIONAL_ETFS,
];

/** Equities + ADRs only — safe to send as IBKR STK orders for EU retail. */
export const USA_EXECUTABLE_EQUITIES: readonly string[] = [
  ...USA_SECTOR_TECHNOLOGY,
  ...USA_SECTOR_FINANCIALS,
  ...USA_SECTOR_HEALTHCARE,
  ...USA_SECTOR_CONSUMER,
  ...USA_SECTOR_ENERGY,
];

const SYMBOL_TO_SECTOR = new Map<string, UsaSectorName>();
for (const [name, tickers] of Object.entries(USA_SECTORS) as Array<[UsaSectorName, readonly string[]]>) {
  for (const t of tickers) SYMBOL_TO_SECTOR.set(t, name);
}

export function sectorForSymbol(symbol: string): UsaSectorName | null {
  return SYMBOL_TO_SECTOR.get(symbol.trim().toUpperCase()) ?? null;
}

/**
 * True for US-domiciled / complex ETFs that IBKR EU retail cannot buy (PRIIPs / no KID).
 * Still OK as market indicators. Matches XL* and EW* country/sector ETF patterns.
 */
export function isIbkrNonExecutableUsEtf(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  if (!t) return false;
  if (IBKR_NON_EXECUTABLE_US_ETFS.has(t)) return true;
  // Sector ETFs: XLK, XLF, … XLRE, XLU
  if (/^XL[A-Z]{1,2}$/.test(t)) return true;
  // Country / regional iShares: EWG, EWJ, EWA, …
  if (/^EW[A-Z]{1,2}$/.test(t)) return true;
  return false;
}

/**
 * Individual stocks / ADRs executable on IBKR EU (acciones + ADRs).
 * ETFs are indicators only — never true here.
 */
export function isIbkrExecutableEquity(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  if (!t) return false;
  if (isIbkrNonExecutableUsEtf(t)) return false;
  return true;
}

/** Sector ETF → priority names for rotation agent (indicator ETFs). */
export const SECTOR_ROTATION_MAP = {
  XLK: ["NVDA", "AAPL", "MSFT", "AMD"] as const,
  XLF: ["JPM", "BAC", "GS"] as const,
  XLE: ["XOM", "CVX"] as const,
} as const;

/** Defensive indicator basket — not IBKR-executable for EU retail. */
export const DEFENSIVE_TICKERS = ["GLD", "TLT", "SPY"] as const;
