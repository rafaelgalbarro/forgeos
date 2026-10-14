/**
 * In-memory last bid/ask/last from EODHD US WebSocket (quotes + trades).
 */

import "server-only";

export type EodhdWsMarketStatus = "open" | "closed" | "extended hours";

export type EodhdWsQuote = {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  bidSize?: number;
  askSize?: number;
  lastSize?: number;
  updatedAt: string;
  updatedAtMs: number;
  /** From trade `ms` when present; inferred from session clock otherwise. */
  extendedHours: boolean;
  marketStatus?: EodhdWsMarketStatus;
  quoteUpdatedAtMs: number;
  tradeUpdatedAtMs?: number;
};

const quotes = new Map<string, EodhdWsQuote>();

let lastHydrateMs = 0;

export type EodhdWsRuntimeSnapshot = {
  subscribed: string[];
  lastMsgAt: number;
  quoteConnected: boolean;
  tradeConnected: boolean;
};

let runtimeSnapshot: (() => EodhdWsRuntimeSnapshot) | null = null;

export function registerEodhdWsRuntimeSnapshot(
  fn: (() => EodhdWsRuntimeSnapshot) | null,
): void {
  runtimeSnapshot = fn;
}

function normalizeSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  const dot = s.indexOf(".");
  return dot > 0 ? s.slice(0, dot) : s;
}

export function hydrateEodhdWsStoreFromFile(force = false): void {
  const now = Date.now();
  if (!force && now - lastHydrateMs < 400) return;
  lastHydrateMs = now;
  try {
    const { readEodhdWsSharedStore, isEodhdWsStandalone } =
      require("@/lib/market-data/eodhd-ws-shared") as typeof import("@/lib/market-data/eodhd-ws-shared");
    if (isEodhdWsStandalone()) return;
    const snap = readEodhdWsSharedStore();
    if (!snap?.quotes) return;
    for (const [sym, row] of Object.entries(snap.quotes)) {
      quotes.set(sym, { ...row, symbol: sym });
    }
  } catch {
    /* ignore */
  }
}

export function getEodhdWsQuote(ticker: string): EodhdWsQuote | null {
  hydrateEodhdWsStoreFromFile();
  const key = normalizeSymbol(ticker);
  const hit = quotes.get(key);
  return hit ? { ...hit } : null;
}

export function listEodhdWsSymbols(): string[] {
  hydrateEodhdWsStoreFromFile();
  return [...quotes.keys()];
}

export function patchEodhdWsQuote(
  ticker: string,
  patch: Partial<Omit<EodhdWsQuote, "symbol">> & { symbol?: string },
): EodhdWsQuote {
  const symbol = normalizeSymbol(patch.symbol ?? ticker);
  const prev = quotes.get(symbol);
  const nowMs = Date.now();
  const quoteUpdatedAtMs = patch.quoteUpdatedAtMs ?? prev?.quoteUpdatedAtMs ?? nowMs;
  const tradeUpdatedAtMs = patch.tradeUpdatedAtMs ?? prev?.tradeUpdatedAtMs;

  const bid = patch.bid ?? prev?.bid ?? 0;
  const ask = patch.ask ?? prev?.ask ?? 0;
  const last = patch.last ?? prev?.last ?? 0;
  const updatedAtMs = Math.max(
    quoteUpdatedAtMs,
    tradeUpdatedAtMs ?? 0,
    prev?.updatedAtMs ?? 0,
  );

  const row: EodhdWsQuote = {
    symbol,
    bid: bid > 0 ? bid : prev?.bid ?? 0,
    ask: ask > 0 ? ask : prev?.ask ?? 0,
    last: last > 0 ? last : prev?.last ?? 0,
    bidSize: patch.bidSize ?? prev?.bidSize,
    askSize: patch.askSize ?? prev?.askSize,
    lastSize: patch.lastSize ?? prev?.lastSize,
    updatedAt: new Date(updatedAtMs).toISOString(),
    updatedAtMs,
    extendedHours: patch.extendedHours ?? prev?.extendedHours ?? false,
    marketStatus: patch.marketStatus ?? prev?.marketStatus,
    quoteUpdatedAtMs,
    tradeUpdatedAtMs,
  };
  quotes.set(symbol, row);
  scheduleSharedStoreFlush();
  return { ...row };
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSharedStoreFlush(): void {
  try {
    const { isEodhdWsStandalone, writeEodhdWsSharedStore } =
      require("@/lib/market-data/eodhd-ws-shared") as typeof import("@/lib/market-data/eodhd-ws-shared");
    if (!isEodhdWsStandalone()) return;
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushSharedStoreNow(writeEodhdWsSharedStore);
    }, 300);
    if (typeof flushTimer === "object" && "unref" in flushTimer) {
      flushTimer.unref?.();
    }
  } catch {
    /* ignore */
  }
}

export function flushSharedStoreNow(
  writeFn?: (payload: import("@/lib/market-data/eodhd-ws-shared").EodhdWsSharedStore) => void,
): void {
  try {
    const shared =
      require("@/lib/market-data/eodhd-ws-shared") as typeof import("@/lib/market-data/eodhd-ws-shared");
    const write = writeFn ?? shared.writeEodhdWsSharedStore;
    const now = Date.now();
    const quoteRows: Record<string, EodhdWsQuote> = {};
    let fresh = 0;
    for (const [sym, q] of quotes) {
      quoteRows[sym] = { ...q };
      if (now - q.updatedAtMs <= 60_000) fresh += 1;
    }
    const st = runtimeSnapshot?.() ?? {
      subscribed: [] as string[],
      lastMsgAt: 0,
      quoteConnected: false,
      tradeConnected: false,
    };
    write({
      updatedAt: new Date().toISOString(),
      subscribed: [...st.subscribed],
      quotes: quoteRows,
      meta: {
        lastMsgAtMs: st.lastMsgAt,
        freshSymbolsLastMinute: fresh,
        quoteConnected: st.quoteConnected,
        tradeConnected: st.tradeConnected,
      },
    });
  } catch {
    /* ignore */
  }
}

/** Test helper — clear store. */
export function __resetEodhdWsStoreForTests(): void {
  quotes.clear();
  lastHydrateMs = 0;
}
