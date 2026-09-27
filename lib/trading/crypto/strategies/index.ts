/**
 * Evaluate all Kraken strategies + cost filter + ranking helpers.
 */

import "server-only";

import { getBars, getTicker } from "@/lib/brokers/kraken/market-store";
import {
  allowedStrategiesForRegime,
  getMarketRegime,
} from "@/lib/trading/crypto/regime";
import { evaluateMomentumBreakout5m } from "./momentum-breakout-5m";
import { evaluateRsiMeanReversion15m } from "./rsi-mean-reversion-15m";
import { evaluateTopGainerPullback } from "./top-gainer-pullback";
import { evaluateTrendPullback1h } from "./trend-pullback-1h";
import {
  SHADOW_BOOTSTRAP_STRATEGIES,
  type CryptoStrategyId,
  type CryptoStrategySignal,
} from "./types";
import { evaluateVwapReclaim15m } from "./vwap-reclaim-15m";

export * from "./types";
export { evaluateTrendPullback1h } from "./trend-pullback-1h";
export { evaluateRsiMeanReversion15m } from "./rsi-mean-reversion-15m";
export { evaluateMomentumBreakout5m } from "./momentum-breakout-5m";
export { evaluateTopGainerPullback } from "./top-gainer-pullback";
export { evaluateVwapReclaim15m } from "./vwap-reclaim-15m";

/** Maker+taker round-trip cost estimate (fraction). Default ~0.5% + spread. */
export function estimateRoundTripCostPct(spreadPct: number): number {
  const fee = Number(process.env.KRAKEN_TAKER_FEE_PCT ?? 0.0026); // 0.26% typical
  const maker = Number(process.env.KRAKEN_MAKER_FEE_PCT ?? 0.0016);
  return maker + fee + Math.max(0, spreadPct) * 2;
}

/** Discard if expected move < 4 × round-trip cost. */
export function passesCostFilter(
  signal: CryptoStrategySignal,
  spreadPct: number,
): boolean {
  if (signal.direction !== "BUY") return false;
  const cost = estimateRoundTripCostPct(spreadPct);
  return signal.expectedMovePct >= cost * 4;
}

export function evaluateAllStrategiesForPair(pair: string): CryptoStrategySignal[] {
  const bars1 = getBars(pair, "1");
  const bars5 = getBars(pair, "5");
  const bars15 = getBars(pair, "15");
  const bars1h = getBars(pair, "60");
  const ticker = getTicker(pair);

  const raw: CryptoStrategySignal[] = [
    evaluateTrendPullback1h(bars1h),
    evaluateRsiMeanReversion15m(bars15, bars1h),
    evaluateMomentumBreakout5m(bars5.length ? bars5 : bars1, bars1h),
    evaluateTopGainerPullback(bars15, bars1h, ticker),
    evaluateVwapReclaim15m(bars15),
  ];

  const allowed = allowedStrategiesForRegime();
  const spread =
    ticker && ticker.bid > 0 && ticker.ask > 0
      ? (ticker.ask - ticker.bid) / ticker.mid
      : 0.001;

  return raw.filter((s) => {
    if (s.direction !== "BUY") return false;
    if (allowed !== "all" && !allowed.has(s.strategyId)) return false;
    return passesCostFilter(s, spread);
  });
}

export type RankedSignal = CryptoStrategySignal & {
  pair: string;
  score: number;
  shadow: boolean;
  spreadPct: number;
};

export function rankSignals(
  signals: Array<CryptoStrategySignal & { pair: string }>,
  reliability: Partial<Record<CryptoStrategyId, number>>,
): RankedSignal[] {
  const out: RankedSignal[] = [];
  for (const s of signals) {
    const ticker = getTicker(s.pair);
    const spreadPct =
      ticker && ticker.bid > 0 && ticker.ask > 0
        ? (ticker.ask - ticker.bid) / ticker.mid
        : 0.001;
    const cost = estimateRoundTripCostPct(spreadPct);
    const netMove = Math.max(0, s.expectedMovePct - cost);
    const rel = reliability[s.strategyId] ?? 1;
    const score = s.confidence * netMove * rel;
    const shadow =
      SHADOW_BOOTSTRAP_STRATEGIES.has(s.strategyId) ||
      (reliability[s.strategyId] != null && reliability[s.strategyId]! < 0);
    out.push({ ...s, score, shadow, spreadPct });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function regimeLabel(): string {
  return getMarketRegime().regime;
}
