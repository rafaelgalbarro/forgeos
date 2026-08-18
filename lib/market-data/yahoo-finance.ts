import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { FOREX_PAIRS } from "@/lib/investment/forex/config";
import { cacheKey, getCached, getOrSetCached, setCached } from "@/lib/market-data/cache";
import {
  chartIntervalToPolygon,
  chartRangeToDates,
  fetchPolygonAggregates,
  fetchPolygonTickerDetails,
  getPolygonBatchQuotes,
  isPolygonEnabled,
  polygonBarsToYahoo,
  polygonDetailsToYahooInfo,
} from "@/lib/market-data/polygon";
import {
  BARS_CACHE_TTL_MS,
  FUNDAMENTALS_CACHE_TTL_MS,
  PRICE_CACHE_TTL_MS,
  getDataRefreshPolicy,
} from "@/lib/market-data/refresh-policy";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";

export type YahooQuote = {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  high52w: number;
  low52w: number;
  bid: number;
  ask: number;
  marketCap?: number;
  exchange?: string;
};

export type YahooTickerInfo = {
  symbol: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  trailingPE?: number;
  exchange?: string;
};

const BATCH_SIZE = 200;
const MAX_RETRIES = 3;

/** Once Yahoo returns 401, skip all remaining Yahoo HTTP for this process. */
let yahooUnauthorized401 = false;

function envBool(name: string, defaultValue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export function isYahooFinanceEnabled(): boolean {
  if (yahooUnauthorized401) return false;
  return envBool("USE_YAHOO_FINANCE", true);
}

type IbkrMappedContract = {
  yahooSymbol: string;
  symbol: string;
  currency: string;
  exchange: string;
  secType: "STK" | "CASH";
  whatToShow: "TRADES" | "MIDPOINT";
};

const IBKR_QUOTE_CONCURRENCY = 3;
const IBKR_FETCH_TIMEOUT_MS = 12_000;

function mapTickerToIbkrContracts(ticker: string): IbkrMappedContract[] {
  const yahooSymbol = ticker.trim().toUpperCase();
  if (!yahooSymbol || yahooSymbol.startsWith("^")) return [];

  const fxKey = yahooSymbol.endsWith("=X")
    ? yahooSymbol.slice(0, -2)
    : yahooSymbol.includes("/")
      ? yahooSymbol.replace("/", "")
      : yahooSymbol;
  const pair = FOREX_PAIRS.find((p) => p.pairId === fxKey);
  if (pair) {
    return [
      {
        yahooSymbol,
        symbol: pair.symbol,
        currency: pair.currency,
        exchange: pair.exchange,
        secType: "CASH",
        whatToShow: "MIDPOINT",
      },
    ];
  }
  if (yahooSymbol.endsWith("=X") && fxKey.length === 6) {
    return [
      {
        yahooSymbol,
        symbol: fxKey.slice(0, 3),
        currency: fxKey.slice(3),
        exchange: "IDEALPRO",
        secType: "CASH",
        whatToShow: "MIDPOINT",
      },
    ];
  }

  return quoteRoutesForTicker(yahooSymbol).map((route) => ({
    yahooSymbol,
    symbol: route.symbol,
    currency: route.currency,
    exchange: route.exchange,
    secType: "STK" as const,
    whatToShow: "TRADES" as const,
  }));
}

function yahooRangeToIbkrDuration(range: string): string {
  switch (range.trim().toLowerCase()) {
    case "1d":
      return "1 D";
    case "5d":
      return "5 D";
    case "1wk":
    case "7d":
      return "1 W";
    case "1mo":
      return "1 M";
    case "3mo":
      return "3 M";
    case "6mo":
      return "6 M";
    default:
      return "1 Y";
  }
}

function yahooIntervalToIbkrBarSize(interval: YahooChartInterval): string | null {
  switch (interval) {
    case "1m":
      return "1 min";
    case "5m":
      return "5 mins";
    case "15m":
      return "15 mins";
    case "60m":
    case "1h":
      return "1 hour";
    case "1d":
      return "1 day";
    default:
      return null;
  }
}

async function runPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const n = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (true) {
        const idx = next;
        next += 1;
        if (idx >= items.length) return;
        await worker(items[idx]!);
      }
    }),
  );
}

function ibkrQuoteToYahoo(
  yahooSymbol: string,
  data: {
    last?: number | null;
    currentPrice?: number | null;
    mid?: number | null;
    bid?: number | null;
    ask?: number | null;
    exchange?: string;
  },
): YahooQuote | null {
  const price = Number(data.last ?? data.currentPrice ?? data.mid ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;
  const bid = Number(data.bid ?? price);
  const ask = Number(data.ask ?? price);
  return {
    symbol: yahooSymbol,
    price,
    changePct: 0,
    volume: 0,
    avgVolume: 0,
    high52w: price,
    low52w: price,
    bid: Number.isFinite(bid) && bid > 0 ? bid : price,
    ask: Number.isFinite(ask) && ask > 0 ? ask : price,
    exchange: data.exchange,
  };
}

async function fetchIbkrQuoteForTicker(ticker: string): Promise<YahooQuote | null> {
  const contracts = mapTickerToIbkrContracts(ticker);
  for (const contract of contracts) {
    try {
      const params = new URLSearchParams({
        symbol: contract.symbol,
        currency: contract.currency,
        exchange: contract.exchange,
        secType: contract.secType,
      });
      const data = await ibkrServiceFetch<{
        last?: number | null;
        currentPrice?: number | null;
        mid?: number | null;
        bid?: number | null;
        ask?: number | null;
        exchange?: string;
      }>(`/api/ibkr/quote?${params.toString()}`, {
        signal: AbortSignal.timeout(IBKR_FETCH_TIMEOUT_MS),
      });
      const quote = ibkrQuoteToYahoo(contract.yahooSymbol, data);
      if (quote) return quote;
    } catch {
      /* try next IBKR route */
    }
  }
  return null;
}

async function fetchIbkrChartBars(
  ticker: string,
  interval: YahooChartInterval,
  range: string,
): Promise<YahooOhlcvBar[]> {
  const barSize = yahooIntervalToIbkrBarSize(interval);
  if (!barSize) return [];
  const duration = yahooRangeToIbkrDuration(range);
  const contracts = mapTickerToIbkrContracts(ticker);

  for (const contract of contracts) {
    try {
      const params = new URLSearchParams({
        symbol: contract.symbol,
        duration,
        barSize,
        currency: contract.currency,
        exchange: contract.exchange,
        secType: contract.secType,
        whatToShow: contract.whatToShow,
      });
      const history = await ibkrServiceFetch<{
        bars?: Array<{
          open?: number;
          high?: number;
          low?: number;
          close?: number;
          volume?: number;
          date?: string;
        }>;
      }>(`/api/ibkr/history?${params.toString()}`, {
        signal: AbortSignal.timeout(IBKR_FETCH_TIMEOUT_MS),
      });
      const bars: YahooOhlcvBar[] = [];
      for (const raw of history.bars ?? []) {
        const close = Number(raw.close ?? 0);
        if (!Number.isFinite(close) || close <= 0) continue;
        bars.push({
          open: Number(raw.open ?? close),
          high: Number(raw.high ?? close),
          low: Number(raw.low ?? close),
          close,
          volume: Number(raw.volume ?? 0),
          date: raw.date,
        });
      }
      if (bars.length > 0) return bars;
    } catch {
      /* try next IBKR route */
    }
  }
  return [];
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  if (yahooUnauthorized401) {
    throw new Error("HTTP 401");
  }
  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": "Mozilla/5.0 (ForgeOS Investment Scanner)",
          Accept: "application/json",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok) return res;
      if (res.status === 401) {
        yahooUnauthorized401 = true;
        console.warn("[YahooFinance] unauthorized (401) — skipping Yahoo for remaining requests");
        throw new Error("HTTP 401");
      }
      if (res.status === 429 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      lastErr = new Error(`HTTP ${res.status}`);
      if (res.status !== 429) break;
    } catch (err) {
      lastErr = err;
      if (err instanceof Error && err.message.includes("401")) break;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Yahoo Finance fetch failed");
}

function parseQuoteRow(row: Record<string, unknown>): YahooQuote | null {
  const symbol = String(row.symbol ?? "").trim().toUpperCase();
  if (!symbol) return null;
  const price = Number(row.regularMarketPrice ?? row.postMarketPrice ?? row.preMarketPrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;
  const volume = Number(row.regularMarketVolume ?? row.volume ?? 0);
  const avgVolume = Number(row.averageDailyVolume3Month ?? row.averageDailyVolume10Day ?? volume);
  return {
    symbol,
    price,
    changePct: Number(row.regularMarketChangePercent ?? 0),
    volume: Number.isFinite(volume) ? volume : 0,
    avgVolume: Number.isFinite(avgVolume) && avgVolume > 0 ? avgVolume : volume,
    high52w: Number(row.fiftyTwoWeekHigh ?? price),
    low52w: Number(row.fiftyTwoWeekLow ?? price),
    bid: Number(row.bid ?? price),
    ask: Number(row.ask ?? price),
    marketCap: Number(row.marketCap ?? 0) || undefined,
    exchange: String(row.fullExchangeName ?? row.exchange ?? ""),
  };
}

/** Single-ticker Yahoo quote — Yahoo only. IBKR wrappers call this after IBKR misses. */
export async function fetchYahooQuoteSingle(ticker: string): Promise<YahooQuote | null> {
  if (!isYahooFinanceEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const ttl = getDataRefreshPolicy().priceTtlMs || PRICE_CACHE_TTL_MS;
  const hit = getCached<YahooQuote>(cacheKey("yahoo-quote", symbol));
  if (hit) return hit;

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  try {
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as { quoteResponse?: { result?: Record<string, unknown>[] } };
    const q = parseQuoteRow(data.quoteResponse?.result?.[0] ?? {});
    if (q) setCached(cacheKey("yahoo-quote", q.symbol), q, ttl);
    return q;
  } catch {
    return null;
  }
}

/** Raw Yahoo chart bars — IBKR history fallback. */
export async function fetchYahooChartBarsRaw(
  ticker: string,
  interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  if (!isYahooFinanceEnabled()) return [];
  const symbol = ticker.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
    try {
      const res = await fetchWithRetry(url);
      const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
              volume?: (number | null)[];
            }>;
          };
        }>;
      };
    };
    const result = data.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = quote?.close ?? [];
    const opens = quote?.open ?? [];
    const highs = quote?.high ?? [];
    const lows = quote?.low ?? [];
    const volumes = quote?.volume ?? [];
    const bars: YahooOhlcvBar[] = [];
    for (let i = 0; i < closes.length; i += 1) {
      const c = closes[i];
      if (c == null || !Number.isFinite(c) || c <= 0) continue;
      const ts = timestamps[i];
      bars.push({
        open: Number(opens[i] ?? c),
        high: Number(highs[i] ?? c),
        low: Number(lows[i] ?? c),
        close: c,
        volume: Number(volumes[i] ?? 0),
        date: typeof ts === "number" ? new Date(ts * 1000).toISOString() : undefined,
      });
    }
    return bars;
  } catch {
    return [];
  }
}

async function fetchYahooBatchPricesRaw(tickers: readonly string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (!isYahooFinanceEnabled() || tickers.length === 0) return out;

  const ttl = getDataRefreshPolicy().priceTtlMs || PRICE_CACHE_TTL_MS;

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const chunk = tickers.slice(i, i + BATCH_SIZE);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk.join(","))}`;
    try {
      const res = await fetchWithRetry(url);
      const data = (await res.json()) as { quoteResponse?: { result?: Record<string, unknown>[] } };
      for (const row of data.quoteResponse?.result ?? []) {
        const q = parseQuoteRow(row);
        if (q) {
          out.set(q.symbol, q);
          setCached(cacheKey("yahoo-quote", q.symbol), q, ttl);
        }
      }
    } catch (err) {
      console.warn(
        `[YahooFinance] batch ${i}-${i + chunk.length} failed:`,
        err instanceof Error ? err.message : err,
      );
      if (!isYahooFinanceEnabled()) break;
    }
  }
  return out;
}

/** Batch quotes — Polygon PRIMARY when keyed, then IBKR, then Yahoo. */
export async function getBatchPrices(tickers: readonly string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const ttl = getDataRefreshPolicy().priceTtlMs || PRICE_CACHE_TTL_MS;
  const missing: string[] = [];

  for (const symbol of unique) {
    const hit = getCached<YahooQuote>(cacheKey("yahoo-quote", symbol));
    if (hit) out.set(symbol, hit);
    else missing.push(symbol);
  }

  if (missing.length === 0) return out;

  if (isPolygonEnabled()) {
    try {
      const polygonQuotes = await getPolygonBatchQuotes(missing);
      for (const [symbol, q] of polygonQuotes) {
        out.set(symbol, q);
        setCached(cacheKey("yahoo-quote", symbol), q, ttl);
      }
    } catch (err) {
      console.warn("[MarketData] Polygon batch failed:", err instanceof Error ? err.message : err);
    }
  }

  const afterPolygon = missing.filter((s) => !out.has(s));
  await runPool(afterPolygon, IBKR_QUOTE_CONCURRENCY, async (symbol) => {
    const quote = await fetchIbkrQuoteForTicker(symbol);
    if (!quote) return;
    out.set(symbol, quote);
    setCached(cacheKey("yahoo-quote", symbol), quote, ttl);
  });

  const stillMissing = missing.filter((s) => !out.has(s));
  if (stillMissing.length > 0) {
    const yahoo = await fetchYahooBatchPricesRaw(stillMissing);
    for (const [symbol, q] of yahoo) out.set(symbol, q);
  }

  return out;
}

/** Fundamentals + metadata for one ticker. Yahoo only (IBKR has no sector/PE). */
export async function getTickerInfo(ticker: string): Promise<YahooTickerInfo | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  return getOrSetCached(cacheKey("yahoo-info", symbol), FUNDAMENTALS_CACHE_TTL_MS, async () => {
    if (isPolygonEnabled()) {
      try {
        const details = await fetchPolygonTickerDetails(symbol);
        if (details) return polygonDetailsToYahooInfo(details);
      } catch (err) {
        console.warn("[MarketData] Polygon ticker info failed:", err instanceof Error ? err.message : err);
      }
    }
    if (!isYahooFinanceEnabled()) return null;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,summaryDetail,price`;
    try {
      const res = await fetchWithRetry(url);
      const data = (await res.json()) as {
        quoteSummary?: {
          result?: Array<{
            price?: { symbol?: string; shortName?: string; exchangeName?: string; marketCap?: { raw?: number } };
            summaryDetail?: { trailingPE?: { raw?: number } };
            assetProfile?: { sector?: string; industry?: string };
          }>;
        };
      };
      const row = data.quoteSummary?.result?.[0];
      if (!row) return null;
      return {
        symbol,
        shortName: row.price?.shortName,
        sector: row.assetProfile?.sector,
        industry: row.assetProfile?.industry,
        marketCap: row.price?.marketCap?.raw,
        trailingPE: row.summaryDetail?.trailingPE?.raw,
        exchange: row.price?.exchangeName,
      };
    } catch {
      return null;
    }
  });
}

type YahooRawNumber = { raw?: number; fmt?: string } | number | null | undefined;

function rawNum(v: YahooRawNumber): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v.raw);
  return Number.isFinite(n) ? n : null;
}

/** Normalize Yahoo debt/equity (often percent-like, e.g. 50 → 0.5). */
export function normalizeDebtToEquity(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value > 5) return value / 100;
  return value;
}

/** Normalize Yahoo ROE (fraction or percent). */
export function normalizeRoe(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (Math.abs(value) > 1.5) return value / 100;
  return value;
}

export type YahooFundamentals = {
  symbol: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  trailingPE: number | null;
  priceToBook: number | null;
  /** Fraction, e.g. 0.18 = 18%. */
  returnOnEquity: number | null;
  /** Ratio, e.g. 0.4 (not percent). */
  debtToEquity: number | null;
  dividendYield: number | null;
  dividendRate: number | null;
  recommendationKey: string | null;
  recommendationMean: number | null;
  marketCap: number | null;
  repurchaseOfStock: number | null;
  modulesPresent: string[];
  modulesMissing: string[];
};

export type YahooRatingChange = {
  date: string;
  firm: string;
  toGrade: string;
  fromGrade: string;
  action: string;
};

export type YahooCorporateEvent = {
  type: "dividend" | "split";
  date: string;
  amount?: number;
  splitRatio?: string;
};

const FUNDAMENTAL_MODULES = [
  "assetProfile",
  "summaryDetail",
  "defaultKeyStatistics",
  "financialData",
  "price",
  "upgradeDowngradeHistory",
  "cashflowStatementHistory",
] as const;

/**
 * Extended quoteSummary fundamentals for long-term value analysis.
 * Yahoo modules only — IBKR does not provide ratios. Missing modules are listed;
 * callers should render NO_DATA, never invent. Cached 1 hour.
 */
export async function getYahooFundamentals(ticker: string): Promise<YahooFundamentals | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  return getOrSetCached(cacheKey("yahoo-fundamentals", symbol), FUNDAMENTALS_CACHE_TTL_MS, async () => {
    let polygonPartial: YahooFundamentals | null = null;
    if (isPolygonEnabled()) {
      try {
        const details = await fetchPolygonTickerDetails(symbol);
        if (details) {
          polygonPartial = {
            symbol,
            shortName: details.name,
            industry: details.sicDescription,
            trailingPE: null,
            priceToBook: null,
            returnOnEquity: null,
            debtToEquity: null,
            dividendYield: null,
            dividendRate: null,
            recommendationKey: null,
            recommendationMean: null,
            marketCap: details.marketCap ?? null,
            repurchaseOfStock: null,
            modulesPresent: ["polygon.reference.tickers"],
            modulesMissing: [...FUNDAMENTAL_MODULES],
          };
        }
      } catch (err) {
        console.warn("[MarketData] Polygon fundamentals failed:", err instanceof Error ? err.message : err);
      }
    }
    if (!isYahooFinanceEnabled()) return polygonPartial;
    const modules = FUNDAMENTAL_MODULES.join(",");
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
    try {
      const res = await fetchWithRetry(url);
      const data = (await res.json()) as {
        quoteSummary?: {
          result?: Array<Record<string, unknown>>;
          error?: { description?: string };
        };
      };
      const row = data.quoteSummary?.result?.[0];
      if (!row) return polygonPartial;

      const present: string[] = [];
      const missing: string[] = [];
      for (const m of FUNDAMENTAL_MODULES) {
        if (row[m] != null) present.push(m);
        else missing.push(m);
      }

      const price = row.price as
        | { shortName?: string; marketCap?: YahooRawNumber }
        | undefined;
      const profile = row.assetProfile as { sector?: string; industry?: string } | undefined;
      const summary = row.summaryDetail as
        | {
            trailingPE?: YahooRawNumber;
            dividendYield?: YahooRawNumber;
            dividendRate?: YahooRawNumber;
          }
        | undefined;
      const keys = row.defaultKeyStatistics as
        | { priceToBook?: YahooRawNumber; trailingPE?: YahooRawNumber }
        | undefined;
      const fin = row.financialData as
        | {
            returnOnEquity?: YahooRawNumber;
            debtToEquity?: YahooRawNumber;
            recommendationKey?: string;
            recommendationMean?: YahooRawNumber;
          }
        | undefined;
      const cashflow = row.cashflowStatementHistory as
        | {
            cashflowStatements?: Array<{ repurchaseOfStock?: YahooRawNumber }>;
          }
        | undefined;
      const repurchase = rawNum(cashflow?.cashflowStatements?.[0]?.repurchaseOfStock ?? null);

      return {
        symbol,
        shortName: price?.shortName,
        sector: profile?.sector,
        industry: profile?.industry,
        trailingPE: rawNum(summary?.trailingPE ?? keys?.trailingPE ?? null),
        priceToBook: rawNum(keys?.priceToBook ?? null),
        returnOnEquity: normalizeRoe(rawNum(fin?.returnOnEquity ?? null)),
        debtToEquity: normalizeDebtToEquity(rawNum(fin?.debtToEquity ?? null)),
        dividendYield: rawNum(summary?.dividendYield ?? null),
        dividendRate: rawNum(summary?.dividendRate ?? null),
        recommendationKey: fin?.recommendationKey ?? null,
        recommendationMean: rawNum(fin?.recommendationMean ?? null),
        marketCap: rawNum(price?.marketCap ?? null),
        repurchaseOfStock: repurchase,
        modulesPresent: present,
        modulesMissing: missing,
      };
    } catch {
      return polygonPartial;
    }
  });
}

/** Analyst upgrade / downgrade history from quoteSummary. */
export async function getUpgradeDowngradeHistory(
  ticker: string,
): Promise<{ status: "OK" | "NO_DATA"; items: YahooRatingChange[]; detail: string }> {
  if (!isYahooFinanceEnabled()) {
    return { status: "NO_DATA", items: [], detail: "Yahoo Finance disabled" };
  }
  const symbol = ticker.trim().toUpperCase();
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=upgradeDowngradeHistory`;
  try {
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as {
      quoteSummary?: {
        result?: Array<{
          upgradeDowngradeHistory?: {
            history?: Array<{
              epochGradeDate?: number;
              firm?: string;
              toGrade?: string;
              fromGrade?: string;
              action?: string;
            }>;
          };
        }>;
      };
    };
    const history = data.quoteSummary?.result?.[0]?.upgradeDowngradeHistory?.history ?? [];
    if (!history.length) {
      return {
        status: "NO_DATA",
        items: [],
        detail: "No upgradeDowngradeHistory in Yahoo quoteSummary",
      };
    }
    const items: YahooRatingChange[] = history.slice(0, 12).map((h) => ({
      date:
        typeof h.epochGradeDate === "number"
          ? new Date(h.epochGradeDate * 1000).toISOString()
          : "NO_DATA",
      firm: h.firm ?? "NO_DATA",
      toGrade: h.toGrade ?? "",
      fromGrade: h.fromGrade ?? "",
      action: h.action ?? "",
    }));
    return { status: "OK", items, detail: `${items.length} rating events` };
  } catch (err) {
    return {
      status: "NO_DATA",
      items: [],
      detail: err instanceof Error ? err.message : "upgradeDowngradeHistory failed",
    };
  }
}

/**
 * Dividends + splits via Yahoo chart events (best-effort).
 * Returns NO_DATA when events module is absent.
 */
export async function getYahooCorporateEvents(
  ticker: string,
  range = "10y",
): Promise<{
  status: "OK" | "NO_DATA";
  dividends: YahooCorporateEvent[];
  splits: YahooCorporateEvent[];
  detail: string;
}> {
  if (!isYahooFinanceEnabled()) {
    return {
      status: "NO_DATA",
      dividends: [],
      splits: [],
      detail: "Yahoo Finance disabled",
    };
  }
  const symbol = ticker.trim().toUpperCase();
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=${encodeURIComponent(range)}&events=div%7Csplit`;
  try {
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          events?: {
            dividends?: Record<string, { amount?: number; date?: number }>;
            splits?: Record<
              string,
              { date?: number; numerator?: number; denominator?: number; splitRatio?: string }
            >;
          };
        }>;
      };
    };
    const events = data.chart?.result?.[0]?.events;
    if (!events) {
      return {
        status: "NO_DATA",
        dividends: [],
        splits: [],
        detail: "No chart events (div|split) from Yahoo",
      };
    }
    const dividends: YahooCorporateEvent[] = Object.values(events.dividends ?? {})
      .filter((d) => typeof d.date === "number")
      .map((d) => ({
        type: "dividend" as const,
        date: new Date((d.date as number) * 1000).toISOString(),
        amount: Number.isFinite(Number(d.amount)) ? Number(d.amount) : undefined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const splits: YahooCorporateEvent[] = Object.values(events.splits ?? {})
      .filter((s) => typeof s.date === "number")
      .map((s) => ({
        type: "split" as const,
        date: new Date((s.date as number) * 1000).toISOString(),
        splitRatio:
          s.splitRatio ??
          (s.numerator != null && s.denominator != null
            ? `${s.numerator}:${s.denominator}`
            : undefined),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      status: "OK",
      dividends,
      splits,
      detail: `${dividends.length} dividends · ${splits.length} splits`,
    };
  } catch (err) {
    return {
      status: "NO_DATA",
      dividends: [],
      splits: [],
      detail: err instanceof Error ? err.message : "corporate events failed",
    };
  }
}

export type EarningsHorizonResult =
  | { status: "CLEAR"; detail: string; hoursUntil: number | null }
  | { status: "HAS_EVENT"; detail: string; hoursUntil: number }
  | { status: "NO_DATA"; detail: string; hoursUntil: null };

/**
 * Best-effort earnings window via Yahoo quoteSummary calendarEvents.
 * Returns NO_DATA when the module is missing — callers should not fail closed unless configured.
 */
export async function getEarningsWithinHours(
  ticker: string,
  withinHours: number,
): Promise<EarningsHorizonResult> {
  if (!isYahooFinanceEnabled()) {
    return { status: "NO_DATA", detail: "Yahoo Finance disabled", hoursUntil: null };
  }
  const symbol = ticker.trim().toUpperCase();
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=calendarEvents`;
  try {
    const res = await fetchWithRetry(url);
    const data = (await res.json()) as {
      quoteSummary?: {
        result?: Array<{
          calendarEvents?: {
            earnings?: {
              earningsDate?: Array<{ raw?: number; fmt?: string }>;
            };
          };
        }>;
      };
    };
    const earningsDates = data.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate ?? [];
    if (!earningsDates.length) {
      return {
        status: "NO_DATA",
        detail: "No calendarEvents.earningsDate in Yahoo quoteSummary",
        hoursUntil: null,
      };
    }
    const now = Date.now();
    const horizonMs = withinHours * 3_600_000;
    let nearestHours: number | null = null;
    for (const d of earningsDates) {
      const raw = d.raw;
      if (raw == null || !Number.isFinite(raw)) continue;
      const ms = raw * 1000;
      const hoursUntil = (ms - now) / 3_600_000;
      if (hoursUntil < 0) continue;
      if (nearestHours == null || hoursUntil < nearestHours) nearestHours = hoursUntil;
      if (ms >= now && ms <= now + horizonMs) {
        return {
          status: "HAS_EVENT",
          detail: d.fmt ? `earnings ${d.fmt}` : `earnings in ${hoursUntil.toFixed(1)}h`,
          hoursUntil,
        };
      }
    }
    return {
      status: "CLEAR",
      detail:
        nearestHours != null
          ? `Next earnings ~${nearestHours.toFixed(1)}h out (outside ${withinHours}h window)`
          : `No upcoming earnings in Yahoo calendar within ${withinHours}h`,
      hoursUntil: nearestHours,
    };
  } catch (err) {
    return {
      status: "NO_DATA",
      detail: `Earnings calendar unavailable: ${err instanceof Error ? err.message : "error"}`,
      hoursUntil: null,
    };
  }
}

/** Yahoo chart intervals used for multi-timeframe analysis. */
export type YahooChartInterval = "1m" | "5m" | "15m" | "60m" | "1h" | "1d" | "1wk";

export type YahooOhlcvBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
};

/**
 * Multi-interval OHLCV. Polygon PRIMARY when keyed; then IBKR; Yahoo last.
 */
export async function getChartBars(
  ticker: string,
  interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];

  return getOrSetCached(
    cacheKey("yahoo-chart", symbol, interval, range),
    BARS_CACHE_TTL_MS,
    async () => {
      if (isPolygonEnabled()) {
        try {
          const { multiplier, timespan } = chartIntervalToPolygon(interval);
          const { from, to } = chartRangeToDates(range);
          const polygonBars = await fetchPolygonAggregates(symbol, multiplier, timespan, from, to);
          if (polygonBars.length > 0) return polygonBarsToYahoo(polygonBars);
        } catch (err) {
          console.warn(
            "[MarketData] Polygon chart failed:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      try {
        const ibkrBars = await fetchIbkrChartBars(symbol, interval, range);
        if (ibkrBars.length > 0) return ibkrBars;
      } catch (err) {
        console.warn("[MarketData] IBKR chart failed:", err instanceof Error ? err.message : err);
      }

      if (!isYahooFinanceEnabled()) return [];
      return fetchYahooChartBarsRaw(symbol, interval, range);
    },
  );
}

/** Daily OHLCV bars for RSI / indicators (last N days). */
export async function getDailyBars(ticker: string, range = "3mo"): Promise<
  Array<{ close: number; volume: number }>
> {
  const bars = await getChartBars(ticker, "1d", range);
  return bars.map((b) => ({ close: b.close, volume: b.volume }));
}

export function computeRsi(closes: readonly number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}
