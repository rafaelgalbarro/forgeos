import type { Bar } from "@/lib/brokers/kraken/market-store";
import { dailyVwap, ema } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * VWAP_BOUNCE_5M: 1h uptrend, session VWAP touch + rejection on 5m.
 * TP +1.5%, SL −0.7%, max hold 60m.
 */
export function evaluateVwapBounce5m(
  bars5m: readonly Bar[],
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "VWAP_BOUNCE_5M" as const;
  if (bars5m.length < 30 || bars1h.length < 30) {
    return holdSignal(id, "insuficientes barras");
  }
  const c1h = bars1h.map((b) => b.close);
  const e20 = ema(c1h, 20);
  const e50 = ema(c1h, 50);
  if (e20 == null || e50 == null || !(e20 > e50)) {
    return holdSignal(id, "1h no alcista");
  }

  const vwap = dailyVwap(bars5m);
  if (vwap == null || !(vwap > 0)) return holdSignal(id, "sin VWAP");
  const last = bars5m[bars5m.length - 1]!;
  const touched = last.low <= vwap * 1.001 && last.high >= vwap * 0.999;
  const rejected = last.close > vwap && last.close > last.open;
  if (!(touched && rejected)) return holdSignal(id, "sin touch+reject VWAP");

  const price = last.close;
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.7,
    reasoning: `VWAP_BOUNCE_5M vwap=${vwap.toFixed(4)}`,
    entry: price,
    stopLoss: price * (1 - 0.007),
    takeProfit: price * (1 + 0.025),
    expectedMovePct: 0.025,
    maxHoldMs: 60 * 60_000,
    atr: price * 0.007,
    stopLossPct: 0.007,
    riskR: price * 0.007,
    candleTime: last.time,
  };
}
