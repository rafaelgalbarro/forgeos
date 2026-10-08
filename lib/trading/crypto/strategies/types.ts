/**
 * Shared crypto strategy signal types — 12 intradía Kraken.
 */

export const ALL_CRYPTO_STRATEGY_IDS = [
  "TREND_PULLBACK_1H",
  "RSI_MEAN_REVERSION_15M",
  "TOP_GAINER_PULLBACK",
  "MOMENTUM_BREAKOUT_5M",
  "VWAP_RECLAIM_15M",
  "RANGE_GRID_15M",
  "RSI2_TREND_5M",
  "LIQUIDITY_SWEEP_15M",
  "BB_SQUEEZE_BREAKOUT_15M",
  "RS_VS_BTC_1H",
  "EMA_CROSS_15M",
  "SESSION_OPEN_BREAKOUT",
] as const;

export type CryptoStrategyId = (typeof ALL_CRYPTO_STRATEGY_IDS)[number];

/** Strategies introduced in this release — 48h max 1 open position each. */
export const NEW_CRYPTO_STRATEGIES: ReadonlySet<CryptoStrategyId> = new Set([
  "RANGE_GRID_15M",
  "RSI2_TREND_5M",
  "LIQUIDITY_SWEEP_15M",
  "BB_SQUEEZE_BREAKOUT_15M",
  "RS_VS_BTC_1H",
  "EMA_CROSS_15M",
  "SESSION_OPEN_BREAKOUT",
]);

export type CryptoStrategySignal = {
  strategyId: CryptoStrategyId;
  direction: "BUY" | "HOLD" | "SELL";
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
  /** Candle open time (unix sec) for idempotency. */
  candleTime?: number;
  /** Optional grid level index (RANGE_GRID). */
  gridLevel?: number;
  /** Exit reason hint for forced closes. */
  forceExitReason?: string;
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

/** Idempotency key: strategy + pair + candle. */
export function cryptoSignalKey(
  strategyId: string,
  pair: string,
  candleTime: number | undefined,
): string {
  const c =
    candleTime != null && Number.isFinite(candleTime)
      ? String(Math.floor(candleTime))
      : "na";
  return `${strategyId}|${pair.trim().toUpperCase()}|${c}`;
}
