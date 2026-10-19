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
  "MICRO_BREAKOUT_1M",
  "MOMENTUM_IGNITION_1M",
  "CAPITULATION_REVERSAL_1M",
  "VWAP_BOUNCE_5M",
] as const;

export type CryptoStrategyId = (typeof ALL_CRYPTO_STRATEGY_IDS)[number];

/** Fast 1–5m commission-aware strategies (5s analysis loop). */
export const FAST_CRYPTO_STRATEGY_IDS = [
  "MICRO_BREAKOUT_1M",
  "MOMENTUM_IGNITION_1M",
  "CAPITULATION_REVERSAL_1M",
  "VWAP_BOUNCE_5M",
] as const;

export type FastCryptoStrategyId = (typeof FAST_CRYPTO_STRATEGY_IDS)[number];

/** Native Kraken Futures short legs (not geometric mirror of longs). */
export const FUTURES_SHORT_STRATEGY_IDS = [
  "VWAP_BOUNCE_5M_SHORT",
  "TREND_PULLBACK_1H_SHORT",
  "LIQUIDITY_SWEEP_15M_SHORT",
  "RS_VS_BTC_1H_SHORT",
] as const;

export type FuturesShortStrategyId = (typeof FUTURES_SHORT_STRATEGY_IDS)[number];

export const FUTURES_SHORT_STRATEGY_SET: ReadonlySet<string> = new Set(
  FUTURES_SHORT_STRATEGY_IDS,
);

export function isFuturesShortStrategy(id: string): boolean {
  return FUTURES_SHORT_STRATEGY_SET.has(id);
}

export const FAST_CRYPTO_STRATEGY_SET: ReadonlySet<string> = new Set(
  FAST_CRYPTO_STRATEGY_IDS,
);

export function isFastCryptoStrategy(id: string): boolean {
  return FAST_CRYPTO_STRATEGY_SET.has(id);
}

/**
 * Cost-filter mode:
 * - maker_maker: entry plans post-only TP as primary exit (fast + RANGE_GRID)
 * - maker_taker: primary exit path is often stop / time (taker)
 */
export type StrategyCostFilterMode = "maker_maker" | "maker_taker";

export function strategyCostFilterMode(strategyId: string): StrategyCostFilterMode {
  if (isFastCryptoStrategy(strategyId)) return "maker_maker";
  if (strategyId === "RANGE_GRID_15M") return "maker_maker";
  return "maker_taker";
}

/** Strategies introduced in this release — 48h max 1 open position each. */
export const NEW_CRYPTO_STRATEGIES: ReadonlySet<CryptoStrategyId> = new Set([
  "RANGE_GRID_15M",
  "RSI2_TREND_5M",
  "LIQUIDITY_SWEEP_15M",
  "BB_SQUEEZE_BREAKOUT_15M",
  "RS_VS_BTC_1H",
  "EMA_CROSS_15M",
  "SESSION_OPEN_BREAKOUT",
  "MICRO_BREAKOUT_1M",
  "MOMENTUM_IGNITION_1M",
  "CAPITULATION_REVERSAL_1M",
  "VWAP_BOUNCE_5M",
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
