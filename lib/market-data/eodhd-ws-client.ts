/**
 * EODHD All-in-One US WebSocket — quotes (/ws/us-quote) + trades (/ws/us).
 * 04:00–20:00 ET · max 50 simultaneous tickers · auto-reconnect.
 */

import "server-only";

import { isEodhdConfigured } from "@/lib/market-data/eodhd";
import {
  listEodhdWsSymbols,
  patchEodhdWsQuote,
  type EodhdWsMarketStatus,
} from "@/lib/market-data/eodhd-ws-store";
import {
  isUsAfterHoursSession,
  isUsEodhdWsSession,
  isUsPremarketSession,
  isUsRegularSession,
} from "@/lib/trading/exchange-hours";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";
import { listPendingPremarketShadowTickers } from "@/lib/trading/us-premarket";

export const EODHD_WS_MAX_TICKERS = 50;
export const EODHD_WS_STALE_ALERT_MS = 2 * 60_000;

type WsLike = {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
};

type Channel = "quote" | "trade";

let quoteWs: WsLike | null = null;
let tradeWs: WsLike | null = null;
let subscribed = new Set<string>();
let started = false;
let reconnectQuoteTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTradeTimer: ReturnType<typeof setTimeout> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let qcTimer: ReturnType<typeof setInterval> | null = null;
let lastMsgAt = 0;
function apiKey(): string {
  return process.env.EODHD_API_KEY?.trim() ?? "";
}

function wsUrl(path: "us-quote" | "us"): string {
  return `wss://ws.eodhistoricaldata.com/ws/${path}?api_token=${encodeURIComponent(apiKey())}`;
}

function normalizeUsSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  const dot = s.indexOf(".");
  return dot > 0 ? s.slice(0, dot) : s;
}

function parseMarketStatus(ms: unknown): EodhdWsMarketStatus | undefined {
  const v = String(ms ?? "").toLowerCase();
  if (v === "open") return "open";
  if (v === "closed") return "closed";
  if (v.includes("extended")) return "extended hours";
  return undefined;
}

function handlePayload(raw: string, channel: Channel): void {
  lastMsgAt = Date.now();
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }
  const symRaw = String(msg.s ?? msg.symbol ?? "").trim();
  if (!symRaw) return;
  const symbol = normalizeUsSymbol(symRaw);
  if (!symbol) return;

  if (channel === "quote") {
    const bp = Number(msg.bp);
    const ap = Number(msg.ap);
    const t = Number(msg.t);
    const tsMs = Number.isFinite(t) ? (t < 1e12 ? t * 1000 : t) : Date.now();
    patchEodhdWsQuote(symbol, {
      bid: bp > 0 ? bp : undefined,
      ask: ap > 0 ? ap : undefined,
      bidSize: Number(msg.bs) > 0 ? Number(msg.bs) : undefined,
      askSize: Number(msg.as) > 0 ? Number(msg.as) : undefined,
      quoteUpdatedAtMs: tsMs,
      extendedHours: !isUsRegularFromClock(tsMs),
    });
    return;
  }

  const price = Number(msg.p);
  const t = Number(msg.t);
  const tsMs = Number.isFinite(t) ? (t < 1e12 ? t * 1000 : t) : Date.now();
  const ms = parseMarketStatus(msg.ms);
  const extended =
    ms === "extended hours" ||
    (ms == null && !isUsRegularFromClock(tsMs));
  patchEodhdWsQuote(symbol, {
    last: price > 0 ? price : undefined,
    lastSize: Number(msg.v) > 0 ? Number(msg.v) : undefined,
    tradeUpdatedAtMs: tsMs,
    marketStatus: ms,
    extendedHours: extended,
  });
}

function isExtendedEtFromClock(at: Date): boolean {
  if (!isUsEodhdWsSession(at)) return false;
  return isUsPremarketSession(at) || isUsAfterHoursSession(at);
}

function isUsRegularFromClock(atMs: number): boolean {
  return isUsRegularSession(new Date(atMs));
}

function sendSubscribe(socket: WsLike, symbols: string[]): void {
  if (!symbols.length) return;
  socket.send(
    JSON.stringify({
      action: "subscribe",
      symbols: symbols.join(","),
    }),
  );
}

function sendUnsubscribe(socket: WsLike, symbols: string[]): void {
  if (!symbols.length) return;
  socket.send(
    JSON.stringify({
      action: "unsubscribe",
      symbols: symbols.join(","),
    }),
  );
}

function reconcileOnSocket(socket: WsLike | null, desired: Set<string>): void {
  if (!socket || socket.readyState !== 1) return;
  const prev = subscribed;
  const toDrop = [...prev].filter((s) => !desired.has(s));
  const toAdd = [...desired].filter((s) => !prev.has(s));
  if (toDrop.length) sendUnsubscribe(socket, toDrop);
  if (toAdd.length) sendSubscribe(socket, toAdd);
}

function connectChannel(channel: Channel): void {
  if (!isEodhdConfigured()) return;
  const WS = (globalThis as { WebSocket?: new (url: string) => WsLike }).WebSocket;
  if (!WS) {
    console.warn("[EODHD/WS] WebSocket no disponible en runtime");
    return;
  }

  const path = channel === "quote" ? "us-quote" : "us";
  const url = wsUrl(path);
  let socket: WsLike;
  try {
    socket = new WS(url);
  } catch (err) {
    console.warn(
      `[EODHD/WS] connect ${path} failed:`,
      err instanceof Error ? err.message : err,
    );
    return;
  }

  if (channel === "quote") quoteWs = socket;
  else tradeWs = socket;

  socket.onopen = () => {
    console.log(`[EODHD/WS] ${path} conectado — ${subscribed.size} símbolos`);
    lastMsgAt = Date.now();
    sendSubscribe(socket, [...subscribed]);
  };
  socket.onmessage = (ev) => {
    handlePayload(String(ev.data ?? ""), channel);
  };
  socket.onerror = () => {
    console.warn(`[EODHD/WS] ${path} error`);
  };
  socket.onclose = () => {
    console.warn(`[EODHD/WS] ${path} cerrado — reconectando en 3s`);
    if (channel === "quote") quoteWs = null;
    else tradeWs = null;
    if (!started) return;
    const timerRef = channel === "quote" ? reconnectQuoteTimer : reconnectTradeTimer;
    if (timerRef) clearTimeout(timerRef);
    const t = setTimeout(() => connectChannel(channel), 3_000);
    if (channel === "quote") reconnectQuoteTimer = t;
    else reconnectTradeTimer = t;
  };
}

/** Priority: pending premarket shadow marks, then cycle universe — hard cap 50. */
export function pickEodhdWsSubscriptionTickers(
  candidates: readonly string[],
  max: number = EODHD_WS_MAX_TICKERS,
): string[] {
  const pending = listPendingPremarketShadowTickers();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...pending, ...candidates]) {
    const symbol = normalizeUsSymbol(raw);
    if (!symbol || seen.has(symbol) || isEuropeanEurEquity(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
    if (out.length >= max) break;
  }
  return out;
}

export function updateEodhdWsSubscriptions(tickers: readonly string[]): string[] {
  const picked = pickEodhdWsSubscriptionTickers(tickers, EODHD_WS_MAX_TICKERS);
  const desired = new Set(picked);
  const prev = subscribed;
  subscribed = desired;
  reconcileOnSocket(quoteWs, desired);
  reconcileOnSocket(tradeWs, desired);
  const dropped = [...prev].filter((s) => !desired.has(s)).length;
  const added = [...desired].filter((s) => !prev.has(s)).length;
  if (added || dropped) {
    console.log(
      `[EODHD/WS] subs ${desired.size}/${EODHD_WS_MAX_TICKERS} (+${added} −${dropped})`,
    );
  }
  return picked;
}

export async function ensureEodhdUsWsForUniverse(tickers: readonly string[]): Promise<string[]> {
  if (!isEodhdConfigured()) return [];
  if (!isUsEodhdWsSession()) return [];
  startEodhdUsMarketData();
  return updateEodhdWsSubscriptions(tickers);
}

export function startEodhdUsMarketData(): void {
  if (!isEodhdConfigured()) return;
  if (started) return;
  started = true;
  connectChannel("quote");
  connectChannel("trade");
  if (!watchdogTimer) {
    watchdogTimer = setInterval(() => {
      void staleWatchdogTick();
    }, 30_000);
    if (typeof watchdogTimer === "object" && "unref" in watchdogTimer) {
      watchdogTimer.unref?.();
    }
  }
  if (!qcTimer) {
    qcTimer = setInterval(() => {
      void minuteQcTick();
    }, 60_000);
    if (typeof qcTimer === "object" && "unref" in qcTimer) {
      qcTimer.unref?.();
    }
  }
}

async function minuteQcTick(): Promise<void> {
  if (!started || !isUsEodhdWsSession()) return;
  const { runEodhdWsQcForSymbols } = await import("@/lib/market-data/eodhd-ws-qc");
  await runEodhdWsQcForSymbols([...subscribed]);
}

export function getEodhdWsSubscribedTickers(): string[] {
  return [...subscribed];
}

async function staleWatchdogTick(): Promise<void> {
  if (!started || !isUsEodhdWsSession()) return;
  const now = Date.now();
  if (lastMsgAt && now - lastMsgAt > EODHD_WS_STALE_ALERT_MS * 2) {
    console.warn("[EODHD/WS] socket silencioso — reconectando");
    try {
      quoteWs?.close();
      tradeWs?.close();
    } catch {
      /* ignore */
    }
  }
}

export function getEodhdWsStatus(): {
  started: boolean;
  subscribed: number;
  quoteConnected: boolean;
  tradeConnected: boolean;
  lastMsgAgeMs: number;
  symbols: string[];
} {
  return {
    started,
    subscribed: subscribed.size,
    quoteConnected: Boolean(quoteWs && quoteWs.readyState === 1),
    tradeConnected: Boolean(tradeWs && tradeWs.readyState === 1),
    lastMsgAgeMs: lastMsgAt ? Date.now() - lastMsgAt : -1,
    symbols: listEodhdWsSymbols(),
  };
}

/** Test helper — reset client state. */
export function __resetEodhdWsClientForTests(): void {
  started = false;
  subscribed = new Set();
  quoteWs = null;
  tradeWs = null;
  lastMsgAt = 0;
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = null;
  if (qcTimer) clearInterval(qcTimer);
  qcTimer = null;
}
