/**
 * Alpaca Crypto Order Executor
 * Equivalent to ibkr-supervised-submit but for Alpaca paper/live.
 */
import "server-only";

const ALPACA_API_KEY = process.env.ALPACA_API_KEY ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? "";
const ALPACA_ENDPOINT = process.env.ALPACA_ENDPOINT ?? "https://paper-api.alpaca.markets/v2";
const TIMEOUT_MS = 15_000;

export const ALPACA_CRYPTO_TICKERS = [
  "BTC", "ETH", "SOL", "AVAX", "DOGE", "XRP", "ADA", "LINK", "LTC", "BCH"
] as const;

export type AlpacaCryptoTicker = (typeof ALPACA_CRYPTO_TICKERS)[number];

const ALPACA_CRYPTO_SET = new Set<string>(ALPACA_CRYPTO_TICKERS);

/** BTC, BTCUSD, BTC/USD → BTC */
export function normalizeAlpacaCryptoTicker(raw: string): AlpacaCryptoTicker | null {
  const t = raw.trim().toUpperCase().replace(/[-_/]/g, "");
  const base = t.endsWith("USD") && t.length > 3 ? t.slice(0, -3) : t;
  return ALPACA_CRYPTO_SET.has(base) ? (base as AlpacaCryptoTicker) : null;
}

export function isAlpacaCryptoTicker(ticker: string): boolean {
  return normalizeAlpacaCryptoTicker(ticker) !== null;
}

/** BTC → BTC/USD (formato Alpaca) */
export function toAlpacaSymbol(ticker: string): string | null {
  const base = normalizeAlpacaCryptoTicker(ticker);
  return base ? `${base}/USD` : null;
}

export type AlpacaSubmitResult = {
  readonly orderId: string;
  readonly clientOrderId: string;
  readonly symbol: string;
  readonly status: string;
  readonly qty: string;
  readonly side: string;
  readonly type: string;
  readonly filledAt: string | null;
  readonly filledAvgPrice: string | null;
};

export type AlpacaSubmitParams = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  limitPrice?: number;
  rationale?: string;
};

async function alpacaFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Alpaca ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit a crypto order to Alpaca.
 * Uses notional (USD amount) for fractional crypto support.
 */
export async function submitAlpacaCryptoOrder(
  params: AlpacaSubmitParams
): Promise<AlpacaSubmitResult> {
  const alpacaSymbol = toAlpacaSymbol(params.symbol);
  if (!alpacaSymbol) {
    throw new Error(`${params.symbol} no es un ticker crypto Alpaca válido`);
  }

  const side = params.side === "BUY" ? "buy" : "sell";

  // Para crypto Alpaca usamos qty fraccional o notional
  const orderBody: Record<string, unknown> = {
    symbol: alpacaSymbol,
    side,
    type: params.limitPrice ? "limit" : "market",
    time_in_force: "gtc",
  };

  // Usamos qty directa (shares = unidades de crypto)
  if (params.quantity > 0) {
    orderBody.qty = String(params.quantity);
  }

  if (params.limitPrice && params.limitPrice > 0) {
    orderBody.limit_price = String(params.limitPrice.toFixed(2));
  }

  console.log(
    `[AlpacaSubmit] ${alpacaSymbol} ${side} qty=${params.quantity} ` +
    `limit=${params.limitPrice ?? "market"} | ${params.rationale ?? ""}`
  );

  const order = await alpacaFetch<{
    id: string;
    client_order_id: string;
    symbol: string;
    status: string;
    qty: string;
    side: string;
    type: string;
    filled_at: string | null;
    filled_avg_price: string | null;
  }>(`${ALPACA_ENDPOINT}/orders`, {
    method: "POST",
    body: JSON.stringify(orderBody),
  });

  console.log(
    `[AlpacaSubmit] ✅ Orden enviada: id=${order.id} symbol=${order.symbol} ` +
    `status=${order.status} qty=${order.qty}`
  );

  return {
    orderId: order.id,
    clientOrderId: order.client_order_id,
    symbol: order.symbol,
    status: order.status,
    qty: order.qty,
    side: order.side,
    type: order.type,
    filledAt: order.filled_at,
    filledAvgPrice: order.filled_avg_price,
  };
}

/**
 * Get current price for a crypto ticker from Alpaca.
 */
export async function getAlpacaCryptoPrice(ticker: string): Promise<number> {
  const base = normalizeAlpacaCryptoTicker(ticker);
  if (!base) throw new Error(`${ticker} no es crypto Alpaca`);

  const symbol = encodeURIComponent(`${base}/USD`);
  const data = await alpacaFetch<{
    bars: Record<string, { c: number }>;
  }>(`https://data.alpaca.markets/v1beta3/crypto/us/latest/bars?symbols=${symbol}`);

  const bar = data.bars?.[`${base}/USD`];
  if (!bar || !bar.c) throw new Error(`Sin precio Alpaca para ${base}/USD`);
  return bar.c;
}
