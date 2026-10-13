import "server-only";

import { ibkrDailyBars, type IbkrBarSize } from "@/lib/market-data/ibkr-history";
import type { OhlcvBar } from "@/lib/market-data/types";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";

export type { IbkrBarSize };

/**
 * Fetches OHLCV bars — EODHD for EU / US stocks via ibkrDailyBars helper; IBKR for others.
 */
export async function fetchHistoryBars(
  ticker: string,
  _duration = "1 Y",
  _barSize: IbkrBarSize = "1 day",
): Promise<{ bars: OhlcvBar[]; errors: string[] }> {
  const errors: string[] = [];
  const symbol = ticker.trim().toUpperCase();
  const eu = isEuropeanEurEquity(symbol);

  const bars = await ibkrDailyBars(symbol).catch(() => [] as OhlcvBar[]);
  if (bars.length >= 20) {
    return { bars, errors };
  }
  if (bars.length > 0) {
    errors.push(
      eu
        ? `EODHD: solo ${bars.length} barras para ${symbol} — skip`
        : `IBKR: solo ${bars.length} barras para ${symbol} — skip`,
    );
  } else {
    errors.push(
      eu
        ? `EODHD: sin barras para ${symbol} — skip`
        : `IBKR: sin barras para ${symbol} — skip`,
    );
  }
  return { bars, errors };
}

/** Quick price — EODHD for EU, IBKR otherwise. */
export async function fetchFinnhubPrice(ticker: string): Promise<number | null> {
  const symbol = ticker.trim().toUpperCase();
  if (isEuropeanEurEquity(symbol)) {
    try {
      const { getQuote } = await import("@/lib/market-data/eodhd");
      const eod = await getQuote(symbol);
      if (eod && eod.price > 0) return eod.price;
    } catch {
      /* fall through */
    }
    return null;
  }
  try {
    const { getIbkrPriceCached } = await import("@/lib/market-data/ibkr-prices");
    const ibkr = await getIbkrPriceCached(ticker);
    if (ibkr && ibkr.price > 0) return ibkr.price;
  } catch {
    /* fall through */
  }
  return null;
}
