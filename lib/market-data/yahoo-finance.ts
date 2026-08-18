import "server-only";

import { cacheKey, getOrSetCached } from "@/lib/market-data/cache";
import {
  getBatchQuotes,
  getCandles,
  getCandlesWithResolution,
  getQuote,
  isFinnhubEnabled,
  yahooIntervalToFinnhub,
  yahooRangeToUnix,
  type FinnhubOhlcvBar,
} from "@/lib/market-data/finnhub";
import { BARS_CACHE_TTL_MS } from "@/lib/market-data/refresh-policy";

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

/** @deprecated Yahoo retired — returns Finnhub availability. */
export function isYahooFinanceEnabled(): boolean {
  return isFinnhubEnabled();
}

function finnhubQuoteToYahoo(symbol: string, q: { c: number; h: number; l: number; pc: number }): YahooQuote {
  const price = q.c;
  const prev = q.pc > 0 ? q.pc : price;
  const changePct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
  return {
    symbol,
    price,
    changePct,
    volume: 0,
    avgVolume: 0,
    high52w: q.h > 0 ? q.h : price,
    low52w: q.l > 0 ? q.l : price,
    bid: price,
    ask: price,
  };
}

function finnhubBarsToYahoo(bars: readonly FinnhubOhlcvBar[]): YahooOhlcvBar[] {
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}

/** @deprecated IBKR market data disabled — use Finnhub. */
export async function fetchIbkrQuoteForTicker(_ticker: string): Promise<YahooQuote | null> {
  return null;
}

/** @deprecated IBKR market data disabled — use Finnhub. */
export async function fetchIbkrChartBars(
  _ticker: string,
  _interval: YahooChartInterval,
  _range: string,
): Promise<YahooOhlcvBar[]> {
  return [];
}

/** Single-ticker quote via Finnhub /quote. */
export async function fetchYahooQuoteSingle(ticker: string): Promise<YahooQuote | null> {
  if (!isFinnhubEnabled()) return null;
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;
  const q = await getQuote(symbol);
  if (!q) return null;
  return finnhubQuoteToYahoo(symbol, q);
}

/** Daily chart bars via Finnhub candles. */
export async function fetchYahooChartBarsRaw(
  ticker: string,
  interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  if (!isFinnhubEnabled()) return [];
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  const resolution = yahooIntervalToFinnhub(interval);
  const { from, to } = yahooRangeToUnix(range);
  const forex = symbol.endsWith("=X") || (symbol.length === 6 && symbol.includes("USD"));
  const bars = await getCandlesWithResolution(symbol, resolution, from, to, forex);
  return finnhubBarsToYahoo(bars);
}

/** Batch quotes — Finnhub only. */
export async function getBatchPrices(tickers: readonly string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (tickers.length === 0 || !isFinnhubEnabled()) return out;

  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const quotes = await getBatchQuotes(unique);
  for (const [symbol, q] of quotes) {
    out.set(symbol, finnhubQuoteToYahoo(symbol, q));
  }
  return out;
}

/** Fundamentals — Finnhub free tier has no quoteSummary; returns null. */
export async function getTickerInfo(_ticker: string): Promise<YahooTickerInfo | null> {
  return null;
}

export function normalizeDebtToEquity(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value > 5) return value / 100;
  return value;
}

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
  returnOnEquity: number | null;
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

/** @deprecated Yahoo fundamentals disabled — Finnhub free tier has no ratios module. */
export async function getYahooFundamentals(_ticker: string): Promise<YahooFundamentals | null> {
  return null;
}

export async function getUpgradeDowngradeHistory(
  _ticker: string,
): Promise<{ status: "OK" | "NO_DATA"; items: YahooRatingChange[]; detail: string }> {
  return { status: "NO_DATA", items: [], detail: "Yahoo fundamentals disabled — Finnhub only for prices" };
}

export async function getYahooCorporateEvents(
  _ticker: string,
  _range = "10y",
): Promise<{
  status: "OK" | "NO_DATA";
  dividends: YahooCorporateEvent[];
  splits: YahooCorporateEvent[];
  detail: string;
}> {
  return {
    status: "NO_DATA",
    dividends: [],
    splits: [],
    detail: "Yahoo corporate events disabled — Finnhub only for prices",
  };
}

export type EarningsHorizonResult =
  | { status: "CLEAR"; detail: string; hoursUntil: number | null }
  | { status: "HAS_EVENT"; detail: string; hoursUntil: number }
  | { status: "NO_DATA"; detail: string; hoursUntil: null };

export async function getEarningsWithinHours(
  _ticker: string,
  _withinHours: number,
): Promise<EarningsHorizonResult> {
  return {
    status: "NO_DATA",
    detail: "Earnings calendar unavailable — Finnhub only for prices",
    hoursUntil: null,
  };
}

export type YahooChartInterval = "1m" | "5m" | "15m" | "60m" | "1h" | "1d" | "1wk";

export type YahooOhlcvBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: string;
};

/** Multi-interval OHLCV — Finnhub only. */
export async function getChartBars(
  ticker: string,
  interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || !isFinnhubEnabled()) return [];

  return getOrSetCached(
    cacheKey("finnhub-chart", symbol, interval, range),
    BARS_CACHE_TTL_MS,
    async () => {
      if (interval === "1d" && (range === "3mo" || range === "90d")) {
        const days = range.startsWith("3") ? 90 : 90;
        const bars = await getCandles(symbol, days);
        if (bars.length > 0) return finnhubBarsToYahoo(bars);
      }
      const resolution = yahooIntervalToFinnhub(interval);
      const { from, to } = yahooRangeToUnix(range);
      const forex = symbol.endsWith("=X");
      const bars = await getCandlesWithResolution(symbol, resolution, from, to, forex);
      return finnhubBarsToYahoo(bars);
    },
  );
}

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
