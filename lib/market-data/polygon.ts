/**
 * @deprecated Polygon retired — Finnhub is the sole market data source.
 * Thin compatibility layer; all functions delegate to Finnhub or return empty.
 */

import "server-only";

import {
  getHistory as getAvHistory,
  isAlphaVantageEnabled,
} from "@/lib/market-data/alpha-vantage";
import {
  getForexQuote as finnhubGetForexQuote,
  getQuote as finnhubGetQuote,
  isFinnhubEnabled,
} from "@/lib/market-data/finnhub";
import type { YahooOhlcvBar, YahooQuote, YahooTickerInfo } from "@/lib/market-data/yahoo-finance";

export type PolygonTimespan = "minute" | "hour" | "day" | "week";

export type PolygonQuote = {
  symbol: string;
  price: number;
  timestamp?: string;
  source: "finnhub";
  changePct?: number;
  volume?: number;
  avgVolume?: number;
  bid?: number;
  ask?: number;
  high52w?: number;
  low52w?: number;
  marketCap?: number;
  exchange?: string;
};

export type PolygonForexQuote = {
  from: string;
  to: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp?: string;
  source: "finnhub";
};

export type PolygonHistoryBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
};

export type PolygonTickerDetails = {
  symbol: string;
  name?: string;
  market?: string;
  primaryExchange?: string;
  type?: string;
  sicDescription?: string;
  marketCap?: number;
};

/** @deprecated Always false — use isFinnhubEnabled(). */
export function isPolygonEnabled(): boolean {
  return false;
}

export function normalizePolygonTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function chartIntervalToPolygon(
  interval: "1m" | "5m" | "15m" | "60m" | "1h" | "1d" | "1wk",
): { multiplier: number; timespan: PolygonTimespan } {
  switch (interval) {
    case "1m":
      return { multiplier: 1, timespan: "minute" };
    case "5m":
      return { multiplier: 5, timespan: "minute" };
    case "15m":
      return { multiplier: 15, timespan: "minute" };
    case "60m":
    case "1h":
      return { multiplier: 1, timespan: "hour" };
    case "1wk":
      return { multiplier: 1, timespan: "week" };
    default:
      return { multiplier: 1, timespan: "day" };
  }
}

export function chartRangeToDates(range: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  const r = range.trim().toLowerCase();
  if (r.endsWith("d")) from.setDate(from.getDate() - Number.parseInt(r, 10));
  else if (r.endsWith("mo")) from.setMonth(from.getMonth() - Number.parseInt(r, 10));
  else if (r.endsWith("y")) from.setFullYear(from.getFullYear() - Number.parseInt(r, 10));
  else from.setMonth(from.getMonth() - 3);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function toPolygonQuote(symbol: string, q: { c: number; h: number; l: number; pc: number }): PolygonQuote {
  const prev = q.pc > 0 ? q.pc : q.c;
  return {
    symbol,
    price: q.c,
    source: "finnhub",
    changePct: prev > 0 ? ((q.c - prev) / prev) * 100 : 0,
    bid: q.c,
    ask: q.c,
    high52w: q.h,
    low52w: q.l,
  };
}

export async function fetchPolygonForexOnly(pair: string): Promise<PolygonForexQuote | null> {
  if (!isFinnhubEnabled()) return null;
  const q = await finnhubGetForexQuote(pair);
  if (!q) return null;
  const codes = pair.replace("=X", "").toUpperCase();
  return {
    from: codes.slice(0, 3),
    to: codes.slice(3, 6),
    bid: q.bid,
    ask: q.ask,
    mid: q.mid,
    source: "finnhub",
  };
}

export async function getLastValue(ticker: string): Promise<PolygonQuote | null> {
  if (!isFinnhubEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  const q = await finnhubGetQuote(symbol);
  if (!q) return null;
  return toPolygonQuote(symbol, q);
}

export async function fetchPolygonAggregates(
  ticker: string,
  _multiplier: number,
  _timespan: PolygonTimespan,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  if (!isAlphaVantageEnabled()) return [];
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  const days = Number.isFinite(fromMs) && Number.isFinite(toMs)
    ? Math.max(1, Math.ceil((toMs - fromMs) / 86_400_000))
    : 90;
  const symbol = ticker.trim().toUpperCase();
  const bars = await getAvHistory(symbol, days);
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}

export async function fetchPolygonHistoryOnly(
  ticker: string,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  return fetchPolygonAggregates(ticker, 1, "day", from, to);
}

export async function fetchPolygonTickerDetails(_ticker: string): Promise<PolygonTickerDetails | null> {
  return null;
}

export function polygonDetailsToYahooInfo(details: PolygonTickerDetails): YahooTickerInfo {
  return {
    symbol: details.symbol,
    shortName: details.name,
    industry: details.sicDescription,
    marketCap: details.marketCap,
    exchange: details.primaryExchange ?? details.market,
  };
}

export async function getQuote(ticker: string): Promise<PolygonQuote | null> {
  return getLastValue(ticker);
}

export async function lV(ticker: string): Promise<PolygonQuote | null> {
  return getQuote(ticker);
}

export async function getHistory(
  ticker: string,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  return fetchPolygonHistoryOnly(ticker, from, to);
}

export async function getForexQuote(pair: string): Promise<PolygonForexQuote | null> {
  return fetchPolygonForexOnly(pair);
}

export async function getPolygonBatchQuotes(
  tickers: readonly string[],
): Promise<Map<string, YahooQuote>> {
  const { getBatchPrices } = await import("@/lib/market-data/yahoo-finance");
  return getBatchPrices(tickers);
}

export function polygonBarsToYahoo(bars: readonly PolygonHistoryBar[]): YahooOhlcvBar[] {
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}
