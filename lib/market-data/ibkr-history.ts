/**
 * IBKR multi-timeframe historical bars (reqHistoricalData).
 * TTLs: 1min→1m, 5mins→5m, 1day→24h. FMP is never called here.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import type { OhlcvBar } from "@/lib/market-data/types";
import { getHistory as getEodhdHistory, isEodhdConfigured } from "@/lib/market-data/eodhd";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";
import { getOrSetIbkrCached, ibkrCacheKey } from "@/lib/trading/ibkr-cache";
import { IBKR_CRYPTO_SEC_TYPE, isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";
import { getIntradayHistory } from "@/lib/market-data/eodhd";

export type IbkrBarSize = "1 min" | "5 mins" | "15 mins" | "1 hour" | "1 day";

const FETCH_TIMEOUT_MS = 12_000;

/**
 * IBKR pacing: ~60 historical requests per 10 minutes. With 100 stocks per 3-minute cycle we
 * asked for ~200, the broker queued them and 1,400+ tickers/day ended in "skip (timeout IBKR)"
 * (28–29/10), signals included. Budget the requests and answer "no bars" at once when spent.
 */
const HIST_BUDGET = Math.max(10, Number(process.env.IBKR_HIST_BUDGET_PER_10MIN ?? 50) || 50);
const histStamps: number[] = [];
let histBudgetWarnAt = 0;
function takeHistToken(): boolean {
  const now = Date.now();
  while (histStamps.length && now - histStamps[0]! > 10 * 60_000) histStamps.shift();
  if (histStamps.length >= HIST_BUDGET) {
    if (now - histBudgetWarnAt > 60_000) {
      histBudgetWarnAt = now;
      console.warn(`[History] presupuesto IBKR agotado (${HIST_BUDGET}/10 min) — sin velas IBKR este ciclo`);
    }
    return false;
  }
  histStamps.push(now);
  return true;
}

function ttlForBar(bar: string): number {
  if (bar === "1 min") return 60_000;
  if (bar === "5 mins") return 5 * 60_000;
  if (bar === "1 day") return 24 * 60 * 60_000;
  return 5 * 60_000;
}

function asBar(raw: Record<string, unknown>): OhlcvBar | null {
  const close = Number(raw.close);
  if (!(Number.isFinite(close) && close > 0)) return null;
  return {
    open: Number(raw.open) || close,
    high: Number(raw.high) || close,
    low: Number(raw.low) || close,
    close,
    volume: Number(raw.volume) || 0,
    date: String(raw.date ?? ""),
  };
}

async function fetchBarsOnce(
  symbol: string,
  duration: string,
  bar: IbkrBarSize,
  exchange: string,
  currency: string,
  secType: string,
): Promise<OhlcvBar[]> {
  const qs =
    `symbol=${encodeURIComponent(symbol)}` +
    `&duration=${encodeURIComponent(duration)}` +
    `&barSize=${encodeURIComponent(bar)}` +
    `&bar=${encodeURIComponent(bar)}` +
    `&exchange=${encodeURIComponent(exchange)}` +
    `&currency=${encodeURIComponent(currency)}` +
    `&secType=${encodeURIComponent(secType)}` +
    `&useRTH=0`;

  const paths = [`/api/ibkr/historical?${qs}`];
  for (const path of paths) {
    if (!takeHistToken()) return [];
    try {
      const raw = await ibkrServiceFetch<{
        bars?: Array<Record<string, unknown>>;
        data?: Array<Record<string, unknown>>;
      }>(path, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const rows = raw?.bars ?? raw?.data ?? [];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const bars = rows.map((r) => asBar(r)).filter((b): b is OhlcvBar => b != null);
      if (bars.length > 0) return bars;
    } catch {
      /* try next */
    }
  }
  return [];
}

/** Primary helper — IBKR historical bars with bar-size TTL. */
export async function ibkrHistorical(
  symbol: string,
  duration: string,
  bar: IbkrBarSize,
): Promise<OhlcvBar[]> {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return [];
  // EU locals: never reqHistoricalData (no EU market-data subscription).
  if (isEuropeanEurEquity(ticker)) return [];

  const key = ibkrCacheKey("hist", ticker, duration.replace(/\s+/g, ""), bar.replace(/\s+/g, ""));
  return getOrSetIbkrCached(key, async () => {
    const crypto = isIbkrCryptoTicker(ticker);
    const routes = quoteRoutesForTicker(ticker);
    for (const route of routes) {
      const secType = crypto || route.exchange === "PAXOS" ? IBKR_CRYPTO_SEC_TYPE : "STK";
      const bars = await fetchBarsOnce(
        route.symbol,
        duration,
        bar,
        route.exchange,
        route.currency,
        secType,
      );
      if (bars.length > 0) return bars;
    }
    return [];
  }, ttlForBar(bar));
}

/** Daily bars for swing indicators (EMA200 needs ~1Y / 252 sessions). */
export async function ibkrDailyBars(symbol: string): Promise<OhlcvBar[]> {
  const ticker = symbol.trim().toUpperCase();
  const { isUsStockTicker } = await import("@/lib/trading/stocks-universe");
  const euLocal = isEuropeanEurEquity(ticker);
  const preferEodhd =
    euLocal || isUsStockTicker(ticker) || isIbkrCryptoTicker(ticker);

  async function loadEodhdBars(): Promise<OhlcvBar[]> {
    if (!isEodhdConfigured()) return [];
    const rows = await getEodhdHistory(ticker, 275);
    return rows
      .map((r) => ({
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        date: r.date,
      }))
      .filter((b) => b.date && b.close > 0);
  }

  if (preferEodhd) {
    const eodhd = await loadEodhdBars();
    if (eodhd.length >= 20) {
      console.log(
        `[History] ${ticker}: EODHD directo (${eodhd.length} barras)` +
          (euLocal ? " [EU]" : ""),
      );
      return eodhd;
    }
    if (euLocal) {
      console.warn(`[History] ${ticker}: EODHD insuficiente para EU — sin IBKR history`);
      return eodhd;
    }
  }

  const year = await ibkrHistorical(symbol, "1 Y", "1 day");
  if (year.length >= 50) return year;

  const eodhd = await loadEodhdBars();
  if (eodhd.length >= 20) {
    console.log(`[History] ${ticker}: fallback EODHD (${eodhd.length} barras, IBKR=${year.length})`);
    return eodhd;
  }

  const sixty = await ibkrHistorical(symbol, "60 D", "1 day");
  if (sixty.length > year.length) return sixty;
  return year.length > 0 ? year : eodhd;
}

/** Intraday 1-hour bars for swing entry timing. */
export async function ibkrBars1h(symbol: string): Promise<OhlcvBar[]> {
  const ticker = symbol.trim().toUpperCase();
  const { isUsStockTicker } = await import("@/lib/trading/stocks-universe");
  // 1-hour bars change slowly: EODHD (cached) for EU and US stocks keeps IBKR pacing for 5m bars.
  if ((isEuropeanEurEquity(ticker) || isUsStockTicker(ticker)) && isEodhdConfigured()) {
    const rows = await getIntradayHistory(ticker, "1h", 10).catch(() => []);
    return rows
      .map((r) => ({
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        date: r.date,
      }))
      .filter((b) => b.date && b.close > 0);
  }
  return ibkrHistorical(symbol, "10 D", "1 hour");
}

/** Intraday 15-min bars (crypto / forex). */
export async function ibkrBars15m(symbol: string): Promise<OhlcvBar[]> {
  return ibkrHistorical(symbol, "5 D", "15 mins");
}

/** Intraday 5-min bars for VWAP / momentum. */
export async function ibkrBars5m(symbol: string): Promise<OhlcvBar[]> {
  return ibkrHistorical(symbol, "5 D", "5 mins");
}

/** Intraday 1-min bars for scalping. */
export async function ibkrBars1m(symbol: string): Promise<OhlcvBar[]> {
  return ibkrHistorical(symbol, "1 D", "1 min");
}
