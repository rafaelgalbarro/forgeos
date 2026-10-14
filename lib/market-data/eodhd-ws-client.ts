/**
 * EODHD All-in-One US WebSocket — quotes (/ws/us-quote) + trades (/ws/us).
 * Production: single PM2 writer (forgeos-eodhd-us-ws); Next.js reads shared store.
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
  type EodhdWsMarketStatus,
} from "@/lib/market-data/eodhd-ws-store";
import {
  EODHD_WS_SUBSCRIBE_CAP,
  isEodhdWsExternal,
  isEodhdWsStandalone,
  readEodhdWsHeartbeat,
  readEodhdWsSharedStore,
  readEodhdWsSubscribeRequest,
  shouldNextJsOwnEodhdWs,
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

type Channel = "quote" | "trade";

let quoteWs: WsLike | null = null;
let tradeWs: WsLike | null = null;
let subscribed = new Set<string>();
let started = false;
let reconnectQuoteTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTradeTimer: ReturnType<typeof setTimeout> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let qcTimer: ReturnType<typeof setInterval> | null = null;
let statsTimer: ReturnType<typeof setInterval> | null = null;
let subscribePollTimer: ReturnType<typeof setInterval> | null = null;
let lastMsgAt = 0;
let channelsOpen = 0;
let last422AlertAt = 0;
const startedAt = new Date().toISOString();

function ownsWebSocketConnection(): boolean {
  return isEodhdWsStandalone() || shouldNextJsOwnEodhdWs();
}

function logWsConnectedIfReady(): void {
  if (channelsOpen >= 2) {
    console.log("[EODHD/WS] connected — us-quote + us (2 channels)");
  }
}

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

async function alertEodhd422(message: string): Promise<void> {
  const now = Date.now();
  if (now - last422AlertAt < 10 * 60_000) return;
  last422AlertAt = now;
  const { sendTelegramMessage } = await import("@/lib/notifications/telegram-bot");
  await sendTelegramMessage(
    `🚨 <b>EODHD WS</b> status 422 — ${message || "Symbols limit reached"}`,
  ).catch(() => undefined);
}

function handlePayload(raw: string, channel: Channel): void {
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
    channelsOpen += 1;
    logWsConnectedIfReady();
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
    channelsOpen = Math.max(0, channelsOpen - 1);
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
    reconcileOnSocket(tradeWs, desired);
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

export async function ensureEodhdUsWsForUniverse(tickers: readonly string[]): Promise<string[]> {
  if (!isEodhdConfigured()) return [];
  if (!isUsEodhdWsSession()) return [];

  const picked = pickEodhdWsSubscriptionTickers(tickers, EODHD_WS_SUBSCRIBE_CAP);

  if (isEodhdWsExternal() && !isEodhdWsStandalone()) {
    writeEodhdWsSubscribeRequest(picked);
    hydrateEodhdWsStoreFromFile(true);
    console.log(
      `[EODHD/WS] subscribe request ${picked.length} US tickers → PM2 writer (no local socket)`,
    );
    return picked;
  }

  startEodhdUsMarketData();
  return updateEodhdWsSubscriptions(tickers);
}

export function startEodhdUsMarketData(): void {
  if (!isEodhdConfigured()) return;
  if (!ownsWebSocketConnection()) {
    if (isEodhdWsExternal()) {
      console.log("[EODHD/WS] sockets owned by forgeos-eodhd-us-ws — reader only");
    }
    return;
  }
  if (started) return;
  started = true;

  registerEodhdWsRuntimeSnapshot(() => ({
    subscribed: [...subscribed],
    lastMsgAt,
    quoteConnected: Boolean(quoteWs && quoteWs.readyState === 1),
    tradeConnected: Boolean(tradeWs && tradeWs.readyState === 1),
  }));

  connectChannel("quote");
  connectChannel("trade");

  if (isEodhdWsStandalone() && !subscribePollTimer) {
    subscribePollTimer = setInterval(() => {
      void pollSubscribeRequestFile();
    }, 4_000);
    if (typeof subscribePollTimer === "object" && "unref" in subscribePollTimer) {
      subscribePollTimer.unref?.();
    }
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
      tradeConnected: Boolean(tradeWs && tradeWs.readyState === 1),
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
  if (isEodhdWsExternal() && !isEodhdWsStandalone()) {
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
  external: boolean;
  writerPid: number | null;
} {
  if (isEodhdWsExternal() && !isEodhdWsStandalone()) {
    hydrateEodhdWsStoreFromFile(true);
    const hb = readEodhdWsHeartbeat();
    const snap = readEodhdWsSharedStore();
    return {
      started: Boolean(hb && Date.now() - Date.parse(hb.updatedAt) < 5 * 60_000),
      subscribed: snap?.subscribed?.length ?? hb?.subscribed ?? 0,
      quoteConnected: snap?.meta?.quoteConnected ?? hb?.quoteConnected ?? false,
      tradeConnected: snap?.meta?.tradeConnected ?? hb?.tradeConnected ?? false,
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
    tradeConnected: Boolean(tradeWs && tradeWs.readyState === 1),
    lastMsgAgeMs: lastMsgAt ? Date.now() - lastMsgAt : -1,
    symbols: listEodhdWsSymbols(),
    external: false,
    writerPid: isEodhdWsStandalone() ? process.pid : null,
  };
}

/** Test helper — reset client state. */
export function __resetEodhdWsClientForTests(): void {
  started = false;
  subscribed = new Set();
  quoteWs = null;
  tradeWs = null;
  lastMsgAt = 0;
  channelsOpen = 0;
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
}
