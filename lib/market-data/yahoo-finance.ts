import "server-only";

import {
  getBatchQuotes,
  getForexHistory,
  getHistory,
  getQuote,
  isFmpEnabled,
  normalizeFmpForexSymbol,
  type FmpBar,
  type FmpQuote,
} from "@/lib/market-data/fmp";

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

/** Yahoo retired — FMP is the sole quotes/history source. */
export function isYahooFinanceEnabled(): boolean {
  return isFmpEnabled();
}

function isForexSymbol(ticker: string): boolean {
  const raw = ticker.trim().toUpperCase();
  if (raw.endsWith("=X") || raw.startsWith("OANDA:")) return true;
  const stripped = raw.replace("=X", "").replace("/", "").replace("_", "");
  return stripped.length === 6 && /^[A-Z]{6}$/.test(stripped);
}

function toFmpSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  if (!raw) return "";
  return isForexSymbol(raw) ? normalizeFmpForexSymbol(raw) : raw;
}

function fmpQuoteToYahoo(q: FmpQuote, requestedSymbol?: string): YahooQuote {
  const price = q.price;
  const changePct = Number.isFinite(q.changePercentage) ? q.changePercentage : 0;
  const high52w = q.yearHigh && q.yearHigh > 0 ? q.yearHigh : q.dayHigh > 0 ? q.dayHigh : price;
  const low52w = q.yearLow && q.yearLow > 0 ? q.yearLow : q.dayLow > 0 ? q.dayLow : price;
  return {
    symbol: requestedSymbol ?? q.symbol,
    price,
    changePct,
    volume: q.volume,
    avgVolume: q.avgVolume ?? 0,
    high52w,
    low52w,
    bid: price,
    ask: price,
    marketCap: q.marketCap,
    exchange: q.exchange,
  };
}

function fmpBarsToYahoo(bars: readonly FmpBar[]): YahooOhlcvBar[] {
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}

export function rangeToDays(range: string): number {
  const r = range.trim().toLowerCase();
  if (r.endsWith("d")) return Number.parseInt(r, 10) || 5;
  if (r.endsWith("mo")) return (Number.parseInt(r, 10) || 3) * 22;
  if (r.endsWith("y")) return (Number.parseInt(r, 10) || 1) * 252;
  if (r === "1wk" || r === "7d") return 7;
  return 66;
}

async function fetchFmpBars(ticker: string, range: string): Promise<YahooOhlcvBar[]> {
  if (!isFmpEnabled()) return [];
  const symbol = toFmpSymbol(ticker);
  if (!symbol) return [];
  const days = rangeToDays(range);
  const bars = isForexSymbol(ticker) ? await getForexHistory(symbol, days) : await getHistory(symbol, days);
  return fmpBarsToYahoo(bars);
}

/** @deprecated IBKR market data disabled — orders/account only. */
export async function fetchIbkrQuoteForTicker(_ticker: string): Promise<YahooQuote | null> {
  return null;
}

/** @deprecated IBKR market data disabled — orders/account only. */
export async function fetchIbkrChartBars(
  _ticker: string,
  _interval: YahooChartInterval,
  _range: string,
): Promise<YahooOhlcvBar[]> {
  return [];
}

/** Single-ticker quote via FMP /api/v3/quote/{ticker}. */
export async function fetchYahooQuoteSingle(ticker: string): Promise<YahooQuote | null> {
  if (!isFmpEnabled()) return null;
  const requested = ticker.trim().toUpperCase();
  const symbol = toFmpSymbol(requested);
  if (!symbol) return null;
  const q = await getQuote(symbol);
  if (!q) return null;
  return fmpQuoteToYahoo(q, requested);
}

/** Daily chart bars via FMP /api/v3/historical-price-full. */
export async function fetchYahooChartBarsRaw(
  ticker: string,
  _interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  return fetchFmpBars(symbol, range);
}

/** Batch quotes — one FMP /api/v3/quote/AAPL,NVDA call (chunked at 50). */
export async function getBatchPrices(tickers: readonly string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>();
  if (tickers.length === 0 || !isFmpEnabled()) return out;

  const requested = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const fmpSymbols = [...new Set(requested.map(toFmpSymbol).filter(Boolean))];
  const quotes = await getBatchQuotes(fmpSymbols);
  for (const symbol of requested) {
    const fmpSymbol = toFmpSymbol(symbol);
    const q = quotes.get(fmpSymbol);
    if (!q) continue;
    out.set(symbol, fmpQuoteToYahoo(q, symbol));
  }
  return out;
}

/** Fundamentals — FMP quote path does not include ratios; returns null. */
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

/** @deprecated Yahoo fundamentals disabled — FMP quotes/history only. */
export async function getYahooFundamentals(_ticker: string): Promise<YahooFundamentals | null> {
  return null;
}

export async function getUpgradeDowngradeHistory(
  _ticker: string,
): Promise<{ status: "OK" | "NO_DATA"; items: YahooRatingChange[]; detail: string }> {
  return { status: "NO_DATA", items: [], detail: "Yahoo fundamentals disabled — FMP only for prices" };
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
    detail: "Yahoo corporate events disabled — FMP only for prices",
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
    detail: "Earnings calendar unavailable — FMP only for prices",
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

/** Daily OHLCV — FMP EOD full (24h cache). Intraday intervals reuse daily bars. */
export async function getChartBars(
  ticker: string,
  _interval: YahooChartInterval = "1d",
  range = "3mo",
): Promise<YahooOhlcvBar[]> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return [];
  return fetchFmpBars(symbol, range);
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
