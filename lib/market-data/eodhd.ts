/**
 * EODHD market data — primary fallback when IBKR times out.
 * Quotes TTL 3 min · History TTL 24 h · skip tickers after 3 consecutive failures.
 */

import "server-only";

import { cacheKey, getCached, getOrSetCached, setCached } from "@/lib/market-data/cache";

export type EodhdQuote = {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercentage: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  high52w: number;
  low52w: number;
  source: "EODHD";
  updatedAt: string;
};

export type EodhdBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const QUOTES_TTL_MS = 3 * 60 * 1000;
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_CONSECUTIVE_FAILURES = 3;

const FOREX_IDS = new Set([
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCHF",
  "USDCAD",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
]);

const quoteFailures = new Map<string, number>();
const ignoredTickers = new Set<string>();

function apiKey(): string {
  return process.env.EODHD_API_KEY?.trim() ?? "";
}

export function isEodhdConfigured(): boolean {
  return apiKey().length > 0;
}

export function shouldSkipEodhdQuote(ticker: string): boolean {
  const key = ticker.trim().toUpperCase();
  return ignoredTickers.has(key);
}

function recordQuoteFailure(ticker: string): void {
  const key = ticker.trim().toUpperCase();
  const next = (quoteFailures.get(key) ?? 0) + 1;
  quoteFailures.set(key, next);
  if (next >= MAX_CONSECUTIVE_FAILURES) {
    ignoredTickers.add(key);
    console.warn(`[EODHD] ${key} ignorado tras ${next} fallos consecutivos de precio`);
  }
}

function recordQuoteSuccess(ticker: string): void {
  const key = ticker.trim().toUpperCase();
  quoteFailures.delete(key);
  ignoredTickers.delete(key);
}

/** Map internal ticker → EODHD symbol (AAPL → AAPL.US, EURUSD → EURUSD.FOREX). */
export function toEodhdSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase().replace("/", "");
  if (!raw) return raw;
  if (raw.includes(".")) return raw;
  if (FOREX_IDS.has(raw)) return `${raw}.FOREX`;
  return `${raw}.US`;
}

function baseUrl(): string {
  return (process.env.EODHD_BASE_URL ?? "https://eodhd.com/api").replace(/\/$/, "");
}

async function eodhdFetch<T>(path: string): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${baseUrl()}${path}${sep}api_token=${encodeURIComponent(key)}&fmt=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type EodhdRealtime = {
  code?: string;
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  previousClose?: number;
  change?: number;
  change_p?: number;
};

async function loadYearStats(eodhdSymbol: string): Promise<{ high52w: number; low52w: number }> {
  const cacheId = cacheKey("eodhd-52w", eodhdSymbol);
  const hit = getCached<{ high52w: number; low52w: number }>(cacheId);
  if (hit) return hit;

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await eodhdFetch<
    Array<{ date?: string; high?: number; low?: number; close?: number }>
  >(`/eod/${encodeURIComponent(eodhdSymbol)}?from=${from}&to=${to}&period=d`);

  let high52w = 0;
  let low52w = Number.POSITIVE_INFINITY;
  for (const row of rows ?? []) {
    const h = Number(row.high ?? row.close ?? 0);
    const l = Number(row.low ?? row.close ?? 0);
    if (h > high52w) high52w = h;
    if (l > 0 && l < low52w) low52w = l;
  }
  if (!Number.isFinite(low52w) || low52w === Number.POSITIVE_INFINITY) low52w = 0;
  const stats = { high52w, low52w };
  if (high52w > 0) setCached(cacheId, stats, HISTORY_TTL_MS);
  return stats;
}

function mapRealtime(symbol: string, raw: EodhdRealtime, stats: { high52w: number; low52w: number }): EodhdQuote | null {
  const price = Number(raw.close ?? 0);
  if (!(price > 0)) return null;
  const previousClose = Number(raw.previousClose ?? price);
  const change = Number(raw.change ?? price - previousClose);
  const changePercentage = Number(
    raw.change_p ?? (previousClose > 0 ? (change / previousClose) * 100 : 0),
  );
  const high = Number(raw.high ?? price);
  const low = Number(raw.low ?? price);
  return {
    symbol: symbol.toUpperCase(),
    price,
    previousClose: previousClose > 0 ? previousClose : price,
    change,
    changePercentage,
    open: Number(raw.open ?? price),
    high,
    low,
    volume: Number(raw.volume ?? 0),
    high52w: stats.high52w > 0 ? stats.high52w : high,
    low52w: stats.low52w > 0 ? stats.low52w : low,
    source: "EODHD",
    updatedAt: new Date((raw.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

/** GET /real-time/{SYMBOL} */
export async function getQuote(ticker: string): Promise<EodhdQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || shouldSkipEodhdQuote(symbol)) return null;
  if (!isEodhdConfigured()) return null;

  const cacheId = cacheKey("eodhd-quote", symbol);
  const hit = getCached<EodhdQuote>(cacheId);
  if (hit) return hit;

  const eodhdSymbol = toEodhdSymbol(symbol);
  const raw = await eodhdFetch<EodhdRealtime>(`/real-time/${encodeURIComponent(eodhdSymbol)}`);
  if (!raw) {
    recordQuoteFailure(symbol);
    return null;
  }

  const stats = await loadYearStats(eodhdSymbol);
  const quote = mapRealtime(symbol, raw, stats);
  if (!quote) {
    recordQuoteFailure(symbol);
    return null;
  }

  recordQuoteSuccess(symbol);
  setCached(cacheId, quote, QUOTES_TTL_MS);
  return quote;
}

/** Parallel batch quotes — one HTTP call per symbol via Promise.all. */
export async function getBatchQuotes(tickers: readonly string[]): Promise<Map<string, EodhdQuote>> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const out = new Map<string, EodhdQuote>();
  if (unique.length === 0 || !isEodhdConfigured()) return out;

  const results = await Promise.all(
    unique.map(async (symbol) => {
      const quote = await getQuote(symbol);
      return { symbol, quote };
    }),
  );

  for (const { symbol, quote } of results) {
    if (quote) out.set(symbol, quote);
  }
  return out;
}

/** Daily EOD history — cached 24 h. */
export async function getHistory(ticker: string, days = 180): Promise<EodhdBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || !isEodhdConfigured()) return [];

  const eodhdSymbol = toEodhdSymbol(symbol);
  const cacheId = cacheKey("eodhd-hist", eodhdSymbol, String(days));
  return getOrSetCached(cacheId, HISTORY_TTL_MS, async () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await eodhdFetch<
      Array<{
        date?: string;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
      }>
    >(`/eod/${encodeURIComponent(eodhdSymbol)}?from=${from}&to=${to}&period=d`);

    return (rows ?? [])
      .map((r) => ({
        date: String(r.date ?? ""),
        open: Number(r.open ?? 0),
        high: Number(r.high ?? 0),
        low: Number(r.low ?? 0),
        close: Number(r.close ?? 0),
        volume: Number(r.volume ?? 0),
      }))
      .filter((b) => b.date && b.close > 0);
  });
}

export function getEodhdQuotesTtlMs(): number {
  return QUOTES_TTL_MS;
}

export type EodhdScreenerRow = {
  symbol: string;
  changePct: number;
  volume: number;
  price: number;
};

/** US screener — top gainers with volume/price filters (cached 3 min). */
export async function screenerUsGainers(options?: {
  minVolume?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}): Promise<EodhdScreenerRow[]> {
  const minVolume = options?.minVolume ?? 500_000;
  const minPrice = options?.minPrice ?? 5;
  const maxPrice = options?.maxPrice ?? 500;
  const limit = options?.limit ?? 100;
  if (!isEodhdConfigured()) return [];

  const cacheId = cacheKey("eodhd-screener-us", String(minVolume), String(limit));
  const hit = getCached<EodhdScreenerRow[]>(cacheId);
  if (hit) return hit;

  const filters = JSON.stringify([
    ["exchange", "=", "US"],
    ["volume", ">", minVolume],
    ["adjusted_close", ">", minPrice],
    ["adjusted_close", "<", maxPrice],
  ]);
  const rows = await eodhdFetch<
    Array<{
      code?: string;
      close?: number;
      adjusted_close?: number;
      change_p?: number;
      volume?: number;
    }>
  >(
    `/screener?filters=${encodeURIComponent(filters)}&sort=change_p.desc&limit=${limit}`,
  );

  const out = (rows ?? [])
    .map((r) => {
      const code = String(r.code ?? "").trim().toUpperCase();
      const symbol = code.includes(".") ? code.split(".")[0]! : code;
      const price = Number(r.adjusted_close ?? r.close ?? 0);
      const volume = Number(r.volume ?? 0);
      const changePct = Number(r.change_p ?? 0);
      if (!symbol || !(price > 0)) return null;
      return { symbol, changePct, volume, price };
    })
    .filter((r): r is EodhdScreenerRow => r != null);

  if (out.length > 0) setCached(cacheId, out, QUOTES_TTL_MS);
  return out;
}
