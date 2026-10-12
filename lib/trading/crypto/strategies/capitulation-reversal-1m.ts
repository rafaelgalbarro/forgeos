import type { Bar } from "@/lib/brokers/kraken/market-store";
import { relVolume } from "@/lib/trading/crypto/indicators";
import type { MarketRegime } from "@/lib/trading/crypto/regime";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * CAPITULATION_REVERSAL_1M: 1m drop >1.5% with vol >5× avg that recovers half
 * the wick next candle; not strong BAJISTA. TP +1.5%, SL under wick.
 */
export function evaluateCapitulationReversal1m(
  bars1m: readonly Bar[],
  regime: MarketRegime,
): CryptoStrategySignal {
  const id = "CAPITULATION_REVERSAL_1M" as const;
  if (regime === "BAJISTA") return holdSignal(id, "régimen BAJISTA");
  if (bars1m.length < 25) return holdSignal(id, "insuficientes barras 1m");

  const dump = bars1m[bars1m.length - 2]!;
  const recover = bars1m[bars1m.length - 1]!;
  if (!(dump.open > 0)) return holdSignal(id, "dump open inválido");
  const dropPct = (dump.open - dump.close) / dump.open;
  if (!(dropPct > 0.015)) return holdSignal(id, `drop=${(dropPct * 100).toFixed(2)}% <= 1.5`);

  const rvDump = relVolume(bars1m.slice(0, -1), 20);
  if (rvDump == null || !(rvDump > 5)) {
    return holdSignal(id, `volRel dump=${rvDump?.toFixed(2) ?? "na"} <= 5`);
  }

  const wickLow = dump.low;
  const midWick = dump.close - (dump.close - wickLow) * 0.5;
  // Recovered half the lower wick: close of next candle above midpoint of wick
  if (!(recover.close >= midWick)) {
    return holdSignal(id, "sin recovery half-wick");
  }

  const price = recover.close;
  const stop = Math.min(wickLow * 0.999, price * (1 - 0.01));
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.68,
    reasoning: `CAPITULATION_REVERSAL_1M drop=${(dropPct * 100).toFixed(1)}% volRel=${rvDump.toFixed(1)}`,
    entry: price,
    stopLoss: stop,
    takeProfit: price * (1 + 0.025),
    expectedMovePct: 0.025,
    maxHoldMs: 30 * 60_000,
    atr: price - stop,
    stopLossPct: (price - stop) / price,
    riskR: price - stop,
    candleTime: recover.time,
  };
}
