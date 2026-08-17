import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { quoteRoutesForTicker, type TickerQuoteRoute } from "@/lib/trading/ticker-price-routes";
import {
  resolveLimitPriceFromQuote,
  type LiveLimitQuote,
} from "@/lib/trading/limit-price";

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

/** Direct IBKR FastAPI read — no HTTP loopback through Next.js. */
export async function fetchTradingAccountSnapshot(): Promise<TradingAccountSnapshot> {
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

type IbkrHistoryResponse = {
  bars?: Array<{ close?: number; high?: number; low?: number; volume?: number }>;
  recentErrors?: Array<{ code?: number; message?: string } | string>;
  note?: string;
  exchange?: string;
};

async function fetchHistoryForRoute(route: TickerQuoteRoute): Promise<IbkrHistoryResponse> {
  const params = new URLSearchParams({
    symbol: route.symbol,
    duration: "5 D",
    barSize: "1 day",
    currency: route.currency,
    exchange: route.exchange,
  });
  return ibkrServiceFetch<IbkrHistoryResponse>(`/api/ibkr/history?${params.toString()}`);
}

function formatHistoryError(route: TickerQuoteRoute, history: IbkrHistoryResponse, err?: unknown): string {
  if (err instanceof Error) {
    return `${route.label} (${route.exchange}/${route.currency}): ${err.message}`;
  }
  const recent = (history.recentErrors ?? [])
    .map((e) => (typeof e === "string" ? e : e.message ?? String(e.code ?? "error")))
    .filter(Boolean)
    .join("; ");
  const note = history.note?.trim();
  if (recent) return `${route.label} (${route.exchange}): ${recent}`;
  if (note) return `${route.label} (${route.exchange}): ${note}`;
  return `${route.label} (${route.exchange}/${route.currency}): sin barras de precio`;
}

export async function fetchTradingPrice(ticker: string): Promise<TradingPriceSnapshot> {
  const routes = quoteRoutesForTicker(ticker);
  const quoteErrors: string[] = [];

  for (const route of routes) {
    try {
      const history = await fetchHistoryForRoute(route);
      const bars = Array.isArray(history.bars) ? history.bars : [];
      const last = bars[bars.length - 1] ?? {};
      const prev = bars[bars.length - 2] ?? last;
      const currentPrice = Number(last.close ?? 0);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        quoteErrors.push(formatHistoryError(route, history));
        continue;
      }
      const prevClose = Number(prev.close ?? currentPrice);
      return {
        ticker,
        currentPrice,
        previousClose: prevClose,
        bid: currentPrice,
        ask: currentPrice,
        change1d: currentPrice - prevClose,
        high52w: Math.max(...bars.map((b) => Number(b.high ?? 0)), currentPrice),
        low52w: Math.min(
          ...bars.map((b) => Number(b.low ?? (currentPrice || 0))).filter((n) => n > 0),
          currentPrice || 0,
        ),
        volume: Number(last.volume ?? 0),
        quoteSymbol: route.symbol,
        quoteExchange: route.exchange,
        quoteCurrency: route.currency,
        quoteRoute: route.label,
        quoteErrors,
      };
    } catch (err) {
      quoteErrors.push(formatHistoryError(route, {}, err));
    }
  }

  throw new Error(
    quoteErrors.length
      ? `No se pudo obtener precio de ${ticker} — ${quoteErrors.join(" | ")}`
      : `No se pudo obtener precio de ${ticker}`,
  );
}

export async function fetchTradingPosition(
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

/** Open position symbols with non-zero size — for pre-trade correlation checks. */
export async function fetchTradingOpenSymbols(): Promise<string[]> {
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

async function fetchIbkrStockQuote(ticker: string): Promise<LiveLimitQuote | null> {
  const routes = quoteRoutesForTicker(ticker);
  const tried = new Set<string>();
  for (const route of [...routes, { symbol: ticker, exchange: "SMART", currency: "USD", label: "SMART" }]) {
    const key = `${route.exchange}:${route.currency}`;
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      const data = await ibkrServiceFetch<{
        bid?: number | null;
        ask?: number | null;
        last?: number | null;
        mid?: number | null;
        currentPrice?: number | null;
      }>(
        `/api/ibkr/quote?symbol=${encodeURIComponent(route.symbol || ticker)}` +
          `&currency=${encodeURIComponent(route.currency)}` +
          `&exchange=${encodeURIComponent(route.exchange)}`,
      );
      const last = asPositive(data.last) ?? asPositive(data.currentPrice);
      const bid = asPositive(data.bid);
      const ask = asPositive(data.ask);
      const mid = asPositive(data.mid);
      if (last || bid || ask || mid) {
        return { bid, ask, last, mid };
      }
    } catch {
      /* try next route */
    }
  }
  return null;
}

async function fetchIbkrForexQuote(pairId: string): Promise<LiveLimitQuote | null> {
  try {
    const data = await ibkrServiceFetch<{
      quotes?: Array<{
        pairId?: string;
        bid?: number | null;
        ask?: number | null;
        last?: number | null;
        mid?: number | null;
      }>;
    }>(`/api/forex/quotes?pair=${encodeURIComponent(pairId)}`);
    const row = (data.quotes ?? []).find(
      (q) => (q.pairId ?? "").toUpperCase() === pairId.toUpperCase(),
    ) ?? data.quotes?.[0];
    if (!row) return null;
    return {
      bid: asPositive(row.bid),
      ask: asPositive(row.ask),
      last: asPositive(row.last),
      mid: asPositive(row.mid),
    };
  } catch {
    return null;
  }
}

/**
 * Live LMT price from IBKR at approval/submit time (not the analysis snapshot).
 * Stocks: last/current else mid. FOREX: BUY=ask, SELL=bid.
 */
export async function fetchLiveLimitPrice(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly asset: "STK" | "FOREX";
  readonly suggested?: number | null;
}): Promise<number> {
  const quote =
    args.asset === "FOREX"
      ? await fetchIbkrForexQuote(args.symbol)
      : await fetchIbkrStockQuote(args.symbol);

  const fromLive = quote
    ? resolveLimitPriceFromQuote({
        asset: args.asset,
        side: args.side,
        quote,
        suggested: args.suggested,
      })
    : null;
  if (fromLive != null) return fromLive;

  if (args.asset === "STK") {
    try {
      const hist = await fetchTradingPrice(args.symbol);
      const histQuote: LiveLimitQuote = {
        bid: asPositive(hist.bid),
        ask: asPositive(hist.ask),
        last: asPositive(hist.currentPrice),
        mid: null,
      };
      const fromHist = resolveLimitPriceFromQuote({
        asset: "STK",
        side: args.side,
        quote: histQuote,
        suggested: args.suggested,
      });
      if (fromHist != null) return fromHist;
    } catch {
      /* fall through */
    }
  }

  const suggested = asPositive(args.suggested);
  if (suggested != null) return suggested;
  throw new Error(`No live IBKR limitPrice for ${args.symbol}`);
}
