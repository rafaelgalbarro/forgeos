/**
 * Crypto universe — Binance spot (24h) + legacy IBKR PAXOS aliases.
 * Internal tickers: BTC, ETH, BNB, SOL, XRP
 * Binance: BTCUSDT | IBKR legacy: secType=CRYPTO exchange=PAXOS
 */

import {
  BINANCE_CRYPTO_TICKERS,
  isBinanceCryptoTicker,
  normalizeBinanceCryptoTicker,
  toBinanceSymbol,
} from "@/lib/market-data/binance-config";

export { BINANCE_CRYPTO_TICKERS, isBinanceCryptoTicker, normalizeBinanceCryptoTicker, toBinanceSymbol };

/** @deprecated Use BINANCE_CRYPTO_TICKERS — kept for IBKR/universe imports. */
export const IBKR_CRYPTO_TICKERS = BINANCE_CRYPTO_TICKERS;

export type IbkrCryptoTicker = (typeof IBKR_CRYPTO_TICKERS)[number];

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
};

/** BTC, BTCUSD, BTC/USD, BTCUSDT → BTC */
export function normalizeIbkrCryptoTicker(raw: string): IbkrCryptoTicker | null {
  return normalizeBinanceCryptoTicker(raw);
}

export function isIbkrCryptoTicker(ticker: string): boolean {
  return isBinanceCryptoTicker(ticker);
}

export function fmpCryptoSymbol(ticker: string): string | null {
  const base = normalizeIbkrCryptoTicker(ticker);
  return base ? `${base}USD` : null;
}

export function binanceCryptoSymbol(ticker: string): string | null {
  return toBinanceSymbol(ticker);
}

export function ibkrCryptoSymbol(ticker: string): string | null {
  return normalizeIbkrCryptoTicker(ticker);
}

export function coingeckoId(ticker: string): string | null {
  const base = normalizeIbkrCryptoTicker(ticker);
  return base ? COINGECKO_IDS[base] ?? null : null;
}

export function coingeckoIdsList(): string {
  return IBKR_CRYPTO_TICKERS.map((t) => COINGECKO_IDS[t]).filter(Boolean).join(",");
}

export const IBKR_CRYPTO_SEC_TYPE = "CRYPTO";
export const IBKR_CRYPTO_EXCHANGE = "PAXOS";

export type CryptoUniverseStatus = {
  required: readonly IbkrCryptoTicker[];
  inUniverse: string[];
  missing: string[];
  btcEthPresent: boolean;
  ibkrProbe: {
    connected: boolean | null;
    btcQuoteOk: boolean;
    ethQuoteOk: boolean;
    note: string;
  };
};

/** Ensure BTC/ETH (and full PAXOS set) are always candidates for the scanner/universe. */
export function ensureCryptoInTickerList(tickers: readonly string[]): string[] {
  const out = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  for (const c of IBKR_CRYPTO_TICKERS) {
    if (!out.includes(c)) out.unshift(c);
  }
  return out;
}

/**
 * Verify BTC/ETH are in the analysis universe and IBKR can quote CRYPTO/PAXOS.
 * Logs a clear status line; never throws.
 */
export async function verifyCryptoTradingStatus(
  universeSymbols?: readonly string[],
): Promise<CryptoUniverseStatus> {
  const symbols = (universeSymbols ?? []).map((s) => s.trim().toUpperCase());
  const inUniverse = IBKR_CRYPTO_TICKERS.filter((c) => symbols.includes(c));
  const missing = IBKR_CRYPTO_TICKERS.filter((c) => !symbols.includes(c));
  const btcEthPresent = symbols.includes("BTC") && symbols.includes("ETH");

  let connected: boolean | null = null;
  let btcQuoteOk = false;
  let ethQuoteOk = false;
  let note = "IBKR probe skipped";

  try {
    const { getBinancePrice } = await import("@/lib/market-data/binance-rest");
    const [btcOk, ethOk] = await Promise.all([
      getBinancePrice("BTC").then((p) => (p?.price ?? 0) > 0),
      getBinancePrice("ETH").then((p) => (p?.price ?? 0) > 0),
    ]);
    btcQuoteOk = btcOk;
    ethQuoteOk = ethOk;
    connected = btcOk || ethOk;
    if (btcQuoteOk && ethQuoteOk) {
      note = "Binance spot OK para BTC y ETH (WS/REST tiempo real)";
    } else if (btcQuoteOk || ethQuoteOk) {
      note = `Binance parcial: BTC=${btcQuoteOk} ETH=${ethQuoteOk}`;
    } else {
      const { ibkrServiceFetch } = await import("@/lib/ibkr/service-client");
      const status = await ibkrServiceFetch<{ connected?: boolean }>("/api/ibkr/status").catch(
        () => null,
      );
      connected = status?.connected ?? false;
      if (!connected) {
        note = "Binance sin precio e IBKR desconectado";
      } else {
        const probe = async (sym: string) => {
          try {
            const q = await ibkrServiceFetch<{
              last?: number;
              bid?: number;
              ask?: number;
              price?: number;
            }>(
              `/api/ibkr/quote?symbol=${encodeURIComponent(sym)}&secType=${IBKR_CRYPTO_SEC_TYPE}&exchange=${IBKR_CRYPTO_EXCHANGE}&currency=USD`,
            );
            const px = Number(q?.last ?? q?.price ?? q?.bid ?? q?.ask ?? 0);
            return px > 0;
          } catch {
            return false;
          }
        };
        btcQuoteOk = await probe("BTC");
        ethQuoteOk = await probe("ETH");
        note =
          btcQuoteOk && ethQuoteOk
            ? "IBKR CRYPTO/PAXOS OK (fallback)"
            : `Sin precio Binance/IBKR — BTC=${btcQuoteOk} ETH=${ethQuoteOk}`;
      }
    }
  } catch (err) {
    note = `probe error: ${err instanceof Error ? err.message : String(err)}`;
  }

  const result: CryptoUniverseStatus = {
    required: IBKR_CRYPTO_TICKERS,
    inUniverse: [...inUniverse],
    missing: [...missing],
    btcEthPresent,
    ibkrProbe: { connected, btcQuoteOk, ethQuoteOk, note },
  };

  console.log(
    `[CryptoStatus] BTC/ETH en universo=${btcEthPresent} ` +
      `crypto=${inUniverse.join(",") || "(ninguno)"} ` +
      `missing=${missing.join(",") || "—"} | ${note}`,
  );
  return result;
}