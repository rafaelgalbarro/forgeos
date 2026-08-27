import "server-only";

import { ibkrDailyBars, type IbkrBarSize } from "@/lib/market-data/ibkr-history";
import { getHistory, getQuote, isFmpEnabled } from "@/lib/market-data/fmp";
import type { OhlcvBar } from "@/lib/market-data/types";

export type { IbkrBarSize };

/**
 * Fetches OHLCV bars — IBKR primary; FMP only if IBKR returns empty (last resort).
 */
export async function fetchHistoryBars(
  ticker: string,
  duration = "1 Y",
  _barSize: IbkrBarSize = "1 day",
): Promise<{ bars: OhlcvBar[]; errors: string[] }> {
  const errors: string[] = [];
  const symbol = ticker.trim().toUpperCase();

  const ibkrBars = await ibkrDailyBars(symbol).catch(() => [] as OhlcvBar[]);
  if (ibkrBars.length >= 20) {
    return { bars: ibkrBars, errors };
  }
  if (ibkrBars.length > 0) {
    errors.push(`IBKR: solo ${ibkrBars.length} barras para ${symbol}`);
  } else {
    errors.push(`IBKR: sin barras para ${symbol}`);
  }

  // Last-resort FMP fallback when IBKR completely fails
  if (isFmpEnabled()) {
    const days = duration.includes("Y") || duration.includes("M") ? 250 : duration.includes("W") ? 35 : 7;
    const raw = await getHistory(ticker, days).catch(() => []);
    const bars: OhlcvBar[] = raw.map((b) => ({
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      date: b.date,
    }));
    if (bars.length >= 20) {
      errors.push("FMP fallback usado (IBKR vacío)");
      return { bars, errors };
    }
    errors.push(`FMP fallback: solo ${bars.length} barras`);
  }

  return { bars: ibkrBars, errors };
}

/** Quick price — prefer IBKR; FMP quote only as last resort. */
export async function fetchFinnhubPrice(ticker: string): Promise<number | null> {
  try {
    const { getIbkrPriceCached } = await import("@/lib/market-data/ibkr-prices");
    const ibkr = await getIbkrPriceCached(ticker);
    if (ibkr && ibkr.price > 0) return ibkr.price;
  } catch {
    /* fall through */
  }
  if (!isFmpEnabled()) return null;
  const q = await getQuote(ticker);
  return q && q.price > 0 ? q.price : null;
}
