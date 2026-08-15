import "server-only";

import { cacheKey, getCached, getOrSetCached, setCached } from "@/lib/market-data/cache";
import {
  BARS_CACHE_TTL_MS,
  FUNDAMENTALS_CACHE_TTL_MS,
  PRICE_CACHE_TTL_MS,
  getDataRefreshPolicy,
} from "@/lib/market-data/refresh-policy";

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

function envBool(name: string, defaultValue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export function isYahooFinanceEnabled(): boolean {
  return envBool("USE_YAHOO_FINANCE", true);
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = MAX_RETRIES): Promise<Response> {
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
      if (res.status === 429 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
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

/** Batch quotes — up to ~200 symbols per Yahoo request; 5m in-memory TTL (hits <100ms). */
export async function getBatchPrices(tickers: readonly string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (!isYahooFinanceEnabled() || tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const ttl = getDataRefreshPolicy().priceTtlMs || PRICE_CACHE_TTL_MS;
  const missing: string[] = [];

  for (const symbol of unique) {
    const hit = getCached<YahooQuote>(cacheKey("yahoo-quote", symbol));
    if (hit) out.set(symbol, hit);
    else missing.push(symbol);
  }

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const chunk = missing.slice(i, i + BATCH_SIZE);
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
    }
  }
  return out;
}

/** Fundamentals + metadata for one ticker. */
export async function getTickerInfo(ticker: string): Promise<YahooTickerInfo | null> {
  if (!isYahooFinanceEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  return getOrSetCached(cacheKey("yahoo-info", symbol), FUNDAMENTALS_CACHE_TTL_MS, async () => {
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
 * Missing modules are listed — callers should render NO_DATA, never invent.
 * Cached 1 hour.
 */
export async function getYahooFundamentals(ticker: string): Promise<YahooFundamentals | null> {
  if (!isYahooFinanceEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  return getOrSetCached(cacheKey("yahoo-fundamentals", symbol), FUNDAMENTALS_CACHE_TTL_MS, async () => {
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
      if (!row) return null;

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
      return null;
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
export type YahooChartInterval = "5m" | "60m" | "1h" | "1d" | "1wk";

export type YahooOhlcvBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
};

/**
 * Multi-interval OHLCV via Yahoo chart API.
 * Intervals: 5m, 60m/1h, 1d, 1wk. Returns [] on failure / disabled.
 */
export async function getChartBars(
  ticker: string,
  interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  if (!isYahooFinanceEnabled()) return [];
  const symbol = ticker.trim().toUpperCase();
  return getOrSetCached(
    cacheKey("yahoo-chart", symbol, interval, range),
    BARS_CACHE_TTL_MS,
    async () => {
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
