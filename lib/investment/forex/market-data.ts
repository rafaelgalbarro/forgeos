/**
 * FOREX live market data — Finnhub only (OANDA:EUR_USD candles + quotes).
 * IBKR reserved for order execution, not market data.
 */

import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import {
  getBatchForexQuotes,
  getFinnhubQuoteTtlMs,
  getCandlesWithResolution,
  getForexCandles,
  isFinnhubEnabled,
  yahooIntervalToFinnhub,
  yahooRangeToUnix,
} from "@/lib/market-data/finnhub";
import {
  FOREX_PAIRS,
  getForexPair,
  priceToPips,
  type ForexIbkrContract,
  type ForexPairId,
} from "@/lib/investment/forex/config";
import type { ForexBar } from "@/lib/investment/forex/indicators";
import {
  FOREX_TF_SPECS,
  parseForexTimeframe,
  type ForexTimeframe,
} from "@/lib/investment/forex/timeframes";

export type ForexLiveQuote = {
  pairId: string;
  display: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  spreadPips: number | null;
  source: "FINNHUB" | "NO_DATA";
  updatedAt: string;
};

export type ForexCandle = ForexBar & {
  volume: number;
  time: string;
};

export type ForexHistoryResult = {
  pairId: string;
  display: string;
  timeframe: ForexTimeframe;
  source: "FINNHUB" | "NO_DATA";
  bars: ForexCandle[];
  count: number;
  generatedAt: string;
  note: string;
};

const QUOTES_TTL_MS = getFinnhubQuoteTtlMs;

function emptyQuote(p: ForexIbkrContract, now: string): ForexLiveQuote {
  return {
    pairId: p.pairId,
    display: p.display,
    bid: null,
    ask: null,
    mid: null,
    spreadPips: null,
    source: "NO_DATA",
    updatedAt: now,
  };
}

function toCandle(b: {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  date?: string;
  time?: string;
}): ForexCandle | null {
  if (![b.open, b.high, b.low, b.close].every((n) => Number.isFinite(n))) return null;
  const time = b.time ?? b.date ?? new Date().toISOString();
  return {
    time,
    date: time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: Number.isFinite(b.volume) ? Number(b.volume) : 0,
  };
}

function aggregateBars(bars: ForexCandle[], n: number): ForexCandle[] {
  if (n <= 1 || bars.length === 0) return bars;
  const out: ForexCandle[] = [];
  for (let i = 0; i < bars.length; i += n) {
    const chunk = bars.slice(i, i + n);
    if (chunk.length === 0) continue;
    const first = chunk[0]!;
    const last = chunk[chunk.length - 1]!;
    out.push({
      time: first.time,
      date: first.time,
      open: first.open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: last.close,
      volume: chunk.reduce((s, c) => s + (c.volume || 0), 0),
    });
  }
  return out;
}

async function loadFinnhubQuotesRaw(): Promise<ForexLiveQuote[]> {
  const now = new Date().toISOString();
  if (!isFinnhubEnabled()) return FOREX_PAIRS.map((p) => emptyQuote(p, now));

  const byPair = await getBatchForexQuotes(FOREX_PAIRS.map((p) => p.pairId));
  return FOREX_PAIRS.map((p) => {
    const q = byPair.get(p.pairId);
    if (!q || !Number.isFinite(q.mid) || q.mid <= 0) return emptyQuote(p, now);
    return {
      pairId: p.pairId,
      display: p.display,
      bid: q.bid,
      ask: q.ask,
      mid: q.mid,
      spreadPips: priceToPips(p, q.bid, q.ask),
      source: "FINNHUB" as const,
      updatedAt: q.updatedAt,
    };
  });
}

/** Live bid/ask for all 9 pairs — Finnhub OANDA quotes, ~1 min cache. */
export async function getForexLiveQuotes(): Promise<{
  quotes: ForexLiveQuote[];
  generatedAt: string;
  fromCache: boolean;
}> {
  const key = cacheKey("forex-live-quotes");
  const hit = getCached<{ quotes: ForexLiveQuote[]; generatedAt: string }>(key);
  if (hit) {
    return { quotes: hit.quotes, generatedAt: hit.generatedAt, fromCache: true };
  }

  const quotes = await loadFinnhubQuotesRaw();
  const generatedAt = new Date().toISOString();
  setCached(key, { quotes, generatedAt }, QUOTES_TTL_MS());
  return { quotes, generatedAt, fromCache: false };
}

async function loadFinnhubBars(pair: ForexIbkrContract, tf: ForexTimeframe): Promise<ForexCandle[]> {
  const spec = FOREX_TF_SPECS[tf];
  if (!isFinnhubEnabled()) return [];

  const resolution = yahooIntervalToFinnhub(spec.yahooInterval);
  const { from, to } = yahooRangeToUnix(spec.yahooRange);
  const raw = await getCandlesWithResolution(pair.pairId, resolution, from, to, true);
  const candles = raw
    .map((b) =>
      toCandle({
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        date: b.date,
      }),
    )
    .filter((b): b is ForexCandle => b != null);

  if (candles.length > 0) return aggregateBars(candles, spec.aggregate);

  const days =
    spec.yahooRange === "5d"
      ? 7
      : spec.yahooRange === "1mo"
        ? 35
        : spec.yahooRange === "3mo"
          ? 95
          : 180;
  const daily = await getForexCandles(pair.pairId, days);
  const dailyCandles = daily
    .map((b) =>
      toCandle({
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        date: b.date,
      }),
    )
    .filter((b): b is ForexCandle => b != null);
  return aggregateBars(dailyCandles, spec.aggregate);
}

/** OHLCV for one pair/timeframe — Finnhub only. */
export async function getForexHistory(
  pairIdRaw: string,
  timeframeRaw?: string | null,
): Promise<ForexHistoryResult> {
  const timeframe = parseForexTimeframe(timeframeRaw);
  const pair = getForexPair(pairIdRaw.toUpperCase() as ForexPairId);
  const pairId = pair?.pairId ?? pairIdRaw.toUpperCase();
  const display = pair?.display ?? pairId;
  const cacheId = cacheKey("forex-hist", pairId, timeframe);
  const cached = getCached<ForexHistoryResult>(cacheId);
  if (cached) return cached;

  let bars: ForexCandle[] = [];
  let source: ForexHistoryResult["source"] = "NO_DATA";

  if (pair && isFinnhubEnabled()) {
    bars = await loadFinnhubBars(pair, timeframe);
    if (bars.length > 0) source = "FINNHUB";
  }

  const result: ForexHistoryResult = {
    pairId,
    display,
    timeframe,
    source,
    bars,
    count: bars.length,
    generatedAt: new Date().toISOString(),
    note:
      bars.length > 0
        ? `${bars.length} velas ${timeframe} via Finnhub`
        : "NO_DATA — sin historial Finnhub para este TF",
  };
  const ttl =
    timeframe === "1m" || timeframe === "5m"
      ? 15_000
      : timeframe === "15m" || timeframe === "1h"
        ? 60_000
        : 5 * 60_000;
  setCached(cacheId, result, ttl);
  return result;
}

export async function getForexHistoryBatch(
  pairIds: readonly string[],
  timeframeRaw?: string | null,
): Promise<ForexHistoryResult[]> {
  const results: ForexHistoryResult[] = [];
  for (const id of pairIds) {
    results.push(await getForexHistory(id, timeframeRaw));
  }
  return results;
}
