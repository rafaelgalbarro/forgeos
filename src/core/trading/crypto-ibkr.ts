/**
 * IBKR crypto (PAXOS) — always-on 24h universe.
 * Internal tickers: BTC, ETH, LTC, BCH, XRP
 * IBKR: symbol=BTC secType=CRYPTO exchange=PAXOS currency=USD
 * FMP: BTCUSD
 */

export const IBKR_CRYPTO_TICKERS = ["BTC", "ETH", "LTC", "BCH", "XRP"] as const;

export type IbkrCryptoTicker = (typeof IBKR_CRYPTO_TICKERS)[number];

const CRYPTO_SET = new Set<string>(IBKR_CRYPTO_TICKERS);

const COINGECKO_IDS: Record<IbkrCryptoTicker, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  XRP: "ripple",
};

/** BTC, BTCUSD, BTC/USD, BTC-USD → BTC */
export function normalizeIbkrCryptoTicker(raw: string): IbkrCryptoTicker | null {
  const t = raw
    .trim()
    .toUpperCase()
    .replace(/^CRYPTO:/, "")
    .replace(/[-_/]/g, "");
  if (!t) return null;
  const base = t.endsWith("USD") && t.length > 3 ? t.slice(0, -3) : t;
  return CRYPTO_SET.has(base) ? (base as IbkrCryptoTicker) : null;
}

export function isIbkrCryptoTicker(ticker: string): boolean {
  return normalizeIbkrCryptoTicker(ticker) != null;
}

export function fmpCryptoSymbol(ticker: string): string | null {
  const base = normalizeIbkrCryptoTicker(ticker);
  return base ? `${base}USD` : null;
}

export function ibkrCryptoSymbol(ticker: string): string | null {
  return normalizeIbkrCryptoTicker(ticker);
}

export function coingeckoId(ticker: string): string | null {
  const base = normalizeIbkrCryptoTicker(ticker);
  return base ? COINGECKO_IDS[base] : null;
}

export function coingeckoIdsList(): string {
  return IBKR_CRYPTO_TICKERS.map((t) => COINGECKO_IDS[t]).join(",");
}

export const IBKR_CRYPTO_SEC_TYPE = "CRYPTO";
export const IBKR_CRYPTO_EXCHANGE = "PAXOS";
