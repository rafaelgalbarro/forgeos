/**
 * Financial Modeling Prep — sole quotes + EOD history source (stable API, Starter plan).
 * Quotes: GET /stable/profile?symbol=  → [{ symbol, price, ... }]
 * History: GET /stable/historical-price-eod/full?symbol=  → [{ date, open, high, low, close, volume }]
 * Batch quotes: individual profile calls (profile batch unsupported on Starter).
 * Never invents prices. Never logs the API key.
 */

import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const PROFILE_ENDPOINT = "/profile";
const HISTORY_ENDPOINT = "/historical-price-eod/full";
const QUOTE_TTL_MS = 60_000;
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
/** Starter plan: 300 calls/min — cap parallel profile fetches. */
const BATCH_CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 20_000;

export type FmpQuote = {
  symbol: string;
  price: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  volume: number;
  changePercentage: number;
  yearHigh?: number;
  yearLow?: number;
  avgVolume?: number;
  marketCap?: number;
  exchange?: string;
};

export type FmpBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Read at call time — bracket access avoids Next.js build-time env inlining. */
function readFmpApiKey(): string | null {
  const raw = process.env["FMP_API_KEY"];
  if (typeof raw !== "string") return null;
  const key = raw.trim().replace(/^['"]|['"]$/g, "");
  return key || null;
}

export function isFmpEnabled(): boolean {
  return Boolean(readFmpApiKey());
}

export function getFmpRuntimeStatus(): { configured: boolean; keyLength: number } {
  const key = readFmpApiKey();
  return { configured: Boolean(key), keyLength: key?.length ?? 0 };
}

/** EURUSD style: strip =X, slashes, OANDA:, underscores. */
export function normalizeFmpForexSymbol(pair: string): string {
  return pair
    .trim()
    .toUpperCase()
    .replace(/^OANDA:/, "")
    .replace(/=X$/i, "")
    .replace(/\//g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, "");
}

function asFinite(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pathForLog(endpoint: string): string {
  return endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
}

/**
 * Build stable FMP URL with apikey as query param (never Authorization header).
 */
function buildFmpUrl(
  endpoint: string,
  query: Readonly<Record<string, string>>,
): string | null {
  const key = readFmpApiKey();
  if (!key) return null;

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${FMP_BASE}${path}`);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("apikey", key);
  return url.toString();
}

async function fmpFetchJson(endpoint: string, query: Record<string, string>): Promise<unknown | null> {
  const key = readFmpApiKey();
  if (!key) {
    console.warn("[FMP] FMP_API_KEY missing at runtime — set in .env.local and restart Next.js");
    return null;
  }
  const url = buildFmpUrl(endpoint, query);
  if (!url) return null;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const hint =
        res.status === 402
          ? ` (payment required — key configured=${Boolean(key)}, len=${key.length}; verify FMP_API_KEY in .env.local)`
          : "";
      console.warn(`[FMP] HTTP ${res.status} ${pathForLog(endpoint)}${hint}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("[FMP]", pathForLog(endpoint), err instanceof Error ? err.message : err);
    return null;
  }
}

function parseRangeYearBounds(range: unknown): { yearHigh?: number; yearLow?: number } {
  if (typeof range !== "string") return {};
  const parts = range.split("-").map((part) => asFinite(part.trim()));
  if (parts.length !== 2 || parts[0] == null || parts[1] == null) return {};
  return { yearLow: parts[0], yearHigh: parts[1] };
}

function parseQuote(row: Record<string, unknown>): FmpQuote | null {
  const symbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "";
  const price = asFinite(row.price);
  if (!symbol || price == null || price <= 0) return null;
  const open = asFinite(row.open) ?? price;
  const dayHigh = asFinite(row.dayHigh) ?? asFinite(row.high) ?? price;
  const dayLow = asFinite(row.dayLow) ?? asFinite(row.low) ?? price;
  const previousClose = asFinite(row.previousClose) ?? price;
  const volume = asFinite(row.volume) ?? asFinite(row.volAvg) ?? 0;
  const changePercentage =
    asFinite(row.changePercentage) ??
    asFinite(row.changesPercentage) ??
    asFinite(row.changes) ??
    0;
  const rangeBounds = parseRangeYearBounds(row.range);
  const yearHigh = asFinite(row.yearHigh) ?? rangeBounds.yearHigh;
  const yearLow = asFinite(row.yearLow) ?? rangeBounds.yearLow;
  const avgVolume = asFinite(row.avgVolume) ?? asFinite(row.volAvg) ?? undefined;
  const marketCap = asFinite(row.marketCap) ?? asFinite(row.mktCap) ?? undefined;
  const exchange =
    typeof row.exchange === "string"
      ? row.exchange
      : typeof row.exchangeShortName === "string"
        ? row.exchangeShortName
        : undefined;
  return {
    symbol,
    price,
    open,
    dayHigh,
    dayLow,
    previousClose,
    volume,
    changePercentage,
    yearHigh,
    yearLow,
    avgVolume,
    marketCap,
    exchange,
  };
}

function quoteRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  if (body && typeof body === "object") return [body as Record<string, unknown>];
  return [];
}

function parseBar(row: Record<string, unknown>): FmpBar | null {
  const dateRaw = typeof row.date === "string" ? row.date : null;
  const open = asFinite(row.open);
  const high = asFinite(row.high);
  const low = asFinite(row.low);
  const close = asFinite(row.close);
  const volume = asFinite(row.volume) ?? 0;
  if (!dateRaw || open == null || high == null || low == null || close == null) return null;
  const date = dateRaw.includes("T") ? dateRaw.slice(0, 10) : dateRaw;
  return { date, open, high, low, close, volume };
}

function extractHistoricalRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  if (body && typeof body === "object") {
    const historical = (body as { historical?: unknown }).historical;
    if (Array.isArray(historical)) {
      return historical.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object",
      );
    }
  }
  return [];
}

export async function getQuote(ticker: string): Promise<FmpQuote | null> {
  if (!isFmpEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const key = cacheKey("fmp-quote", symbol);
  const hit = getCached<FmpQuote>(key);
  if (hit) return hit;

  const body = await fmpFetchJson(PROFILE_ENDPOINT, { symbol });
  const row = quoteRows(body)[0];
  if (!row) return null;
  const quote = parseQuote(row);
  if (!quote) return null;
  setCached(key, quote, QUOTE_TTL_MS);
  setCached(cacheKey("fmp-quote", quote.symbol), quote, QUOTE_TTL_MS);
  return quote;
}

export async function getBatchQuotes(tickers: readonly string[]): Promise<Map<string, FmpQuote>> {
  const out = new Map<string, FmpQuote>();
  if (!isFmpEnabled() || tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const missing: string[] = [];
  for (const symbol of unique) {
    const hit = getCached<FmpQuote>(cacheKey("fmp-quote", symbol));
    if (hit) out.set(symbol, hit);
    else missing.push(symbol);
  }
  if (missing.length === 0) return out;

  for (let i = 0; i < missing.length; i += BATCH_CONCURRENCY) {
    const chunk = missing.slice(i, i + BATCH_CONCURRENCY);
    const quotes = await Promise.all(chunk.map((symbol) => getQuote(symbol)));
    for (const quote of quotes) {
      if (!quote) continue;
      out.set(quote.symbol, quote);
    }
  }

  return out;
}

export async function getHistory(ticker: string, days: number): Promise<FmpBar[]> {
  if (!isFmpEnabled()) return [];
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  const safeDays = Math.max(1, Math.floor(Number(days)) || 90);
  const key = cacheKey("fmp-hist", symbol);
  const hit = getCached<FmpBar[]>(key);
  if (hit) return hit.slice(-safeDays);

  const body = await fmpFetchJson(HISTORY_ENDPOINT, { symbol });
  if (body == null) return [];
  const bars = extractHistoricalRows(body)
    .map(parseBar)
    .filter((b): b is FmpBar => b != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (bars.length === 0) return [];
  setCached(key, bars, HISTORY_TTL_MS);
  return bars.slice(-safeDays);
}

export async function getForexQuote(pair: string): Promise<FmpQuote | null> {
  const symbol = normalizeFmpForexSymbol(pair);
  if (!symbol) return null;
  return getQuote(symbol);
}

export async function getForexHistory(pair: string, days: number): Promise<FmpBar[]> {
  const symbol = normalizeFmpForexSymbol(pair);
  if (!symbol) return [];
  return getHistory(symbol, days);
}

export function getFmpQuoteTtlMs(): number {
  return QUOTE_TTL_MS;
}
