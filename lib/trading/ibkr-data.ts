import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getIbkrPrice } from "@/lib/market-data/ibkr-prices";
import { peekCachedQuote } from "@/lib/market-data/fmp";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";
import {
  resolveLimitPriceFromQuote,
  type LiveLimitQuote,
} from "@/lib/trading/limit-price";
import {
  getOrSetIbkrCached,
  ibkrCacheKey,
  IBKR_PRICE_CACHE_TTL_MS,
} from "@/lib/trading/ibkr-cache";

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
  return getOrSetIbkrCached(
    ibkrCacheKey("price", ticker),
    () => fetchTradingPriceLive(ticker),
    IBKR_PRICE_CACHE_TTL_MS,
  );
}

async function fetchTradingPriceLive(ticker: string): Promise<TradingPriceSnapshot> {
  const symbol = ticker.trim().toUpperCase();
  const routes = quoteRoutesForTicker(symbol);
  const quoteErrors: string[] = [];

  // 1) IBKR market-data (primary — free, no FMP rate limit)
  const ibkr = await getIbkrPrice(symbol);
  if (ibkr && ibkr.price > 0) {
    console.log(
      `[Universe] ${symbol} precio IBKR $${ibkr.price.toFixed(2)} via ${ibkr.exchange}/${ibkr.currency}`,
    );
    return {
      ticker: symbol,
      currentPrice: ibkr.price,
      previousClose: ibkr.price,
      bid: ibkr.bid ?? ibkr.price,
      ask: ibkr.ask ?? ibkr.price,
      change1d: 0,
      high52w: ibkr.price,
      low52w: ibkr.price,
      volume: 0,
      changePercentage: 0,
      quoteSymbol: symbol,
      quoteExchange: ibkr.exchange,
      quoteCurrency: ibkr.currency,
      quoteRoute: ibkr.route,
      quoteErrors,
    };
  }
  quoteErrors.push("IBKR: no price");

  // 2) Stale FMP quote cache only (no FMP HTTP) — 10 min TTL when previously filled
  const fmpCached = peekCachedQuote(symbol);
  if (fmpCached && fmpCached.price > 0) {
    console.log(
      `[Universe] ${symbol} precio FMP-caché $${fmpCached.price.toFixed(2)} (sin HTTP FMP)`,
    );
    const route = routes[0];
    const prev = fmpCached.previousClose > 0 ? fmpCached.previousClose : fmpCached.price;
    return {
      ticker: symbol,
      currentPrice: fmpCached.price,
      previousClose: prev,
      bid: fmpCached.price,
      ask: fmpCached.price,
      change1d: fmpCached.price - prev,
      high52w: fmpCached.yearHigh && fmpCached.yearHigh > 0 ? fmpCached.yearHigh : fmpCached.price,
      low52w: fmpCached.yearLow && fmpCached.yearLow > 0 ? fmpCached.yearLow : fmpCached.price,
      volume: fmpCached.volume ?? 0,
      changePercentage: fmpCached.changePercentage ?? 0,
      priceAvg50: fmpCached.priceAvg50,
      priceAvg200: fmpCached.priceAvg200,
      quoteSymbol: route?.symbol ?? symbol,
      quoteExchange: route?.exchange ?? "FMP-CACHE",
      quoteCurrency: route?.currency ?? "USD",
      quoteRoute: "FMP-cache-10m",
      quoteErrors,
    };
  }
  quoteErrors.push("FMP-cache: empty");

  throw new Error(`sin precio IBKR ni caché FMP (${quoteErrors.join("; ")})`);
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

async function fetchIbkrLiveLimitQuote(ticker: string): Promise<LiveLimitQuote | null> {
  const ibkr = await getIbkrPrice(ticker.trim().toUpperCase());
  if (!ibkr || !(ibkr.price > 0)) return null;
  const bid = ibkr.bid ?? ibkr.price;
  const ask = ibkr.ask ?? ibkr.price;
  return {
    bid,
    ask,
    last: ibkr.price,
    mid: (bid + ask) / 2,
  };
}

/**
 * Live LMT price from IBKR market-data at approval/submit time.
 * FMP is never used for realtime prices (Starter 429).
 */
export async function fetchLiveLimitPrice(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly asset: "STK" | "FOREX";
  readonly suggested?: number | null;
}): Promise<number> {
  const quote = await fetchIbkrLiveLimitQuote(args.symbol);

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
  throw new Error(`No IBKR limitPrice for ${args.symbol}`);
}
