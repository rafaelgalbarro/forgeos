/**
 * Alpha Vantage — daily history only (25 calls/day free tier).
 * Quotes stay on Finnhub. History is cached 24h and never refetched while fresh.
 */

import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { cacheKey, getCached, getOrSetCached, peekCached, setCached } from "@/lib/market-data/cache";

const AV_BASE = "https://www.alphavantage.co/query";
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const QUOTE_TTL_MS = 2 * 60 * 1000;
const MAX_CALLS_PER_DAY = 25;
const FETCH_TIMEOUT_MS = 25_000;
const DISK_DIR = path.join(process.cwd(), ".forgeos", "cache");
const DISK_FILE = path.join(DISK_DIR, "alpha-vantage.json");

export type AlphaVantageQuote = {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
};

export type AlphaVantageBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
};

type DiskStore = {
  calls: { date: string; count: number };
  entries: Record<string, { expiresAt: number; value: unknown }>;
};

let disk: DiskStore | null = null;
let fetchChain: Promise<unknown> = Promise.resolve();

export function isAlphaVantageEnabled(): boolean {
  return Boolean(process.env.ALPHA_VANTAGE_API_KEY?.trim());
}

function apiKey(): string | null {
  return process.env.ALPHA_VANTAGE_API_KEY?.trim() || null;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadDisk(): DiskStore {
  if (disk) return disk;
  try {
    const raw = readFileSync(DISK_FILE, "utf8");
    const parsed = JSON.parse(raw) as DiskStore;
    if (parsed && typeof parsed === "object") {
      disk = {
        calls: parsed.calls?.date === todayUtc()
          ? parsed.calls
          : { date: todayUtc(), count: 0 },
        entries: parsed.entries ?? {},
      };
      return disk;
    }
  } catch {
    /* missing or corrupt — start empty */
  }
  disk = { calls: { date: todayUtc(), count: 0 }, entries: {} };
  return disk;
}

function saveDisk(): void {
  if (!disk) return;
  try {
    mkdirSync(DISK_DIR, { recursive: true });
    writeFileSync(DISK_FILE, JSON.stringify(disk), "utf8");
  } catch (err) {
    console.warn("[AlphaVantage] disk cache write failed:", err instanceof Error ? err.message : err);
  }
}

function getDiskCached<T>(key: string, allowStale = false): T | null {
  const store = loadDisk();
  const entry = store.entries[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    if (allowStale) return entry.value as T;
    delete store.entries[key];
    saveDisk();
    return null;
  }
  return entry.value as T;
}

function setDiskCached<T>(key: string, value: T, ttlMs: number): void {
  const store = loadDisk();
  store.entries[key] = { value, expiresAt: Date.now() + ttlMs };
  saveDisk();
}

function remainingCalls(): number {
  const store = loadDisk();
  if (store.calls.date !== todayUtc()) {
    store.calls = { date: todayUtc(), count: 0 };
    saveDisk();
  }
  return Math.max(0, MAX_CALLS_PER_DAY - store.calls.count);
}

function consumeCall(): boolean {
  if (remainingCalls() <= 0) return false;
  const store = loadDisk();
  store.calls.count += 1;
  saveDisk();
  return true;
}

function runSerialized<T>(work: () => Promise<T>): Promise<T> {
  const task = fetchChain.then(async () => work());
  fetchChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

function parseForexPair(pair: string): { from: string; to: string } | null {
  const raw = pair.trim().toUpperCase().replace("=X", "").replace("/", "").replace("OANDA:", "").replace("_", "");
  if (raw.length === 6 && /^[A-Z]{6}$/.test(raw)) {
    return { from: raw.slice(0, 3), to: raw.slice(3) };
  }
  return null;
}

function toStockSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (raw.endsWith("=X")) return raw.slice(0, -2);
  const dot = raw.indexOf(".");
  return dot > 0 ? raw.slice(0, dot) : raw;
}

function isForexTicker(ticker: string): boolean {
  const raw = ticker.trim().toUpperCase();
  if (raw.endsWith("=X") || raw.startsWith("OANDA:")) return true;
  const stripped = raw.replace("=X", "").replace("/", "");
  return stripped.length === 6 && /^[A-Z]{6}$/.test(stripped);
}

function mapDailySeries(
  series: Record<string, Record<string, string>> | undefined,
  days: number,
): AlphaVantageBar[] {
  if (!series || typeof series !== "object") return [];
  const bars: AlphaVantageBar[] = [];
  const dates = Object.keys(series).sort();
  for (const date of dates) {
    const row = series[date];
    if (!row) continue;
    const close = Number(row["4. close"]);
    if (!Number.isFinite(close) || close <= 0) continue;
    bars.push({
      open: Number(row["1. open"] ?? close),
      high: Number(row["2. high"] ?? close),
      low: Number(row["3. low"] ?? close),
      close,
      volume: Number(row["5. volume"] ?? 0),
      date: `${date}T00:00:00.000Z`,
    });
  }
  const keep = Math.max(1, Math.min(Math.floor(days), bars.length));
  return bars.slice(-keep);
}

async function avFetch(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const key = apiKey();
  if (!key) return null;
  if (!consumeCall()) {
    console.warn("[AlphaVantage] daily quota exhausted (25/day) — serving cache only");
    return null;
  }

  const search = new URLSearchParams({ ...params, apikey: key });
  const url = `${AV_BASE}?${search.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[AlphaVantage] HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (typeof data.Note === "string" || typeof data.Information === "string") {
      console.warn("[AlphaVantage] rate/info:", data.Note ?? data.Information);
      return null;
    }
    if (typeof data["Error Message"] === "string") {
      console.warn("[AlphaVantage]", data["Error Message"]);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[AlphaVantage]", err instanceof Error ? err.message : err);
    return null;
  }
}

function historyMemKey(kind: "stk" | "fx", id: string): string {
  return cacheKey("av-hist", kind, id);
}

async function loadHistoryCached(
  memKey: string,
  loader: () => Promise<AlphaVantageBar[]>,
): Promise<AlphaVantageBar[]> {
  const mem = getCached<AlphaVantageBar[]>(memKey);
  if (mem && mem.length > 0) return mem;

  const diskHit = getDiskCached<AlphaVantageBar[]>(memKey);
  if (diskHit && diskHit.length > 0) {
    setCached(memKey, diskHit, HISTORY_TTL_MS);
    return diskHit;
  }

  const stale = peekCached<AlphaVantageBar[]>(memKey);
  if (remainingCalls() <= 0) {
    if (stale?.value?.length) return stale.value;
    const staleDisk = getDiskCached<AlphaVantageBar[]>(memKey, true);
    if (staleDisk?.length) return staleDisk;
    return [];
  }

  return getOrSetCached(memKey, HISTORY_TTL_MS, async () => {
    const bars = await runSerialized(loader);
    if (bars.length > 0) {
      setDiskCached(memKey, bars, HISTORY_TTL_MS);
      return bars;
    }
    if (stale?.value?.length) return stale.value;
    return [];
  });
}

/** Current price from GLOBAL_QUOTE. Prefer Finnhub for live quotes. */
export async function getQuote(ticker: string): Promise<AlphaVantageQuote | null> {
  const symbol = toStockSymbol(ticker);
  if (!symbol || !isAlphaVantageEnabled()) return null;

  const memKey = cacheKey("av-quote", symbol);
  return getOrSetCached(memKey, QUOTE_TTL_MS, async () =>
    runSerialized(async () => {
      const data = await avFetch({ function: "GLOBAL_QUOTE", symbol });
      const row = data?.["Global Quote"] as Record<string, string> | undefined;
      const price = Number(row?.["05. price"]);
      if (!row || !Number.isFinite(price) || price <= 0) return null;
      return {
        symbol,
        price,
        open: Number(row["02. open"] ?? price),
        high: Number(row["03. high"] ?? price),
        low: Number(row["04. low"] ?? price),
        volume: Number(row["06. volume"] ?? 0),
      };
    }),
  );
}

/** Daily OHLCV from TIME_SERIES_DAILY — last N days, 24h cache. */
export async function getHistory(ticker: string, days: number): Promise<AlphaVantageBar[]> {
  const symbol = toStockSymbol(ticker);
  if (!symbol || !isAlphaVantageEnabled()) return [];
  if (isForexTicker(ticker)) {
    const pair = parseForexPair(ticker);
    if (!pair) return [];
    return getForexHistory(pair.from, pair.to, days);
  }

  const safeDays = Math.max(1, Math.floor(days) || 100);
  const memKey = historyMemKey("stk", symbol);
  const bars = await loadHistoryCached(memKey, async () => {
    const data = await avFetch({
      function: "TIME_SERIES_DAILY",
      symbol,
      outputsize: "compact",
    });
    const series = data?.["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
    return mapDailySeries(series, 100);
  });
  return bars.slice(-safeDays);
}

/** FOREX daily OHLCV from FX_DAILY — 24h cache. */
export async function getForexHistory(
  from: string,
  to: string,
  days = 100,
): Promise<AlphaVantageBar[]> {
  const fromSym = from.trim().toUpperCase();
  const toSym = to.trim().toUpperCase();
  if (!fromSym || !toSym || !isAlphaVantageEnabled()) return [];

  const safeDays = Math.max(1, Math.floor(days) || 100);
  const memKey = historyMemKey("fx", `${fromSym}${toSym}`);
  const bars = await loadHistoryCached(memKey, async () => {
    const data = await avFetch({
      function: "FX_DAILY",
      from_symbol: fromSym,
      to_symbol: toSym,
      outputsize: "compact",
    });
    const series = data?.["Time Series FX (Daily)"] as Record<string, Record<string, string>> | undefined;
    return mapDailySeries(series, 100);
  });
  return bars.slice(-safeDays);
}

export function rangeToDays(range: string): number {
  const r = range.trim().toLowerCase();
  if (r.endsWith("d")) return Number.parseInt(r, 10) || 5;
  if (r.endsWith("mo")) return (Number.parseInt(r, 10) || 3) * 22;
  if (r.endsWith("y")) return (Number.parseInt(r, 10) || 1) * 252;
  if (r === "1wk" || r === "7d") return 7;
  return 66;
}
