/**
 * Binance REST — spot price + signed order submit.
 */

import "server-only";

import { createHmac } from "node:crypto";

import {
  binanceApiKey,
  binanceApiSecret,
  binanceRestBaseUrl,
  isBinanceConfigured,
  normalizeBinanceCryptoTicker,
  toBinanceSymbol,
} from "@/lib/market-data/binance-config";
import { ensureBinanceWsStarted, peekBinanceWsPrice } from "@/lib/market-data/binance-ws";

export type BinanceLivePrice = {
  symbol: string;
  price: number;
  source: "ws" | "rest";
  updatedAt: string;
};

function signQuery(query: string): string {
  return createHmac("sha256", binanceApiSecret()).update(query).digest("hex");
}

async function binanceSignedFetch<T>(
  path: string,
  params: Record<string, string | number>,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  if (!isBinanceConfigured()) {
    throw new Error("Binance API key/secret not configured");
  }
  const qs = new URLSearchParams(
    Object.entries({ ...params, timestamp: Date.now() }).map(([k, v]) => [k, String(v)]),
  );
  qs.set("signature", signQuery(qs.toString()));
  const url = `${binanceRestBaseUrl()}${path}?${qs.toString()}`;
  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": binanceApiKey() },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Binance ${path} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** REST ticker price — fallback when WS not warm yet. */
export async function fetchBinanceRestPrice(ticker: string): Promise<BinanceLivePrice | null> {
  const symbol = toBinanceSymbol(ticker);
  if (!symbol) return null;
  try {
    const url = `${binanceRestBaseUrl()}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return null;
    const raw = (await res.json()) as { price?: string };
    const price = Number(raw.price);
    if (!(price > 0)) return null;
    const base = normalizeBinanceCryptoTicker(ticker);
    return {
      symbol: base ?? ticker.toUpperCase(),
      price,
      source: "rest",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** WS tick first, REST fallback — starts WS if needed. */
export async function getBinancePrice(ticker: string): Promise<BinanceLivePrice | null> {
  void ensureBinanceWsStarted();
  const ws = peekBinanceWsPrice(ticker);
  if (ws && ws.price > 0) {
    return { symbol: ws.symbol, price: ws.price, source: "ws", updatedAt: ws.updatedAt };
  }
  return fetchBinanceRestPrice(ticker);
}

export type BinanceOrderResult = {
  orderId: string;
  symbol: string;
  status: string;
  executedQty: number;
  price: number;
};

/** POST /api/v3/order — LIMIT GTC on spot. */
export async function submitBinanceLimitOrder(args: {
  readonly ticker: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly limitPrice: number;
}): Promise<BinanceOrderResult> {
  const symbol = toBinanceSymbol(args.ticker);
  if (!symbol) throw new Error(`Unsupported Binance ticker: ${args.ticker}`);
  if (!(args.quantity > 0)) throw new Error(`Invalid quantity: ${args.quantity}`);
  if (!(args.limitPrice > 0)) throw new Error(`Invalid limitPrice: ${args.limitPrice}`);

  const raw = await binanceSignedFetch<{
    orderId?: number;
    symbol?: string;
    status?: string;
    executedQty?: string;
    price?: string;
  }>("/api/v3/order", {
    symbol,
    side: args.side,
    type: "LIMIT",
    timeInForce: "GTC",
    quantity: args.quantity,
    price: args.limitPrice,
  }, "POST");

  return {
    orderId: String(raw.orderId ?? ""),
    symbol: raw.symbol ?? symbol,
    status: raw.status ?? "NEW",
    executedQty: Number(raw.executedQty ?? 0) || 0,
    price: Number(raw.price ?? args.limitPrice) || args.limitPrice,
  };
}
