/**
 * Alpaca paper-trading universe — forex + crypto pair ids (no slash).
 */

export const ALPACA_FOREX_PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCHF",
] as const;

export const ALPACA_CRYPTO_PAIRS = [
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
  "XRPUSD",
] as const;

/** @deprecated use ALPACA_FOREX_PAIRS */
export const FOREX_PAIRS = ALPACA_FOREX_PAIRS;
/** @deprecated use ALPACA_CRYPTO_PAIRS */
export const CRYPTO_PAIRS = ALPACA_CRYPTO_PAIRS;

export type AlpacaForexPairId = (typeof ALPACA_FOREX_PAIRS)[number];
export type AlpacaCryptoPairId = (typeof ALPACA_CRYPTO_PAIRS)[number];

const FOREX_SET = new Set<string>(ALPACA_FOREX_PAIRS);
const CRYPTO_SET = new Set<string>(ALPACA_CRYPTO_PAIRS);

const FOREX_DISPLAY: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCHF: "USD/CHF",
};

const CRYPTO_SLASH: Record<string, string> = {
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
  SOLUSD: "SOL/USD",
  XRPUSD: "XRP/USD",
};

export function normalizeAlpacaTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace("/", "");
}

export function isAlpacaForexTicker(ticker: string): boolean {
  return FOREX_SET.has(normalizeAlpacaTicker(ticker));
}

export function isAlpacaCryptoTicker(ticker: string): boolean {
  return CRYPTO_SET.has(normalizeAlpacaTicker(ticker));
}

export function isAlpacaTicker(ticker: string): boolean {
  const id = normalizeAlpacaTicker(ticker);
  return FOREX_SET.has(id) || CRYPTO_SET.has(id);
}

export function toAlpacaForexDisplay(pairId: string): string {
  const id = normalizeAlpacaTicker(pairId);
  return FOREX_DISPLAY[id] ?? id;
}

export function toAlpacaCryptoSymbol(pairId: string): string {
  const id = normalizeAlpacaTicker(pairId);
  return CRYPTO_SLASH[id] ?? id;
}

export function alpacaAssetClass(ticker: string): "forex" | "crypto" | null {
  const id = normalizeAlpacaTicker(ticker);
  if (FOREX_SET.has(id)) return "forex";
  if (CRYPTO_SET.has(id)) return "crypto";
  return null;
}

/** Forex: 1000 units · Crypto: $100 notional. */
export const ALPACA_FOREX_ORDER_UNITS = 1_000;
export const ALPACA_CRYPTO_ORDER_NOTIONAL_USD = 100;
