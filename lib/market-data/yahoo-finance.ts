import "server-only";

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

/** Batch quotes — up to ~200 symbols per Yahoo request; chunks larger lists automatically. */
export async function getBatchPrices(tickers: readonly string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (!isYahooFinanceEnabled() || tickers.length === 0) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const chunk = unique.slice(i, i + BATCH_SIZE);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk.join(","))}`;
    try {
      const res = await fetchWithRetry(url);
      const data = (await res.json()) as { quoteResponse?: { result?: Record<string, unknown>[] } };
      for (const row of data.quoteResponse?.result ?? []) {
        const q = parseQuoteRow(row);
        if (q) out.set(q.symbol, q);
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
