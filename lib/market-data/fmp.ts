/**
 * Financial Modeling Prep — sole quotes + EOD history source (stable API, Starter plan).
 * Quotes: GET /stable/quote?symbol=AAPL,MSFT (batch ≤50) → [{ symbol, price, ... }]
 * History: GET /stable/historical-price-eod/light?symbol=  → [{ date, price, volume }]
 * Rate limit: 10m quote cache, 24h history cache, 30s startup gate, max 3 parallel,
 * max 5 req/s, batch-only quotes (never individual), 429 → wait 60s + retry once.
 * Never invents prices. Never logs the API key.
 */

import "server-only";

import { cacheKey, getCached, peekCached, setCached } from "@/lib/market-data/cache";
import {
  coingeckoId,
  coingeckoIdsList,
  fmpCryptoSymbol,
  normalizeIbkrCryptoTicker,
} from "@/src/core/trading/crypto-ibkr";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const QUOTE_ENDPOINT = "/quote";
const HISTORY_LIGHT_ENDPOINT = "/historical-price-eod/light";
const HISTORY_FULL_ENDPOINT = "/historical-price-eod/full";
/** Quote prices — 10 minutes (reduces burst load on cycle start). */
const QUOTE_TTL_MS = 10 * 60_000;
/** EOD history — 24 hours (daily bars do not change intraday). */
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const BATCH_SYMBOL_LIMIT = 50;
const STARTUP_DELAY_MS = 30_000;
const MAX_PARALLEL_REQUESTS = 3;
const MAX_REQUESTS_PER_SECOND = 5;
const RATE_LIMIT_RETRY_MS = 60_000;
const FETCH_TIMEOUT_MS = 20_000;
const PROCESS_START_MS = Date.now();

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
  priceAvg50?: number;
  priceAvg200?: number;
};

export type FmpBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type QueueTask<T> = {
  work: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

/** Bounded queue: max 3 in flight, max 5 request starts per second, 30s startup gate. */
class FmpRequestScheduler {
  private inFlight = 0;
  private readonly pending: QueueTask<unknown>[] = [];
  private readonly recentStarts: number[] = [];
  private startupGatePassed = false;

  private async waitStartupGate(): Promise<void> {
    if (this.startupGatePassed) return;
    const elapsed = Date.now() - PROCESS_START_MS;
    if (elapsed < STARTUP_DELAY_MS) {
      await sleep(STARTUP_DELAY_MS - elapsed);
    }
    this.startupGatePassed = true;
  }

  private async waitRateSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();
      while (this.recentStarts.length > 0 && now - this.recentStarts[0]! >= 1000) {
        this.recentStarts.shift();
      }
      if (this.recentStarts.length < MAX_REQUESTS_PER_SECOND) {
        this.recentStarts.push(now);
        return;
      }
      await sleep(50);
    }
  }

  private drain(): void {
    while (this.inFlight < MAX_PARALLEL_REQUESTS && this.pending.length > 0) {
      const item = this.pending.shift()!;
      this.inFlight += 1;
      void (async () => {
        try {
          await this.waitStartupGate();
          await this.waitRateSlot();
          const result = await item.work();
          item.resolve(result);
        } catch (err) {
          item.reject(err);
        } finally {
          this.inFlight -= 1;
          this.drain();
        }
      })();
    }
  }

  enqueue<T>(work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        work,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.drain();
    });
  }
}

const fmpScheduler = new FmpRequestScheduler();

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

type FetchOutcome =
  | { kind: "ok"; data: unknown }
  | { kind: "rate_limited" }
  | { kind: "error"; status?: number };

async function fmpFetchOnce(endpoint: string, query: Record<string, string>): Promise<FetchOutcome> {
  const url = buildFmpUrl(endpoint, query);
  if (!url) return { kind: "error" };
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 429) return { kind: "rate_limited" };
    if (!res.ok) {
      const key = readFmpApiKey();
      const hint =
        res.status === 402
          ? ` (payment required — key configured=${Boolean(key)}, len=${key?.length ?? 0})`
          : "";
      console.warn(`[FMP] HTTP ${res.status} ${pathForLog(endpoint)}${hint}`);
      return { kind: "error", status: res.status };
    }
    return { kind: "ok", data: await res.json() };
  } catch (err) {
    console.warn("[FMP]", pathForLog(endpoint), err instanceof Error ? err.message : err);
    return { kind: "error" };
  }
}

async function fmpFetchJson(endpoint: string, query: Record<string, string>): Promise<unknown | null> {
  const key = readFmpApiKey();
  if (!key) {
    console.warn("[FMP] FMP_API_KEY missing at runtime — set in .env.local and restart Next.js");
    return null;
  }

  return fmpScheduler.enqueue(async () => {
    const first = await fmpFetchOnce(endpoint, query);
    if (first.kind === "ok") return first.data;
    if (first.kind === "rate_limited") {
      console.warn("[FMP] Rate limit hit → esperando 60s y reintentando una vez");
      await sleep(RATE_LIMIT_RETRY_MS);
      const second = await fmpFetchOnce(endpoint, query);
      if (second.kind === "ok") return second.data;
      console.warn("[FMP] Rate limit hit → usando caché/esperando (retry falló)");
      return null;
    }
    return null;
  });
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
  const priceAvg50 = asFinite(row.priceAvg50) ?? asFinite(row.ma50) ?? undefined;
  const priceAvg200 = asFinite(row.priceAvg200) ?? asFinite(row.ma200) ?? undefined;
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
    priceAvg50,
    priceAvg200,
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
  const close = asFinite(row.close) ?? asFinite(row.price);
  const volume = asFinite(row.volume) ?? 0;
  if (!dateRaw || close == null) return null;
  const date = dateRaw.includes("T") ? dateRaw.slice(0, 10) : dateRaw;
  const o = open ?? close;
  const h = high ?? close;
  const l = low ?? close;
  return { date, open: o, high: h, low: l, close, volume };
}

/** ^VIX → VIX for FMP stable quote/history. */
export function normalizeFmpEquitySymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (!raw) return raw;
  if (raw.startsWith("^")) return raw.slice(1);
  const dot = raw.indexOf(".");
  return dot > 0 ? raw.slice(0, dot) : raw;
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

function remapQuoteSymbol(quote: FmpQuote, requested: string): FmpQuote {
  return { ...quote, symbol: requested };
}

function toFmpQuoteSymbol(requested: string): string {
  const crypto = normalizeIbkrCryptoTicker(requested);
  if (crypto) return fmpCryptoSymbol(crypto) ?? requested;
  return normalizeFmpEquitySymbol(requested);
}

function cacheQuote(requested: string, quote: FmpQuote): void {
  setCached(cacheKey("fmp-quote", requested), quote, QUOTE_TTL_MS);
  setCached(cacheKey("fmp-quote", quote.symbol), quote, QUOTE_TTL_MS);
}

function staleQuote(requested: string): FmpQuote | null {
  const peek = peekCached<FmpQuote>(cacheKey("fmp-quote", requested));
  return peek?.value ?? null;
}

async function fetchCoinGeckoQuote(requested: string): Promise<FmpQuote | null> {
  const id = coingeckoId(requested);
  const canon = normalizeIbkrCryptoTicker(requested);
  if (!id || !canon) return null;
  try {
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", coingeckoIdsList());
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");
    url.searchParams.set("include_24hr_vol", "true");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[FMP] CoinGecko HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }
    >;
    const row = body[id];
    const price = asFinite(row?.usd);
    if (price == null || price <= 0) return null;
    const change = asFinite(row?.usd_24h_change) ?? 0;
    const vol = asFinite(row?.usd_24h_vol) ?? 0;
    return {
      symbol: canon,
      price,
      open: price,
      dayHigh: price,
      dayLow: price,
      previousClose: price,
      volume: vol,
      changePercentage: change,
      exchange: "CRYPTO",
    };
  } catch (err) {
    console.warn("[FMP] CoinGecko fallback failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Single-symbol quote — always routes through batch /stable/quote (never individual profile).
 */
export async function getQuote(ticker: string): Promise<FmpQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const crypto = normalizeIbkrCryptoTicker(symbol);
  const requested = crypto ?? symbol;
  const key = cacheKey("fmp-quote", requested);
  const hit = getCached<FmpQuote>(key);
  if (hit) return hit;

  if (isFmpEnabled()) {
    const batch = await getBatchQuotes([requested]);
    const fromBatch = batch.get(requested);
    if (fromBatch) return fromBatch;
  }

  if (crypto) {
    const cg = await fetchCoinGeckoQuote(requested);
    if (cg) {
      cacheQuote(requested, cg);
      return cg;
    }
  }

  return staleQuote(requested);
}

/**
 * Batch quotes — up to 50 symbols per /stable/quote request (mandatory batch path).
 * Fresh cache (<10 min) is used first; only misses hit FMP.
 */
export async function getBatchQuotes(tickers: readonly string[]): Promise<Map<string, FmpQuote>> {
  const out = new Map<string, FmpQuote>();
  if (tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const missing: string[] = [];
  for (const symbol of unique) {
    const requested = normalizeIbkrCryptoTicker(symbol) ?? symbol;
    const hit = getCached<FmpQuote>(cacheKey("fmp-quote", requested));
    if (hit) out.set(requested, hit);
    else missing.push(requested);
  }
  if (missing.length === 0) return out;

  if (!isFmpEnabled()) {
    for (const requested of missing) {
      const crypto = normalizeIbkrCryptoTicker(requested);
      if (!crypto) continue;
      const q = await fetchCoinGeckoQuote(requested);
      if (q) {
        cacheQuote(requested, q);
        out.set(requested, q);
      }
    }
    return out;
  }

  for (let i = 0; i < missing.length; i += BATCH_SYMBOL_LIMIT) {
    const chunk = missing.slice(i, i + BATCH_SYMBOL_LIMIT);
    const fmpSymbols = chunk.map((s) => toFmpQuoteSymbol(s));
    const joined = [...new Set(fmpSymbols)].join(",");
    const body = await fmpFetchJson(QUOTE_ENDPOINT, { symbol: joined });

    if (body == null) {
      console.warn("[FMP] Rate limit hit → usando caché/esperando (batch)");
      for (const requested of chunk) {
        const stale = staleQuote(requested);
        if (stale) out.set(requested, stale);
        else if (normalizeIbkrCryptoTicker(requested)) {
          const cg = await fetchCoinGeckoQuote(requested);
          if (cg) {
            cacheQuote(requested, cg);
            out.set(requested, cg);
          }
        }
      }
      continue;
    }

    const byFmp = new Map<string, FmpQuote>();
    for (const row of quoteRows(body)) {
      const parsed = parseQuote(row);
      if (!parsed) continue;
      byFmp.set(parsed.symbol.toUpperCase(), parsed);
    }

    for (let j = 0; j < chunk.length; j += 1) {
      const requested = chunk[j]!;
      const fmpSym = fmpSymbols[j]!.toUpperCase();
      const parsed = byFmp.get(fmpSym) ?? byFmp.get(requested);
      if (!parsed) {
        const stale = staleQuote(requested);
        if (stale) out.set(requested, stale);
        continue;
      }
      const quote = remapQuoteSymbol(parsed, requested);
      cacheQuote(requested, quote);
      out.set(requested, quote);
    }
  }

  return out;
}

export async function getHistory(ticker: string, days: number): Promise<FmpBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  const safeDays = Math.max(50, Math.min(Math.floor(days), 400));
  const fmpSymbol = normalizeFmpEquitySymbol(symbol);
  const cacheId = cacheKey("fmp-history", symbol, String(safeDays));
  const hit = getCached<FmpBar[]>(cacheId);
  if (hit) return hit;

  let bars: FmpBar[] = [];
  if (isFmpEnabled()) {
    const lightBody = await fmpFetchJson(HISTORY_LIGHT_ENDPOINT, { symbol: fmpSymbol });
    if (lightBody == null) {
      const stale = peekCached<FmpBar[]>(cacheId);
      if (stale?.value?.length) {
        console.warn(`[FMP] Rate limit hit → usando caché histórico para ${symbol}`);
        return stale.value;
      }
    } else {
      bars = extractHistoricalRows(lightBody)
        .map(parseBar)
        .filter((row): row is FmpBar => row != null);
    }

    if (bars.length < 20) {
      const fullBody = await fmpFetchJson(HISTORY_FULL_ENDPOINT, { symbol: fmpSymbol });
      if (fullBody != null) {
        const fullRows = extractHistoricalRows(fullBody)
          .map(parseBar)
          .filter((row): row is FmpBar => row != null);
        if (fullRows.length > bars.length) bars = fullRows;
      }
    }

    bars = bars.sort((a, b) => a.date.localeCompare(b.date)).slice(-safeDays);
  }

  if (bars.length > 0) setCached(cacheId, bars, HISTORY_TTL_MS);
  return bars;
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
