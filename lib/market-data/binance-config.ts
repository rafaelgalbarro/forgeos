import "server-only";

/** Binance spot USDT pairs — primary crypto universe (24h). */
export const BINANCE_CRYPTO_TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "AVAX",
  "DOGE",
  "XRP",
  "ADA",
  "LINK",
  "LTC",
  "BCH",
] as const;

export type BinanceCryptoTicker = (typeof BINANCE_CRYPTO_TICKERS)[number];

const BINANCE_SET = new Set<string>(BINANCE_CRYPTO_TICKERS);

/** Internal ticker → Binance symbol (BTC → BTCUSDT). */
export function toBinanceSymbol(ticker: string): string | null {
  const base = normalizeBinanceCryptoTicker(ticker);
  return base ? `${base}USDT` : null;
}

/** BTC, BTCUSDT, BTC/USDT → BTC */
export function normalizeBinanceCryptoTicker(raw: string): BinanceCryptoTicker | null {
  const t = raw
    .trim()
    .toUpperCase()
    .replace(/^CRYPTO:/, "")
    .replace(/[-_/]/g, "");
  if (!t) return null;
  const base = t.endsWith("USDT") && t.length > 4 ? t.slice(0, -4) : t.endsWith("USD") && t.length > 3 ? t.slice(0, -3) : t;
  return BINANCE_SET.has(base) ? (base as BinanceCryptoTicker) : null;
}

export function isBinanceCryptoTicker(ticker: string): boolean {
  return normalizeBinanceCryptoTicker(ticker) != null;
}

export function binanceRestBaseUrl(): string {
  return (process.env.BINANCE_REST_URL ?? "https://api.binance.com").replace(/\/$/, "");
}

export function binanceWsBaseUrl(): string {
  return (process.env.BINANCE_WS_URL ?? "wss://stream.binance.com:9443").replace(/\/$/, "");
}

export function isBinanceConfigured(): boolean {
  return Boolean(process.env.BINANCE_API_KEY?.trim() && process.env.BINANCE_SECRET?.trim());
}

export function binanceApiKey(): string {
  return process.env.BINANCE_API_KEY?.trim() ?? "";
}

export function binanceApiSecret(): string {
  return process.env.BINANCE_SECRET?.trim() ?? "";
}
