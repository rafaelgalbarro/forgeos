/**
 * US premarket execution (STOCKS_EXECUTION_PREMARKET, default off).
 * Shadow journals with live premarket prices; live only after 20 improving signals.
 */

import fs from "node:fs";
import path from "node:path";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import {
  isUsPremarketSession,
  isUsRegularSession,
  zonedClock,
} from "@/lib/trading/exchange-hours";

export const PREMARKET_MAX_SPREAD_PCT = 0.3;
export const PREMARKET_SIZE_FACTOR = 0.5;
export const PREMARKET_NO_ENTRY_BEFORE_OPEN_MIN = 15;
export const PREMARKET_LIVE_MIN_SIGNALS = 20;
/** Reject quotes older than this during premarket (never prior-day close). */
export const PREMARKET_QUOTE_MAX_AGE_MS = 30 * 60_000;

const CACHE_FILE = path.join(
  process.cwd(),
  ".forgeos",
  "cache",
  "us-premarket-shadow.json",
);

export type PremarketQuoteProbe = {
  readonly price: number;
  readonly previousClose?: number;
  readonly bid?: number;
  readonly ask?: number;
  readonly volume?: number;
  /** ISO or epoch-ms of last trade / quote update. */
  readonly updatedAt?: string | number | null;
  readonly quoteRoute?: string;
};

export type PremarketShadowSignal = {
  id: string;
  ticker: string;
  strategy: string;
  signalAt: string;
  entryPremarket: number;
  stopLoss?: number;
  takeProfit?: number;
  /** Regular-session counterfactual entry (open print). */
  entryRegular?: number | null;
  openPrice?: number | null;
  closePrice?: number | null;
  pnlAtOpenPct?: number | null;
  pnlAtClosePremarketPct?: number | null;
  pnlAtCloseRegularPct?: number | null;
  /** True when premarket entry beat waiting for the open through close. */
  improved?: boolean | null;
  resolvedOpenAt?: string | null;
  resolvedCloseAt?: string | null;
};

type ShadowStore = {
  updatedAt: string;
  signals: PremarketShadowSignal[];
};

function pctReturn(entry: number, mark: number): number {
  if (!(entry > 0) || !(mark > 0)) return 0;
  return ((mark - entry) / entry) * 100;
}

function loadStore(): ShadowStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return { updatedAt: new Date().toISOString(), signals: [] };
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as ShadowStore;
    return {
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      signals: Array.isArray(raw.signals) ? raw.signals : [],
    };
  } catch {
    return { updatedAt: new Date().toISOString(), signals: [] };
  }
}

function saveStore(store: ShadowStore): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[Premarket] shadow save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Last 15 minutes before NYSE open (09:15–09:30 ET) — no new premarket entries. */
export function isUsPremarketNoEntryCutoff(at: Date = new Date()): boolean {
  if (!isUsPremarketSession(at)) return false;
  const c = zonedClock("America/New_York", at);
  const open = 9 * 60 + 30;
  return c.nowMinutes >= open - PREMARKET_NO_ENTRY_BEFORE_OPEN_MIN && c.nowMinutes < open;
}

export function premarketSpreadPct(bid: number, ask: number): number | null {
  if (!(bid > 0) || !(ask > 0) || ask < bid) return null;
  const mid = (bid + ask) / 2;
  if (!(mid > 0)) return null;
  return ((ask - bid) / mid) * 100;
}

/** Best limit for premarket: BUY=ask, SELL=bid (never mid/last alone). */
export function premarketLimitPrice(
  side: "BUY" | "SELL",
  bid: number,
  ask: number,
): number | null {
  if (side === "BUY") return ask > 0 ? ask : null;
  return bid > 0 ? bid : null;
}

export function premarketMinVolume(): number {
  return TRADING_CONFIG.schedule.extendedHoursMinVolume ?? 100_000;
}

/**
 * Live premarket quote: IBKR bid/ask preferred; EODHD only if timestamp is fresh
 * and not the prior-day close. Never decide with yesterday's close.
 */
export function isUsablePremarketQuote(
  quote: PremarketQuoteProbe,
  nowMs: number = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  if (!(quote.price > 0)) {
    return { ok: false, reason: "sin precio premarket" };
  }

  const route = (quote.quoteRoute ?? "").toUpperCase();
  const hasBook =
    typeof quote.bid === "number" &&
    quote.bid > 0 &&
    typeof quote.ask === "number" &&
    quote.ask > 0 &&
    quote.ask >= quote.bid;

  // IBKR live book during premarket is authoritative (bid/ask for LMT).
  if (hasBook && route.includes("IBKR")) {
    return { ok: true };
  }

  let updatedMs: number | null = null;
  if (typeof quote.updatedAt === "number" && Number.isFinite(quote.updatedAt)) {
    updatedMs = quote.updatedAt < 1e12 ? quote.updatedAt * 1000 : quote.updatedAt;
  } else if (typeof quote.updatedAt === "string" && quote.updatedAt.trim()) {
    const parsed = Date.parse(quote.updatedAt);
    if (Number.isFinite(parsed)) updatedMs = parsed;
  }

  if (updatedMs == null) {
    // No provenance → refuse (could be prior close stamped as "price").
    if (hasBook) return { ok: true };
    return { ok: false, reason: "precio sin timestamp fresco (no prior-close)" };
  }

  const age = nowMs - updatedMs;
  if (age < 0 || age > PREMARKET_QUOTE_MAX_AGE_MS) {
    return {
      ok: false,
      reason: `cotización stale (${Math.round(age / 60_000)}m) — skip, no prior-close`,
    };
  }

  const prev = quote.previousClose ?? 0;
  const vol = quote.volume ?? 0;
  if (prev > 0 && Math.abs(quote.price - prev) / prev < 0.0005 && vol <= 0) {
    return {
      ok: false,
      reason: "precio ≈ previousClose sin volumen — posible cierre previo",
    };
  }

  if (hasBook) return { ok: true };
  if (route.includes("EODHD") || route.includes("ALPACA") || route.includes("IBKR")) {
    return { ok: true };
  }
  return { ok: false, reason: `fuente no usable en premarket (${quote.quoteRoute ?? "?"})` };
}

export function assertPremarketLiveGates(opts: {
  bid: number;
  ask: number;
  volume: number;
  at?: Date;
}): void {
  const at = opts.at ?? new Date();
  if (!isUsPremarketSession(at)) {
    throw new Error("PREMARKET_GATE: no es sesión premarket ET");
  }
  if (isUsPremarketNoEntryCutoff(at)) {
    throw new Error(
      `PREMARKET_GATE: sin entradas en últimos ${PREMARKET_NO_ENTRY_BEFORE_OPEN_MIN}m antes de open`,
    );
  }
  const spread = premarketSpreadPct(opts.bid, opts.ask);
  if (spread == null) {
    throw new Error("PREMARKET_GATE: bid/ask requeridos para LMT outsideRth");
  }
  if (spread >= PREMARKET_MAX_SPREAD_PCT) {
    throw new Error(
      `PREMARKET_GATE: spread ${spread.toFixed(3)}% ≥ ${PREMARKET_MAX_SPREAD_PCT}%`,
    );
  }
  const minVol = premarketMinVolume();
  if (!(opts.volume >= minVol)) {
    throw new Error(
      `PREMARKET_GATE: volumen premarket ${opts.volume} < mínimo ${minVol}`,
    );
  }
}

export function recordPremarketShadowSignal(params: {
  ticker: string;
  strategy: string;
  entryPremarket: number;
  stopLoss?: number;
  takeProfit?: number;
}): PremarketShadowSignal {
  const store = loadStore();
  const row: PremarketShadowSignal = {
    id: `${params.ticker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ticker: params.ticker.trim().toUpperCase(),
    strategy: params.strategy || "PRO",
    signalAt: new Date().toISOString(),
    entryPremarket: params.entryPremarket,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
  };
  store.signals.push(row);
  // Keep last 500
  if (store.signals.length > 500) {
    store.signals = store.signals.slice(-500);
  }
  saveStore(store);
  return row;
}

/** Mark open prints for unresolved shadow signals (call once regular session has opened). */
export function resolvePremarketShadowAtOpen(
  prices: ReadonlyMap<string, number>,
  at: Date = new Date(),
): number {
  // Before 09:30 ET there is no open print yet
  if (getNyMinutes(at) < 9 * 60 + 30 && isUsPremarketSession(at)) return 0;
  const store = loadStore();
  let n = 0;
  for (const s of store.signals) {
    if (s.openPrice != null && s.openPrice > 0) continue;
    const px = prices.get(s.ticker.toUpperCase());
    if (!(px != null && px > 0)) continue;
    s.openPrice = px;
    s.entryRegular = px;
    s.pnlAtOpenPct = pctReturn(s.entryPremarket, px);
    s.resolvedOpenAt = new Date().toISOString();
    n += 1;
  }
  if (n > 0) saveStore(store);
  return n;
}

/** Mark close prints + improved flag vs regular-session counterfactual. */
export function resolvePremarketShadowAtClose(
  prices: ReadonlyMap<string, number>,
  at: Date = new Date(),
): number {
  const ny = getNyMinutes(at);
  // Allow from 15:55 ET onward (near close) or after regular close
  if (isUsRegularSession(at) && ny < 15 * 60 + 55) return 0;
  const store = loadStore();
  let n = 0;
  for (const s of store.signals) {
    if (s.closePrice != null && s.closePrice > 0) continue;
    if (s.openPrice == null || !(s.openPrice > 0)) continue;
    const px = prices.get(s.ticker.toUpperCase());
    if (!(px != null && px > 0)) continue;
    s.closePrice = px;
    s.pnlAtClosePremarketPct = pctReturn(s.entryPremarket, px);
    const regularEntry = s.entryRegular ?? s.openPrice;
    s.pnlAtCloseRegularPct = pctReturn(regularEntry, px);
    s.improved =
      (s.pnlAtClosePremarketPct ?? 0) > (s.pnlAtCloseRegularPct ?? 0);
    s.resolvedCloseAt = new Date().toISOString();
    n += 1;
  }
  if (n > 0) saveStore(store);
  return n;
}

export type PremarketLiveReadiness = {
  resolvedClose: number;
  improved: number;
  ready: boolean;
  detail: string;
};

export function getPremarketLiveReadiness(
  minSignals: number = PREMARKET_LIVE_MIN_SIGNALS,
): PremarketLiveReadiness {
  const store = loadStore();
  const closed = store.signals.filter(
    (s) => s.closePrice != null && s.improved != null,
  );
  const improved = closed.filter((s) => s.improved === true).length;
  const resolvedClose = closed.length;
  const ready = resolvedClose >= minSignals && improved > resolvedClose / 2;
  return {
    resolvedClose,
    improved,
    ready,
    detail: ready
      ? `live-ready: ${improved}/${resolvedClose} premarket improved vs open entry`
      : `shadow only: ${improved}/${resolvedClose} improved (need ≥${minSignals} closed + majority improve)`,
  };
}

export function isPremarketLiveReady(): boolean {
  return getPremarketLiveReadiness().ready;
}

function getNyMinutes(at: Date): number {
  return zonedClock("America/New_York", at).nowMinutes;
}

/** Tickers with unresolved open or close marks (for MTM resolution). */
export function listPendingPremarketShadowTickers(): string[] {
  return [
    ...new Set(
      loadStore()
        .signals.filter((s) => s.closePrice == null || !(s.closePrice > 0))
        .map((s) => s.ticker.toUpperCase()),
    ),
  ];
}

/** Test helper. */
export function __resetPremarketShadowForTests(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
  } catch {
    /* ignore */
  }
}

export function __loadPremarketShadowForTests(): PremarketShadowSignal[] {
  return loadStore().signals;
}
