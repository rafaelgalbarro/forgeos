import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, ema, emaSeries } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * EMA_CROSS_15M: EMA9 crosses above EMA21 on 15m with EMA50 > EMA200 on 1h.
 */
export function evaluateEmaCross15m(
  bars15: readonly Bar[],
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "EMA_CROSS_15M" as const;
  if (bars15.length < 40 || bars1h.length < 220) {
    return holdSignal(id, "insuficientes barras");
  }
  const c1h = bars1h.map((b) => b.close);
  const e50 = ema(c1h, 50);
  const e200 = ema(c1h, 200);
  if (e50 == null || e200 == null || !(e50 > e200)) {
    return holdSignal(id, "EMA50<=EMA200 1h");
  }

  const c15 = bars15.map((b) => b.close);
  const s9 = emaSeries(c15, 9);
  const s21 = emaSeries(c15, 21);
  const i = c15.length - 1;
  const e9 = s9[i];
  const e21 = s21[i];
  const p9 = s9[i - 1];
  const p21 = s21[i - 1];
  if (e9 == null || e21 == null || p9 == null || p21 == null) {
    return holdSignal(id, "EMA series n/a");
  }
  const crossUp = p9 <= p21 && e9 > e21;
  if (!crossUp) return holdSignal(id, "sin cruce EMA9/21");

  const price = c15[i]!;
  const a = atr(bars15, 14) ?? price * 0.01;
  const stopLoss = Math.min(e21, price) - a * 0.5;
  const takeProfit = price + (price - stopLoss) * 2;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.69,
    reasoning: `EMA_CROSS 9×21 15m + tendencia 1h`,
    entry: price,
    stopLoss,
    takeProfit,
    expectedMovePct: (takeProfit - price) / price,
    maxHoldMs: 16 * 3600_000,
    atr: a,
    stopLossPct: (price - stopLoss) / price,
    riskR: price - stopLoss,
    candleTime: bars15[i]!.time,
  };
}
