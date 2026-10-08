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
import { evaluateVwapReclaim15m } from "./vwap-reclaim-15m";
import { evaluateRangeGrid15m } from "./range-grid-15m";
import { evaluateRsi2Trend5m } from "./rsi2-trend-5m";
import { evaluateLiquiditySweep15m } from "./liquidity-sweep-15m";
import { evaluateBbSqueezeBreakout15m } from "./bb-squeeze-breakout-15m";
import {
  evaluateRsVsBtc1h,
  topRsPairsVsBtc,
} from "./rs-vs-btc-1h";
import { evaluateEmaCross15m } from "./ema-cross-15m";
import { evaluateSessionOpenBreakout } from "./session-open-breakout";
import {
  cryptoSignalKey,
  type CryptoStrategyId,
  type CryptoStrategySignal,
} from "./types";
import { cryptoStrategyEffectiveMode } from "@/lib/trading/crypto/live-strategies";

export * from "./types";
export { evaluateTrendPullback1h } from "./trend-pullback-1h";
export { evaluateRsiMeanReversion15m } from "./rsi-mean-reversion-15m";
export { evaluateMomentumBreakout5m } from "./momentum-breakout-5m";
export { evaluateTopGainerPullback } from "./top-gainer-pullback";
export { evaluateVwapReclaim15m } from "./vwap-reclaim-15m";
export { evaluateRangeGrid15m } from "./range-grid-15m";
export { evaluateRsi2Trend5m, rsi2TrendShouldExit } from "./rsi2-trend-5m";
export { evaluateLiquiditySweep15m } from "./liquidity-sweep-15m";
export { evaluateBbSqueezeBreakout15m } from "./bb-squeeze-breakout-15m";
export { evaluateRsVsBtc1h, topRsPairsVsBtc } from "./rs-vs-btc-1h";
export { evaluateEmaCross15m } from "./ema-cross-15m";
export {
  evaluateSessionOpenBreakout,
  isSessionOpenWindow,
} from "./session-open-breakout";

/** Maker + taker round-trip (fraction). Defaults match Kraken retail. */
export function estimateRoundTripCostPct(spreadPct: number): number {
  const taker = Number(process.env.KRAKEN_TAKER_FEE_PCT ?? 0.004); // 0.40%
  const maker = Number(process.env.KRAKEN_MAKER_FEE_PCT ?? 0.0025); // 0.25%
  // Entries post-only (maker) + exit often taker on stop
  return maker + taker + Math.max(0, spreadPct) * 2;
}

/** Discard if expected move to TP < 3 × round-trip cost. */
export function passesCostFilter(
  signal: CryptoStrategySignal,
  spreadPct: number,
): boolean {
  if (signal.direction !== "BUY") return false;
  const cost = estimateRoundTripCostPct(spreadPct);
  return signal.expectedMovePct >= cost * 3;
}

export type EvaluatePairOpts = {
  openGridLevels?: number;
  isTop3Rs?: boolean;
  now?: Date;
};

export function evaluateAllStrategiesForPair(
  pair: string,
  opts?: EvaluatePairOpts,
): CryptoStrategySignal[] {
  const bars1 = getBars(pair, "1");
  const bars5 = getBars(pair, "5");
  const bars15 = getBars(pair, "15");
  const bars1h = getBars(pair, "60");
  const btc1h = getBars("XBTEUR", "60");
  const ticker = getTicker(pair);
  const regime = getMarketRegime().regime;

  const raw: CryptoStrategySignal[] = [
    evaluateTrendPullback1h(bars1h),
    evaluateRsiMeanReversion15m(bars15, bars1h),
    evaluateMomentumBreakout5m(bars5.length ? bars5 : bars1, bars1h),
    evaluateTopGainerPullback(bars15, bars1h, ticker),
    evaluateVwapReclaim15m(bars15),
    evaluateRangeGrid15m(bars15, regime, opts?.openGridLevels ?? 0),
    evaluateRsi2Trend5m(bars5.length ? bars5 : bars1, bars1h),
    evaluateLiquiditySweep15m(bars15),
    evaluateBbSqueezeBreakout15m(bars15),
    evaluateRsVsBtc1h(bars15, bars1h, btc1h, regime, {
      isTop3Rs: opts?.isTop3Rs,
    }),
    evaluateEmaCross15m(bars15, bars1h),
    evaluateSessionOpenBreakout(bars15, opts?.now ?? new Date()),
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

/** Grid force-exit signals (regime left LATERAL). */
export function evaluateGridForceExits(
  pair: string,
): CryptoStrategySignal | null {
  const bars15 = getBars(pair, "15");
  const regime = getMarketRegime().regime;
  const sig = evaluateRangeGrid15m(bars15, regime, 0);
  if (sig.forceExitReason === "REGIME_EXIT_LATERAL") return sig;
  return null;
}

export type RankedSignal = CryptoStrategySignal & {
  pair: string;
  score: number;
  shadow: boolean;
  spreadPct: number;
  signalKey: string;
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
    const score = s.confidence * netMove * Math.max(0.2, rel);
    const shadow = cryptoStrategyEffectiveMode(s.strategyId) === "shadow";
    out.push({
      ...s,
      score,
      shadow,
      spreadPct,
      signalKey: cryptoSignalKey(s.strategyId, s.pair, s.candleTime),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function regimeLabel(): string {
  return getMarketRegime().regime;
}
