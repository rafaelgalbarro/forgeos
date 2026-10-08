import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, ema } from "@/lib/trading/crypto/indicators";
import type { MarketRegime } from "@/lib/trading/crypto/regime";
import { holdSignal, type CryptoStrategySignal } from "./types";

function ret(bars: readonly Bar[], n: number): number | null {
  if (bars.length < n + 1) return null;
  const a = bars[bars.length - 1 - n]!.close;
  const b = bars[bars.length - 1]!.close;
  if (!(a > 0)) return null;
  return (b - a) / a;
}

/**
 * RS_VS_BTC_1H: relative strength vs BTC on 1h+4h; BTC not BAJISTA;
 * entry on first pullback to EMA20 15m.
 * Caller should only invoke for pairs in top-3 RS universe.
 */
export function evaluateRsVsBtc1h(
  bars15: readonly Bar[],
  bars1h: readonly Bar[],
  btc1h: readonly Bar[],
  regime: MarketRegime,
  opts?: { isTop3Rs?: boolean },
): CryptoStrategySignal {
  const id = "RS_VS_BTC_1H" as const;
  if (regime === "BAJISTA") return holdSignal(id, "BTC régimen BAJISTA");
  if (!opts?.isTop3Rs) return holdSignal(id, "no top-3 RS vs BTC");
  if (bars15.length < 40 || bars1h.length < 10 || btc1h.length < 10) {
    return holdSignal(id, "insuficientes barras");
  }

  const pair1h = ret(bars1h, 1);
  const pair4h = ret(bars1h, 4);
  const btcR1 = ret(btc1h, 1);
  const btcR4 = ret(btc1h, 4);
  if (
    pair1h == null ||
    pair4h == null ||
    btcR1 == null ||
    btcR4 == null
  ) {
    return holdSignal(id, "returns n/a");
  }
  const rs1 = pair1h - btcR1;
  const rs4 = pair4h - btcR4;
  if (rs1 <= 0 || rs4 <= 0) return holdSignal(id, "RS no positivo 1h+4h");

  const c15 = bars15.map((b) => b.close);
  const e20 = ema(c15, 20);
  const price = c15[c15.length - 1]!;
  if (e20 == null) return holdSignal(id, "EMA20 n/a");
  if (Math.abs(price - e20) / price > 0.01) {
    return holdSignal(id, "sin pullback EMA20 15m");
  }

  const a = atr(bars15, 14) ?? price * 0.01;
  const stopLoss = Math.min(e20, price) - a;
  const takeProfit = price + (price - stopLoss) * 2;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.71,
    reasoning: `RS_VS_BTC rs1h=${(rs1 * 100).toFixed(1)}% rs4h=${(rs4 * 100).toFixed(1)}%`,
    entry: price,
    stopLoss,
    takeProfit,
    expectedMovePct: (takeProfit - price) / price,
    maxHoldMs: 24 * 3600_000,
    atr: a,
    stopLossPct: (price - stopLoss) / price,
    riskR: price - stopLoss,
    candleTime: bars15[bars15.length - 1]!.time,
  };
}

/** Rank pairs by combined RS vs BTC; return top N symbols. */
export function topRsPairsVsBtc(
  pairs: string[],
  get1h: (pair: string) => readonly Bar[],
  btc1h: readonly Bar[],
  n = 3,
): string[] {
  const scored: Array<{ pair: string; score: number }> = [];
  for (const pair of pairs) {
    if (pair === "XBTEUR" || pair === "BTCEUR") continue;
    const bars = get1h(pair);
    const p1 = ret(bars, 1);
    const p4 = ret(bars, 4);
    const b1 = ret(btc1h, 1);
    const b4 = ret(btc1h, 4);
    if (p1 == null || p4 == null || b1 == null || b4 == null) continue;
    scored.push({ pair, score: p1 - b1 + (p4 - b4) });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((s) => s.pair);
}
