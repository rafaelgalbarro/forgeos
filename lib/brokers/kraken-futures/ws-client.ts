/**
 * Kraken Futures WebSocket v1 — ticker + mark price cache.
 */

import "server-only";

import { ingestFuturesWsTicker } from "./market-sync";
import { spotPairToPfSymbol } from "./instruments";

type WsLike = {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((ev: { data?: unknown }) => void) | null;
  onclose: (() => void) | null;
};

type TickerSnap = {
  symbol: string;
  bid: number;
  ask: number;
  mark: number;
  fundingRate: number;
  updatedAt: string;
};

const cache = new Map<string, TickerSnap>();
let ws: WsLike | null = null;
let subscribed: string[] = [];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function getFuturesWsTicker(pfSymbol: string): TickerSnap | null {
  return cache.get(pfSymbol.toUpperCase()) ?? null;
}

export function getFuturesWsStatus(): { connected: boolean; symbols: string[] } {
  return { connected: ws?.readyState === 1, symbols: [...subscribed] };
}

export function startKrakenFuturesMarketData(pfSymbols: string[]): void {
  subscribed = pfSymbols.map((s) => s.toUpperCase());
  const WS = (globalThis as { WebSocket?: new (url: string) => WsLike }).WebSocket;
  if (!WS) {
    console.warn("[Kraken/Futures/WS] WebSocket no disponible — REST only");
    return;
  }
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  const socket = new WS("wss://futures.kraken.com/ws/v1");
  ws = socket;
  socket.onopen = () => {
    console.log(
      `[Kraken/Futures/WS] conectado — ${subscribed.length} PF símbolos`,
    );
    socket.send(
      JSON.stringify({ event: "subscribe", feed: "ticker", product_ids: subscribed }),
    );
  };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data ?? "")) as Record<string, unknown>;
      if (msg.feed !== "ticker") return;
      const sym = String(msg.product_id ?? msg.symbol ?? "").toUpperCase();
      if (!sym) return;
      const snap = {
        symbol: sym,
        bid: num(msg.bid),
        ask: num(msg.ask),
        mark: num(msg.markPrice ?? msg.price),
        fundingRate: num(msg.funding_rate ?? msg.relativeFundingRate),
        updatedAt: new Date().toISOString(),
      };
      cache.set(sym, snap);
      ingestFuturesWsTicker(sym, snap);
    } catch {
      /* ignore */
    }
  };
  socket.onclose = () => {
    ws = null;
    setTimeout(() => startKrakenFuturesMarketData(subscribed), 5_000);
  };
}

export function subscribeFuturesForSpotPairs(spotPairs: string[]): void {
  const pf = spotPairs
    .map((p) => spotPairToPfSymbol(p))
    .filter((s): s is string => Boolean(s));
  if (pf.length) startKrakenFuturesMarketData(pf);
}

/** Test hook: simulate WS ticker payload without a socket. */
export function __testIngestFuturesWsMessage(raw: string): void {
  try {
    const msg = JSON.parse(raw) as Record<string, unknown>;
    if (msg.feed !== "ticker") return;
    const sym = String(msg.product_id ?? msg.symbol ?? "").toUpperCase();
    if (!sym) return;
    const snap = {
      symbol: sym,
      bid: num(msg.bid),
      ask: num(msg.ask),
      mark: num(msg.markPrice ?? msg.price),
      fundingRate: num(msg.funding_rate ?? msg.relativeFundingRate),
      updatedAt: new Date().toISOString(),
    };
    cache.set(sym, snap);
    ingestFuturesWsTicker(sym, snap);
  } catch {
    /* ignore */
  }
}
