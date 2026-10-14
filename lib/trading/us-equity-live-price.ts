/**
 * US equity entry pricing — EODHD WebSocket sole realtime source.
 * QC: WS vs latest 1m candle (≤1% delta) + fresh WS (<2m). No IBKR quotes.
 */

import "server-only";

import { getQuote as getEodhdRestQuote } from "@/lib/market-data/eodhd";
import { getEodhdWsQuote } from "@/lib/market-data/eodhd-ws-store";
import { evaluateEodhdWsQuality } from "@/lib/market-data/eodhd-ws-qc";
import type { TradingPriceSnapshot } from "@/lib/trading/ibkr-data";
import { isUsEodhdWsSession } from "@/lib/trading/exchange-hours";
import { isEuropeanEurEquity } from "@/lib/trading/europe-equities";

export type UsEquityLivePriceResult =
  | { ok: true; snap: TradingPriceSnapshot }
  | {
      ok: false;
      reason: string;
      code: "STALE" | "NO_WS" | "QC_FAIL" | "NOT_US";
    };

function midPrice(bid: number, ask: number, last: number): number {
  if (bid > 0 && ask >= bid) return (bid + ask) / 2;
  if (last > 0) return last;
  return bid > 0 ? bid : ask;
}

function snapshotFromWs(
  symbol: string,
  ws: NonNullable<ReturnType<typeof getEodhdWsQuote>>,
  previousClose: number,
): TradingPriceSnapshot {
  const bid = ws.bid > 0 ? ws.bid : ws.last;
  const ask = ws.ask > 0 ? ws.ask : ws.last;
  const last = ws.last > 0 ? ws.last : midPrice(bid, ask, 0);
  const px = last > 0 ? last : midPrice(bid, ask, 0);
  const change1d = previousClose > 0 ? px - previousClose : 0;
  const changePct =
    previousClose > 0 ? (change1d / previousClose) * 100 : 0;
  return {
    ticker: symbol,
    currentPrice: px,
    previousClose: previousClose > 0 ? previousClose : px,
    bid,
    ask,
    change1d,
    high52w: px,
    low52w: px,
    volume: ws.lastSize ?? 0,
    changePercentage: changePct,
    quoteSymbol: symbol,
    quoteExchange: "EODHD",
    quoteCurrency: "USD",
    quoteRoute: "EODHD-WS",
    quoteErrors: [],
    quoteUpdatedAt: ws.updatedAt,
  };
}

/** True when US entries must not fall back to EODHD REST /real-time. */
export function mustUseEodhdWsForUsEntry(at: Date = new Date()): boolean {
  return isUsEodhdWsSession(at);
}

/**
 * Resolve US equity price for entries / premarket shadow (WS only).
 * During 4–20 ET: QC fail or stale WS → skip; REST /real-time never used for price.
 */
export async function resolveUsEquityLivePrice(
  ticker: string,
  at: Date = new Date(),
): Promise<UsEquityLivePriceResult> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol || isEuropeanEurEquity(symbol)) {
    return { ok: false, reason: "not US equity", code: "NOT_US" };
  }
  if (!mustUseEodhdWsForUsEntry(at)) {
    return { ok: false, reason: "outside EODHD WS window", code: "NO_WS" };
  }

  const qc = await evaluateEodhdWsQuality(symbol, { alert: false, at });
  if (!qc.ok) {
    const code =
      qc.code === "STALE" ? "STALE" : qc.code === "NO_WS" ? "NO_WS" : "QC_FAIL";
    return { ok: false, reason: qc.reason, code };
  }

  const ws = getEodhdWsQuote(symbol);
  if (!ws) {
    return {
      ok: false,
      reason: `${symbol}: sin cotización EODHD WS (suscribir ≤50)`,
      code: "NO_WS",
    };
  }

  let previousClose = 0;
  try {
    const meta = await getEodhdRestQuote(symbol);
    if (meta?.previousClose != null && meta.previousClose > 0) {
      previousClose = meta.previousClose;
    }
  } catch {
    /* metadata only — not entry mark */
  }

  return { ok: true, snap: snapshotFromWs(symbol, ws, previousClose) };
}
