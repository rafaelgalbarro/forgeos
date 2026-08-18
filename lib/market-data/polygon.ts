/**
 * Polygon.io market data client — UNUSED / SECONDARY.
 * Live quotes and history go IBKR-first (see yahoo-finance.ts). This module is
 * kept for optional callers; it is not the primary market-data path.
 */

import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import {
  BARS_CACHE_TTL_MS,
  PRICE_CACHE_TTL_MS,
  getDataRefreshPolicy,
} from "@/lib/market-data/refresh-policy";
import type { YahooOhlcvBar, YahooQuote, YahooTickerInfo } from "@/lib/market-data/yahoo-finance";

const POLYGON_BASE = "https://api.polygon.io";
const MAX_RETRIES = 2;

export type PolygonTimespan = "minute" | "hour" | "day" | "week";

export type PolygonQuote = {
  symbol: string;
  price: number;
  timestamp?: string;
  source: "polygon" | "yahoo";
  changePct?: number;
  volume?: number;
  avgVolume?: number;
  bid?: number;
  ask?: number;
  high52w?: number;
  low52w?: number;
  marketCap?: number;
  exchange?: string;
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

export type PolygonTickerDetails = {
  symbol: string;
  name?: string;
  market?: string;
  primaryExchange?: string;
  type?: string;
  sicDescription?: string;
  marketCap?: number;
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
  if (cleaned.length === 6 && /^[A-Z]{6}$/.test(cleaned)) {
    return { from: cleaned.slice(0, 3), to: cleaned.slice(3, 6) };
  }
  return null;
}

export function chartIntervalToPolygon(
  interval: "1m" | "5m" | "15m" | "60m" | "1h" | "1d" | "1wk",
): { multiplier: number; timespan: PolygonTimespan } {
  switch (interval) {
    case "1m":
      return { multiplier: 1, timespan: "minute" };
    case "5m":
      return { multiplier: 5, timespan: "minute" };
    case "15m":
      return { multiplier: 15, timespan: "minute" };
    case "60m":
    case "1h":
      return { multiplier: 1, timespan: "hour" };
    case "1wk":
      return { multiplier: 1, timespan: "week" };
    default:
      return { multiplier: 1, timespan: "day" };
  }
}

export function chartRangeToDates(range: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  const r = range.trim().toLowerCase();
  if (r.endsWith("d")) from.setDate(from.getDate() - Number.parseInt(r, 10));
  else if (r.endsWith("mo")) from.setMonth(from.getMonth() - Number.parseInt(r, 10));
  else if (r.endsWith("y")) from.setFullYear(from.getFullYear() - Number.parseInt(r, 10));
  else from.setMonth(from.getMonth() - 3);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function polygonFetch<T>(path: string, retries = MAX_RETRIES): Promise<T | null> {
  const apiKey = polygonApiKey();
  if (!apiKey) return null;

  const separator = path.includes("?") ? "&" : "?";
  const url = `${POLYGON_BASE}${path}${separator}apiKey=${encodeURIComponent(apiKey)}`;

  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, {
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
      if (res.status !== 429) break;
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  console.warn("[Polygon]", path, lastErr instanceof Error ? lastErr.message : lastErr);
  return null;
}

function mapAggResults(
  results: Array<{ t?: number; o?: number; h?: number; l?: number; c?: number; v?: number }> | undefined,
): PolygonHistoryBar[] {
  return (results ?? [])
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

function toYahooQuote(symbol: string, row: PolygonQuote): YahooQuote {
  const price = row.price;
  return {
    symbol: symbol.trim().toUpperCase(),
    price,
    changePct: Number(row.changePct ?? 0),
    volume: Number(row.volume ?? 0),
    avgVolume: Number(row.avgVolume ?? row.volume ?? 0),
    high52w: Number(row.high52w ?? price),
    low52w: Number(row.low52w ?? price),
    bid: Number(row.bid ?? price),
    ask: Number(row.ask ?? price),
    marketCap: row.marketCap,
    exchange: row.exchange,
  };
}

export async function fetchPolygonForexOnly(pair: string): Promise<PolygonForexQuote | null> {
  if (!isPolygonEnabled()) return null;
  const codes = parseForexPair(pair);
  if (!codes) return null;

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
    return {
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
  }
  const converted = Number(data?.converted);
  if (Number.isFinite(converted) && converted > 0) {
    return {
      from: codes.from,
      to: codes.to,
      bid: converted,
      ask: converted,
      mid: converted,
      source: "polygon",
    };
  }
  return null;
}

/**
 * Polygon-only last price (no Yahoo). Tries last/trade, snapshot, previous close,
 * and FX conversion. Used as PRIMARY by yahoo-finance wrappers.
 */
export async function getLastValue(ticker: string): Promise<PolygonQuote | null> {
  if (!isPolygonEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;

  const fx = parseForexPair(symbol);
  if (fx) {
    const fxQuote = await fetchPolygonForexOnly(symbol);
    if (fxQuote && Number.isFinite(fxQuote.mid) && fxQuote.mid > 0) {
      return {
        symbol,
        price: fxQuote.mid,
        timestamp: fxQuote.timestamp,
        source: "polygon",
        bid: fxQuote.bid,
        ask: fxQuote.ask,
      };
    }
  }

  const polySymbol = normalizePolygonTicker(symbol);

  const lastTrade = await polygonFetch<{
    status?: string;
    results?: { p?: number; t?: number; s?: number };
  }>(`/v2/last/trade/${encodeURIComponent(polySymbol)}`);
  const lastPrice = Number(lastTrade?.results?.p);
  if (Number.isFinite(lastPrice) && lastPrice > 0) {
    return {
      symbol,
      price: lastPrice,
      timestamp:
        typeof lastTrade?.results?.t === "number"
          ? new Date(lastTrade.results.t).toISOString()
          : undefined,
      source: "polygon",
      volume: Number(lastTrade?.results?.s ?? 0) || undefined,
    };
  }

  const snap = await polygonFetch<{
    ticker?: {
      todaysChangePerc?: number;
      updated?: number;
      lastTrade?: { p?: number; t?: number };
      lastQuote?: { p?: number; P?: number; t?: number };
      min?: { c?: number; v?: number };
      day?: { c?: number; v?: number; h?: number; l?: number };
      prevDay?: { c?: number; v?: number; h?: number; l?: number };
    };
  }>(`/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(polySymbol)}`);
  const t = snap?.ticker;
  const snapPrice = Number(
    t?.lastTrade?.p ?? t?.min?.c ?? t?.day?.c ?? t?.prevDay?.c ?? 0,
  );
  if (Number.isFinite(snapPrice) && snapPrice > 0) {
    const bid = Number(t?.lastQuote?.p ?? snapPrice);
    const ask = Number(t?.lastQuote?.P ?? snapPrice);
    return {
      symbol,
      price: snapPrice,
      timestamp:
        typeof t?.updated === "number"
          ? new Date(t.updated).toISOString()
          : undefined,
      source: "polygon",
      changePct: Number(t?.todaysChangePerc ?? 0),
      volume: Number(t?.day?.v ?? t?.min?.v ?? 0),
      avgVolume: Number(t?.prevDay?.v ?? t?.day?.v ?? 0),
      bid: Number.isFinite(bid) && bid > 0 ? bid : snapPrice,
      ask: Number.isFinite(ask) && ask > 0 ? ask : snapPrice,
      high52w: Number(t?.day?.h ?? snapPrice),
      low52w: Number(t?.day?.l ?? snapPrice),
    };
  }

  const prev = await polygonFetch<{
    results?: Array<{ c?: number; v?: number; h?: number; l?: number; t?: number }>;
  }>(`/v2/aggs/ticker/${encodeURIComponent(polySymbol)}/prev?adjusted=true`);
  const prevBar = prev?.results?.[0];
  const prevClose = Number(prevBar?.c);
  if (Number.isFinite(prevClose) && prevClose > 0) {
    return {
      symbol,
      price: prevClose,
      timestamp: typeof prevBar?.t === "number" ? new Date(prevBar.t).toISOString() : undefined,
      source: "polygon",
      volume: Number(prevBar?.v ?? 0),
      high52w: Number(prevBar?.h ?? prevClose),
      low52w: Number(prevBar?.l ?? prevClose),
    };
  }

  return null;
}

/** Alias used by some callers for last trade / last value. */
export const lV = getLastValue;

/** Polygon-only daily (or custom) aggregates — no Yahoo. */
export async function fetchPolygonAggregates(
  ticker: string,
  multiplier: number,
  timespan: PolygonTimespan,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  if (!isPolygonEnabled() || !ticker || !from || !to) return [];
  const polySymbol = normalizePolygonTicker(ticker);
  const data = await polygonFetch<{
    results?: Array<{ t?: number; o?: number; h?: number; l?: number; c?: number; v?: number }>;
  }>(
    `/v2/aggs/ticker/${encodeURIComponent(polySymbol)}/range/${encodeURIComponent(String(multiplier))}/${encodeURIComponent(timespan)}/${encodeURIComponent(from)}/${encodeURIComponent(to)}?adjusted=true&sort=asc&limit=50000`,
  );
  return mapAggResults(data?.results);
}

/** Polygon-only daily history — no Yahoo. */
export async function fetchPolygonHistoryOnly(
  ticker: string,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  return fetchPolygonAggregates(ticker, 1, "day", from, to);
}

export async function fetchPolygonTickerDetails(
  ticker: string,
): Promise<PolygonTickerDetails | null> {
  if (!isPolygonEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const polySymbol = normalizePolygonTicker(symbol);
  const data = await polygonFetch<{
    results?: {
      ticker?: string;
      name?: string;
      market?: string;
      primary_exchange?: string;
      type?: string;
      sic_description?: string;
      market_cap?: number;
    };
  }>(`/v3/reference/tickers/${encodeURIComponent(polySymbol)}`);
  const row = data?.results;
  if (!row) return null;
  return {
    symbol,
    name: row.name,
    market: row.market,
    primaryExchange: row.primary_exchange,
    type: row.type,
    sicDescription: row.sic_description,
    marketCap: Number(row.market_cap ?? 0) || undefined,
  };
}

export function polygonDetailsToYahooInfo(details: PolygonTickerDetails): YahooTickerInfo {
  return {
    symbol: details.symbol,
    shortName: details.name,
    industry: details.sicDescription,
    marketCap: details.marketCap,
    exchange: details.primaryExchange ?? details.market,
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
      changePct: q.changePct,
      volume: q.volume,
      avgVolume: q.avgVolume,
      bid: q.bid,
      ask: q.ask,
      high52w: q.high52w,
      low52w: q.low52w,
      marketCap: q.marketCap,
      exchange: q.exchange,
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

/** Last trade / snapshot / prev close. Polygon PRIMARY; Yahoo only if Polygon misses. */
export async function getQuote(ticker: string): Promise<PolygonQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;

  const ttl = getDataRefreshPolicy().priceTtlMs || PRICE_CACHE_TTL_MS;
  const cached = getCached<PolygonQuote>(cacheKey("polygon-quote", symbol));
  if (cached) return cached;

  let result: PolygonQuote | null = await getLastValue(symbol);

  if (!result) {
    result = await yahooQuoteFallback(symbol);
  }

  if (result) setCached(cacheKey("polygon-quote", symbol), result, ttl);
  return result;
}

/** Daily OHLCV. Polygon PRIMARY; Yahoo only if Polygon returns no bars. */
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

  let bars = await fetchPolygonHistoryOnly(symbol, from, to);

  if (bars.length === 0) {
    bars = await yahooHistoryFallback(symbol, from, to);
  }

  if (bars.length > 0) setCached(cacheId, bars, BARS_CACHE_TTL_MS);
  return bars;
}

/** Real-time FX. Polygon conversion PRIMARY; Yahoo FX mid only if Polygon misses. */
export async function getForexQuote(pair: string): Promise<PolygonForexQuote | null> {
  const codes = parseForexPair(pair);
  if (!codes) return null;

  const pairKey = `${codes.from}${codes.to}`;
  const ttl = 900;
  const cached = getCached<PolygonForexQuote>(cacheKey("polygon-fx", pairKey));
  if (cached) return cached;

  let result: PolygonForexQuote | null = await fetchPolygonForexOnly(pairKey);

  if (!result) {
    result = await yahooForexFallback(pairKey);
  }

  if (result) setCached(cacheKey("polygon-fx", pairKey), result, ttl);
  return result;
}

/**
 * Batch quotes from Polygon ONLY (no Yahoo). yahoo-finance.ts falls back to Yahoo
 * for symbols still missing — avoids Yahoo being invoked "inside" the primary path.
 */
export async function getPolygonBatchQuotes(
  tickers: readonly string[],
): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (tickers.length === 0 || !isPolygonEnabled()) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  await Promise.all(
    unique.map(async (symbol) => {
      const q = await getLastValue(symbol);
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
