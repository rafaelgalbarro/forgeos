import "server-only";

import { cacheKey, getOrSetCached } from "@/lib/market-data/cache";
import {
  getForexHistory as getAvForexHistory,
  getHistory as getAvHistory,
  isAlphaVantageEnabled,
  rangeToDays,
  type AlphaVantageBar,
} from "@/lib/market-data/alpha-vantage";
import {
  getBatchQuotes,
  getQuote,
  isFinnhubEnabled,
} from "@/lib/market-data/finnhub";

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

/** @deprecated Yahoo retired — Finnhub quotes + Alpha Vantage history. */
export function isYahooFinanceEnabled(): boolean {
  return isFinnhubEnabled() || isAlphaVantageEnabled();
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

function avBarsToYahoo(bars: readonly AlphaVantageBar[]): YahooOhlcvBar[] {
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}

function isForexSymbol(ticker: string): boolean {
  const raw = ticker.trim().toUpperCase();
  if (raw.endsWith("=X") || raw.startsWith("OANDA:")) return true;
  const stripped = raw.replace("=X", "").replace("/", "");
  return stripped.length === 6 && /^[A-Z]{6}$/.test(stripped);
}

function parseForexPair(ticker: string): { from: string; to: string } | null {
  const raw = ticker.trim().toUpperCase().replace("=X", "").replace("/", "").replace("OANDA:", "").replace("_", "");
  if (raw.length === 6 && /^[A-Z]{6}$/.test(raw)) {
    return { from: raw.slice(0, 3), to: raw.slice(3) };
  }
  return null;
}

async function fetchAlphaVantageBars(ticker: string, range: string): Promise<YahooOhlcvBar[]> {
  if (!isAlphaVantageEnabled()) return [];
  const days = rangeToDays(range);
  if (isForexSymbol(ticker)) {
    const pair = parseForexPair(ticker);
    if (!pair) return [];
    return avBarsToYahoo(await getAvForexHistory(pair.from, pair.to, days));
  }
  return avBarsToYahoo(await getAvHistory(ticker, days));
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

/** Daily chart bars via Alpha Vantage TIME_SERIES_DAILY / FX_DAILY. */
export async function fetchYahooChartBarsRaw(
  ticker: string,
  _interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  return fetchAlphaVantageBars(symbol, range);
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

/** Daily OHLCV — Alpha Vantage (24h cache). Intraday intervals reuse daily bars. */
export async function getChartBars(
  ticker: string,
  _interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  return getOrSetCached(cacheKey("av-chart", symbol, range), 60_000, () =>
    fetchAlphaVantageBars(symbol, range),
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
