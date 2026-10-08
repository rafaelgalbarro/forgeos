import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, ema, lowestLow, rsi } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/** RSI_MEAN_REVERSION_15M: RSI<30, 1h trend not bearish, price near support. */
export function evaluateRsiMeanReversion15m(
  bars15: readonly Bar[],
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "RSI_MEAN_REVERSION_15M" as const;
  if (bars15.length < 40) return holdSignal(id, "insuficientes barras 15m");
  const c15 = bars15.map((b) => b.close);
  const price = c15[c15.length - 1]!;
  const r = rsi(c15, 14);
  const a = atr(bars15, 14);
  const support = lowestLow(bars15, 20);
  if (r == null || a == null) return holdSignal(id, "indicadores incompletos");
  if (!(r < 30)) return holdSignal(id, `RSI=${r.toFixed(0)} >= 30`);

  const c1h = bars1h.length >= 30 ? bars1h.map((b) => b.close) : c15;
  const e20 = ema(c1h, 20);
  const e50 = ema(c1h, 50);
  const trendOk =
    e20 == null || e50 == null ? true : e20 >= e50 * 0.998;
  if (!trendOk) return holdSignal(id, "tendencia 1h bajista");
  if (support != null && price < support * 0.995) {
    return holdSignal(id, "rompe soporte");
  }
  if (support != null && (price - support) / price > 0.02) {
    return holdSignal(id, "lejos del soporte");
  }

  const stopDist = Math.min(a * 1.5, price * 0.03);
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.72,
    reasoning: `RSI_MEAN_REVERSION_15M RSI=${r.toFixed(0)} soporte ok`,
    entry: price,
    stopLoss: price - stopDist,
    takeProfit: price + stopDist * 2,
    expectedMovePct: (stopDist * 2) / price,
    maxHoldMs: 24 * 3600_000,
    atr: a,
    stopLossPct: stopDist / price,
    riskR: stopDist,
    candleTime: bars15[bars15.length - 1]!.time,
  };
}
