/**
 * EODHD market data — primary fallback when IBKR times out.
 * Quotes TTL 3 min · History TTL 12 h · skip tickers after 3 consecutive failures.
 */

import "server-only";

import { cacheKey, getCached, getOrSetCached, setCached } from "@/lib/market-data/cache";
import { getEuropeanEurEquity } from "@/lib/trading/europe-equities";

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
/** Daily EOD history cache — 12 h so cycles every 3 min reuse bars. */
const HISTORY_TTL_MS = 12 * 60 * 60 * 1000;
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

/** Map internal ticker → EODHD symbol (AAPL → AAPL.US, EURUSD → EURUSD.FOREX, IBE → IBE.MC). */
export function toEodhdSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase().replace("/", "");
  if (!raw) return raw;
  if (raw.includes(".")) return raw;
  if (FOREX_IDS.has(raw)) return `${raw}.FOREX`;
  const eu = getEuropeanEurEquity(raw);
  if (eu?.eodhd) return eu.eodhd;
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

/** Daily EOD history — cached 12 h (~275 sessions ≈ 1Y trading days). */
export async function getHistory(ticker: string, days = 275): Promise<EodhdBar[]> {
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
  marketCap?: number;
  sector?: string;
  industry?: string;
};

/** US screener — All-in-One fields: adjusted_close, refund_1d_p, avgvol_200d (cached 3 min). */
export async function screenerUsGainers(options?: {
  minVolume?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  sort?: "refund_1d_p-desc" | "refund_1d_p-asc" | "avgvol_200d-desc";
}): Promise<EodhdScreenerRow[]> {
  const minVolume = options?.minVolume ?? 500_000;
  const minPrice = options?.minPrice ?? 5;
  const maxPrice = options?.maxPrice ?? 50_000;
  const limit = options?.limit ?? 100;
  const sort = options?.sort ?? "refund_1d_p-desc";
  if (!isEodhdConfigured()) return [];

  const cacheId = cacheKey("eodhd-screener-us-v2", String(minVolume), String(limit), sort);
  const hit = getCached<EodhdScreenerRow[]>(cacheId);
  if (hit) return hit;

  const filters = JSON.stringify([
    ["exchange", "=", "US"],
    ["adjusted_close", ">", minPrice],
    ["adjusted_close", "<", maxPrice],
    ["avgvol_200d", ">", minVolume],
  ]);
  const fields =
    "code,adjusted_close,refund_1d_p,avgvol_200d,market_capitalization,sector,industry";
  const rows = await eodhdFetch<
    Array<{
      code?: string;
      adjusted_close?: number;
      close?: number;
      refund_1d_p?: number;
      change_p?: number;
      avgvol_200d?: number;
      volume?: number;
      market_capitalization?: number;
      sector?: string;
      industry?: string;
    }>
  >(
    `/screener?filters=${encodeURIComponent(filters)}&sort=${encodeURIComponent(sort)}&limit=${limit}&fields=${encodeURIComponent(fields)}`,
  );

  const out = (rows ?? [])
    .map((r) => {
      const code = String(r.code ?? "").trim().toUpperCase();
      const symbol = code.includes(".") ? code.split(".")[0]! : code;
      const price = Number(r.adjusted_close ?? r.close ?? 0);
      const volume = Number(r.avgvol_200d ?? r.volume ?? 0);
      const changePct = Number(r.refund_1d_p ?? r.change_p ?? 0);
      if (!symbol || !(price > 0)) return null;
      return {
        symbol,
        changePct,
        volume,
        price,
        marketCap: Number(r.market_capitalization ?? 0) || undefined,
        sector: r.sector ? String(r.sector) : undefined,
        industry: r.industry ? String(r.industry) : undefined,
      };
    })
    .filter((r): r is EodhdScreenerRow => r != null);

  if (out.length > 0) setCached(cacheId, out, QUOTES_TTL_MS);
  return out;
}

const ETF_NAME_HINT =
  /\b(ETF|ETN|FUND|TRUST|ISHARES|SPDR|VANGUARD|PROSHARES|DIREXION|INVESCO)\b/i;

export type EodhdOpportunityRow = EodhdScreenerRow & {
  eodhdCode: string;
  exchange: string;
  avgVolume: number;
};

function mapScreenerRows(
  rows: Array<{
    code?: string;
    name?: string;
    type?: string;
    exchange?: string;
    adjusted_close?: number;
    close?: number;
    refund_1d_p?: number;
    change_p?: number;
    avgvol_200d?: number;
    avgvol_50d?: number;
    volume?: number;
    market_capitalization?: number;
    sector?: string;
    industry?: string;
  }> | null,
  exchangeFallback: string,
): EodhdOpportunityRow[] {
  return (rows ?? [])
    .map((r) => {
      const code = String(r.code ?? "").trim().toUpperCase();
      if (!code) return null;
      const type = String(r.type ?? "").toLowerCase();
      const name = String(r.name ?? "");
      if (type.includes("etf") || ETF_NAME_HINT.test(name)) return null;
      const symbol = code.includes(".") ? code.split(".")[0]! : code;
      const price = Number(r.adjusted_close ?? r.close ?? 0);
      const avgVolume = Number(r.avgvol_50d ?? r.avgvol_200d ?? 0);
      const dayVolume = Number(r.volume ?? 0);
      const changePct = Number(r.refund_1d_p ?? r.change_p ?? 0);
      if (!symbol || !(price > 0)) return null;
      return {
        symbol,
        eodhdCode: code.includes(".") ? code : `${code}.${exchangeFallback}`,
        exchange: String(r.exchange ?? exchangeFallback).toUpperCase(),
        changePct,
        volume: dayVolume > 0 ? dayVolume : avgVolume,
        avgVolume: avgVolume > 0 ? avgVolume : dayVolume,
        price,
        marketCap: Number(r.market_capitalization ?? 0) || undefined,
        sector: r.sector ? String(r.sector) : undefined,
        industry: r.industry ? String(r.industry) : undefined,
      };
    })
    .filter((r): r is EodhdOpportunityRow => r != null);
}

/** Generic EODHD All-in-One screener for one exchange. */
export async function screenerExchange(options: {
  exchange: string;
  minPrice?: number;
  maxPrice?: number;
  minAvgVolume?: number;
  minMarketCap?: number;
  limit?: number;
  sort?: string;
}): Promise<EodhdOpportunityRow[]> {
  if (!isEodhdConfigured()) return [];
  const exchange = options.exchange.toUpperCase();
  const minPrice = options.minPrice ?? 0.5;
  const maxPrice = options.maxPrice ?? 10_000;
  const minAvgVolume = options.minAvgVolume ?? 0;
  const minMarketCap = options.minMarketCap ?? 0;
  const limit = options.limit ?? 100;
  const sort = options.sort ?? "avgvol_200d-desc";

  const cacheId = cacheKey(
    "eodhd-screener-ex",
    exchange,
    String(minPrice),
    String(maxPrice),
    String(minAvgVolume),
    String(minMarketCap),
    String(limit),
  );
  const hit = getCached<EodhdOpportunityRow[]>(cacheId);
  if (hit) return hit;

  const filters: unknown[][] = [
    ["exchange", "=", exchange],
    ["adjusted_close", ">", minPrice],
    ["adjusted_close", "<", maxPrice],
  ];
  if (minAvgVolume > 0) filters.push(["avgvol_200d", ">", minAvgVolume]);
  if (minMarketCap > 0) filters.push(["market_capitalization", ">", minMarketCap]);

  const fields =
    "code,name,type,exchange,adjusted_close,refund_1d_p,avgvol_200d,avgvol_50d,volume,market_capitalization,sector,industry";
  const rows = await eodhdFetch<
    Array<{
      code?: string;
      name?: string;
      type?: string;
      exchange?: string;
      adjusted_close?: number;
      close?: number;
      refund_1d_p?: number;
      change_p?: number;
      avgvol_200d?: number;
      avgvol_50d?: number;
      volume?: number;
      market_capitalization?: number;
      sector?: string;
      industry?: string;
    }>
  >(
    `/screener?filters=${encodeURIComponent(JSON.stringify(filters))}&sort=${encodeURIComponent(sort)}&limit=${limit}&fields=${encodeURIComponent(fields)}`,
  );

  const out = mapScreenerRows(rows, exchange);
  if (out.length > 0) setCached(cacheId, out, QUOTES_TTL_MS);
  return out;
}

/** US common stocks: price $2–max, avg vol > 1M, mcap > $300M (ETFs excluded). */
export async function screenerUsOpportunityUniverse(maxPrice: number): Promise<EodhdOpportunityRow[]> {
  return screenerExchange({
    exchange: "US",
    minPrice: 2,
    maxPrice: Math.max(2.5, maxPrice),
    minAvgVolume: 1_000_000,
    minMarketCap: 300_000_000,
    limit: 100,
    sort: "avgvol_200d-desc",
  });
}

const EU_SCREENER_EXCHANGES = ["MC", "XETRA", "AS", "PA", "MI"] as const;

/** BME / Xetra / Euronext / Borsa Italiana — price ≤ max, avg vol > 300k. */
export async function screenerEuOpportunityUniverse(maxPriceEur: number): Promise<EodhdOpportunityRow[]> {
  const maxPrice = Math.max(1, maxPriceEur);
  const batches = await Promise.all(
    EU_SCREENER_EXCHANGES.map((exchange) =>
      screenerExchange({
        exchange,
        minPrice: 0.5,
        maxPrice,
        minAvgVolume: 300_000,
        limit: 40,
        sort: "avgvol_200d-desc",
      }).catch(() => [] as EodhdOpportunityRow[]),
    ),
  );
  const byCode = new Map<string, EodhdOpportunityRow>();
  for (const batch of batches) {
    for (const row of batch) {
      if (!byCode.has(row.eodhdCode)) byCode.set(row.eodhdCode, row);
    }
  }
  return [...byCode.values()];
}

/** Intraday OHLCV from EODHD (1m / 5m / 1h). Cached 3–5 min. */
export async function getIntradayHistory(
  ticker: string,
  interval: "1m" | "5m" | "15m" | "1h" = "1h",
  daysBack = 30,
): Promise<EodhdBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || !isEodhdConfigured()) return [];

  const eodhdSymbol = toEodhdSymbol(symbol);
  const cacheId = cacheKey("eodhd-intra", eodhdSymbol, interval, String(daysBack));
  const ttl = interval === "1h" ? 5 * 60 * 1000 : 3 * 60 * 1000;
  return getOrSetCached(cacheId, ttl, async () => {
    const to = Math.floor(Date.now() / 1000);
    const from = to - daysBack * 24 * 60 * 60;
    // EODHD intervals: 1m, 5m, 1h (15m approximated via 5m resample when needed)
    const apiInterval = interval === "15m" ? "5m" : interval;
    const rows = await eodhdFetch<
      Array<{
        datetime?: string;
        timestamp?: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
      }>
    >(
      `/intraday/${encodeURIComponent(eodhdSymbol)}?interval=${apiInterval}&from=${from}&to=${to}`,
    );

    let bars = (rows ?? [])
      .map((r) => {
        const ts =
          typeof r.timestamp === "number"
            ? new Date(r.timestamp * 1000).toISOString()
            : String(r.datetime ?? "");
        return {
          date: ts,
          open: Number(r.open ?? 0),
          high: Number(r.high ?? 0),
          low: Number(r.low ?? 0),
          close: Number(r.close ?? 0),
          volume: Number(r.volume ?? 0),
        };
      })
      .filter((b) => b.date && b.close > 0);

    if (interval === "15m" && bars.length > 0) {
      bars = aggregateBars(bars, 3);
    }
    return bars;
  });
}

function aggregateBars(bars: EodhdBar[], groupSize: number): EodhdBar[] {
  const out: EodhdBar[] = [];
  for (let i = 0; i < bars.length; i += groupSize) {
    const chunk = bars.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    out.push({
      date: chunk[0]!.date,
      open: chunk[0]!.open,
      high: Math.max(...chunk.map((b) => b.high)),
      low: Math.min(...chunk.map((b) => b.low)),
      close: chunk.at(-1)!.close,
      volume: chunk.reduce((s, b) => s + b.volume, 0),
    });
  }
  return out;
}
