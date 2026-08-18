/**
 * Polygon.io market data client — primary quotes, history, and FX conversion.
 * Falls back to Yahoo Finance when Polygon is unavailable or returns no data.
 */

import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import {
  BARS_CACHE_TTL_MS,
  PRICE_CACHE_TTL_MS,
  getDataRefreshPolicy,
} from "@/lib/market-data/refresh-policy";
import type { YahooOhlcvBar, YahooQuote } from "@/lib/market-data/yahoo-finance";

const POLYGON_BASE = "https://api.polygon.io";
const MAX_RETRIES = 2;

export type PolygonQuote = {
  symbol: string;
  price: number;
  timestamp?: string;
  source: "polygon" | "yahoo";
};

export type PolygonForexQuote = {
  from: string;
  to: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp?: string;
  source: "polygon" | "yahoo";
};

export type PolygonHistoryBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
};

function envBool(name: string, defaultValue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export function isPolygonEnabled(): boolean {
  const key = process.env.POLYGON_API_KEY?.trim();
  if (!key) return false;
  return envBool("USE_POLYGON", true);
}

function polygonApiKey(): string | null {
  const key = process.env.POLYGON_API_KEY?.trim();
  return key || null;
}

/** Map Yahoo-style tickers to Polygon symbol format. */
export function normalizePolygonTicker(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (!raw) return raw;
  if (raw.startsWith("C:") || raw.startsWith("I:") || raw.startsWith("X:")) return raw;
  if (raw.endsWith("=X")) {
    const pair = raw.slice(0, -2);
    if (pair.length === 6) return `C:${pair}`;
  }
  if (raw.startsWith("^")) return `I:${raw.slice(1)}`;
  return raw;
}

function parseForexPair(pair: string): { from: string; to: string } | null {
  const cleaned = pair.trim().toUpperCase().replace(/\//g, "").replace(/=X$/, "");
  if (cleaned.startsWith("C:") && cleaned.length === 9) {
    const codes = cleaned.slice(2);
    return { from: codes.slice(0, 3), to: codes.slice(3, 6) };
  }
  if (cleaned.length === 6) {
    return { from: cleaned.slice(0, 3), to: cleaned.slice(3, 6) };
  }
  return null;
}

async function polygonFetch<T>(path: string, retries = MAX_RETRIES): Promise<T | null> {
  const apiKey = polygonApiKey();
  if (!apiKey) return null;

  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(`${POLYGON_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 429 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
        continue;
      }
      lastErr = new Error(`Polygon HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  console.warn("[Polygon]", path, lastErr instanceof Error ? lastErr.message : lastErr);
  return null;
}

function toYahooQuote(symbol: string, row: PolygonQuote): YahooQuote {
  const price = row.price;
  return {
    symbol: symbol.trim().toUpperCase(),
    price,
    changePct: 0,
    volume: 0,
    avgVolume: 0,
    high52w: price,
    low52w: price,
    bid: price,
    ask: price,
  };
}

async function yahooQuoteFallback(ticker: string): Promise<PolygonQuote | null> {
  try {
    const { fetchYahooQuoteSingle } = await import("@/lib/market-data/yahoo-finance");
    const q = await fetchYahooQuoteSingle(ticker);
    if (!q) return null;
    return {
      symbol: q.symbol,
      price: q.price,
      source: "yahoo",
    };
  } catch {
    return null;
  }
}

async function yahooHistoryFallback(
  ticker: string,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  try {
    const { fetchYahooChartBarsRaw } = await import("@/lib/market-data/yahoo-finance");
    const bars = await fetchYahooChartBarsRaw(ticker, "1d", inferYahooRange(from, to));
    return bars.map((b) => ({
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      date: b.date,
    }));
  } catch {
    return [];
  }
}

async function yahooForexFallback(pair: string): Promise<PolygonForexQuote | null> {
  const codes = parseForexPair(pair);
  if (!codes) return null;
  try {
    const { fetchYahooQuoteSingle } = await import("@/lib/market-data/yahoo-finance");
    const yahooSymbol = `${codes.from}${codes.to}=X`;
    const q = await fetchYahooQuoteSingle(yahooSymbol);
    if (!q || !Number.isFinite(q.price)) return null;
    const mid = q.price;
    const jpyQuoted = codes.to === "JPY";
    const half = jpyQuoted ? 0.005 : 0.00005;
    return {
      from: codes.from,
      to: codes.to,
      bid: mid - half,
      ask: mid + half,
      mid,
      source: "yahoo",
    };
  } catch {
    return null;
  }
}

function inferYahooRange(from: string, to: string): string {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return "3mo";
  const days = Math.max(1, Math.round((toMs - fromMs) / 86_400_000));
  if (days <= 7) return "5d";
  if (days <= 35) return "1mo";
  if (days <= 95) return "3mo";
  if (days <= 190) return "6mo";
  if (days <= 380) return "1y";
  if (days <= 760) return "2y";
  return "5y";
}

/** Last trade price via /v2/last/trade/{ticker}. Falls back to Yahoo on failure. */
export async function getQuote(ticker: string): Promise<PolygonQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;

  const ttl = getDataRefreshPolicy().priceTtlMs || PRICE_CACHE_TTL_MS;
  const cached = getCached<PolygonQuote>(cacheKey("polygon-quote", symbol));
  if (cached) return cached;

  let result: PolygonQuote | null = null;

  if (isPolygonEnabled()) {
    const polySymbol = normalizePolygonTicker(symbol);
    const data = await polygonFetch<{
      status?: string;
      results?: { p?: number; t?: number };
    }>(`/v2/last/trade/${encodeURIComponent(polySymbol)}`);
    const price = Number(data?.results?.p);
    if (Number.isFinite(price) && price > 0) {
      result = {
        symbol,
        price,
        timestamp:
          typeof data?.results?.t === "number"
            ? new Date(data.results.t).toISOString()
            : undefined,
        source: "polygon",
      };
    }
  }

  if (!result) {
    result = await yahooQuoteFallback(symbol);
  }

  if (result) setCached(cacheKey("polygon-quote", symbol), result, ttl);
  return result;
}

/** Daily OHLCV via /v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}. Falls back to Yahoo. */
export async function getHistory(
  ticker: string,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || !from || !to) return [];

  const cacheId = cacheKey("polygon-history", symbol, from, to);
  const cached = getCached<PolygonHistoryBar[]>(cacheId);
  if (cached) return cached;

  let bars: PolygonHistoryBar[] = [];

  if (isPolygonEnabled()) {
    const polySymbol = normalizePolygonTicker(symbol);
    const data = await polygonFetch<{
      results?: Array<{ t?: number; o?: number; h?: number; l?: number; c?: number; v?: number }>;
    }>(
      `/v2/aggs/ticker/${encodeURIComponent(polySymbol)}/range/1/day/${encodeURIComponent(from)}/${encodeURIComponent(to)}?adjusted=true&sort=asc&limit=50000`,
    );
    bars = (data?.results ?? [])
      .map((row): PolygonHistoryBar | null => {
        const close = Number(row.c);
        if (!Number.isFinite(close) || close <= 0) return null;
        return {
          open: Number(row.o ?? close),
          high: Number(row.h ?? close),
          low: Number(row.l ?? close),
          close,
          volume: Number(row.v ?? 0),
          date: typeof row.t === "number" ? new Date(row.t).toISOString() : undefined,
        };
      })
      .filter((b): b is PolygonHistoryBar => b != null);
  }

  if (bars.length === 0) {
    bars = await yahooHistoryFallback(symbol, from, to);
  }

  if (bars.length > 0) setCached(cacheId, bars, BARS_CACHE_TTL_MS);
  return bars;
}

/** Real-time FX via /v1/conversion/{from}/{to}. Falls back to Yahoo FX mid. */
export async function getForexQuote(pair: string): Promise<PolygonForexQuote | null> {
  const codes = parseForexPair(pair);
  if (!codes) return null;

  const pairKey = `${codes.from}${codes.to}`;
  const ttl = 900;
  const cached = getCached<PolygonForexQuote>(cacheKey("polygon-fx", pairKey));
  if (cached) return cached;

  let result: PolygonForexQuote | null = null;

  if (isPolygonEnabled()) {
    const data = await polygonFetch<{
      status?: string;
      last?: { bid?: number; ask?: number; timestamp?: number };
      converted?: number;
    }>(
      `/v1/conversion/${encodeURIComponent(codes.from)}/${encodeURIComponent(codes.to)}?amount=1&precision=5`,
    );
    const bid = Number(data?.last?.bid);
    const ask = Number(data?.last?.ask);
    if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
      result = {
        from: codes.from,
        to: codes.to,
        bid,
        ask,
        mid: (bid + ask) / 2,
        timestamp:
          typeof data?.last?.timestamp === "number"
            ? new Date(data.last.timestamp).toISOString()
            : undefined,
        source: "polygon",
      };
    } else {
      const converted = Number(data?.converted);
      if (Number.isFinite(converted) && converted > 0) {
        result = {
          from: codes.from,
          to: codes.to,
          bid: converted,
          ask: converted,
          mid: converted,
          source: "polygon",
        };
      }
    }
  }

  if (!result) {
    result = await yahooForexFallback(pairKey);
  }

  if (result) setCached(cacheKey("polygon-fx", pairKey), result, ttl);
  return result;
}

/** Batch quotes mapped to YahooQuote shape for existing callers. */
export async function getPolygonBatchQuotes(
  tickers: readonly string[],
): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  await Promise.all(
    unique.map(async (symbol) => {
      const q = await getQuote(symbol);
      if (q) out.set(symbol, toYahooQuote(symbol, q));
    }),
  );
  return out;
}

/** Map Polygon history bars to YahooOhlcvBar for chart consumers. */
export function polygonBarsToYahoo(bars: readonly PolygonHistoryBar[]): YahooOhlcvBar[] {
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}
