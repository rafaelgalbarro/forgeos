/**
 * FOREX market data — IBKR IDEALPRO (Finnhub free tier has no OANDA/FOREX).
 * Stocks use Finnhub; FOREX history + quotes come from ibkr-broker.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import { getFinnhubQuoteTtlMs } from "@/lib/market-data/finnhub";
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
  source: "IBKR" | "NO_DATA";
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
  source: "IBKR" | "NO_DATA";
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

function mapIbkrBars(
  bars: Array<{
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    date?: string;
  }>,
): ForexCandle[] {
  return bars
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
}

async function loadIbkrForexQuotes(): Promise<ForexLiveQuote[]> {
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
    const fromDedicated = (data.quotes ?? []).map((q) => ({
      pairId: q.pairId,
      display: q.display ?? q.pairId,
      bid: typeof q.bid === "number" ? q.bid : null,
      ask: typeof q.ask === "number" ? q.ask : null,
      mid: typeof q.mid === "number" ? q.mid : null,
      spreadPips: typeof q.spreadPips === "number" ? q.spreadPips : null,
      source: q.mid != null ? ("IBKR" as const) : ("NO_DATA" as const),
      updatedAt: now,
    }));
    if (fromDedicated.some((q) => q.mid != null)) return fromDedicated;
  } catch {
    /* fall through to per-pair /api/ibkr/quote */
  }

  return Promise.all(
    FOREX_PAIRS.map(async (p) => {
      try {
        const params = new URLSearchParams({
          symbol: p.symbol,
          currency: p.currency,
          exchange: p.exchange,
          secType: p.secType,
        });
        const data = await ibkrServiceFetch<{
          bid?: number | null;
          ask?: number | null;
          last?: number | null;
          mid?: number | null;
        }>(`/api/ibkr/quote?${params.toString()}`);
        const bid = typeof data.bid === "number" ? data.bid : null;
        const ask = typeof data.ask === "number" ? data.ask : null;
        const mid =
          typeof data.mid === "number"
            ? data.mid
            : typeof data.last === "number"
              ? data.last
              : bid != null && ask != null
                ? (bid + ask) / 2
                : null;
        return {
          pairId: p.pairId,
          display: p.display,
          bid,
          ask,
          mid,
          spreadPips: bid != null && ask != null ? priceToPips(p, bid, ask) : null,
          source: mid != null ? ("IBKR" as const) : ("NO_DATA" as const),
          updatedAt: now,
        };
      } catch {
        return emptyQuote(p, now);
      }
    }),
  );
}

/** Live bid/ask for all 9 pairs — IBKR IDEALPRO. */
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

  const quotes = await loadIbkrForexQuotes();
  const generatedAt = new Date().toISOString();
  setCached(key, { quotes, generatedAt }, QUOTES_TTL_MS());
  return { quotes, generatedAt, fromCache: false };
}

async function loadIbkrForexBars(pair: ForexIbkrContract, tf: ForexTimeframe): Promise<ForexCandle[]> {
  const spec = FOREX_TF_SPECS[tf];
  try {
    const params = new URLSearchParams({
      symbol: pair.symbol,
      currency: pair.currency,
      exchange: pair.exchange,
      secType: pair.secType,
      duration: spec.ibkrDuration,
      barSize: spec.ibkrBarSize,
      whatToShow: "MIDPOINT",
    });
    const data = await ibkrServiceFetch<{
      bars?: Array<{
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        date?: string;
      }>;
    }>(`/api/ibkr/history?${params.toString()}`);
    const bars = mapIbkrBars(data.bars ?? []);
    if (bars.length > 0) return aggregateBars(bars, spec.aggregate);
  } catch {
    /* dedicated FOREX history next */
  }

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
      `/api/forex/history?pair=${encodeURIComponent(pair.pairId)}` +
        `&duration=${encodeURIComponent(spec.ibkrDuration)}` +
        `&barSize=${encodeURIComponent(spec.ibkrBarSize)}`,
    );
    return aggregateBars(mapIbkrBars(data.bars ?? []), spec.aggregate);
  } catch {
    return [];
  }
}

/** OHLCV for one pair/timeframe — IBKR IDEALPRO. */
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

  if (pair) {
    bars = await loadIbkrForexBars(pair, timeframe);
    if (bars.length > 0) source = "IBKR";
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
        ? `${bars.length} velas ${timeframe} via IBKR`
        : "NO_DATA — sin historial IBKR para este TF",
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
