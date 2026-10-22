const ALPACA_API_KEY = process.env.ALPACA_API_KEY ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? "";
const ALPACA_ENDPOINT = process.env.ALPACA_ENDPOINT ?? "https://paper-api.alpaca.markets/v2";
const DATA_ENDPOINT = "https://data.alpaca.markets/v2";
const TIMEOUT_MS = 10_000;

function alpacaHeaders() {
  return {
    "APCA-API-KEY-ID": ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET,
    "Content-Type": "application/json",
  };
}

async function alpacaFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...alpacaHeaders(), ...(init?.headers ?? {}) },
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

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  buying_power: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  paper: boolean;
}

export async function getAlpacaAccount(): Promise<AlpacaAccount> {
  return alpacaFetch<AlpacaAccount>(`${ALPACA_ENDPOINT}/account`);
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  change_today: string;
}

export async function getAlpacaPositions(): Promise<AlpacaPosition[]> {
  return alpacaFetch<AlpacaPosition[]>(`${ALPACA_ENDPOINT}/positions`);
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  status: string;
  created_at: string;
  filled_at: string | null;
  filled_avg_price: string | null;
  limit_price: string | null;
}

export async function getAlpacaOrders(status = "all", limit = 50): Promise<AlpacaOrder[]> {
  return alpacaFetch<AlpacaOrder[]>(
    `${ALPACA_ENDPOINT}/orders?status=${status}&limit=${limit}&direction=desc`
  );
}

export interface PlaceOrderParams {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit";
  time_in_force?: "day" | "gtc" | "ioc";
  limit_price?: number;
}

export async function placeAlpacaOrder(params: PlaceOrderParams): Promise<AlpacaOrder> {
  return alpacaFetch<AlpacaOrder>(`${ALPACA_ENDPOINT}/orders`, {
    method: "POST",
    body: JSON.stringify({
      symbol: params.symbol,
      qty: params.qty,
      side: params.side,
      type: params.type ?? "market",
      time_in_force: params.time_in_force ?? "gtc",
      ...(params.limit_price ? { limit_price: params.limit_price } : {}),
    }),
  });
}

export interface AlpacaCryptoBar {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

export async function getCryptoQuotes(symbols: string[]): Promise<AlpacaCryptoBar[]> {
  const syms = symbols.join(",");
  const data = await alpacaFetch<{
    bars: Record<string, { c: number; o: number; h: number; l: number; v: number; t: string }>;
  }>(`${DATA_ENDPOINT}/crypto/us/latest/bars?symbols=${syms}`);
  return Object.entries(data.bars ?? {}).map(([symbol, bar]) => ({
    symbol,
    price: bar.c,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    volume: bar.v,
    timestamp: bar.t,
  }));
}
