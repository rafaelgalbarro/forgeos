import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  getCandles,
  getForexQuote as finnhubGetForexQuote,
  getQuote as finnhubGetQuote,
  isFinnhubEnabled,
} from "@/lib/market-data/finnhub";
import { quoteRoutesForTicker, type TickerQuoteRoute } from "@/lib/trading/ticker-price-routes";
import {
  resolveLimitPriceFromQuote,
  type LiveLimitQuote,
} from "@/lib/trading/limit-price";
import { getOrSetIbkrCached, ibkrCacheKey } from "@/lib/trading/ibkr-cache";

type AccountTag = { value?: string; currency?: string };
type AccountMap = Record<string, Record<string, AccountTag>>;

function parseTagNumber(tags: Record<string, AccountTag> | undefined, tag: string): number {
  const raw = tags?.[tag]?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function primaryAccountId(): string {
  return (process.env.IBKR_ACCOUNT_ID ?? "").trim();
}

export type TradingAccountBreakdown = {
  accountId: string;
  nav: number;
  cash: number;
};

export type TradingAccountSnapshot = {
  navUSD: number;
  cashUSD: number;
  dailyPnlUSD: number;
  openPositionsCount: number;
  primaryAccountId: string | null;
  combinedNav: number;
  combinedCash: number;
  tradingCashUSD: number;
  accounts: TradingAccountBreakdown[];
};

export type TradingPriceSnapshot = {
  ticker: string;
  currentPrice: number;
  previousClose: number;
  bid: number;
  ask: number;
  change1d: number;
  high52w: number;
  low52w: number;
  volume: number;
  quoteSymbol: string;
  quoteExchange: string;
  quoteCurrency: string;
  quoteRoute: string;
  quoteErrors: readonly string[];
};

export type TradingPositionSnapshot = {
  shares: number;
  avgCost: number;
  unrealizedPnl: number;
};

/** Direct IBKR FastAPI read — cached 5 min for dashboard/scanners (not live approval). */
export async function fetchTradingAccountSnapshot(): Promise<TradingAccountSnapshot> {
  return getOrSetIbkrCached(ibkrCacheKey("account"), fetchTradingAccountSnapshotLive);
}

async function fetchTradingAccountSnapshotLive(): Promise<TradingAccountSnapshot> {
  const [account, positions] = await Promise.all([
    ibkrServiceFetch<AccountMap>("/api/ibkr/account"),
    ibkrServiceFetch<unknown[]>("/api/ibkr/positions").catch(() => []),
  ]);

  const ids = Object.keys(account ?? {});
  const accounts: TradingAccountBreakdown[] = ids.map((accountId) => ({
    accountId,
    nav: parseTagNumber(account[accountId], "NetLiquidation"),
    cash: parseTagNumber(account[accountId], "TotalCashValue"),
  }));

  const combinedNav = accounts.reduce((sum, row) => sum + row.nav, 0);
  const combinedCash = accounts.reduce((sum, row) => sum + row.cash, 0);
  const primary = primaryAccountId();
  const primaryRow = primary ? accounts.find((row) => row.accountId === primary) : undefined;
  const tradingCashUSD = primaryRow?.cash ?? combinedCash;
  const dailyPnlUSD = ids.reduce((sum, id) => {
    return (
      sum +
      parseTagNumber(account[id], "UnrealizedPnL") +
      parseTagNumber(account[id], "RealizedPnL")
    );
  }, 0);

  const openPositionsCount = Array.isArray(positions)
    ? positions.filter((p) => {
        const row = p as { position?: number; account?: string };
        if (typeof row.position !== "number" || Math.abs(row.position) <= 0) return false;
        if (primary && row.account && row.account !== primary) return false;
        return true;
      }).length
    : 0;

  return {
    navUSD: combinedNav,
    cashUSD: tradingCashUSD,
    dailyPnlUSD,
    openPositionsCount,
    primaryAccountId: primary || null,
    combinedNav,
    combinedCash,
    tradingCashUSD,
    accounts,
  };
}

export async function fetchTradingPrice(ticker: string): Promise<TradingPriceSnapshot> {
  return getOrSetIbkrCached(ibkrCacheKey("price", ticker), () => fetchTradingPriceLive(ticker));
}

async function fetchTradingPriceLive(ticker: string): Promise<TradingPriceSnapshot> {
  const routes = quoteRoutesForTicker(ticker);
  const quoteErrors: string[] = [];

  if (!isFinnhubEnabled()) {
    throw new Error(`FINNHUB_API_KEY required for price data — ${ticker}`);
  }

  const quote = await finnhubGetQuote(ticker);
  if (!quote || !Number.isFinite(quote.c) || quote.c <= 0) {
    throw new Error(`Finnhub sin precio para ${ticker}`);
  }

  const candles = await getCandles(ticker, 90);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  const currentPrice = quote.c;
  const prevClose = prev?.close ?? quote.pc ?? currentPrice;
  const route = routes[0];

  return {
    ticker,
    currentPrice,
    previousClose: prevClose,
    bid: currentPrice,
    ask: currentPrice,
    change1d: currentPrice - prevClose,
    high52w: Math.max(...candles.map((b) => b.high), quote.h, currentPrice),
    low52w: Math.min(
      ...candles.map((b) => b.low).filter((n) => n > 0),
      quote.l > 0 ? quote.l : currentPrice,
    ),
    volume: last?.volume ?? 0,
    quoteSymbol: route?.symbol ?? ticker,
    quoteExchange: route?.exchange ?? "FINNHUB",
    quoteCurrency: route?.currency ?? "USD",
    quoteRoute: route?.label ?? "Finnhub",
    quoteErrors,
  };
}

export async function fetchTradingPosition(
  ticker: string,
): Promise<TradingPositionSnapshot | undefined> {
  return getOrSetIbkrCached(ibkrCacheKey("position", ticker), () => fetchTradingPositionLive(ticker));
}

async function fetchTradingPositionLive(
  ticker: string,
): Promise<TradingPositionSnapshot | undefined> {
  const positions = await ibkrServiceFetch<
    Array<{
      symbol?: string;
      position?: number;
      avgCost?: number;
      unrealizedPnl?: number;
    }>
  >("/api/ibkr/positions");
  const pos = positions.find((p) => (p.symbol ?? "").toUpperCase() === ticker.toUpperCase());
  if (!pos) return undefined;
  return {
    shares: Number(pos.position ?? 0),
    avgCost: Number(pos.avgCost ?? 0),
    unrealizedPnl: Number(pos.unrealizedPnl ?? 0),
  };
}

export async function fetchTradingOpenSymbols(): Promise<string[]> {
  return getOrSetIbkrCached(ibkrCacheKey("open-symbols"), fetchTradingOpenSymbolsLive);
}

async function fetchTradingOpenSymbolsLive(): Promise<string[]> {
  try {
    const positions = await ibkrServiceFetch<
      Array<{ symbol?: string; position?: number }>
    >("/api/ibkr/positions");
    if (!Array.isArray(positions)) return [];
    return positions
      .filter((p) => typeof p.position === "number" && Math.abs(p.position) > 0)
      .map((p) => (p.symbol ?? "").toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function asPositive(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

async function fetchFinnhubStockQuote(ticker: string): Promise<LiveLimitQuote | null> {
  const q = await finnhubGetQuote(ticker);
  if (!q || !Number.isFinite(q.c) || q.c <= 0) return null;
  return {
    bid: q.c,
    ask: q.c,
    last: q.c,
    mid: q.c,
  };
}

async function fetchFinnhubForexQuote(pairId: string): Promise<LiveLimitQuote | null> {
  const q = await finnhubGetForexQuote(pairId);
  if (!q || !Number.isFinite(q.mid) || q.mid <= 0) return null;
  return {
    bid: asPositive(q.bid),
    ask: asPositive(q.ask),
    last: q.mid,
    mid: q.mid,
  };
}

/**
 * Live LMT price from Finnhub at approval/submit time.
 * IBKR is used only for order execution, not market data.
 */
export async function fetchLiveLimitPrice(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly asset: "STK" | "FOREX";
  readonly suggested?: number | null;
}): Promise<number> {
  const quote =
    args.asset === "FOREX"
      ? await fetchFinnhubForexQuote(args.symbol)
      : await fetchFinnhubStockQuote(args.symbol);

  const fromLive = quote
    ? resolveLimitPriceFromQuote({
        asset: args.asset,
        side: args.side,
        quote,
        suggested: args.suggested,
      })
    : null;
  if (fromLive != null) return fromLive;

  const suggested = asPositive(args.suggested);
  if (suggested != null) return suggested;
  throw new Error(`No Finnhub limitPrice for ${args.symbol}`);
}
