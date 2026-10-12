import type { Bar, BookSnap } from "@/lib/brokers/kraken/market-store";
import { highestHigh, relVolume } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

function bookImbalance(book: BookSnap | null): number | null {
  if (!book?.bids?.length || !book?.asks?.length) return null;
  const bidQty = book.bids.slice(0, 10).reduce((s, l) => s + l.qty, 0);
  const askQty = book.asks.slice(0, 10).reduce((s, l) => s + l.qty, 0);
  if (!(askQty > 0)) return null;
  return bidQty / askQty;
}

/**
 * MICRO_BREAKOUT_1M: break 15×1m high, vol > 3× avg, bids > 1.5× asks (L10).
 * TP +2.5% (≥3× maker+maker @ 0.40%), SL −0.7%, max hold 30m.
 */
export function evaluateMicroBreakout1m(
  bars1m: readonly Bar[],
  book: BookSnap | null,
): CryptoStrategySignal {
  const id = "MICRO_BREAKOUT_1M" as const;
  if (bars1m.length < 20) return holdSignal(id, "insuficientes barras 1m");
  const last = bars1m[bars1m.length - 1]!;
  const priorHigh = highestHigh(bars1m.slice(0, -1), 15);
  const rv = relVolume(bars1m, 15);
  const imb = bookImbalance(book);
  if (priorHigh == null || rv == null) return holdSignal(id, "indicadores incompletos");
  if (!(last.close > priorHigh)) return holdSignal(id, "sin ruptura high15");
  if (!(rv > 3)) return holdSignal(id, `volRel=${rv.toFixed(2)} <= 3`);
  if (imb == null || !(imb > 1.5)) {
    return holdSignal(id, `book imb=${imb?.toFixed(2) ?? "na"} <= 1.5`);
  }
  const price = last.close;
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.72,
    reasoning: `MICRO_BREAKOUT_1M high15 volRel=${rv.toFixed(1)} imb=${imb.toFixed(2)}`,
    entry: price,
    stopLoss: price * (1 - 0.007),
    takeProfit: price * (1 + 0.025),
    expectedMovePct: 0.025,
    maxHoldMs: 30 * 60_000,
    atr: price * 0.007,
    stopLossPct: 0.007,
    riskR: price * 0.007,
    candleTime: last.time,
  };
}
