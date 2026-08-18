/**
 * Finnhub market data — sole price/history source when FINNHUB_API_KEY is set.
 * Rate limit: 30 calls/min, 1s between calls, batch pauses. Cache: 2 min quotes (open market).
 */

import "server-only";

import { cacheKey, getCached, getOrSetCached, setCached } from "@/lib/market-data/cache";
import { getUsMarketSession } from "@/src/core/trading/market-session";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const QUOTE_TTL_OPEN_MS = 2 * 60_000;
const QUOTE_TTL_CLOSED_MS = 60_000;
const CANDLES_TTL_MS = 5 * 60_000;
const MAX_CALLS_PER_MINUTE = 30;
const INTER_CALL_DELAY_MS = 1_000;
const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 3_000;
const RETRY_429_MS = 5_000;
const MAX_429_RETRIES = 2;
const FETCH_TIMEOUT_MS = 20_000;

export type FinnhubQuote = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t?: number;
};

export type FinnhubCandleSet = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  t: number[];
  s: "ok" | "no_data";
};

export type FinnhubOhlcvBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
};

const callTimestamps: number[] = [];
let fetchChain: Promise<unknown> = Promise.resolve();
let lastFetchFinishedAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 2 min quotes when US market open; 1 min otherwise. */
export function getFinnhubQuoteTtlMs(): number {
  const session = getUsMarketSession();
  const isMarketOpen = session.isTradeable && session.phase === "REGULAR";
  return isMarketOpen ? QUOTE_TTL_OPEN_MS : QUOTE_TTL_CLOSED_MS;
}

export function isFinnhubEnabled(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY?.trim());
}

function finnhubApiKey(): string | null {
  const key = process.env.FINNHUB_API_KEY?.trim();
  return key || null;
}

async function acquireRateLimit(): Promise<void> {
  const now = Date.now();
  while (callTimestamps.length > 0 && callTimestamps[0]! < now - 60_000) {
    callTimestamps.shift();
  }
  if (callTimestamps.length >= MAX_CALLS_PER_MINUTE) {
    const wait = callTimestamps[0]! + 60_000 - now + 50;
    await sleep(Math.max(0, wait));
    return acquireRateLimit();
  }
  callTimestamps.push(Date.now());
}

async function waitInterCallDelay(): Promise<void> {
  const elapsed = Date.now() - lastFetchFinishedAt;
  if (elapsed < INTER_CALL_DELAY_MS) {
    await sleep(INTER_CALL_DELAY_MS - elapsed);
  }
}

/** Serialize all Finnhub HTTP so concurrent callers cannot burst past limits. */
async function runSerialized<T>(work: () => Promise<T>): Promise<T> {
  const task = fetchChain.then(async () => work());
  fetchChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

type FinnhubFetchResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "rate_limited" }
  | { kind: "error" };

async function finnhubFetchOnce<T>(path: string, apiKey: string): Promise<FinnhubFetchResult<T>> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${FINNHUB_BASE}${path}${separator}token=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (res.status === 429) return { kind: "rate_limited" };
  if (!res.ok) {
    console.warn(`[Finnhub] HTTP ${res.status} ${path}`);
    return { kind: "error" };
  }
  return { kind: "ok", data: (await res.json()) as T };
}

async function finnhubFetch<T>(path: string): Promise<T | null> {
  const apiKey = finnhubApiKey();
  if (!apiKey) return null;

  return runSerialized(async () => {
    for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt += 1) {
      await acquireRateLimit();
      await waitInterCallDelay();

      try {
        const result = await finnhubFetchOnce<T>(path, apiKey);
        lastFetchFinishedAt = Date.now();

        if (result.kind === "ok") return result.data;
        if (result.kind === "rate_limited" && attempt < MAX_429_RETRIES) {
          console.warn(`[Finnhub] 429 on ${path} — retry in ${RETRY_429_MS}ms`);
          await sleep(RETRY_429_MS);
          continue;
        }
        if (result.kind === "rate_limited") {
          console.warn(`[Finnhub] rate limited after retries: ${path}`);
        }
        return null;
      } catch (err) {
        lastFetchFinishedAt = Date.now();
        console.warn("[Finnhub]", path, err instanceof Error ? err.message : err);
        return null;
      }
    }
    return null;
  });
}

/** Normalize ticker to Finnhub stock symbol (strip suffixes). */
export function toFinnhubStockSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (!raw) return raw;
  if (raw.endsWith("=X")) return raw.slice(0, -2);
  if (raw.includes("/")) return raw.replace("/", "");
  if (raw.startsWith("^")) return raw;
  const dot = raw.indexOf(".");
  return dot > 0 ? raw.slice(0, dot) : raw;
}

/** Map pair id (EURUSD) or Yahoo symbol to OANDA:EUR_USD. */
export function toFinnhubForexSymbol(pairOrTicker: string): string {
  const raw = pairOrTicker.trim().toUpperCase().replace("=X", "").replace("/", "");
  if (raw.startsWith("OANDA:")) return raw;
  if (raw.length === 6 && /^[A-Z]{6}$/.test(raw)) {
    return `OANDA:${raw.slice(0, 3)}_${raw.slice(3)}`;
  }
  return raw;
}

function isForexTicker(ticker: string): boolean {
  const raw = ticker.trim().toUpperCase();
  if (raw.endsWith("=X")) return true;
  if (raw.startsWith("OANDA:")) return true;
  const stripped = raw.replace("=X", "").replace("/", "");
  return stripped.length === 6 && /^[A-Z]{6}$/.test(stripped);
}

function mapCandles(data: FinnhubCandleSet | null): FinnhubOhlcvBar[] {
  if (!data || data.s !== "ok" || !Array.isArray(data.c)) return [];
  const bars: FinnhubOhlcvBar[] = [];
  for (let i = 0; i < data.c.length; i += 1) {
    const close = Number(data.c[i]);
    if (!Number.isFinite(close) || close <= 0) continue;
    const ts = data.t[i];
    bars.push({
      open: Number(data.o[i] ?? close),
      high: Number(data.h[i] ?? close),
      low: Number(data.l[i] ?? close),
      close,
      volume: Number(data.v[i] ?? 0),
      date: typeof ts === "number" ? new Date(ts * 1000).toISOString() : undefined,
    });
  }
  return bars;
}

/** Current price from /quote (stocks) or /quote with OANDA symbol (forex). */
export async function getQuote(ticker: string): Promise<FinnhubQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || !isFinnhubEnabled()) return null;

  const cacheId = cacheKey(
    "finnhub-quote",
    isForexTicker(symbol) ? toFinnhubForexSymbol(symbol) : toFinnhubStockSymbol(symbol),
  );
  const ttl = getFinnhubQuoteTtlMs();
  return getOrSetCached(cacheId, ttl, async () => {
    const finnhubSymbol = isForexTicker(symbol)
      ? toFinnhubForexSymbol(symbol)
      : toFinnhubStockSymbol(symbol);
    const data = await finnhubFetch<FinnhubQuote>(
      `/quote?symbol=${encodeURIComponent(finnhubSymbol)}`,
    );
    const price = Number(data?.c);
    if (!data || !Number.isFinite(price) || price <= 0) return null;
    return {
      c: price,
      h: Number(data.h ?? price),
      l: Number(data.l ?? price),
      o: Number(data.o ?? price),
      pc: Number(data.pc ?? price),
      t: data.t,
    };
  });
}

/** Last N daily candles from /stock/candle (30-day window). */
export async function getCandles(ticker: string, _days: number): Promise<FinnhubOhlcvBar[]> {
  const symbol = toFinnhubStockSymbol(ticker);
  if (!symbol || !isFinnhubEnabled()) return [];

  const cacheId = cacheKey("finnhub-candles", symbol, "30", "D");
  return getOrSetCached(cacheId, CANDLES_TTL_MS, async () => {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 30 * 24 * 3600;
    const data = await finnhubFetch<FinnhubCandleSet>(
      `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}`,
    );
    return mapCandles(data);
  });
}

/** FOREX daily candles from /forex/candle (OANDA:EUR_USD). */
export async function getForexCandles(pair: string, days: number): Promise<FinnhubOhlcvBar[]> {
  const symbol = toFinnhubForexSymbol(pair);
  if (!symbol || !isFinnhubEnabled()) return [];

  const safeDays = Math.max(1, Math.min(Math.floor(days), 365 * 5));
  const cacheId = cacheKey("finnhub-fx-candles", symbol, String(safeDays), "D");
  return getOrSetCached(cacheId, CANDLES_TTL_MS, async () => {
    const to = Math.floor(Date.now() / 1000);
    const from = to - safeDays * 86_400;
    const data = await finnhubFetch<FinnhubCandleSet>(
      `/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}`,
    );
    return mapCandles(data);
  });
}

export type FinnhubForexQuote = {
  pairId: string;
  bid: number;
  ask: number;
  mid: number;
  updatedAt: string;
};

/** Live FOREX mid/bid/ask from /quote on OANDA symbol. */
export async function getForexQuote(pairId: string): Promise<FinnhubForexQuote | null> {
  const symbol = toFinnhubForexSymbol(pairId);
  const pairKey = pairId.replace("=X", "").replace("/", "").toUpperCase();
  if (!symbol || !isFinnhubEnabled()) return null;

  const ttl = getFinnhubQuoteTtlMs();
  const cacheId = cacheKey("finnhub-fx-quote", symbol);
  const hit = getCached<FinnhubForexQuote>(cacheId);
  if (hit) return hit;

  const data = await getQuote(symbol);
  if (!data || !Number.isFinite(data.c) || data.c <= 0) return null;

  const mid = data.c;
  const jpyQuoted = pairKey.endsWith("JPY");
  const half = jpyQuoted ? 0.005 : 0.00005;
  const result: FinnhubForexQuote = {
    pairId: pairKey.length === 6 ? pairKey : pairId,
    bid: mid - half,
    ask: mid + half,
    mid,
    updatedAt: new Date().toISOString(),
  };
  setCached(cacheId, result, ttl);
  return result;
}

export type FinnhubChartInterval = "1" | "5" | "15" | "60" | "D" | "W";

/** OHLCV with arbitrary Finnhub resolution (stocks or forex). */
export async function getCandlesWithResolution(
  ticker: string,
  resolution: FinnhubChartInterval,
  fromUnix: number,
  toUnix: number,
  forex = false,
): Promise<FinnhubOhlcvBar[]> {
  if (!isFinnhubEnabled()) return [];
  const symbol = forex ? toFinnhubForexSymbol(ticker) : toFinnhubStockSymbol(ticker);
  const cacheId = cacheKey("finnhub-bars", symbol, resolution, String(fromUnix), String(toUnix));
  return getOrSetCached(cacheId, CANDLES_TTL_MS, async () => {
    const endpoint = forex ? "forex/candle" : "stock/candle";
    const data = await finnhubFetch<FinnhubCandleSet>(
      `/${endpoint}?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromUnix}&to=${toUnix}`,
    );
    return mapCandles(data);
  });
}

export function yahooIntervalToFinnhub(
  interval: "1m" | "5m" | "15m" | "60m" | "1h" | "1d" | "1wk",
): FinnhubChartInterval {
  switch (interval) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "15m":
      return "15";
    case "60m":
    case "1h":
      return "60";
    case "1wk":
      return "W";
    default:
      return "D";
  }
}

export function yahooRangeToUnix(range: string): { from: number; to: number } {
  const to = Math.floor(Date.now() / 1000);
  const r = range.trim().toLowerCase();
  let days = 90;
  if (r.endsWith("d")) days = Number.parseInt(r, 10) || 5;
  else if (r.endsWith("mo")) days = (Number.parseInt(r, 10) || 3) * 30;
  else if (r.endsWith("y")) days = (Number.parseInt(r, 10) || 1) * 365;
  else if (r === "1wk" || r === "7d") days = 7;
  const from = to - days * 86_400;
  return { from, to };
}

/** Batch quotes — 5 tickers per batch, 3s pause between batches, serialized HTTP. */
export async function getBatchQuotes(
  tickers: readonly string[],
): Promise<Map<string, FinnhubQuote>> {
  const out = new Map<string, FinnhubQuote>();
  if (!isFinnhubEnabled() || tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(BATCH_PAUSE_MS);

    const batch = unique.slice(i, i + BATCH_SIZE);
    for (const symbol of batch) {
      const q = await getQuote(symbol);
      if (q) out.set(symbol, q);
    }
  }
  return out;
}

/** Batch FOREX quotes — same batching as stocks. */
export async function getBatchForexQuotes(
  pairIds: readonly string[],
): Promise<Map<string, FinnhubForexQuote>> {
  const out = new Map<string, FinnhubForexQuote>();
  if (!isFinnhubEnabled() || pairIds.length === 0) return out;

  const unique = [...new Set(pairIds.map((p) => p.trim().toUpperCase()).filter(Boolean))];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(BATCH_PAUSE_MS);

    const batch = unique.slice(i, i + BATCH_SIZE);
    for (const pairId of batch) {
      const q = await getForexQuote(pairId);
      if (q) out.set(pairId, q);
    }
  }
  return out;
}
