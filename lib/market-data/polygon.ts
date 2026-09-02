/**
 * @deprecated Polygon retired — FMP is the sole market data source.
 * Thin compatibility layer; all functions delegate to FMP or return empty.
 */

import "server-only";

import {
  getForexQuote as fmpGetForexQuote,
  getHistory as fmpGetHistory,
  getQuote as fmpGetQuote,
  isFmpEnabled,
  normalizeFmpForexSymbol,
} from "@/lib/market-data/fmp";
import type { YahooOhlcvBar, YahooQuote, YahooTickerInfo } from "@/lib/market-data/yahoo-finance";

export type PolygonTimespan = "minute" | "hour" | "day" | "week";

export type PolygonQuote = {
  symbol: string;
  price: number;
  timestamp?: string;
  source: "fmp";
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
  source: "fmp";
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

/** Compatibility: true when FMP is configured. */
export function isPolygonEnabled(): boolean {
  return isFmpEnabled();
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

export async function fetchPolygonForexOnly(pair: string): Promise<PolygonForexQuote | null> {
  if (!isFmpEnabled()) return null;
  const q = await fmpGetForexQuote(pair);
  if (!q || q.price <= 0) return null;
  const codes = normalizeFmpForexSymbol(pair);
  return {
    from: codes.slice(0, 3),
    to: codes.slice(3, 6),
    bid: q.price,
    ask: q.price,
    mid: q.price,
    source: "fmp",
  };
}

export async function getLastValue(ticker: string): Promise<PolygonQuote | null> {
  if (!isFmpEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  const q = await fmpGetQuote(symbol);
  if (!q) return null;
  return {
    symbol,
    price: q.price,
    source: "fmp",
    changePct: q.changePercentage,
    volume: q.volume,
    avgVolume: q.avgVolume,
    bid: q.price,
    ask: q.price,
    high52w: q.yearHigh ?? q.dayHigh,
    low52w: q.yearLow ?? q.dayLow,
    marketCap: q.marketCap,
    exchange: q.exchange,
  };
}

export async function fetchPolygonAggregates(
  ticker: string,
  _multiplier: number,
  _timespan: PolygonTimespan,
  from: string,
  to: string,
): Promise<PolygonHistoryBar[]> {
  if (!isFmpEnabled()) return [];
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  const days = Number.isFinite(fromMs) && Number.isFinite(toMs)
    ? Math.max(1, Math.ceil((toMs - fromMs) / 86_400_000))
    : 90;
  const symbol = ticker.trim().toUpperCase();
  const bars = await fmpGetHistory(symbol, days);
  const fromDay = from.slice(0, 10);
  const toDay = to.slice(0, 10);
  return bars
    .filter((b) => (!fromDay || b.date >= fromDay) && (!toDay || b.date <= toDay))
    .map((b) => ({
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
