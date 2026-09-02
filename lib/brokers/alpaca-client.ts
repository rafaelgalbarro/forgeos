/**
 * Alpaca paper trading client — account, positions, orders, prices.
 */

import "server-only";

import { fetchAlpacaForexRates } from "@/lib/market-data/alpaca-forex";
import {
  alpacaAssetClass,
  isAlpacaCryptoTicker,
  isAlpacaForexTicker,
  normalizeAlpacaTicker,
  toAlpacaCryptoSymbol,
  toAlpacaForexDisplay,
} from "@/lib/brokers/alpaca-pairs";

export type AlpacaAccount = {
  id: string;
  status: string;
  currency: string;
  cash: number;
  portfolioValue: number;
  buyingPower: number;
  equity: number;
  patternDayTrader: boolean;
  tradingBlocked: boolean;
  accountBlocked: boolean;
};

export type AlpacaPosition = {
  symbol: string;
  qty: number;
  side: string;
  marketValue: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPl: number;
  unrealizedPlpc: number;
};

export type AlpacaOrder = {
  id: string;
  clientOrderId: string;
  symbol: string;
  side: string;
  type: string;
  qty: string | null;
  notional: string | null;
  status: string;
  filledQty: string;
  filledAvgPrice: string | null;
  submittedAt: string;
};

export type AlpacaPriceQuote = {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  source: "ALPACA_TRADE" | "ALPACA_FOREX" | "ALPACA_CRYPTO";
  updatedAt: string;
};

export type AlpacaBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function alpacaTradingBase(): string {
  const raw =
    process.env.ALPACA_ENDPOINT?.trim() ||
    process.env.ALPACA_PAPER_URL?.trim() ||
    "https://paper-api.alpaca.markets/v2";
  return raw.replace(/\/$/, "");
}

function alpacaDataBase(): string {
  return (process.env.ALPACA_DATA_URL ?? "https://data.alpaca.markets").replace(/\/$/, "");
}

export function isAlpacaConfigured(): boolean {
  return Boolean(process.env.ALPACA_API_KEY?.trim() && process.env.ALPACA_SECRET?.trim());
}

function alpacaHeaders(): Record<string, string> {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY?.trim() ?? "",
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET?.trim() ?? "",
    Accept: "application/json",
  };
}

async function alpacaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isAlpacaConfigured()) {
    throw new Error("Alpaca API keys not configured (ALPACA_API_KEY / ALPACA_SECRET)");
  }
  const url = `${alpacaTradingBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...alpacaHeaders(), ...(init?.headers ?? {}) },
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Alpaca HTTP ${res.status} ${path}: ${body.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

async function alpacaDataFetch<T>(path: string): Promise<T> {
  if (!isAlpacaConfigured()) {
    throw new Error("Alpaca API keys not configured");
  }
  const url = `${alpacaDataBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: alpacaHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Alpaca data HTTP ${res.status} ${path}: ${body.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

/** GET /v2/account */
export async function getAccount(): Promise<AlpacaAccount> {
  const raw = await alpacaFetch<Record<string, unknown>>("/account");
  return {
    id: String(raw.id ?? ""),
    status: String(raw.status ?? ""),
    currency: String(raw.currency ?? "USD"),
    cash: Number(raw.cash ?? 0),
    portfolioValue: Number(raw.portfolio_value ?? 0),
    buyingPower: Number(raw.buying_power ?? 0),
    equity: Number(raw.equity ?? 0),
    patternDayTrader: Boolean(raw.pattern_day_trader),
    tradingBlocked: Boolean(raw.trading_blocked),
    accountBlocked: Boolean(raw.account_blocked),
  };
}

/** GET /v2/positions */
export async function getPositions(): Promise<AlpacaPosition[]> {
  const rows = await alpacaFetch<Array<Record<string, unknown>>>("/positions");
  return (rows ?? []).map((p) => ({
    symbol: String(p.symbol ?? ""),
    qty: Number(p.qty ?? 0),
    side: String(p.side ?? ""),
    marketValue: Number(p.market_value ?? 0),
    avgEntryPrice: Number(p.avg_entry_price ?? 0),
    currentPrice: Number(p.current_price ?? 0),
    unrealizedPl: Number(p.unrealized_pl ?? 0),
    unrealizedPlpc: Number(p.unrealized_plpc ?? 0),
  }));
}

/** GET /v2/orders?status=open */
export async function getOrders(status: "open" | "closed" | "all" = "open"): Promise<AlpacaOrder[]> {
  const rows = await alpacaFetch<Array<Record<string, unknown>>>(`/orders?status=${status}&limit=100`);
  return (rows ?? []).map(mapAlpacaOrder);
}

function mapAlpacaOrder(raw: Record<string, unknown>): AlpacaOrder {
  return {
    id: String(raw.id ?? ""),
    clientOrderId: String(raw.client_order_id ?? ""),
    symbol: String(raw.symbol ?? ""),
    side: String(raw.side ?? ""),
    type: String(raw.type ?? ""),
    qty: raw.qty != null ? String(raw.qty) : null,
    notional: raw.notional != null ? String(raw.notional) : null,
    status: String(raw.status ?? ""),
    filledQty: String(raw.filled_qty ?? "0"),
    filledAvgPrice: raw.filled_avg_price != null ? String(raw.filled_avg_price) : null,
    submittedAt: String(raw.submitted_at ?? new Date().toISOString()),
  };
}

export type PlaceAlpacaOrderParams = {
  symbol: string;
  qty?: number;
  notional?: number;
  side: "buy" | "sell";
  type?: "market" | "limit";
  limitPrice?: number;
  timeInForce?: "gtc" | "ioc" | "day";
};

/** POST /v2/orders */
export async function placeOrder(params: PlaceAlpacaOrderParams): Promise<AlpacaOrder> {
  const id = normalizeAlpacaTicker(params.symbol);
  const asset = alpacaAssetClass(id);
  const symbol =
    asset === "crypto"
      ? toAlpacaCryptoSymbol(id)
      : asset === "forex"
        ? toAlpacaForexDisplay(id)
        : params.symbol;

  const body: Record<string, string | number> = {
    symbol,
    side: params.side,
    type: params.type ?? "market",
    time_in_force: params.timeInForce ?? "gtc",
  };

  if (params.notional != null && params.notional > 0) {
    body.notional = params.notional.toFixed(2);
  } else if (params.qty != null && params.qty > 0) {
    body.qty = asset === "crypto" ? String(params.qty) : String(Math.floor(params.qty));
  } else {
    throw new Error(`Alpaca placeOrder: qty or notional required for ${symbol}`);
  }

  if (params.type === "limit" && params.limitPrice != null && params.limitPrice > 0) {
    body.limit_price = params.limitPrice.toFixed(asset === "forex" ? 5 : 2);
  }

  const raw = await alpacaFetch<Record<string, unknown>>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return mapAlpacaOrder(raw);
}

/** DELETE /v2/orders/{orderId} */
export async function cancelOrder(orderId: string): Promise<void> {
  await alpacaFetch(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
}

/** Latest trade price — crypto via data API; forex via rates; equities via data API. */
export async function getPrice(symbol: string): Promise<AlpacaPriceQuote> {
  const id = normalizeAlpacaTicker(symbol);
  const now = new Date().toISOString();

  if (isAlpacaForexTicker(id)) {
    const rates = await fetchAlpacaForexRates([id]);
    const row = rates[0];
    const mid = row?.mid ?? null;
    if (mid == null || !(mid > 0)) {
      throw new Error(`Alpaca forex price unavailable for ${id}`);
    }
    return {
      symbol: id,
      price: mid,
      bid: row.bid ?? undefined,
      ask: row.ask ?? undefined,
      source: "ALPACA_FOREX",
      updatedAt: row.updatedAt || now,
    };
  }

  if (isAlpacaCryptoTicker(id)) {
    const slash = toAlpacaCryptoSymbol(id);
    try {
      const json = await alpacaDataFetch<{
        trades?: Record<string, { p?: number; t?: string }>;
      }>(`/v1beta3/crypto/us/latest/trades?symbols=${encodeURIComponent(slash)}`);
      const trade = json.trades?.[slash];
      const price = Number(trade?.p);
      if (Number.isFinite(price) && price > 0) {
        return {
          symbol: id,
          price,
          source: "ALPACA_CRYPTO",
          updatedAt: trade?.t ?? now,
        };
      }
    } catch (err) {
      console.warn(
        `[Alpaca] crypto latest trade failed for ${slash}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // User-specified trading path fallback + data API latest trade
  try {
    const slash = isAlpacaCryptoTicker(id) ? toAlpacaCryptoSymbol(id) : id;
    const raw = await alpacaFetch<{ trade?: { p?: number; t?: string } }>(
      `/latest/trades/${encodeURIComponent(slash)}`,
    );
    const price = Number(raw?.trade?.p);
    if (Number.isFinite(price) && price > 0) {
      return {
        symbol: id,
        price,
        source: "ALPACA_TRADE",
        updatedAt: raw.trade?.t ?? now,
      };
    }
  } catch {
    /* fall through to data API */
  }

  const json = await alpacaDataFetch<{
    trades?: Record<string, { p?: number; t?: string }>;
  }>(`/v2/stocks/trades/latest?symbols=${encodeURIComponent(id)}&feed=iex`);
  const trade = json.trades?.[id];
  const price = Number(trade?.p);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Alpaca price unavailable for ${id}`);
  }
  return {
    symbol: id,
    price,
    source: "ALPACA_TRADE",
    updatedAt: trade?.t ?? now,
  };
}

/** Recent 5m bars for strategy signals. */
export async function getRecentBars(
  symbol: string,
  limit = 40,
): Promise<AlpacaBar[]> {
  const id = normalizeAlpacaTicker(symbol);
  const asset = alpacaAssetClass(id);
  const now = new Date();
  const start = new Date(now.getTime() - limit * 5 * 60_000).toISOString();

  if (asset === "forex") {
    const display = toAlpacaForexDisplay(id);
    const json = await alpacaDataFetch<{
      bars?: Record<string, Array<{ t?: string; o?: number; h?: number; l?: number; c?: number; v?: number }>>;
    }>(
      `/v1beta3/forex/us/bars?symbols=${encodeURIComponent(display)}&timeframe=5Min&limit=${limit}&start=${encodeURIComponent(start)}`,
    );
    const rows = json.bars?.[display] ?? [];
    return rows.map((b) => ({
      time: String(b.t ?? ""),
      open: Number(b.o ?? 0),
      high: Number(b.h ?? 0),
      low: Number(b.l ?? 0),
      close: Number(b.c ?? 0),
      volume: Number(b.v ?? 0),
    }));
  }

  if (asset === "crypto") {
    const slash = toAlpacaCryptoSymbol(id);
    const json = await alpacaDataFetch<{
      bars?: Record<string, Array<{ t?: string; o?: number; h?: number; l?: number; c?: number; v?: number }>>;
    }>(
      `/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(slash)}&timeframe=5Min&limit=${limit}&start=${encodeURIComponent(start)}`,
    );
    const rows = json.bars?.[slash] ?? [];
    return rows.map((b) => ({
      time: String(b.t ?? ""),
      open: Number(b.o ?? 0),
      high: Number(b.h ?? 0),
      low: Number(b.l ?? 0),
      close: Number(b.c ?? 0),
      volume: Number(b.v ?? 0),
    }));
  }

  return [];
}

export function hasAlpacaPosition(positions: AlpacaPosition[], ticker: string): boolean {
  const id = normalizeAlpacaTicker(ticker);
  return positions.some((p) => {
    const sym = p.symbol.replace("/", "").toUpperCase();
    return sym === id && Math.abs(p.qty) > 0;
  });
}
