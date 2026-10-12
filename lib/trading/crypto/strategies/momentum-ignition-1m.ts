import type { Bar } from "@/lib/brokers/kraken/market-store";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * MOMENTUM_IGNITION_1M: among top-5 1h gainers, 3 green 1m with rising vol;
 * enter on 30–50% pullback of last candle. TP +2%, SL −0.8%, max 20m.
 */
export function evaluateMomentumIgnition1m(
  bars1m: readonly Bar[],
  opts?: { isTop5Gainer1h?: boolean },
): CryptoStrategySignal {
  const id = "MOMENTUM_IGNITION_1M" as const;
  if (!opts?.isTop5Gainer1h) return holdSignal(id, "no top-5 gainer 1h");
  if (bars1m.length < 6) return holdSignal(id, "insuficientes barras 1m");
  const a = bars1m[bars1m.length - 3]!;
  const b = bars1m[bars1m.length - 2]!;
  const c = bars1m[bars1m.length - 1]!;
  const green =
    a.close > a.open && b.close > b.open && c.close > c.open;
  if (!green) return holdSignal(id, "no 3 velas verdes");
  const risingVol = a.volume < b.volume && b.volume < c.volume;
  if (!risingVol) return holdSignal(id, "volumen no creciente");

  const range = c.high - c.low;
  if (!(range > 0)) return holdSignal(id, "vela flat");
  const pullback = (c.high - c.close) / range;
  if (pullback < 0.3 || pullback > 0.5) {
    return holdSignal(id, `pullback=${(pullback * 100).toFixed(0)}% fuera 30-50`);
  }

  const price = c.close;
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.7,
    reasoning: `MOMENTUM_IGNITION_1M pullback=${(pullback * 100).toFixed(0)}%`,
    entry: price,
    stopLoss: price * (1 - 0.008),
    takeProfit: price * (1 + 0.025),
    expectedMovePct: 0.025,
    maxHoldMs: 20 * 60_000,
    atr: price * 0.008,
    stopLossPct: 0.008,
    riskR: price * 0.008,
    candleTime: c.time,
  };
}

/** Rank pairs by last completed 1h candle % change. */
export function topGainerPairs1h(
  pairs: readonly string[],
  get1h: (pair: string) => readonly Bar[],
  n = 5,
): string[] {
  const scored: Array<{ pair: string; pct: number }> = [];
  for (const pair of pairs) {
    const bars = get1h(pair);
    if (bars.length < 2) continue;
    const last = bars[bars.length - 1]!;
    if (!(last.open > 0)) continue;
    scored.push({
      pair,
      pct: ((last.close - last.open) / last.open) * 100,
    });
  }
  return scored
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n)
    .map((s) => s.pair);
}
