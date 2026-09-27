import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, ema, highestHigh, relVolume } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/** MOMENTUM_BREAKOUT_5M: break 20-bar high with vol>2x, 1h uptrend. Max hold 4h. */
export function evaluateMomentumBreakout5m(
  bars5: readonly Bar[],
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "MOMENTUM_BREAKOUT_5M" as const;
  if (bars5.length < 30) return holdSignal(id, "insuficientes barras 5m");
  const price = bars5[bars5.length - 1]!.close;
  const priorHigh = highestHigh(bars5.slice(0, -1), 20);
  const rv = relVolume(bars5, 20);
  const a = atr(bars5, 14);
  if (priorHigh == null || rv == null || a == null) {
    return holdSignal(id, "indicadores incompletos");
  }
  if (!(price > priorHigh)) return holdSignal(id, "sin ruptura high20");
  if (!(rv > 2)) return holdSignal(id, `volRel=${rv.toFixed(2)} <= 2`);

  const c1h = bars1h.map((b) => b.close);
  const e20 = ema(c1h, 20);
  const e50 = ema(c1h, 50);
  if (e20 == null || e50 == null || !(e20 > e50)) {
    return holdSignal(id, "1h no alcista");
  }

  const stopDist = Math.min(a * 1.2, price * 0.03);
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.7,
    reasoning: `MOMENTUM_BREAKOUT_5M high20 volRel=${rv.toFixed(1)}`,
    entry: price,
    stopLoss: price - stopDist,
    takeProfit: price + stopDist * 2.5,
    expectedMovePct: (stopDist * 2.5) / price,
    maxHoldMs: 4 * 3600_000,
    atr: a,
    stopLossPct: stopDist / price,
    riskR: stopDist,
  };
}
