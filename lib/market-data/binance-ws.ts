/**
 * Binance WebSocket — real-time trade ticks (no polling).
 * Combined stream: wss://stream.binance.com:9443/stream?streams=btcusdt@trade/...
 */

import "server-only";

import {
  BINANCE_CRYPTO_TICKERS,
  binanceWsBaseUrl,
  toBinanceSymbol,
} from "@/lib/market-data/binance-config";

export type BinanceWsTick = {
  symbol: string;
  price: number;
  qty: number;
  tradeTime: number;
  updatedAt: string;
};

type TradeMessage = {
  stream?: string;
  data?: {
    s?: string;
    p?: string;
    q?: string;
    T?: number;
  };
};

const priceBySymbol = new Map<string, BinanceWsTick>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let starting = false;

function binanceSymbolToBase(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  return s.endsWith("USDT") ? s.slice(0, -4) : s;
}

function combinedStreamUrl(): string {
  const streams = BINANCE_CRYPTO_TICKERS.map(
    (t) => `${toBinanceSymbol(t)?.toLowerCase()}@trade`,
  )
    .filter(Boolean)
    .join("/");
  return `${binanceWsBaseUrl()}/stream?streams=${streams}`;
}

function handleMessage(raw: string): void {
  let msg: TradeMessage;
  try {
    msg = JSON.parse(raw) as TradeMessage;
  } catch {
    return;
  }
  const data = msg.data;
  if (!data?.s || !data.p) return;
  const price = Number(data.p);
  if (!(price > 0)) return;
  const base = binanceSymbolToBase(data.s);
  const tick: BinanceWsTick = {
    symbol: base,
    price,
    qty: Number(data.q ?? 0) || 0,
    tradeTime: Number(data.T ?? Date.now()),
    updatedAt: new Date().toISOString(),
  };
  priceBySymbol.set(base, tick);
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ws = null;
    starting = false;
    void ensureBinanceWsStarted();
  }, 3_000);
}

/** Start combined trade stream (idempotent). */
export async function ensureBinanceWsStarted(): Promise<void> {
  if (ws?.readyState === WebSocket.OPEN || starting) return;
  if (typeof WebSocket === "undefined") {
    console.warn("[BinanceWS] WebSocket no disponible en este runtime");
    return;
  }
  starting = true;
  try {
    const url = combinedStreamUrl();
    const socket = new WebSocket(url);
    ws = socket;
    socket.onopen = () => {
      starting = false;
      console.log(`[BinanceWS] Conectado — ${BINANCE_CRYPTO_TICKERS.length} streams @trade`);
    };
    socket.onmessage = (ev) => {
      const payload = typeof ev.data === "string" ? ev.data : String(ev.data);
      handleMessage(payload);
    };
    socket.onerror = () => {
      console.warn("[BinanceWS] Error de conexión — reintentando…");
    };
    socket.onclose = () => {
      starting = false;
      if (ws === socket) ws = null;
      scheduleReconnect();
    };
  } catch (err) {
    starting = false;
    console.warn(
      "[BinanceWS] No se pudo conectar:",
      err instanceof Error ? err.message : err,
    );
    scheduleReconnect();
  }
}

/** Latest tick from WS cache (base symbol, e.g. BTC). */
export function peekBinanceWsPrice(ticker: string): BinanceWsTick | null {
  const base = ticker.trim().toUpperCase().replace(/USDT$/, "");
  return priceBySymbol.get(base) ?? null;
}

export function getAllBinanceWsPrices(): ReadonlyMap<string, BinanceWsTick> {
  return priceBySymbol;
}
