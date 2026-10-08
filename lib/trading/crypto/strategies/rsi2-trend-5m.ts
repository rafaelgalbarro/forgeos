import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, ema, rsi } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * RSI2_TREND_5M: EMA50 > EMA200 on 1h AND RSI(2) on 5m < 10.
 * Exit: close above EMA5 (5m) or 4h max hold.
 */
export function evaluateRsi2Trend5m(
  bars5: readonly Bar[],
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "RSI2_TREND_5M" as const;
  if (bars5.length < 30 || bars1h.length < 220) {
    return holdSignal(id, "insuficientes barras");
  }
  const c1h = bars1h.map((b) => b.close);
  const e50 = ema(c1h, 50);
  const e200 = ema(c1h, 200);
  if (e50 == null || e200 == null || !(e50 > e200)) {
    return holdSignal(id, "EMA50<=EMA200 1h");
  }
  const c5 = bars5.map((b) => b.close);
  const r2 = rsi(c5, 2);
  if (r2 == null || r2 >= 10) return holdSignal(id, `RSI2=${r2?.toFixed(1) ?? "n/a"}>=10`);

  const price = c5[c5.length - 1]!;
  const e5 = ema(c5, 5);
  const a = atr(bars5, 14) ?? price * 0.01;
  const stopLoss = price - a * 1.2;
  // Target: reclaim EMA5 + buffer, or 2R
  const tpViaEma = e5 != null ? e5 * 1.002 : price + a * 2;
  const takeProfit = Math.max(tpViaEma, price + (price - stopLoss) * 2);
  const expectedMovePct = (takeProfit - price) / price;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.7,
    reasoning: `RSI2_TREND RSI2=${r2.toFixed(1)} EMA50>200 1h`,
    entry: price,
    stopLoss,
    takeProfit,
    expectedMovePct,
    maxHoldMs: 4 * 3600_000,
    atr: a,
    stopLossPct: (price - stopLoss) / price,
    riskR: price - stopLoss,
    candleTime: bars5[bars5.length - 1]!.time,
  };
}

/** Exit check reused by engine + backtester. */
export function rsi2TrendShouldExit(
  bars5: readonly Bar[],
  entry: number,
  openedAtMs: number,
  nowMs = Date.now(),
): string | null {
  if (nowMs - openedAtMs >= 4 * 3600_000) return "MAX_HOLD_4H";
  if (bars5.length < 10) return null;
  const c5 = bars5.map((b) => b.close);
  const e5 = ema(c5, 5);
  const price = c5[c5.length - 1]!;
  if (e5 != null && price > e5) return "EMA5_RECLAIM";
  void entry;
  return null;
}
