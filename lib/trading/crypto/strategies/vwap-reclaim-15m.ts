import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, dailyVwap, relVolume } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/** VWAP_RECLAIM_15M: price reclaims daily VWAP after losing it, rising volume. */
export function evaluateVwapReclaim15m(bars15: readonly Bar[]): CryptoStrategySignal {
  const id = "VWAP_RECLAIM_15M" as const;
  if (bars15.length < 40) return holdSignal(id, "insuficientes barras 15m");
  const vwap = dailyVwap(bars15);
  const a = atr(bars15, 14);
  const rv = relVolume(bars15, 20);
  if (vwap == null || a == null || rv == null) {
    return holdSignal(id, "indicadores incompletos");
  }
  const prev = bars15[bars15.length - 2]!;
  const last = bars15[bars15.length - 1]!;
  const wasBelow = prev.close < vwap * 0.999;
  const nowAbove = last.close > vwap * 1.0005;
  if (!(wasBelow && nowAbove)) return holdSignal(id, "sin reclaim VWAP");
  if (!(rv > 1.2)) return holdSignal(id, `volRel=${rv.toFixed(2)} bajo`);

  const price = last.close;
  const stopDist = Math.min(a * 1.4, price * 0.03);
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.69,
    reasoning: `VWAP_RECLAIM_15M volRel=${rv.toFixed(1)}`,
    entry: price,
    stopLoss: Math.min(price - stopDist, vwap * 0.995),
    takeProfit: price + stopDist * 2,
    expectedMovePct: (stopDist * 2) / price,
    maxHoldMs: 24 * 3600_000,
    atr: a,
    stopLossPct: stopDist / price,
    riskR: stopDist,
  };
}
