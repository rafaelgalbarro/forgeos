import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, ema, rsi } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/** Live RSI band — flipped to 35–60 only if OOS net improves (validate script). */
export const TREND_PULLBACK_RSI_MIN = 40;
export const TREND_PULLBACK_RSI_MAX = 55;

/** Candidate wider band for near-misses at 34–37 and 56–64. */
export const TREND_PULLBACK_RSI_MIN_WIDE = 35;
export const TREND_PULLBACK_RSI_MAX_WIDE = 60;

export type TrendPullbackRsiOpts = {
  rsiMin?: number;
  rsiMax?: number;
};

/**
 * TREND_PULLBACK_1H: EMA20 > EMA50 on 1h, pullback to EMA20, RSI band.
 * Default RSI 40–55; adopt 35–60 only after OOS validation with real fees.
 */
export function evaluateTrendPullback1h(
  bars1h: readonly Bar[],
  opts?: TrendPullbackRsiOpts,
): CryptoStrategySignal {
  const id = "TREND_PULLBACK_1H" as const;
  const rsiMin = opts?.rsiMin ?? TREND_PULLBACK_RSI_MIN;
  const rsiMax = opts?.rsiMax ?? TREND_PULLBACK_RSI_MAX;
  if (bars1h.length < 60) return holdSignal(id, "insuficientes barras 1h");
  const closes = bars1h.map((b) => b.close);
  const price = closes[closes.length - 1]!;
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(bars1h, 14);
  if (e20 == null || e50 == null || r == null || a == null) {
    return holdSignal(id, "indicadores incompletos");
  }
  if (!(e20 > e50)) return holdSignal(id, "EMA20<=EMA50 1h");
  if (Math.abs(price - e20) / price > 0.012) return holdSignal(id, "no en EMA20");
  if (r < rsiMin || r > rsiMax) {
    return holdSignal(id, `RSI=${r.toFixed(0)} fuera ${rsiMin}-${rsiMax}`);
  }
  const stopDist = Math.min(a * 1.5, price * 0.03);
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.74,
    reasoning: `TREND_PULLBACK_1H EMA20>EMA50 RSI=${r.toFixed(0)}`,
    entry: price,
    stopLoss: price - stopDist,
    takeProfit: price + stopDist * 2,
    expectedMovePct: (stopDist * 2) / price,
    maxHoldMs: 24 * 3600_000,
    atr: a,
    stopLossPct: stopDist / price,
    riskR: stopDist,
    candleTime: bars1h[bars1h.length - 1]!.time,
  };
}
