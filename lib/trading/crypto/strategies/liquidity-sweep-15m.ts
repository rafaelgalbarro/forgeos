import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, highestHigh, lowestLow, relVolume } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * LIQUIDITY_SWEEP_15M: wick below 20-bar low that closes back inside range,
 * volume > 1.5× avg. Stop under wick; TP mid-range or 2R.
 */
export function evaluateLiquiditySweep15m(
  bars15: readonly Bar[],
): CryptoStrategySignal {
  const id = "LIQUIDITY_SWEEP_15M" as const;
  if (bars15.length < 25) return holdSignal(id, "insuficientes barras");

  const prior = bars15.slice(-21, -1);
  const last = bars15[bars15.length - 1]!;
  const low20 = lowestLow(prior, prior.length);
  const high20 = highestHigh(prior, prior.length);
  if (low20 == null || high20 == null) return holdSignal(id, "rango 20 n/a");

  const swept = last.low < low20 && last.close > low20;
  if (!swept) return holdSignal(id, "sin sweep de liquidez");

  const rv = relVolume(bars15, 20);
  if (rv == null || rv < 1.5) return holdSignal(id, `vol ${rv?.toFixed(2) ?? "n/a"}<1.5x`);

  const mid = (high20 + low20) / 2;
  const entry = last.close;
  const stopLoss = last.low * 0.999;
  const risk = entry - stopLoss;
  if (!(risk > 0)) return holdSignal(id, "risk=0");
  const tp2r = entry + risk * 2;
  const takeProfit = Math.min(mid, tp2r) > entry ? Math.max(mid, entry + risk) : tp2r;
  // Prefer mid if above entry, else 2R
  const tp = mid > entry ? mid : tp2r;
  const a = atr(bars15, 14) ?? risk;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.72,
    reasoning: `LIQUIDITY_SWEEP wick<low20 close-in vol=${rv.toFixed(1)}x`,
    entry,
    stopLoss,
    takeProfit: tp,
    expectedMovePct: (tp - entry) / entry,
    maxHoldMs: 12 * 3600_000,
    atr: a,
    stopLossPct: risk / entry,
    riskR: risk,
    candleTime: last.time,
  };
}
