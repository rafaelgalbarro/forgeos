/**
 * Futures-only strategy evaluation (long + native shorts), futures fees + diagnostics.
 */

import "server-only";

import { getBars, getTicker } from "@/lib/brokers/kraken/market-store";
import { spotPairToPfSymbol } from "@/lib/brokers/kraken-futures/instruments";
import { getMarketRegime } from "@/lib/trading/crypto/regime";
import { recordFuturesStrategyEval } from "@/lib/trading/crypto/futures-diagnostics";
import { applyStopDistanceCap } from "@/lib/trading/crypto/signal-guards";
import {
  evaluateAllStrategiesForPair,
  evaluateFastStrategiesForPair,
  passesCostFilter,
  type EvaluatePairOpts,
} from "@/lib/trading/crypto/strategies";
import {
  bottomRsPairsVsBtc,
  evaluateLiquiditySweep15mShort,
  evaluateRsVsBtc1hShort,
  evaluateTrendPullback1hShort,
  evaluateVwapBounce5mShort,
} from "@/lib/trading/crypto/strategies/futures-short-strategies";
import { topRsPairsVsBtc } from "@/lib/trading/crypto/strategies/rs-vs-btc-1h";
import type { CryptoStrategySignal } from "@/lib/trading/crypto/strategies/types";
import {
  FUTURES_DEFAULT_MAKER,
  FUTURES_DEFAULT_TAKER,
} from "@/lib/trading/crypto/backtest-futures-core";

export type FuturesFeeRates = { makerPct: number; takerPct: number };

function allowedFuturesShortForRegime(regime: string): boolean {
  return regime === "BAJISTA" || regime === "LATERAL";
}

function passesFuturesCostFilter(
  signal: CryptoStrategySignal,
  spreadPct: number,
  fees: FuturesFeeRates,
): boolean {
  return passesCostFilter(signal, spreadPct, {
    allowFuturesShort: true,
    makerPct: fees.makerPct,
    takerPct: fees.takerPct,
  });
}

function recordEval(
  signal: CryptoStrategySignal,
  pair: string,
  direction: "long" | "short",
  missing: string | null,
): void {
  recordFuturesStrategyEval({
    strategy: signal.strategyId,
    // Diagnostics show the traded contract (PF_*), not the internal spot key.
    pair: spotPairToPfSymbol(pair) ?? pair,
    direction,
    signalDirection: missing ? "HOLD" : signal.direction,
    reasoning: signal.reasoning,
    missing,
  });
}

function filterFuturesSignal(
  signal: CryptoStrategySignal,
  pair: string,
  direction: "long" | "short",
  spread: number,
  fees: FuturesFeeRates,
  regimeOk: boolean,
): CryptoStrategySignal | null {
  let missing: string | null = null;
  const wantBuy = direction === "long";
  const wantSell = direction === "short";
  if (wantBuy && signal.direction !== "BUY") {
    missing = signal.reasoning.slice(0, 80);
  } else if (wantSell && signal.direction !== "SELL") {
    missing = signal.reasoning.slice(0, 80);
  } else if (!regimeOk) {
    missing = `régimen no permite ${direction}`;
  } else if (applyStopDistanceCap(signal) === null) {
    missing = "stop_distance_cap";
  } else if (!passesFuturesCostFilter(signal, spread, fees)) {
    missing = "coste_futures_3x";
  }
  recordEval(signal, pair, direction, missing);
  if (missing) return null;
  return signal;
}

/**
 * Evaluate long (spot logic) + native shorts for Kraken Futures engine.
 */
export function evaluateFuturesStrategiesForPair(
  pair: string,
  opts: EvaluatePairOpts & {
    fees?: FuturesFeeRates;
    allPairs?: string[];
  },
): CryptoStrategySignal[] {
  const fees = opts.fees ?? {
    makerPct: FUTURES_DEFAULT_MAKER,
    takerPct: FUTURES_DEFAULT_TAKER,
  };
  const regime = getMarketRegime().regime;
  const ticker = getTicker(pair);
  const spread =
    ticker && ticker.bid > 0 && ticker.ask > 0 && ticker.mid > 0
      ? (ticker.ask - ticker.bid) / ticker.mid
      : 0.001;

  const longRegimeOk = regime !== "BAJISTA";
  const shortRegimeOk = allowedFuturesShortForRegime(regime);

  const seenLong = new Set<string>();
  const longs: CryptoStrategySignal[] = [];
  for (const s of [
    ...evaluateAllStrategiesForPair(pair, opts),
    ...evaluateFastStrategiesForPair(pair, opts),
  ]) {
    if (seenLong.has(s.strategyId)) continue;
    seenLong.add(s.strategyId);
    longs.push(s);
  }

  const bars5 = getBars(pair, "5");
  const bars15 = getBars(pair, "15");
  const bars1h = getBars(pair, "60");
  const btc1h = getBars("XBTEUR", "60");
  const universe = opts.allPairs ?? [pair];
  const topRs = new Set(
    topRsPairsVsBtc(universe, (p) => getBars(p, "60"), btc1h, 3),
  );
  const bottomRs = new Set(
    bottomRsPairsVsBtc(universe, (p) => getBars(p, "60"), btc1h, 3),
  );

  const shortsRaw: CryptoStrategySignal[] = [
    evaluateVwapBounce5mShort(bars5.length ? bars5 : getBars(pair, "1"), bars1h),
    evaluateTrendPullback1hShort(bars1h),
    evaluateLiquiditySweep15mShort(bars15),
    evaluateRsVsBtc1hShort(bars15, bars1h, btc1h, regime, {
      isBottom3Rs: bottomRs.has(pair),
    }),
  ];

  const out: CryptoStrategySignal[] = [];
  for (const s of longs) {
    const ok = filterFuturesSignal(s, pair, "long", spread, fees, longRegimeOk);
    if (ok) out.push(ok);
  }
  for (const s of shortsRaw) {
    const ok = filterFuturesSignal(s, pair, "short", spread, fees, shortRegimeOk);
    if (ok) out.push(ok);
  }

  // RS long still needs top-3 flag — re-filter RS long if present
  return out.filter((s) => {
    if (s.strategyId === "RS_VS_BTC_1H" && !topRs.has(pair)) return false;
    return true;
  });
}
