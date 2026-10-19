/**
 * Evaluate all Kraken strategies + cost filter + ranking helpers.
 */

import "server-only";

import { getBars, getBook, getTicker } from "@/lib/brokers/kraken/market-store";
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
import { evaluateMicroBreakout1m } from "./micro-breakout-1m";
import {
  evaluateMomentumIgnition1m,
  topGainerPairs1h,
} from "./momentum-ignition-1m";
import { evaluateCapitulationReversal1m } from "./capitulation-reversal-1m";
import { evaluateVwapBounce5m } from "./vwap-bounce-5m";
import { recordStrategyEval } from "@/lib/trading/crypto/diagnostics";
import { applyStopDistanceCap } from "@/lib/trading/crypto/signal-guards";
import {
  cryptoSignalKey,
  isFastCryptoStrategy,
  isFuturesShortStrategy,
  strategyCostFilterMode,
  type CryptoStrategyId,
  type CryptoStrategySignal,
} from "./types";
import { cryptoStrategyEffectiveMode } from "@/lib/trading/crypto/live-strategies";
import {
  getMakerFeePct,
  getTakerFeePct,
} from "@/lib/trading/crypto/fee-schedule";

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
export { evaluateMicroBreakout1m } from "./micro-breakout-1m";
export {
  evaluateMomentumIgnition1m,
  topGainerPairs1h,
} from "./momentum-ignition-1m";
export { evaluateCapitulationReversal1m } from "./capitulation-reversal-1m";
export { evaluateVwapBounce5m } from "./vwap-bounce-5m";
export {
  bottomRsPairsVsBtc,
  evaluateLiquiditySweep15mShort,
  evaluateRsVsBtc1hShort,
  evaluateTrendPullback1hShort,
  evaluateVwapBounce5mShort,
} from "./futures-short-strategies";

/**
 * Round-trip cost fraction for cost filter.
 * - maker_maker (fast / RANGE_GRID): maker+maker+spread → ~0.80% + spread
 * - maker_taker (stop/time primary): maker+taker+spread → ~1.20% + spread
 * Live rates from TradeVolume cache (default 0.40%/0.80%).
 */
export type CostFilterOpts = {
  makerPct?: number;
  takerPct?: number;
  /** Allow native futures short (SELL) signals. */
  allowFuturesShort?: boolean;
};

export function estimateRoundTripCostPct(
  spreadPct: number,
  strategyId?: string,
  feeOpts?: Pick<CostFilterOpts, "makerPct" | "takerPct">,
): number {
  const maker = feeOpts?.makerPct ?? getMakerFeePct();
  const taker = feeOpts?.takerPct ?? getTakerFeePct();
  const spread = Math.max(0, spreadPct);
  const sid = strategyId ?? "";
  const mode =
    isFuturesShortStrategy(sid) && sid.startsWith("VWAP_BOUNCE")
      ? "maker_maker"
      : strategyId
        ? strategyCostFilterMode(strategyId)
        : "maker_taker";
  if (mode === "maker_maker") {
    return maker + maker + spread;
  }
  return maker + taker + spread;
}

/**
 * Fast strategies: post-only in + post-only TP out → maker+maker+spread.
 * With account fees 0.40%+0.40% → min target ≥ ~2.4% (+ spread×3 via passesCostFilter).
 */
export function estimateFastRoundTripCostPct(spreadPct: number): number {
  return estimateRoundTripCostPct(spreadPct, "MICRO_BREAKOUT_1M");
}

export const FAST_MAX_SPREAD_PCT = 0.001; // 0.1%

/** Discard if expected move to TP < 3 × real round-trip cost. */
export function passesCostFilter(
  signal: CryptoStrategySignal,
  spreadPct: number,
  opts?: CostFilterOpts,
): boolean {
  const shortOk =
    opts?.allowFuturesShort &&
    signal.direction === "SELL" &&
    isFuturesShortStrategy(signal.strategyId);
  if (signal.direction !== "BUY" && !shortOk) return false;
  const feeOpts = { makerPct: opts?.makerPct, takerPct: opts?.takerPct };
  const fastLike =
    isFastCryptoStrategy(signal.strategyId) ||
    (isFuturesShortStrategy(signal.strategyId) &&
      signal.strategyId.startsWith("VWAP_BOUNCE"));
  if (fastLike) {
    // Spread is a hard gate; fee RT uses live maker+maker.
    if (spreadPct >= FAST_MAX_SPREAD_PCT) return false;
    const feeCost = estimateRoundTripCostPct(0, signal.strategyId, feeOpts);
    return signal.expectedMovePct + 1e-12 >= feeCost * 3;
  }
  const cost = estimateRoundTripCostPct(spreadPct, signal.strategyId, feeOpts);
  return signal.expectedMovePct + 1e-12 >= cost * 3;
}

export { strategyCostFilterMode };

export type EvaluatePairOpts = {
  openGridLevels?: number;
  isTop3Rs?: boolean;
  isTop5Gainer1h?: boolean;
  now?: Date;
  /** When true, only evaluate fast 1–5m strategies. */
  fastOnly?: boolean;
};

export function evaluateFastStrategiesForPair(
  pair: string,
  opts?: EvaluatePairOpts,
): CryptoStrategySignal[] {
  const bars1 = getBars(pair, "1");
  const bars5 = getBars(pair, "5");
  const bars1h = getBars(pair, "60");
  const book = getBook(pair);
  const ticker = getTicker(pair);
  const regime = getMarketRegime().regime;

  const raw: CryptoStrategySignal[] = [
    evaluateMicroBreakout1m(bars1, book),
    evaluateMomentumIgnition1m(bars1, {
      isTop5Gainer1h: opts?.isTop5Gainer1h,
    }),
    evaluateCapitulationReversal1m(bars1, regime),
    evaluateVwapBounce5m(bars5.length ? bars5 : bars1, bars1h),
  ];

  const spread =
    ticker && ticker.bid > 0 && ticker.ask > 0 && ticker.mid > 0
      ? (ticker.ask - ticker.bid) / ticker.mid
      : 0.001;
  const allowed = allowedStrategiesForRegime();

  for (const s of raw) {
    let missing: string | null = null;
    if (s.direction === "BUY") {
      if (allowed !== "all" && !allowed.has(s.strategyId)) {
        missing = `régimen ${regime} no permite ${s.strategyId}`;
      } else if (applyStopDistanceCap(s) === null) {
        missing = "stop_distance_cap";
      } else if (!passesCostFilter(s, spread)) {
        missing = "coste_roundtrip_3x";
      }
    } else if (/RSI=|EMA|vol|spread|sesión|rango|régimen|1m|5m/i.test(s.reasoning)) {
      missing = s.reasoning.slice(0, 80);
    }
    recordStrategyEval({
      strategy: s.strategyId,
      pair,
      direction: missing && s.direction === "BUY" ? "HOLD" : s.direction,
      reasoning: missing ?? s.reasoning,
      missing:
        s.direction === "BUY" && missing
          ? missing
          : s.direction !== "BUY"
            ? missing
            : null,
      passed: s.direction === "BUY" && !missing ? ["signal_buy"] : [],
    });
  }

  return raw.filter((s) => {
    if (s.direction !== "BUY") return false;
    if (allowed !== "all" && !allowed.has(s.strategyId)) return false;
    if (applyStopDistanceCap(s) === null) return false;
    return passesCostFilter(s, spread);
  });
}

export function evaluateAllStrategiesForPair(
  pair: string,
  opts?: EvaluatePairOpts,
): CryptoStrategySignal[] {
  if (opts?.fastOnly) return evaluateFastStrategiesForPair(pair, opts);

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

  // Diagnostics: every eval + near-miss (blocked buy or single-condition hold)
  for (const s of raw) {
    let missing: string | null = null;
    if (s.direction === "BUY") {
      if (allowed !== "all" && !allowed.has(s.strategyId)) {
        missing = `régimen ${regime} no permite ${s.strategyId}`;
      } else if (applyStopDistanceCap(s) === null) {
        missing = "stop_distance_cap";
      } else if (!passesCostFilter(s, spread)) {
        missing = "coste_roundtrip_3x";
      }
    } else if (/RSI=|EMA|vol|spread|sesión|rango|régimen/i.test(s.reasoning)) {
      missing = s.reasoning.slice(0, 80);
    }
    recordStrategyEval({
      strategy: s.strategyId,
      pair,
      direction: missing && s.direction === "BUY" ? "HOLD" : s.direction,
      reasoning: missing ?? s.reasoning,
      missing:
        s.direction === "BUY" && missing
          ? missing
          : s.direction !== "BUY"
            ? missing
            : null,
      passed: s.direction === "BUY" ? ["signal_buy"] : [],
    });
  }

  return raw.filter((s) => {
    if (s.direction !== "BUY") return false;
    if (allowed !== "all" && !allowed.has(s.strategyId)) return false;
    if (applyStopDistanceCap(s) === null) return false;
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
    const cost = estimateRoundTripCostPct(spreadPct, s.strategyId);
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
