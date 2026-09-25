import "server-only";

import { ibkrDailyBars, type IbkrBarSize } from "@/lib/market-data/ibkr-history";
import type { OhlcvBar } from "@/lib/market-data/types";

export type { IbkrBarSize };

/**
 * Fetches OHLCV bars — IBKR only. Skip ticker if IBKR has no data (no FMP).
 */
export async function fetchHistoryBars(
  ticker: string,
  _duration = "1 Y",
  _barSize: IbkrBarSize = "1 day",
): Promise<{ bars: OhlcvBar[]; errors: string[] }> {
  const errors: string[] = [];
  const symbol = ticker.trim().toUpperCase();

  const ibkrBars = await ibkrDailyBars(symbol).catch(() => [] as OhlcvBar[]);
  if (ibkrBars.length >= 20) {
    return { bars: ibkrBars, errors };
  }
  if (ibkrBars.length > 0) {
    errors.push(`IBKR: solo ${ibkrBars.length} barras para ${symbol} — skip`);
  } else {
    errors.push(`IBKR: sin barras para ${symbol} — skip`);
  }
  return { bars: ibkrBars, errors };
}

/** Quick price — IBKR only. */
export async function fetchFinnhubPrice(ticker: string): Promise<number | null> {
  try {
    const { getIbkrPriceCached } = await import("@/lib/market-data/ibkr-prices");
    const ibkr = await getIbkrPriceCached(ticker);
    if (ibkr && ibkr.price > 0) return ibkr.price;
  } catch {
    /* fall through */
  }
  return null;
}
