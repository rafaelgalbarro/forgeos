import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { quoteRoutesForTicker, type TickerQuoteRoute } from "@/lib/trading/ticker-price-routes";

type AccountTag = { value?: string; currency?: string };
type AccountMap = Record<string, Record<string, AccountTag>>;

function sumTag(account: AccountMap, tag: string): number {
  let total = 0;
  for (const tags of Object.values(account ?? {})) {
    const n = Number(tags?.[tag]?.value);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

export type TradingAccountSnapshot = {
  navUSD: number;
  cashUSD: number;
  dailyPnlUSD: number;
  openPositionsCount: number;
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
  return {
    navUSD: sumTag(account, "NetLiquidation"),
    cashUSD: sumTag(account, "TotalCashValue"),
    dailyPnlUSD: sumTag(account, "UnrealizedPnL") + sumTag(account, "RealizedPnL"),
    openPositionsCount: Array.isArray(positions)
      ? positions.filter((p) => {
          const row = p as { position?: number };
          return typeof row.position === "number" && Math.abs(row.position) > 0;
        }).length
      : 0,
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
