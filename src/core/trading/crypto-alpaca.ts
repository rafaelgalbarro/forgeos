/**
 * Alpaca Crypto universe — 24/7 trading via Alpaca paper/live.
 * Tickers: BTC, ETH, SOL, AVAX, DOGE, XRP, ADA, LINK, LTC, BCH
 */

export const ALPACA_CRYPTO_TICKERS = [
  "BTC", "ETH", "SOL", "AVAX", "DOGE", "XRP", "ADA", "LINK", "LTC", "BCH"
] as const;

export type AlpacaCryptoTicker = (typeof ALPACA_CRYPTO_TICKERS)[number];

const ALPACA_CRYPTO_SET = new Set<string>(ALPACA_CRYPTO_TICKERS);

/** BTC, BTCUSD, BTC/USD, BTC-USD → BTC */
export function normalizeAlpacaTicker(raw: string): AlpacaCryptoTicker | null {
  const t = raw.trim().toUpperCase().replace(/[-_/]/g, "");
  const base = t.endsWith("USD") && t.length > 3 ? t.slice(0, -3) : t;
  return ALPACA_CRYPTO_SET.has(base) ? (base as AlpacaCryptoTicker) : null;
}

export function isAlpacaCryptoTicker(ticker: string): boolean {
  return normalizeAlpacaTicker(ticker) !== null;
}

/** BTC → BTC/USD */
export function toAlpacaSymbol(ticker: string): string | null {
  const base = normalizeAlpacaTicker(ticker);
  return base ? `${base}/USD` : null;
}

/** Ensure all Alpaca crypto tickers are in the universe. */
export function ensureAlpacaCryptoInList(tickers: readonly string[]): string[] {
  const out = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  for (const c of ALPACA_CRYPTO_TICKERS) {
    if (!out.includes(c)) out.unshift(c);
  }
  return out;
}
