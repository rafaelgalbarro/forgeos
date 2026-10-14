/**
 * EODHD US WebSocket — single /ws/us-quote connection (bid/ask).
 * PM2 writer (forgeos-eodhd-us-ws) owns the socket; Next.js is reader-only.
 */

import "server-only";

import { isEodhdConfigured } from "@/lib/market-data/eodhd";
import {
  flushSharedStoreNow,
  getEodhdWsQuote,
  listEodhdWsSymbols,
  patchEodhdWsQuote,
  registerEodhdWsRuntimeSnapshot,
  hydrateEodhdWsStoreFromFile,
} from "@/lib/market-data/eodhd-ws-store";
import {
  EODHD_WS_SUBSCRIBE_CAP,
  isEodhdWsStandalone,
  readEodhdWsHeartbeat,
  readEodhdWsSharedStore,
  readEodhdWsSubscribeRequest,
  writeEodhdWsHeartbeat,
  writeEodhdWsSubscribeRequest,
} from "@/lib/market-data/eodhd-ws-shared";
import { isUsEodhdWsSession, isUsRegularSession } from "@/lib/trading/exchange-hours";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";
import { listPendingPremarketShadowTickers } from "@/lib/trading/us-premarket";

/** @deprecated use EODHD_WS_SUBSCRIBE_CAP — kept for tests */
export const EODHD_WS_MAX_TICKERS = EODHD_WS_SUBSCRIBE_CAP;
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

let quoteWs: WsLike | null = null;
let subscribed = new Set<string>();
let started = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let qcTimer: ReturnType<typeof setInterval> | null = null;
let statsTimer: ReturnType<typeof setInterval> | null = null;
let subscribePollTimer: ReturnType<typeof setInterval> | null = null;
let lastMsgAt = 0;
let last422AlertAt = 0;
const startedAt = new Date().toISOString();

function ownsWebSocketConnection(): boolean {
  return isEodhdWsStandalone();
}

function apiKey(): string {
  return process.env.EODHD_API_KEY?.trim() ?? "";
}

function wsQuoteUrl(): string {
  return `wss://ws.eodhistoricaldata.com/ws/us-quote?api_token=${encodeURIComponent(apiKey())}`;
}

function normalizeUsSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  const dot = s.indexOf(".");
  return dot > 0 ? s.slice(0, dot) : s;
}

function quoteMid(bp: number, ap: number): number | undefined {
  if (bp > 0 && ap >= bp) return (bp + ap) / 2;
  if (bp > 0) return bp;
  if (ap > 0) return ap;
  return undefined;
}

async function alertEodhd422(message: string): Promise<void> {
  last422AlertAt = Date.now();
  const { sendSystemTelegramAlert } = await import("@/lib/notifications/telegram-policy");
  await sendSystemTelegramAlert(
    "eodhd_ws_422",
    `🚨 <b>EODHD WS</b> status 422 — ${message || "Symbols limit reached"}`,
  ).catch(() => undefined);
}

function handlePayload(raw: string): void {
  lastMsgAt = Date.now();
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }

  if (msg.status_code != null) {
    const code = Number(msg.status_code);
    const message = String(msg.message ?? "");
    console.log(`[EODHD/WS] response status_code=${code} message=${message}`);
    if (code === 422) {
      void alertEodhd422(message);
    }
    return;
  }

  const symRaw = String(msg.s ?? msg.symbol ?? "").trim();
  if (!symRaw) return;
  const symbol = normalizeUsSymbol(symRaw);
  if (!symbol) return;

  const bp = Number(msg.bp);
  const ap = Number(msg.ap);
  const t = Number(msg.t);
  const tsMs = Number.isFinite(t) ? (t < 1e12 ? t * 1000 : t) : Date.now();
  const mid = quoteMid(bp, ap);
  patchEodhdWsQuote(symbol, {
    bid: bp > 0 ? bp : undefined,
    ask: ap > 0 ? ap : undefined,
    last: mid,
    bidSize: Number(msg.bs) > 0 ? Number(msg.bs) : undefined,
    askSize: Number(msg.as) > 0 ? Number(msg.as) : undefined,
    quoteUpdatedAtMs: tsMs,
    tradeUpdatedAtMs: tsMs,
    extendedHours: !isUsRegularFromClock(tsMs),
  });
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

function connectUsQuote(): void {
  if (!isEodhdConfigured()) return;
  const WS = (globalThis as { WebSocket?: new (url: string) => WsLike }).WebSocket;
  if (!WS) {
    console.warn("[EODHD/WS] WebSocket no disponible en runtime");
    return;
  }

  let socket: WsLike;
  try {
    socket = new WS(wsQuoteUrl());
  } catch (err) {
    console.warn(
      "[EODHD/WS] connect us-quote failed:",
      err instanceof Error ? err.message : err,
    );
    return;
  }

  quoteWs = socket;

  socket.onopen = () => {
    console.log(
      `[EODHD/WS] connected — us-quote (${subscribed.size} symbols pending subscribe)`,
    );
    lastMsgAt = Date.now();
    sendSubscribe(socket, [...subscribed]);
  };
  socket.onmessage = (ev) => {
    handlePayload(String(ev.data ?? ""));
  };
  socket.onerror = () => {
    console.warn("[EODHD/WS] us-quote error");
  };
  socket.onclose = () => {
    console.warn("[EODHD/WS] us-quote cerrado — reconectando en 3s");
    quoteWs = null;
    if (!started) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectUsQuote(), 3_000);
  };
}

/** Priority: pending premarket shadow marks, then cycle universe — US only, cap 45. */
export function pickEodhdWsSubscriptionTickers(
  candidates: readonly string[],
  max: number = EODHD_WS_SUBSCRIBE_CAP,
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
  const picked = pickEodhdWsSubscriptionTickers(tickers, EODHD_WS_SUBSCRIBE_CAP);
  const desired = new Set(picked);
  const prev = subscribed;
  subscribed = desired;
  if (ownsWebSocketConnection()) {
    reconcileOnSocket(quoteWs, desired);
  }
  const dropped = [...prev].filter((s) => !desired.has(s)).length;
  const added = [...desired].filter((s) => !prev.has(s)).length;
  console.log(
    `[EODHD/WS] subscribe ${desired.size} tickers (cap ${EODHD_WS_SUBSCRIBE_CAP}, +${added} −${dropped})`,
  );
  if (isEodhdWsStandalone()) {
    flushSharedStoreNow();
  }
  return picked;
}

/** Next.js: write subscribe request + hydrate store — never opens a socket. */
export async function ensureEodhdUsWsForUniverse(tickers: readonly string[]): Promise<string[]> {
  if (!isEodhdConfigured()) return [];
  if (!isUsEodhdWsSession()) return [];

  const picked = pickEodhdWsSubscriptionTickers(tickers, EODHD_WS_SUBSCRIBE_CAP);

  if (!isEodhdWsStandalone()) {
    writeEodhdWsSubscribeRequest(picked);
    hydrateEodhdWsStoreFromFile(true);
    console.log(
      `[EODHD/WS] subscribe request ${picked.length} US tickers → forgeos-eodhd-us-ws (reader only)`,
    );
    return picked;
  }

  startEodhdUsMarketData();
  return updateEodhdWsSubscriptions(tickers);
}

export function startEodhdUsMarketData(): void {
  if (!isEodhdConfigured()) return;
  if (!ownsWebSocketConnection()) {
    return;
  }
  if (started) return;
  started = true;

  registerEodhdWsRuntimeSnapshot(() => ({
    subscribed: [...subscribed],
    lastMsgAt,
    quoteConnected: Boolean(quoteWs && quoteWs.readyState === 1),
    tradeConnected: false,
  }));

  connectUsQuote();

  if (!subscribePollTimer) {
    subscribePollTimer = setInterval(() => {
      void pollSubscribeRequestFile();
    }, 4_000);
    subscribePollTimer.unref?.();
  }

  if (!watchdogTimer) {
    watchdogTimer = setInterval(() => {
      void staleWatchdogTick();
    }, 30_000);
    watchdogTimer.unref?.();
  }
  if (!qcTimer) {
    qcTimer = setInterval(() => {
      void minuteQcTick();
    }, 60_000);
    qcTimer.unref?.();
  }
  if (!statsTimer) {
    statsTimer = setInterval(() => {
      logFreshSymbolStats();
    }, 60_000);
    statsTimer.unref?.();
  }
}

async function pollSubscribeRequestFile(): Promise<void> {
  if (!isEodhdWsStandalone() || !isUsEodhdWsSession()) return;
  const req = readEodhdWsSubscribeRequest();
  if (!req?.tickers?.length) return;
  updateEodhdWsSubscriptions(req.tickers);
}

function logFreshSymbolStats(): void {
  if (!started || !isUsEodhdWsSession()) return;
  const now = Date.now();
  let fresh = 0;
  for (const sym of subscribed) {
    const q = getEodhdWsQuote(sym);
    if (q && now - q.updatedAtMs <= 60_000) fresh += 1;
  }
  console.log(
    `[EODHD/WS] fresh symbols last 1m: ${fresh}/${subscribed.size} subscribed`,
  );
  if (isEodhdWsStandalone()) {
    writeEodhdWsHeartbeat({
      role: "standalone",
      startedAt,
      subscribed: subscribed.size,
      quoteConnected: Boolean(quoteWs && quoteWs.readyState === 1),
      tradeConnected: false,
      freshSymbolsLastMinute: fresh,
      lastMsgAtMs: lastMsgAt,
    });
    flushSharedStoreNow();
  }
}

async function minuteQcTick(): Promise<void> {
  if (!started || !isUsEodhdWsSession()) return;
  const { runEodhdWsQcForSymbols } = await import("@/lib/market-data/eodhd-ws-qc");
  await runEodhdWsQcForSymbols([...subscribed]);
}

export function getEodhdWsSubscribedTickers(): string[] {
  if (!isEodhdWsStandalone()) {
    const snap = readEodhdWsSharedStore();
    return snap?.subscribed ?? [];
  }
  return [...subscribed];
}

async function staleWatchdogTick(): Promise<void> {
  if (!started || !isUsEodhdWsSession()) return;
  const now = Date.now();
  if (lastMsgAt && now - lastMsgAt > EODHD_WS_STALE_ALERT_MS * 2) {
    console.warn("[EODHD/WS] socket silencioso — reconectando");
    try {
      quoteWs?.close();
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
  external: boolean;
  writerPid: number | null;
} {
  if (!isEodhdWsStandalone()) {
    hydrateEodhdWsStoreFromFile(true);
    const hb = readEodhdWsHeartbeat();
    const snap = readEodhdWsSharedStore();
    return {
      started: Boolean(hb && Date.now() - Date.parse(hb.updatedAt) < 5 * 60_000),
      subscribed: snap?.subscribed?.length ?? hb?.subscribed ?? 0,
      quoteConnected: snap?.meta?.quoteConnected ?? hb?.quoteConnected ?? false,
      tradeConnected: false,
      lastMsgAgeMs: snap?.meta?.lastMsgAtMs
        ? Date.now() - snap.meta.lastMsgAtMs
        : hb?.lastMsgAtMs
          ? Date.now() - hb.lastMsgAtMs
          : -1,
      symbols: listEodhdWsSymbols(),
      external: true,
      writerPid: hb?.pid ?? null,
    };
  }

  return {
    started,
    subscribed: subscribed.size,
    quoteConnected: Boolean(quoteWs && quoteWs.readyState === 1),
    tradeConnected: false,
    lastMsgAgeMs: lastMsgAt ? Date.now() - lastMsgAt : -1,
    symbols: listEodhdWsSymbols(),
    external: false,
    writerPid: process.pid,
  };
}

/** Test helper — reset client state. */
export function __resetEodhdWsClientForTests(): void {
  started = false;
  subscribed = new Set();
  quoteWs = null;
  lastMsgAt = 0;
  last422AlertAt = 0;
  registerEodhdWsRuntimeSnapshot(null);
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = null;
  if (qcTimer) clearInterval(qcTimer);
  qcTimer = null;
  if (statsTimer) clearInterval(statsTimer);
  statsTimer = null;
  if (subscribePollTimer) clearInterval(subscribePollTimer);
  subscribePollTimer = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
}
