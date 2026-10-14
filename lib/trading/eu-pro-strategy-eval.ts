/**
 * Explicit EU local strategy evaluation — every eligible id is run when session open.
 */

import { EU_EQUITY_STRATEGY_IDS, type EuEquityStrategyId } from "@/lib/trading/equity-strategy-session";

export type EuStrategyEvalContext = {
  eligibleIds: readonly string[];
  euLocal: boolean;
  phase: string;
  price: number;
  change1d: number;
  relVol: number;
  ema9: number | null;
  ema20: number | null;
  ema21: number | null;
  ema50: number | null;
  resistance: number | null;
  support: number | null;
  dayLow: number;
  rsiVal: number | null;
  reversalCandles: string[];
};

export type EuStrategyEvalHit = {
  id: EuEquityStrategyId;
  reason: string;
  stopLossPrice?: number;
  takeProfitPrice?: number;
};

function nearLevel(price: number, level: number | null, pct: number): boolean {
  if (level == null || !(level > 0) || !(price > 0)) return false;
  return Math.abs(price - level) / price <= pct;
}

function hasBullishReversalCandle(candles: string[]): boolean {
  return candles.some((n) => /HAMMER|ENGULF|PIERCING|MORNING/i.test(n));
}

function evalOne(id: EuEquityStrategyId, ctx: EuStrategyEvalContext): EuStrategyEvalHit | null {
  const {
    price,
    change1d,
    relVol,
    ema9,
    ema20,
    ema21,
    ema50,
    resistance,
    support,
    dayLow,
    rsiVal,
    reversalCandles,
    phase,
    euLocal,
  } = ctx;

  if (id === "EU_APERTURA_BREAKOUT") {
    if (
      (phase === "EUROPE_OPEN" || euLocal) &&
      change1d >= 0.5 &&
      relVol >= 1.3 &&
      ema9 != null &&
      ema21 != null &&
      ema9 > ema21 &&
      resistance != null &&
      price > resistance
    ) {
      return {
        id,
        reason: `Gap/breakout EU +${change1d.toFixed(1)}%`,
        stopLossPrice: dayLow > 0 ? dayLow : price * 0.985,
        takeProfitPrice: price * 1.04,
      };
    }
    return null;
  }

  if (id === "EU_EMA21_PULLBACK") {
    if (
      ema9 != null &&
      ema21 != null &&
      ema50 != null &&
      ema9 > ema21 &&
      ema21 > ema50 &&
      nearLevel(price, ema21, 0.015) &&
      rsiVal != null &&
      rsiVal >= 38 &&
      rsiVal <= 60
    ) {
      return {
        id,
        reason: `Pullback EMA21 EU RSI=${rsiVal.toFixed(0)}${hasBullishReversalCandle(reversalCandles) ? " + vela" : ""}`,
        stopLossPrice: ema50 ?? price * 0.97,
        takeProfitPrice: resistance ?? price * 1.05,
      };
    }
    return null;
  }

  if (id === "EU_TREND_CONTINUATION") {
    if (
      euLocal &&
      ema20 != null &&
      ema50 != null &&
      ema20 > ema50 &&
      rsiVal != null &&
      rsiVal >= 45 &&
      rsiVal <= 68 &&
      change1d > -1 &&
      change1d < 4 &&
      relVol >= 0.85
    ) {
      return {
        id,
        reason: `Tendencia EU EMA20>50 RSI=${rsiVal.toFixed(0)}`,
        stopLossPrice: (support != null ? support : price) * 0.985,
        takeProfitPrice: resistance ?? price * 1.04,
      };
    }
    return null;
  }

  return null;
}

/**
 * Runs every eligible EU strategy id (intersection with EU_EQUITY_STRATEGY_IDS).
 */
export function evaluateEuEligibleStrategies(ctx: EuStrategyEvalContext): {
  hits: EuStrategyEvalHit[];
  evaluated: EuEquityStrategyId[];
} {
  const allow = new Set(ctx.eligibleIds.map((s) => s.trim().toUpperCase()));
  const evaluated: EuEquityStrategyId[] = [];
  const hits: EuStrategyEvalHit[] = [];

  for (const id of EU_EQUITY_STRATEGY_IDS) {
    if (!allow.has(id)) continue;
    evaluated.push(id);
    const hit = evalOne(id, ctx);
    if (hit) hits.push(hit);
  }

  return { hits, evaluated };
}
