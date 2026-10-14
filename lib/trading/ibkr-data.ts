import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getIbkrPrice } from "@/lib/market-data/ibkr-prices";
import { getQuote as getEodhdQuote, shouldSkipEodhdQuote } from "@/lib/market-data/eodhd";
import { getPrice as getAlpacaPrice } from "@/lib/brokers/alpaca-client";
import {
  isAlpacaCryptoTicker,
  toAlpacaCryptoPairId,
} from "@/lib/brokers/alpaca-pairs";
import {
  resolveLimitPriceFromQuote,
  type LiveLimitQuote,
} from "@/lib/trading/limit-price";
import {
  getOrSetIbkrCached,
  ibkrCacheKey,
  IBKR_PRICE_CACHE_TTL_MS,
} from "@/lib/trading/ibkr-cache";
import { resolveDayOpenDailyPnl } from "@/lib/trading/nav-day-open";
import {
  getEuropeanEurEquity,
  isEuropeanEurEquity,
} from "@/lib/trading/europe-equities";
import {
  mustUseEodhdWsForUsEntry,
  resolveUsEquityLivePrice,
} from "@/lib/trading/us-equity-live-price";

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
  /** Last trade / quote update (ISO) — required for premarket freshness checks. */
  quoteUpdatedAt?: string;
};

export type TradingPositionSnapshot = {
  shares: number;
  avgCost: number;
  unrealizedPnl: number;
};

/** Direct IBKR FastAPI read — outer TTL 30s (matches shared account/positions cache). */
export async function fetchTradingAccountSnapshot(): Promise<TradingAccountSnapshot> {
  return getOrSetIbkrCached(
    ibkrCacheKey("account-snap"),
    fetchTradingAccountSnapshotLive,
    30_000,
  );
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
  // Daily P&L = NAV − day-open NAV (Europe/Madrid). Never UnrealizedPnL/RealizedPnL.
  const { dailyPnlUSD } = resolveDayOpenDailyPnl("ibkr", combinedNav);

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

function snapshotFromEodhd(symbol: string, eod: NonNullable<Awaited<ReturnType<typeof getEodhdQuote>>>): TradingPriceSnapshot {
  const bid = eod.low > 0 && eod.high > 0 ? Math.min(eod.price, (eod.high + eod.low) / 2) : eod.price;
  const ask = eod.high > 0 && eod.low > 0 ? Math.max(eod.price, (eod.high + eod.low) / 2) : eod.price;
  const eu = getEuropeanEurEquity(symbol);
  return {
    ticker: symbol,
    currentPrice: eod.price,
    previousClose: eod.previousClose,
    bid,
    ask,
    change1d: eod.change,
    high52w: eod.high52w,
    low52w: eod.low52w,
    volume: eod.volume,
    changePercentage: eod.changePercentage,
    quoteSymbol: symbol,
    quoteExchange: eu?.primaryExchange ?? "EODHD",
    quoteCurrency: eu ? "EUR" : "USD",
    quoteRoute: "EODHD-REALTIME",
    quoteErrors: [],
    quoteUpdatedAt: eod.updatedAt,
  };
}

function snapshotFromIbkr(
  symbol: string,
  ibkr: NonNullable<Awaited<ReturnType<typeof getIbkrPrice>>>,
): TradingPriceSnapshot {
  return {
    ticker: symbol,
    currentPrice: ibkr.price,
    previousClose: ibkr.price,
    bid: ibkr.bid ?? ibkr.price,
    ask: ibkr.ask ?? ibkr.price,
    change1d: 0,
    high52w: ibkr.price,
    low52w: ibkr.price,
    volume: ibkr.volume ?? 0,
    changePercentage: 0,
    quoteSymbol: symbol,
    quoteExchange: ibkr.exchange,
    quoteCurrency: ibkr.currency,
    quoteRoute: ibkr.route,
    quoteErrors: [],
    quoteUpdatedAt: new Date().toISOString(),
  };
}

function snapshotFromAlpaca(
  symbol: string,
  quote: Awaited<ReturnType<typeof getAlpacaPrice>>,
): TradingPriceSnapshot {
  const bid = quote.bid ?? quote.price;
  const ask = quote.ask ?? quote.price;
  return {
    ticker: symbol,
    currentPrice: quote.price,
    previousClose: quote.price,
    bid,
    ask,
    change1d: 0,
    high52w: quote.price,
    low52w: quote.price,
    volume: 0,
    changePercentage: 0,
    quoteSymbol: quote.symbol,
    quoteExchange: "ALPACA",
    quoteCurrency: "USD",
    quoteRoute: quote.source,
    quoteErrors: [],
  };
}

function resolveAlpacaCryptoId(symbol: string): string | null {
  if (isAlpacaCryptoTicker(symbol)) return symbol;
  return toAlpacaCryptoPairId(symbol);
}

/** EODHD primary for equities; Alpaca for crypto; IBKR optional fallback (US only). */
async function fetchTradingPriceLive(ticker: string): Promise<TradingPriceSnapshot> {
  const symbol = ticker.trim().toUpperCase();
  const quoteErrors: string[] = [];
  const euLocal = isEuropeanEurEquity(symbol);

  const alpacaCryptoId = resolveAlpacaCryptoId(symbol);
  if (alpacaCryptoId) {
    try {
      const quote = await getAlpacaPrice(alpacaCryptoId);
      if (quote.price > 0) {
        console.log(
          `[Universe] ${symbol} precio Alpaca $${quote.price.toFixed(2)} (${quote.source})`,
        );
        return snapshotFromAlpaca(symbol, quote);
      }
      quoteErrors.push("Alpaca: no price");
    } catch (err) {
      quoteErrors.push(`Alpaca: ${err instanceof Error ? err.message : "error"}`);
    }
  }

  // US regular / extended: EODHD WebSocket only for entry marks (never REST /real-time delay).
  if (!euLocal && mustUseEodhdWsForUsEntry()) {
    const live = await resolveUsEquityLivePrice(symbol);
    if (live.ok) {
      console.log(
        `[Universe] ${symbol} precio EODHD-WS $${live.snap.currentPrice.toFixed(2)} ` +
          `bid=${live.snap.bid.toFixed(2)} ask=${live.snap.ask.toFixed(2)}`,
      );
      return live.snap;
    }
    quoteErrors.push(live.reason);
  } else if (!shouldSkipEodhdQuote(symbol)) {
    const eod = await getEodhdQuote(symbol);
    if (eod != null && eod.price > 0) {
      const ccy = euLocal ? "€" : "$";
      console.log(
        `[Universe] ${symbol} precio EODHD ${ccy}${eod.price.toFixed(2)} Δ${eod.changePercentage.toFixed(2)}%` +
          (euLocal ? " (EU — sin IBKR quotes)" : ""),
      );
      return snapshotFromEodhd(symbol, eod);
    }
    quoteErrors.push("EODHD: no price");
  } else {
    quoteErrors.push("EODHD: ticker en lista de ignorados");
  }

  // EU locals: never fall back to IBKR market data (no EU stock MD subscription).
  if (euLocal) {
    throw new Error(`sin precio EU — skip (${quoteErrors.join("; ")}; IBKR quotes disabled for EU)`);
  }

  try {
    const ibkr = await getIbkrPrice(symbol);
    if (ibkr != null && ibkr.price > 0) {
      console.log(
        `[Universe] ${symbol} precio IBKR fallback $${ibkr.price.toFixed(2)} via ${ibkr.exchange}/${ibkr.currency}`,
      );
      return snapshotFromIbkr(symbol, ibkr);
    }
    quoteErrors.push("IBKR: no price");
  } catch (err) {
    quoteErrors.push(`IBKR: ${err instanceof Error ? err.message : "error"}`);
  }

  throw new Error(`sin precio — skip (${quoteErrors.join("; ")})`);
}

/**
 * US premarket price: prefer IBKR bid/ask (LMT outsideRth), then EODHD realtime
 * only if the quote is fresh — never prior-day close.
 */
export async function fetchPremarketUsPrice(ticker: string): Promise<TradingPriceSnapshot | null> {
  const { isUsablePremarketQuote } = await import("@/lib/trading/us-premarket");
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || isEuropeanEurEquity(symbol)) return null;

  const errors: string[] = [];

  if (mustUseEodhdWsForUsEntry()) {
    const live = await resolveUsEquityLivePrice(symbol);
    if (live.ok) {
      const check = isUsablePremarketQuote({
        price: live.snap.currentPrice,
        previousClose: live.snap.previousClose,
        bid: live.snap.bid,
        ask: live.snap.ask,
        volume: live.snap.volume,
        updatedAt: live.snap.quoteUpdatedAt,
        quoteRoute: live.snap.quoteRoute,
      });
      if (check.ok) {
        console.log(
          `[Premarket] ${symbol} price-source=EODHD-WS-realtime $${live.snap.currentPrice.toFixed(2)} ` +
            `bid=${live.snap.bid.toFixed(2)} ask=${live.snap.ask.toFixed(2)}`,
        );
        return live.snap;
      }
      errors.push(`EODHD-WS: ${check.reason}`);
    } else {
      errors.push(live.reason);
    }
    console.log(`[Premarket] ${symbol} price-source=discarded — ${errors.join("; ")}`);
    return null;
  }

  try {
    const ibkr = await getIbkrPrice(symbol);
    if (ibkr != null && ibkr.price > 0) {
      const snap = snapshotFromIbkr(symbol, ibkr);
      const check = isUsablePremarketQuote({
        price: snap.currentPrice,
        previousClose: snap.previousClose,
        bid: snap.bid,
        ask: snap.ask,
        volume: snap.volume,
        updatedAt: snap.quoteUpdatedAt,
        quoteRoute: snap.quoteRoute,
      });
      if (check.ok) {
        console.log(
          `[Premarket] ${symbol} IBKR $${snap.currentPrice.toFixed(2)} ` +
            `bid=${snap.bid.toFixed(2)} ask=${snap.ask.toFixed(2)}`,
        );
        return snap;
      }
      errors.push(`IBKR: ${check.reason}`);
    } else {
      errors.push("IBKR: no price");
    }
  } catch (err) {
    errors.push(`IBKR: ${err instanceof Error ? err.message : "error"}`);
  }

  if (!shouldSkipEodhdQuote(symbol)) {
    const eod = await getEodhdQuote(symbol);
    if (eod != null && eod.price > 0) {
      const snap = snapshotFromEodhd(symbol, eod);
      const check = isUsablePremarketQuote({
        price: snap.currentPrice,
        previousClose: snap.previousClose,
        bid: snap.bid,
        ask: snap.ask,
        volume: snap.volume,
        updatedAt: snap.quoteUpdatedAt ?? eod.updatedAt,
        quoteRoute: snap.quoteRoute,
      });
      if (check.ok) {
        console.log(
          `[Premarket] ${symbol} EODHD realtime $${snap.currentPrice.toFixed(2)} ` +
            `Δ${eod.changePercentage.toFixed(2)}% ts=${eod.updatedAt}`,
        );
        return snap;
      }
      errors.push(`EODHD: ${check.reason}`);
    } else {
      errors.push("EODHD: no price");
    }
  } else {
    errors.push("EODHD: ignored ticker");
  }

  console.warn(`[Premarket] ${symbol} skip — no live premarket quote (${errors.join("; ")})`);
  return null;
}

export type IbkrPositionRow = {
  symbol: string;
  qty: number;
  avgCost: number;
  marketValue: number;
  /** Implied mark = |marketValue|/qty when available. */
  currentPrice: number;
  account?: string;
  secType?: string;
  unrealizedPnl: number;
};

/** Shared IBKR positions snapshot (30s) — one broker call for ExitManager + per-ticker lookups. */
export async function fetchCachedIbkrPositions(): Promise<IbkrPositionRow[]> {
  return getOrSetIbkrCached(ibkrCacheKey("positions-rows"), fetchIbkrPositionsLive, 30_000);
}

async function fetchIbkrPositionsLive(): Promise<IbkrPositionRow[]> {
  const rows = await ibkrServiceFetch<
    Array<{
      symbol?: string;
      position?: number;
      avgCost?: number;
      marketValue?: number;
      marketPrice?: number;
      account?: string;
      secType?: string;
      unrealizedPnl?: number;
    }>
  >("/api/ibkr/positions").catch(() => []);
  const primary = primaryAccountId();
  const out: IbkrPositionRow[] = [];
  for (const p of Array.isArray(rows) ? rows : []) {
    if (primary && p.account && p.account !== primary) continue;
    const qty = Math.abs(Number(p.position ?? 0));
    if (!(qty > 0)) continue;
    const symbol = String(p.symbol ?? "").trim().toUpperCase();
    if (!symbol) continue;
    const avgCost = Number(p.avgCost ?? 0);
    const marketValue = Number(p.marketValue ?? 0);
    const marketPrice = Number(p.marketPrice ?? 0);
    const fromMv = qty > 0 && Number.isFinite(marketValue) && Math.abs(marketValue) > 0
      ? Math.abs(marketValue) / qty
      : 0;
    const currentPrice =
      Number.isFinite(marketPrice) && marketPrice > 0
        ? marketPrice
        : fromMv > 0
          ? fromMv
          : avgCost;
    out.push({
      symbol,
      qty,
      avgCost,
      marketValue,
      currentPrice,
      account: p.account,
      secType: String(p.secType ?? "STK"),
      unrealizedPnl: Number(p.unrealizedPnl ?? 0),
    });
  }
  return out;
}

export async function fetchTradingPosition(
  ticker: string,
): Promise<TradingPositionSnapshot | undefined> {
  // Shared positions snapshot (30s) — never one HTTP call per ticker.
  const positions = await fetchCachedIbkrPositions();
  const pos = positions.find((p) => p.symbol === ticker.toUpperCase());
  if (!pos) return undefined;
  return {
    shares: pos.qty,
    avgCost: pos.avgCost,
    unrealizedPnl: pos.unrealizedPnl,
  };
}

export async function fetchTradingOpenSymbols(): Promise<string[]> {
  return getOrSetIbkrCached(ibkrCacheKey("open-symbols"), fetchTradingOpenSymbolsLive, 30_000);
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
  const symbol = ticker.trim().toUpperCase();
  if (isEuropeanEurEquity(symbol)) return null;
  const ibkr = await getIbkrPrice(symbol);
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

async function fetchEodhdLiveLimitQuote(ticker: string): Promise<LiveLimitQuote | null> {
  const symbol = ticker.trim().toUpperCase();
  if (shouldSkipEodhdQuote(symbol)) return null;
  const eod = await getEodhdQuote(symbol);
  if (!eod || !(eod.price > 0)) return null;
  const bid =
    eod.low > 0 && eod.high > 0 ? Math.min(eod.price, (eod.high + eod.low) / 2) : eod.price;
  const ask =
    eod.high > 0 && eod.low > 0 ? Math.max(eod.price, (eod.high + eod.low) / 2) : eod.price;
  return {
    bid,
    ask,
    last: eod.price,
    mid: (bid + ask) / 2,
  };
}

/**
 * Live LMT price at approval/submit time.
 * EU equities: EODHD only (no IBKR market data). US: IBKR then suggested.
 */
export async function fetchLiveLimitPrice(args: {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly asset: "STK" | "FOREX" | "CRYPTO";
  readonly suggested?: number | null;
}): Promise<number> {
  const symbol = args.symbol.trim().toUpperCase();
  const quote = isEuropeanEurEquity(symbol)
    ? await fetchEodhdLiveLimitQuote(symbol)
    : await fetchIbkrLiveLimitQuote(symbol);

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
  throw new Error(
    isEuropeanEurEquity(symbol)
      ? `No EODHD limitPrice for ${symbol}`
      : `No IBKR limitPrice for ${symbol}`,
  );
}
