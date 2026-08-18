/**
 * FOREX market data — FMP stable quotes + EOD history.
 * IBKR is not used for prices (orders/account only).
 */

import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import {
  getBatchQuotes,
  getForexHistory as getFmpForexHistory,
  getFmpQuoteTtlMs,
  isFmpEnabled,
} from "@/lib/market-data/fmp";
import {
  FOREX_PAIRS,
  getForexPair,
  type ForexIbkrContract,
  type ForexPairId,
} from "@/lib/investment/forex/config";
import type { ForexBar } from "@/lib/investment/forex/indicators";
import {
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
  source: "FMP" | "NO_DATA";
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
  source: "FMP" | "NO_DATA";
  bars: ForexCandle[];
  count: number;
  generatedAt: string;
  note: string;
};

const QUOTES_TTL_MS = getFmpQuoteTtlMs;
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

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

function historyDays(tf: ForexTimeframe): number {
  if (tf === "1d") return 180;
  if (tf === "4h") return 120;
  return 100;
}

async function loadFmpForexQuotes(): Promise<ForexLiveQuote[]> {
  const now = new Date().toISOString();
  if (!isFmpEnabled()) return FOREX_PAIRS.map((p) => emptyQuote(p, now));

  const ids = FOREX_PAIRS.map((p) => p.pairId);
  const map = await getBatchQuotes(ids);
  return FOREX_PAIRS.map((p) => {
    const q = map.get(p.pairId);
    if (!q || !Number.isFinite(q.price) || q.price <= 0) return emptyQuote(p, now);
    return {
      pairId: p.pairId,
      display: p.display,
      bid: q.price,
      ask: q.price,
      mid: q.price,
      spreadPips: null,
      source: "FMP" as const,
      updatedAt: now,
    };
  });
}

/** Live quotes for all 9 pairs — one FMP /stable/quote batch call. */
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

  const quotes = await loadFmpForexQuotes();
  const generatedAt = new Date().toISOString();
  setCached(key, { quotes, generatedAt }, QUOTES_TTL_MS());
  return { quotes, generatedAt, fromCache: false };
}

/** OHLCV for one pair — FMP EOD daily (intraday TFs reuse daily bars). */
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

  if (pair && isFmpEnabled()) {
    const raw = await getFmpForexHistory(pair.pairId, historyDays(timeframe));
    bars = raw
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
    if (bars.length > 0) source = "FMP";
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
        ? `${bars.length} velas diarias via FMP (EOD; TF ${timeframe} reusa daily)`
        : "NO_DATA — sin historial FMP para este par",
  };
  if (bars.length > 0) setCached(cacheId, result, HISTORY_TTL_MS);
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
