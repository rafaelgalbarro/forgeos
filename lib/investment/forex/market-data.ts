/**
 * FOREX live market data — IBKR IDEALPRO quotes/bars + Yahoo FX fallback.
 * Quotes cached ~1s for sub-second UI polls without hammering IBKR.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import { getBatchPrices, getChartBars, type YahooOhlcvBar } from "@/lib/market-data/yahoo-finance";
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
  source: "IBKR" | "YAHOO" | "NO_DATA";
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
  source: "IBKR" | "YAHOO" | "NO_DATA";
  bars: ForexCandle[];
  count: number;
  generatedAt: string;
  note: string;
};

const QUOTES_TTL_MS = 900;

function yahooSymbol(pair: ForexIbkrContract): string {
  return `${pair.pairId}=X`;
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

async function loadIbkrQuotesRaw(): Promise<ForexLiveQuote[]> {
  const now = new Date().toISOString();
  try {
    const data = await ibkrServiceFetch<{
      quotes?: Array<{
        pairId: string;
        display?: string;
        bid?: number | null;
        ask?: number | null;
        mid?: number | null;
        spreadPips?: number | null;
      }>;
    }>("/api/forex/quotes");
    return (data.quotes ?? []).map((q) => ({
      pairId: q.pairId,
      display: q.display ?? q.pairId,
      bid: typeof q.bid === "number" ? q.bid : null,
      ask: typeof q.ask === "number" ? q.ask : null,
      mid: typeof q.mid === "number" ? q.mid : null,
      spreadPips: typeof q.spreadPips === "number" ? q.spreadPips : null,
      source: q.bid != null && q.ask != null ? ("IBKR" as const) : ("NO_DATA" as const),
      updatedAt: now,
    }));
  } catch {
    return [];
  }
}

async function yahooFallbackQuotes(): Promise<ForexLiveQuote[]> {
  const now = new Date().toISOString();
  const map = await getBatchPrices(FOREX_PAIRS.map((p) => yahooSymbol(p))).catch(() => new Map());
  return FOREX_PAIRS.map((p) => {
    const q = map.get(yahooSymbol(p));
    if (!q || !Number.isFinite(q.price)) {
      return {
        pairId: p.pairId,
        display: p.display,
        bid: null,
        ask: null,
        mid: null,
        spreadPips: null,
        source: "NO_DATA" as const,
        updatedAt: now,
      };
    }
    const mid = q.price;
    const half = p.jpyQuoted ? 0.005 : 0.00005;
    const bid = mid - half;
    const ask = mid + half;
    return {
      pairId: p.pairId,
      display: p.display,
      bid,
      ask,
      mid,
      spreadPips: priceToPips(p, bid, ask),
      source: "YAHOO" as const,
      updatedAt: now,
    };
  });
}

/** Live bid/ask for all 9 pairs — ~1s in-memory TTL. */
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

  let quotes = await loadIbkrQuotesRaw();
  if (quotes.every((q) => q.mid == null)) {
    quotes = await yahooFallbackQuotes();
  } else {
    const missing = FOREX_PAIRS.filter((p) => !quotes.some((q) => q.pairId === p.pairId && q.mid != null));
    if (missing.length) {
      const yahoo = await yahooFallbackQuotes();
      const byId = new Map(quotes.map((q) => [q.pairId, q]));
      for (const m of missing) {
        const y = yahoo.find((q) => q.pairId === m.pairId);
        if (y) byId.set(m.pairId, y);
      }
      quotes = FOREX_PAIRS.map(
        (p) =>
          byId.get(p.pairId) ?? {
            pairId: p.pairId,
            display: p.display,
            bid: null,
            ask: null,
            mid: null,
            spreadPips: null,
            source: "NO_DATA" as const,
            updatedAt: new Date().toISOString(),
          },
      );
    }
  }

  const generatedAt = new Date().toISOString();
  setCached(key, { quotes, generatedAt }, QUOTES_TTL_MS);
  return { quotes, generatedAt, fromCache: false };
}

async function loadIbkrBars(pairId: string, tf: ForexTimeframe): Promise<ForexCandle[]> {
  const spec = FOREX_TF_SPECS[tf];
  try {
    const data = await ibkrServiceFetch<{
      bars?: Array<{
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        date?: string;
      }>;
    }>(
      `/api/forex/history?pair=${encodeURIComponent(pairId)}` +
        `&duration=${encodeURIComponent(spec.ibkrDuration)}` +
        `&barSize=${encodeURIComponent(spec.ibkrBarSize)}`,
    );
    return (data.bars ?? [])
      .map((b) =>
        toCandle({
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: Number(b.volume ?? 0),
          date: b.date,
        }),
      )
      .filter((b): b is ForexCandle => b != null);
  } catch {
    return [];
  }
}

async function loadYahooBars(pair: ForexIbkrContract, tf: ForexTimeframe): Promise<ForexCandle[]> {
  const spec = FOREX_TF_SPECS[tf];
  const raw: YahooOhlcvBar[] = await getChartBars(
    yahooSymbol(pair),
    spec.yahooInterval,
    spec.yahooRange,
  ).catch(() => []);
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
  return aggregateBars(candles, spec.aggregate);
}

/** OHLCV for one pair/timeframe — IBKR first, Yahoo FX fallback. */
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

  let bars = await loadIbkrBars(pairId, timeframe);
  let source: ForexHistoryResult["source"] = bars.length > 0 ? "IBKR" : "NO_DATA";

  if (bars.length < 10 && pair) {
    const yahoo = await loadYahooBars(pair, timeframe);
    if (yahoo.length > bars.length) {
      bars = yahoo;
      source = "YAHOO";
    }
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
        ? `${bars.length} velas ${timeframe} via ${source}`
        : "NO_DATA — sin historial IBKR/Yahoo para este TF",
  };
  // Short TF refresh often; daily slower
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
