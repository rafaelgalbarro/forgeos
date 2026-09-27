/**
 * Kraken public WebSocket API v2 — ticker, book(10), ohlc 1/5/15/60.
 * Auto reconnect + resubscribe. REST OHLC fallback if WS silent > 30s.
 */

import "server-only";

import { restBackfill } from "@/lib/brokers/kraken/market-store";

import {
  getBars,
  setBook,
  setTicker,
  upsertBar,
  type Tf,
} from "@/lib/brokers/kraken/market-store";

const WS_URL = "wss://ws.kraken.com/v2";
const SILENCE_MS = 30_000;

type WsLike = {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
};

let ws: WsLike | null = null;
let symbols: string[] = []; // BTC/EUR format
let lastMsgAt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let restFallbackBusy = false;
let started = false;

function toWsSymbol(altOrWs: string): string {
  const s = altOrWs.trim();
  if (s.includes("/")) return s.replace("XBT", "BTC");
  const u = s.toUpperCase();
  if (u.endsWith("EUR")) {
    let base = u.slice(0, -3);
    if (base === "XBT") base = "BTC";
    return `${base}/EUR`;
  }
  return s;
}

function fromWsSymbol(sym: string): string {
  return sym.replace("/", "").replace("BTC", "XBT").toUpperCase().replace("XBTEUR", "XBTEUR");
}

function altFromWs(sym: string): string {
  const [base, quote] = sym.split("/");
  const b = base === "BTC" ? "XBT" : base;
  return `${b}${quote}`.toUpperCase();
}

function subscribeAll(socket: WsLike): void {
  if (!symbols.length) return;
  const chunk = (arr: string[], n: number) => {
    const out: string[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };
  for (const group of chunk(symbols, 20)) {
    socket.send(
      JSON.stringify({
        method: "subscribe",
        params: { channel: "ticker", symbol: group },
      }),
    );
    socket.send(
      JSON.stringify({
        method: "subscribe",
        params: { channel: "book", depth: 10, symbol: group },
      }),
    );
    for (const interval of [1, 5, 15, 60]) {
      socket.send(
        JSON.stringify({
          method: "subscribe",
          params: { channel: "ohlc", symbol: group, interval },
        }),
      );
    }
  }
}

function handleMessage(raw: string): void {
  lastMsgAt = Date.now();
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }
  const channel = String(msg.channel ?? "");
  const data = msg.data;
  if (!Array.isArray(data) || !data.length) return;

  if (channel === "ticker") {
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const sym = String(r.symbol ?? "");
      const alt = altFromWs(sym);
      const bid = Number(r.bid ?? 0);
      const ask = Number(r.ask ?? 0);
      const last = Number(r.last ?? 0);
      const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : last;
      setTicker(alt, {
        bid,
        ask,
        last,
        mid,
        volume24h: Number(r.volume ?? 0),
        vwap: Number(r.vwap ?? 0),
        high24h: Number(r.high ?? 0),
        low24h: Number(r.low ?? 0),
        changePct24h: Number(r.change_pct ?? 0),
        updatedAt: Date.now(),
      });
    }
  } else if (channel === "book") {
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const sym = String(r.symbol ?? "");
      const alt = altFromWs(sym);
      const bids = Array.isArray(r.bids)
        ? (r.bids as Array<Record<string, number>>).map((b) => ({
            price: Number(b.price),
            qty: Number(b.qty),
          }))
        : [];
      const asks = Array.isArray(r.asks)
        ? (r.asks as Array<Record<string, number>>).map((a) => ({
            price: Number(a.price),
            qty: Number(a.qty),
          }))
        : [];
      if (bids.length || asks.length) {
        setBook(alt, { bids, asks, updatedAt: Date.now() });
      }
    }
  } else if (channel === "ohlc") {
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const sym = String(r.symbol ?? "");
      const alt = altFromWs(sym);
      const interval = Number(r.interval ?? 1);
      const tf = String(interval) as Tf;
      if (!["1", "5", "15", "60"].includes(tf)) continue;
      const openTime = r.open_time ?? r.timestamp;
      const t =
        typeof openTime === "string"
          ? Math.floor(Date.parse(openTime) / 1000)
          : Number(openTime);
      if (!(t > 0)) continue;
      upsertBar(alt, tf, {
        time: t,
        open: Number(r.open ?? 0),
        high: Number(r.high ?? 0),
        low: Number(r.low ?? 0),
        close: Number(r.close ?? 0),
        volume: Number(r.volume ?? 0),
      });
    }
  }
}

function connect(): void {
  const WS = (globalThis as { WebSocket?: new (url: string) => WsLike }).WebSocket;
  if (!WS) {
    console.warn("[Kraken/WS] WebSocket no disponible — solo REST");
    return;
  }
  try {
    ws?.close();
  } catch {
    /* ignore */
  }
  const socket = new WS(WS_URL);
  ws = socket;
  socket.onopen = () => {
    console.log(`[Kraken/WS] conectado — ${symbols.length} símbolos`);
    lastMsgAt = Date.now();
    subscribeAll(socket);
  };
  socket.onmessage = (ev) => {
    handleMessage(String(ev.data ?? ""));
  };
  socket.onerror = () => {
    console.warn("[Kraken/WS] error de socket");
  };
  socket.onclose = () => {
    console.warn("[Kraken/WS] cerrado — reconectando en 3s");
    ws = null;
    if (!started) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(), 3000);
  };
}

async function restFallbackTick(): Promise<void> {
  if (restFallbackBusy) return;
  if (Date.now() - lastMsgAt < SILENCE_MS && ws && ws.readyState === 1) return;
  restFallbackBusy = true;
  try {
    const alts = symbols.map(altFromWs);
    // Rate-limit: backfill up to 5 pairs per tick
    for (const alt of alts.slice(0, 5)) {
      if (getBars(alt, "15").length >= 50) continue;
      await restBackfill(alt, 15);
      await restBackfill(alt, 60);
      await new Promise((r) => setTimeout(r, 350));
    }
  } catch (err) {
    console.warn("[Kraken/WS] REST fallback:", err instanceof Error ? err.message : err);
  } finally {
    restFallbackBusy = false;
  }
}

/** Seed OHLC via REST then start WS. */
export async function startKrakenMarketData(wsNames: string[]): Promise<void> {
  symbols = [...new Set(wsNames.map(toWsSymbol))];
  started = true;
  // Initial REST seed for BTC/ETH + first 8
  const seedAlts = symbols.slice(0, 10).map(altFromWs);
  for (const alt of seedAlts) {
    for (const iv of [1, 5, 15, 60]) {
      await restBackfill(alt, iv).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  connect();
  if (!watchdogTimer) {
    watchdogTimer = setInterval(() => {
      void restFallbackTick();
    }, 15_000);
    if (typeof watchdogTimer === "object" && "unref" in watchdogTimer) {
      watchdogTimer.unref?.();
    }
  }
}

export function updateKrakenMarketSubscriptions(wsNames: string[]): void {
  symbols = [...new Set(wsNames.map(toWsSymbol))];
  if (ws && ws.readyState === 1) subscribeAll(ws);
}

export function getKrakenWsStatus(): {
  connected: boolean;
  symbols: number;
  lastMsgAgeMs: number;
} {
  return {
    connected: Boolean(ws && ws.readyState === 1),
    symbols: symbols.length,
    lastMsgAgeMs: lastMsgAt ? Date.now() - lastMsgAt : -1,
  };
}

export { altFromWs, toWsSymbol, restBackfill };
