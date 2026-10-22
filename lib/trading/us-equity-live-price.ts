/**
 * US equity entry pricing — EODHD WebSocket + REST hierarchy (regular session).
 * Premarket: WebSocket only (never prior-day close as entry mark).
 */

import "server-only";

import { getQuote as getEodhdRestQuote } from "@/lib/market-data/eodhd";
import { getEodhdWsQuote } from "@/lib/market-data/eodhd-ws-store";
import { evaluateEodhdWsQuality } from "@/lib/market-data/eodhd-ws-qc";
import type { TradingPriceSnapshot } from "@/lib/trading/ibkr-data";
import { isUsEodhdWsSession, isUsPremarketSession } from "@/lib/trading/exchange-hours";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";
import { readEnvLocalKey } from "@/lib/trading/stocks-execution-gate";

export type UsPriceSourceMode = "auto" | "rest" | "ws";

export const US_WS_FRESH_MS = 60_000;

export type UsEquityLivePriceResult =
  | { ok: true; snap: TradingPriceSnapshot }
  | {
      ok: false;
      reason: string;
      code: "STALE" | "NO_WS" | "QC_FAIL" | "NOT_US" | "NONE";
    };

export type UsRegularPriceResult =
  | { ok: true; snap: TradingPriceSnapshot; source: "ws" | "rest" }
  | { ok: false; reason: string; source: "none" };

/** Re-read US_PRICE_SOURCE from .env.local each cycle (default auto). */
export function readUsPriceSourceMode(): UsPriceSourceMode {
  const raw = (
    readEnvLocalKey("US_PRICE_SOURCE") ??
    process.env.US_PRICE_SOURCE ??
    "auto"
  )
    .trim()
    .toLowerCase();
  if (raw === "rest" || raw === "ws") return raw;
  return "auto";
}

function midPrice(bid: number, ask: number, last: number): number {
  if (bid > 0 && ask >= bid) return (bid + ask) / 2;
  if (last > 0) return last;
  return bid > 0 ? bid : ask;
}

function snapshotFromWs(
  symbol: string,
  ws: NonNullable<ReturnType<typeof getEodhdWsQuote>>,
  previousClose: number,
): TradingPriceSnapshot {
  const bid = ws.bid > 0 ? ws.bid : ws.last;
  const ask = ws.ask > 0 ? ws.ask : ws.last;
  const last = ws.last > 0 ? ws.last : midPrice(bid, ask, 0);
  const px = last > 0 ? last : midPrice(bid, ask, 0);
  const change1d = previousClose > 0 ? px - previousClose : 0;
  const changePct = previousClose > 0 ? (change1d / previousClose) * 100 : 0;
  return {
    ticker: symbol,
    currentPrice: px,
    previousClose: previousClose > 0 ? previousClose : px,
    bid,
    ask,
    change1d,
    high52w: px,
    low52w: px,
    volume: ws.lastSize ?? 0,
    changePercentage: changePct,
    quoteSymbol: symbol,
    quoteExchange: "EODHD",
    quoteCurrency: "USD",
    quoteRoute: "EODHD-WS",
    quoteErrors: [],
    quoteUpdatedAt: ws.updatedAt,
  };
}

function snapshotFromEodhdRest(
  symbol: string,
  eod: NonNullable<Awaited<ReturnType<typeof getEodhdRestQuote>>>,
): TradingPriceSnapshot {
  const px = eod.price;
  const prev = eod.previousClose > 0 ? eod.previousClose : px;
  return {
    ticker: symbol,
    currentPrice: px,
    previousClose: prev,
    bid: px,
    ask: px,
    change1d: px - prev,
    high52w: eod.high52w ?? px,
    low52w: eod.low52w ?? px,
    volume: eod.volume ?? 0,
    changePercentage: eod.changePercentage ?? 0,
    quoteSymbol: symbol,
    quoteExchange: "EODHD",
    quoteCurrency: "USD",
    quoteRoute: "EODHD-REST",
    quoteErrors: [],
    quoteUpdatedAt: eod.updatedAt,
  };
}

function freshWsQuote(symbol: string, maxAgeMs: number, at: Date): EodhdWsQuoteRow | null {
  const ws = getEodhdWsQuote(symbol);
  if (!ws) return null;
  const age = at.getTime() - ws.updatedAtMs;
  if (!(age >= 0 && age < maxAgeMs)) return null;
  if (!(ws.bid > 0 || ws.ask > 0 || ws.last > 0)) return null;
  return ws;
}

type EodhdWsQuoteRow = NonNullable<ReturnType<typeof getEodhdWsQuote>>;

async function restMetadataPreviousClose(symbol: string): Promise<number> {
  try {
    const meta = await getEodhdRestQuote(symbol);
    if (meta?.previousClose != null && meta.previousClose > 0) {
      return meta.previousClose;
    }
  } catch {
    /* metadata only */
  }
  return 0;
}

async function wsSnapshotIfFresh(
  symbol: string,
  at: Date,
  maxAgeMs: number = US_WS_FRESH_MS,
): Promise<TradingPriceSnapshot | null> {
  const ws = freshWsQuote(symbol, maxAgeMs, at);
  if (!ws) return null;
  const previousClose = await restMetadataPreviousClose(symbol);
  return snapshotFromWs(symbol, ws, previousClose);
}

/** True when US entries used to block REST entirely (premarket WS-only path). */
export function mustUseEodhdWsForUsEntry(at: Date = new Date()): boolean {
  return isUsEodhdWsSession(at) && isUsPremarketSession(at);
}

/**
 * Regular / extended US session (not premarket): WS if fresh (<60s), else EODHD REST, else none.
 * Honors US_PRICE_SOURCE=auto|rest|ws from .env.local each call.
 */
export async function resolveUsRegularSessionPrice(
  ticker: string,
  at: Date = new Date(),
): Promise<UsRegularPriceResult> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || isEuropeanEurEquity(symbol)) {
    return { ok: false, reason: "not US equity", source: "none" };
  }
  if (!isUsEodhdWsSession(at) || isUsPremarketSession(at)) {
    return { ok: false, reason: "not US regular/extended WS window", source: "none" };
  }

  const mode = readUsPriceSourceMode();

  if (mode !== "rest") {
    const snap = await wsSnapshotIfFresh(symbol, at);
    if (snap && snap.currentPrice > 0) {
      return { ok: true, snap, source: "ws" };
    }
    if (mode === "ws") {
      return {
        ok: false,
        reason: `${symbol}: sin WS fresco (<${US_WS_FRESH_MS / 1000}s)`,
        source: "none",
      };
    }
  }

  if (mode !== "ws") {
    try {
      const eod = await getEodhdRestQuote(symbol);
      if (eod != null && eod.price > 0) {
        return { ok: true, snap: snapshotFromEodhdRest(symbol, eod), source: "rest" };
      }
    } catch {
      /* fall through */
    }
    if (mode === "rest") {
      return { ok: false, reason: `${symbol}: EODHD REST sin precio`, source: "none" };
    }
  }

  return {
    ok: false,
    reason: `${symbol}: sin precio WS ni REST`,
    source: "none",
  };
}

/**
 * Resolve US equity price for premarket entries (WS + 1m QC; never REST entry mark).
 */
export async function resolveUsEquityLivePrice(
  ticker: string,
  at: Date = new Date(),
): Promise<UsEquityLivePriceResult> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || isEuropeanEurEquity(symbol)) {
    return { ok: false, reason: "not US equity", code: "NOT_US" };
  }
  if (!isUsEodhdWsSession(at)) {
    return { ok: false, reason: "outside EODHD WS window", code: "NO_WS" };
  }

  const mode = readUsPriceSourceMode();
  if (mode === "rest") {
    return {
      ok: false,
      reason: `${symbol}: premarket requiere WS (US_PRICE_SOURCE=rest)`,
      code: "NO_WS",
    };
  }

  const qc = await evaluateEodhdWsQuality(symbol, { alert: false, at });
  if (!qc.ok) {
    const code =
      qc.code === "STALE" ? "STALE" : qc.code === "NO_WS" ? "NO_WS" : "QC_FAIL";
    return { ok: false, reason: qc.reason, code };
  }

  const ws = getEodhdWsQuote(symbol);
  if (!ws) {
    return {
      ok: false,
      reason: `${symbol}: sin cotización EODHD WS (suscribir ≤45)`,
      code: "NO_WS",
    };
  }

  const previousClose = await restMetadataPreviousClose(symbol);
  const snap = snapshotFromWs(symbol, ws, previousClose);
  if (qc.reason.startsWith("ws-only")) {
    // Price origin visible in [Premarket] logs: WS without 1m cross-check.
    snap.quoteRoute = "EODHD-WS(ws-only)";
    snap.quoteErrors = [qc.reason];
  }
  return { ok: true, snap };
}
