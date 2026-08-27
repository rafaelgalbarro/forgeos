/**
 * Financial Modeling Prep — Starter plan (rate-limited).
 * Live prices: NEVER from FMP HTTP — use IBKR market-data; FMP quote cache is read-only fallback.
 * Allowed FMP HTTP:
 *   - Daily movers: /biggest-gainers, /biggest-losers, /most-actives (cached 1h, once per hour)
 *   - EOD history: /historical-price-eod/light (cached 24h, max 3 parallel)
 * Never invents prices. Never logs the API key.
 */

import "server-only";

import { cacheKey, getCached, peekCached, setCached } from "@/lib/market-data/cache";
import {
  coingeckoId,
  coingeckoIdsList,
  normalizeIbkrCryptoTicker,
} from "@/src/core/trading/crypto-ibkr";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const GAINERS_ENDPOINT = "/biggest-gainers";
const LOSERS_ENDPOINT = "/biggest-losers";
const ACTIVES_ENDPOINT = "/most-actives";
const PRE_POST_GAINERS_ENDPOINT = "/pre-post-market-gainers";
const PRE_POST_ACTIVES_ENDPOINT = "/pre-post-market-most-active";
const COMPANY_SCREENER_ENDPOINT = "/company-screener";
const HISTORY_LIGHT_ENDPOINT = "/historical-price-eod/light";
const HISTORY_FULL_ENDPOINT = "/historical-price-eod/full";
/** Legacy quote cache TTL (read-only — no new FMP quote HTTP). */
const QUOTE_TTL_MS = 10 * 60_000;
/** EOD history — 24 hours (daily bars do not change intraday). */
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
/** Daily movers scanner — 1 hour (gainers+losers+actives once per hour max). */
const MOVERS_TTL_MS = 60 * 60 * 1000;
/** European ADR screener — 24 hours. */
const EUROPE_ADR_TTL_MS = 24 * 60 * 60 * 1000;
/** Premarket movers — 5 minutes (refresh during 14:00–14:30). */
const PREMARKET_TTL_MS = 5 * 60_000;
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

export type FmpGainer = {
  symbol: string;
  price: number;
  changePercentage: number;
  volume: number;
  avgVolume?: number;
  yearHigh?: number;
  source: "fmp-gainers" | "fmp-losers" | "fmp-actives" | "fmp-eu-adr";
};

export type FmpMoversBundle = {
  gainers: FmpGainer[];
  losers: FmpGainer[];
  actives: FmpGainer[];
  all: FmpGainer[];
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

function cacheQuote(requested: string, quote: FmpQuote): void {
  setCached(cacheKey("fmp-quote", requested), quote, QUOTE_TTL_MS);
  setCached(cacheKey("fmp-quote", quote.symbol), quote, QUOTE_TTL_MS);
}

function staleQuote(requested: string): FmpQuote | null {
  const peek = peekCached<FmpQuote>(cacheKey("fmp-quote", requested));
  return peek?.value ?? null;
}

/** Sync peek of last FMP quote cache including stale (no HTTP). IBKR fallback for live cycles. */
export function peekCachedQuote(ticker: string): FmpQuote | null {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const crypto = normalizeIbkrCryptoTicker(symbol);
  const requested = crypto ?? symbol;
  return staleQuote(requested);
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
 * Live quotes are IBKR-only. Returns in-memory cache / CoinGecko crypto only — never hits FMP HTTP.
 */
export async function getQuote(ticker: string): Promise<FmpQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const crypto = normalizeIbkrCryptoTicker(symbol);
  const requested = crypto ?? symbol;
  const hit = getCached<FmpQuote>(cacheKey("fmp-quote", requested));
  if (hit) return hit;

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
 * Batch quotes — cache-only (no FMP HTTP). Live prices must come from IBKR.
 */
export async function getBatchQuotes(tickers: readonly string[]): Promise<Map<string, FmpQuote>> {
  const out = new Map<string, FmpQuote>();
  if (tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  for (const symbol of unique) {
    const requested = normalizeIbkrCryptoTicker(symbol) ?? symbol;
    const hit = getCached<FmpQuote>(cacheKey("fmp-quote", requested));
    if (hit) {
      out.set(requested, hit);
      continue;
    }
    const stale = staleQuote(requested);
    if (stale) {
      out.set(requested, stale);
      continue;
    }
    if (normalizeIbkrCryptoTicker(requested)) {
      const cg = await fetchCoinGeckoQuote(requested);
      if (cg) {
        cacheQuote(requested, cg);
        out.set(requested, cg);
      }
    }
  }
  return out;
}

function parseMoverRows(
  body: unknown,
  source: FmpGainer["source"],
): FmpGainer[] {
  const out: FmpGainer[] = [];
  for (const row of quoteRows(body)) {
    const symbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "";
    const price = asFinite(row.price) ?? asFinite(row.lastPrice);
    if (!symbol || price == null || price <= 0) continue;
    const changePercentage =
      asFinite(row.changesPercentage) ??
      asFinite(row.changePercentage) ??
      asFinite(row.change) ??
      0;
    const volume = asFinite(row.volume) ?? 0;
    const avgVolume = asFinite(row.avgVolume) ?? asFinite(row.volAvg) ?? undefined;
    const yearHigh = asFinite(row.yearHigh) ?? undefined;
    out.push({
      symbol,
      price,
      changePercentage: changePercentage ?? 0,
      volume,
      avgVolume,
      yearHigh,
      source,
    });
    // Seed quote cache so cycle can fall back without FMP HTTP
    cacheQuote(symbol, {
      symbol,
      price,
      open: price,
      dayHigh: price,
      dayLow: price,
      previousClose: price,
      volume,
      changePercentage: changePercentage ?? 0,
      yearHigh,
      avgVolume,
    });
  }
  return out;
}

/**
 * Daily movers — gainers + losers + actives.
 * At most once per hour (3 FMP HTTP calls total, then cached).
 */
export async function getFmpMovers(): Promise<FmpMoversBundle> {
  const cacheId = cacheKey("fmp-movers", "us");
  const hit = getCached<FmpMoversBundle>(cacheId);
  if (hit) return hit;

  const empty: FmpMoversBundle = { gainers: [], losers: [], actives: [], all: [] };
  if (!isFmpEnabled()) {
    const stale = peekCached<FmpMoversBundle>(cacheId);
    return stale?.value ?? empty;
  }

  const [gainersBody, losersBody, activesBody] = await Promise.all([
    fmpFetchJson(GAINERS_ENDPOINT, {}),
    fmpFetchJson(LOSERS_ENDPOINT, {}),
    fmpFetchJson(ACTIVES_ENDPOINT, {}),
  ]);

  if (gainersBody == null && losersBody == null && activesBody == null) {
    const stale = peekCached<FmpMoversBundle>(cacheId);
    if (stale?.value?.all?.length) {
      console.warn("[FMP] Rate limit hit → usando caché movers");
      return stale.value;
    }
    return empty;
  }

  const gainers = parseMoverRows(gainersBody, "fmp-gainers");
  const losers = parseMoverRows(losersBody, "fmp-losers");
  const actives = parseMoverRows(activesBody, "fmp-actives");
  const bySym = new Map<string, FmpGainer>();
  for (const row of [...gainers, ...losers, ...actives]) {
    if (!bySym.has(row.symbol)) bySym.set(row.symbol, row);
  }
  const bundle: FmpMoversBundle = {
    gainers,
    losers,
    actives,
    all: [...bySym.values()],
  };
  if (bundle.all.length > 0) setCached(cacheId, bundle, MOVERS_TTL_MS);
  console.log(
    `[FMP] Movers cached gainers=${gainers.length} losers=${losers.length} actives=${actives.length} (TTL 1h)`,
  );
  return bundle;
}

/** @deprecated Prefer getFmpMovers — kept for callers that only need gainers. */
export async function getFmpGainers(): Promise<FmpGainer[]> {
  const movers = await getFmpMovers();
  return movers.gainers.length ? movers.gainers : movers.all;
}

const EUROPE_ADR_COUNTRIES = ["GB", "DE", "FR", "NL", "CH", "SE", "ES", "IT"] as const;

/**
 * European ADRs / US-listed names via FMP company-screener (NYSE+NASDAQ, EU countries).
 * Cached 24h — at most a few FMP calls per day.
 */
export async function getEuropeanAdrsFromFmp(): Promise<FmpGainer[]> {
  const cacheId = cacheKey("fmp-eu-adrs", "nyse-nasdaq");
  const hit = getCached<FmpGainer[]>(cacheId);
  if (hit) return hit;

  if (!isFmpEnabled()) {
    const stale = peekCached<FmpGainer[]>(cacheId);
    return stale?.value ?? [];
  }

  const out: FmpGainer[] = [];
  const seen = new Set<string>();

  // Limit FMP load: one screener call per country (exchange filtered client-side).
  for (const country of EUROPE_ADR_COUNTRIES) {
    const body = await fmpFetchJson(COMPANY_SCREENER_ENDPOINT, {
      country,
      isActivelyTrading: "true",
      limit: "40",
    });
    if (body == null) continue;
    for (const row of quoteRows(body)) {
      const symbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "";
      if (!symbol || seen.has(symbol)) continue;
      const exchange = String(row.exchangeShortName ?? row.exchange ?? "")
        .trim()
        .toUpperCase();
      if (exchange && !/NYSE|NASDAQ|AMEX|ARCA|BATS|CBOE/.test(exchange)) continue;
      const price = asFinite(row.price) ?? asFinite(row.lastPrice) ?? 0;
      if (price > 0 && (price < 0.75 || price > 500)) continue;
      seen.add(symbol);
      out.push({
        symbol,
        price: price > 0 ? price : 0,
        changePercentage:
          asFinite(row.changesPercentage) ?? asFinite(row.changePercentage) ?? 0,
        volume: asFinite(row.volume) ?? 0,
        avgVolume: asFinite(row.avgVolume) ?? undefined,
        yearHigh: asFinite(row.yearHigh) ?? undefined,
        source: "fmp-eu-adr",
      });
      if (price > 0) {
        cacheQuote(symbol, {
          symbol,
          price,
          open: price,
          dayHigh: price,
          dayLow: price,
          previousClose: price,
          volume: asFinite(row.volume) ?? 0,
          changePercentage:
            asFinite(row.changesPercentage) ?? asFinite(row.changePercentage) ?? 0,
        });
      }
    }
  }

  if (out.length > 0) setCached(cacheId, out, EUROPE_ADR_TTL_MS);
  console.log(`[FMP] European ADRs cached ${out.length} symbols (TTL 24h)`);
  return out;
}

/**
 * Premarket USA movers — cached 5 min so 14:00–14:30 cycles refresh often without hammering FMP.
 */
export async function getFmpPrePostMovers(): Promise<FmpMoversBundle> {
  const cacheId = cacheKey("fmp-prepost", "usa");
  const hit = getCached<FmpMoversBundle>(cacheId);
  if (hit) return hit;

  const empty: FmpMoversBundle = { gainers: [], losers: [], actives: [], all: [] };
  if (!isFmpEnabled()) {
    const stale = peekCached<FmpMoversBundle>(cacheId);
    return stale?.value ?? empty;
  }

  const [gainersBody, activesBody] = await Promise.all([
    fmpFetchJson(PRE_POST_GAINERS_ENDPOINT, {}),
    fmpFetchJson(PRE_POST_ACTIVES_ENDPOINT, {}),
  ]);

  if (gainersBody == null && activesBody == null) {
    const stale = peekCached<FmpMoversBundle>(cacheId);
    return stale?.value ?? empty;
  }

  const gainers = parseMoverRows(gainersBody, "fmp-gainers");
  const actives = parseMoverRows(activesBody, "fmp-actives");
  const bySym = new Map<string, FmpGainer>();
  for (const row of [...gainers, ...actives]) {
    if (!bySym.has(row.symbol)) bySym.set(row.symbol, row);
  }
  const bundle: FmpMoversBundle = {
    gainers,
    losers: [],
    actives,
    all: [...bySym.values()],
  };
  if (bundle.all.length > 0) setCached(cacheId, bundle, PREMARKET_TTL_MS);
  return bundle;
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
