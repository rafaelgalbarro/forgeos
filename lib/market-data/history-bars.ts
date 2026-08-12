import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { quoteRoutesForTicker } from "@/lib/trading/ticker-price-routes";
import type { OhlcvBar } from "@/lib/market-data/types";

type IbkrBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  date?: string;
};

function normalizeBar(raw: IbkrBar): OhlcvBar | null {
  const close = Number(raw.close ?? 0);
  if (!Number.isFinite(close) || close <= 0) return null;
  return {
    open: Number(raw.open ?? close),
    high: Number(raw.high ?? close),
    low: Number(raw.low ?? close),
    close,
    volume: Number(raw.volume ?? 0),
    date: raw.date,
  };
}

export type IbkrBarSize = "1 min" | "5 mins" | "15 mins" | "1 hour" | "1 day";

/** Fetches OHLCV bars from IBKR (tries quote routes). Default daily / 90 days. */
export async function fetchHistoryBars(
  ticker: string,
  duration = "3 M",
  barSize: IbkrBarSize = "1 day",
): Promise<{ bars: OhlcvBar[]; errors: string[] }> {
  const routes = quoteRoutesForTicker(ticker);
  const errors: string[] = [];

  for (const route of routes) {
    try {
      const params = new URLSearchParams({
        symbol: route.symbol,
        duration,
        barSize,
        currency: route.currency,
        exchange: route.exchange,
      });
      const history = await ibkrServiceFetch<{ bars?: IbkrBar[] }>(
        `/api/ibkr/history?${params.toString()}`,
      );
      const bars = (history.bars ?? [])
        .map(normalizeBar)
        .filter((b): b is OhlcvBar => b != null);
      if (bars.length >= 20) {
        return { bars, errors };
      }
      errors.push(`${route.label}: solo ${bars.length} barras`);
    } catch (err) {
      errors.push(`${route.label}: ${err instanceof Error ? err.message : "error"}`);
    }
  }

  return { bars: [], errors };
}
