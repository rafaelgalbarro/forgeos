import type { SerializableValue } from "../../domain/guards";

/**
 * Strategy Engine domain types.
 * Strategies emit intents only — never broker orders.
 */

export const STRATEGY_IDS = [
  "trend-following",
  "momentum",
  "mean-reversion",
  "breakout",
  "low-volatility",
  "quality",
  "growth",
  "value",
  "dividend",
  "market-neutral",
  "swing-trading",
  "position-trading",
  "relative-strength",
  "pairs-trading",
  "sector-rotation",
  "event-driven",
  "earnings",
  "carry",
  "rebalancing",
] as const;

export type StrategyId = (typeof STRATEGY_IDS)[number];

export type StrategyCompatibleMarket =
  | "usa-equities"
  | "europe-equities"
  | "asia-equities"
  | "forex"
  | "etf"
  | "indices"
  | "futures"
  | "options"
  | "bonds"
  | "commodities"
  | "crypto";

export type StrategyTimeHorizonMeta = "intraday" | "swing" | "position" | "strategic";
export type StrategyHistoricalPerformanceLevel = "unproven" | "mixed" | "solid" | "strong";

export const STRATEGY_REGIMES = [
  "bullish",
  "bearish",
  "sideways",
  "transition",
  "high-volatility",
  "low-volatility",
  "risk-on",
  "risk-off",
] as const;

export type StrategyRegime = (typeof STRATEGY_REGIMES)[number];

export type StrategyBias = "bullish" | "bearish" | "neutral";
export type RegimeFit = "compatible" | "incompatible" | "neutral";
export type IntentSide = "long" | "short";
export type IntentUrgency = "low" | "medium" | "high";
export type PositionAction =
  | "hold"
  | "scale-in"
  | "scale-out"
  | "tighten-stop"
  | "widen-stop"
  | "trail";

export interface StrategyMarketContext {
  readonly symbol: string;
  readonly price: number;
  readonly bid?: number;
  readonly ask?: number;
  readonly volume?: number;
  readonly averageVolume?: number;
  readonly returns?: readonly number[];
  readonly smaFast?: number;
  readonly smaSlow?: number;
  readonly rsi?: number;
  readonly atr?: number;
  readonly volatility?: number;
  readonly beta?: number;
  readonly peRatio?: number;
  readonly pbRatio?: number;
  readonly roe?: number;
  readonly earningsGrowth?: number;
  readonly dividendYield?: number;
  readonly qualityScore?: number;
  readonly regime: StrategyRegime;
  readonly capturedAt: string;
}

export interface StrategyPositionContext {
  readonly positionId: string;
  readonly symbol: string;
  readonly side: IntentSide;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly unrealizedPnlPct: number;
  readonly openedAt: string;
  readonly stopLevel?: number;
  readonly targetLevel?: number;
}

export interface StrategyAnalysis {
  readonly strategyId: StrategyId;
  readonly symbol: string;
  readonly score: number;
  readonly bias: StrategyBias;
  readonly regimeFit: RegimeFit;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly metrics: Readonly<Record<string, number>>;
  readonly analyzedAt: string;
}

export interface EntryIntent {
  readonly kind: "entry";
  readonly strategyId: StrategyId;
  readonly symbol: string;
  readonly side: IntentSide;
  readonly conviction: number;
  readonly suggestedSizePct?: number;
  readonly entryZone?: { readonly from: number; readonly to: number };
  readonly invalidationLevel?: number;
  readonly targetLevel?: number;
  readonly timeframe: string;
  readonly rationale: string;
  readonly evidence: readonly string[];
  readonly generatedAt: string;
  readonly expiresAt: string;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export interface ExitIntent {
  readonly kind: "exit";
  readonly strategyId: StrategyId;
  readonly symbol: string;
  readonly positionId?: string;
  readonly side: IntentSide;
  readonly urgency: IntentUrgency;
  readonly exitFraction: number;
  readonly reason: string;
  readonly evidence: readonly string[];
  readonly generatedAt: string;
  readonly expiresAt: string;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export interface PositionIntent {
  readonly kind: "position";
  readonly strategyId: StrategyId;
  readonly symbol: string;
  readonly positionId?: string;
  readonly action: PositionAction;
  readonly suggestedSizePct?: number;
  readonly stopLevel?: number;
  readonly targetLevel?: number;
  readonly rationale: string;
  readonly evidence: readonly string[];
  readonly generatedAt: string;
  readonly expiresAt: string;
  readonly metadata?: Readonly<Record<string, SerializableValue>>;
}

export type StrategyIntent = EntryIntent | ExitIntent | PositionIntent;

export interface StrategyMetadata {
  readonly strategyId: StrategyId;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly date: string;
  readonly assumptions: readonly string[];
  readonly limitations: readonly string[];
  readonly compatibleRegimes: readonly StrategyRegime[];
  readonly incompatibleRegimes: readonly StrategyRegime[];
  readonly risks: readonly string[];
  readonly evidences: readonly string[];
  /** Extended Strategy Center metadata (optional for legacy strategies). */
  readonly compatibleMarkets?: readonly StrategyCompatibleMarket[];
  readonly compatibleAssets?: readonly string[];
  readonly timeHorizon?: StrategyTimeHorizonMeta;
  readonly idealConditions?: readonly string[];
  readonly unfavorableConditions?: readonly string[];
  readonly historicalPerformanceLevel?: StrategyHistoricalPerformanceLevel;
  readonly currentConfidence?: number;
}

export const INTENT_KINDS = ["entry", "exit", "position"] as const;
export type IntentKind = (typeof INTENT_KINDS)[number];

/** Forbidden keys that would imply an order path. */
export const FORBIDDEN_ORDER_KEYS = [
  "orderId",
  "orderType",
  "brokerOrderId",
  "submitOrder",
  "placeOrder",
  "transmit",
  "ibkr",
  "broker",
  "accountId",
  "conId",
] as const;
