/**
 * OTC / PINK sheet tickers — never executable on IBKR for ForgeOS stocks cycle.
 * Example: VWAGY (Volkswagen ADR on Pink) caused NO_ACK storms with NY closed.
 */

/** Explicit known Pink/OTC ADRs in our universes. */
export const OTC_PINK_TICKERS: ReadonlySet<string> = new Set([
  "VWAGY",
  "LVMUY",
  "TCEHY",
  "NSRGY",
  "ADDYY",
  "DANOY",
  "SIEGY",
  "RHHBY",
]);

/** True if symbol must be excluded from executable stocks universe. */
export function isOtcPinkNonExecutable(symbol: string): boolean {
  const t = symbol.trim().toUpperCase();
  if (!t) return false;
  return OTC_PINK_TICKERS.has(t);
}
