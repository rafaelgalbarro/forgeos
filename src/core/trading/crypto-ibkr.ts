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
    const { ibkrServiceFetch } = await import("@/lib/ibkr/service-client");
    const status = await ibkrServiceFetch<{ connected?: boolean }>("/api/ibkr/status").catch(
      () => null,
    );
    connected = status?.connected ?? false;
    if (!connected) {
      note = "IBKR desconectado — no se puede verificar CRYPTO/PAXOS";
    } else {
      // Quote probe: GET /api/ibkr/quote?secType=CRYPTO&exchange=PAXOS
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
      if (btcQuoteOk && ethQuoteOk) {
        note = "IBKR CRYPTO/PAXOS OK para BTC y ETH (cuenta puede cotizar)";
      } else if (btcQuoteOk || ethQuoteOk) {
        note = `IBKR CRYPTO parcial: BTC=${btcQuoteOk} ETH=${ethQuoteOk} — revisar permisos PAXOS`;
      } else {
        note =
          "IBKR no devolvió cotización CRYPTO — cuenta puede no tener permisos PAXOS/BTCUSD; se opera vía FMP/CoinGecko + submit CRYPTO si Live";
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