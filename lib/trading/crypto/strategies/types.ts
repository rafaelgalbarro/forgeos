/**
 * Shared crypto strategy signal types.
 */

export type CryptoStrategyId =
  | "TREND_PULLBACK_1H"
  | "RSI_MEAN_REVERSION_15M"
  | "MOMENTUM_BREAKOUT_5M"
  | "TOP_GAINER_PULLBACK"
  | "VWAP_RECLAIM_15M";

/** Strategies that start in shadow until proven. */
export const SHADOW_BOOTSTRAP_STRATEGIES: ReadonlySet<CryptoStrategyId> = new Set([
  "MOMENTUM_BREAKOUT_5M",
  "TOP_GAINER_PULLBACK",
  "VWAP_RECLAIM_15M",
]);

export type CryptoStrategySignal = {
  strategyId: CryptoStrategyId;
  direction: "BUY" | "HOLD";
  confidence: number;
  reasoning: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  /** Expected move to TP as fraction (e.g. 0.02 = 2%). */
  expectedMovePct: number;
  /** Max hold ms for this strategy. */
  maxHoldMs: number;
  /** ATR of strategy timeframe for trailing. */
  atr: number;
  stopLossPct: number;
  riskR: number;
};

export function holdSignal(
  strategyId: CryptoStrategyId,
  reason: string,
): CryptoStrategySignal {
  return {
    strategyId,
    direction: "HOLD",
    confidence: 0,
    reasoning: reason,
    entry: 0,
    stopLoss: 0,
    takeProfit: 0,
    expectedMovePct: 0,
    maxHoldMs: 24 * 3600_000,
    atr: 0,
    stopLossPct: 0,
    riskR: 0,
  };
}
