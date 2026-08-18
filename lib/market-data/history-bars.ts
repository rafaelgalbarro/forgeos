import "server-only";

import { getHistory, getQuote, isFmpEnabled } from "@/lib/market-data/fmp";
import type { OhlcvBar } from "@/lib/market-data/types";

export type IbkrBarSize = "1 min" | "5 mins" | "15 mins" | "1 hour" | "1 day";

/** Fetches daily OHLCV from FMP (24h cache). */
export async function fetchHistoryBars(
  ticker: string,
  duration = "3 M",
  _barSize: IbkrBarSize = "1 day",
): Promise<{ bars: OhlcvBar[]; errors: string[] }> {
  const errors: string[] = [];
  const days = duration.includes("M") ? 90 : duration.includes("W") ? 35 : 7;
  const raw = await getHistory(ticker, days);
  const bars: OhlcvBar[] = raw.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));

  if (bars.length < 20) {
    errors.push(`FMP: solo ${bars.length} barras para ${ticker}`);
  }
  return { bars, errors };
}

/** Quick FMP quote for limit-price fallback. */
export async function fetchFinnhubPrice(ticker: string): Promise<number | null> {
  if (!isFmpEnabled()) return null;
  const q = await getQuote(ticker);
  return q && q.price > 0 ? q.price : null;
}
