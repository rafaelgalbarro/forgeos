import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  getForexQuote as fmpGetForexQuote,
  getQuote as fmpGetQuote,
  isFmpEnabled,
} from "@/lib/market-data/fmp";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";
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
  changePercentage: number;
  priceAvg50?: number;
  priceAvg200?: number;
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

  const ZERO_VALUE_SYMBOLS = new Set([
    "RWAX",
    "IVPR",
    "INND",
    "APLT.CVR",
    "CGBSF",
    "APTX.OLD",
    "APLT",
  ]);

  const openPositionsCount = Array.isArray(positions)
    ? positions.filter((p) => {
        const row = p as {
          position?: number;
          account?: string;
          symbol?: string;
          avgCost?: number;
          marketValue?: number;
        };
        if (typeof row.position !== "number" || Math.abs(row.position) <= 0) return false;
        if (primary && row.account && row.account !== primary) return false;
        const symbol = String(row.symbol ?? "")
          .trim()
          .toUpperCase();
        if (symbol && ZERO_VALUE_SYMBOLS.has(symbol)) return false;
        // Solo contar posiciones con valor actual > $5
        const qty = Math.abs(row.position);
        const avgCost = Number(row.avgCost ?? 0);
        const marketValue = Number(row.marketValue ?? 0);
        const notional =
          Number.isFinite(marketValue) && Math.abs(marketValue) > 0
            ? Math.abs(marketValue)
            : qty * (Number.isFinite(avgCost) ? avgCost : 0);
        return notional > 5;
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

  if (!isFmpEnabled()) {
    throw new Error(`FMP_API_KEY required for price data — ${ticker}`);
  }

  // Starter plan: profile/quote only — never /historical-price-eod (HTTP 402)
  const quote = await fmpGetQuote(ticker);
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
    throw new Error(`FMP sin precio para ${ticker}`);
  }

  const currentPrice = quote.price;
  const prevClose = quote.previousClose > 0 ? quote.previousClose : currentPrice;
  const route = routes[0];

  return {
    ticker,
    currentPrice,
    previousClose: prevClose,
    bid: currentPrice,
    ask: currentPrice,
    change1d: currentPrice - prevClose,
    high52w: quote.yearHigh && quote.yearHigh > 0 ? quote.yearHigh : currentPrice,
    low52w: quote.yearLow && quote.yearLow > 0 ? quote.yearLow : currentPrice,
    volume: quote.volume ?? 0,
    changePercentage: quote.changePercentage ?? 0,
    priceAvg50: quote.priceAvg50,
    priceAvg200: quote.priceAvg200,
    quoteSymbol: route?.symbol ?? ticker,
    quoteExchange: route?.exchange ?? "FMP",
    quoteCurrency: route?.currency ?? "USD",
    quoteRoute: route?.label ?? "FMP-profile",
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

async function fetchFmpStockQuote(ticker: string): Promise<LiveLimitQuote | null> {
  const q = await fmpGetQuote(ticker);
  if (!q || !Number.isFinite(q.price) || q.price <= 0) return null;
  return {
    bid: q.price,
    ask: q.price,
    last: q.price,
    mid: q.price,
  };
}

async function fetchFmpForexQuote(pairId: string): Promise<LiveLimitQuote | null> {
  const q = await fmpGetForexQuote(pairId);
  if (!q || !Number.isFinite(q.price) || q.price <= 0) return null;
  return {
    bid: asPositive(q.price),
    ask: asPositive(q.price),
    last: q.price,
    mid: q.price,
  };
}

/**
 * Live LMT price from FMP at approval/submit time.
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
      ? await fetchFmpForexQuote(args.symbol)
      : await fetchFmpStockQuote(args.symbol);

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
  throw new Error(`No FMP limitPrice for ${args.symbol}`);
}
