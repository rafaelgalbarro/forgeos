/**
 * Autonomous Live Trading — domain contracts.
 * Mode AUTONOMOUS_LIVE exists but remains LOCKED until certification unlock.
 * Goal: risk-adjusted return maximization / loss limitation (no return promises).
 */

export const AUTONOMOUS_LIVE_PIPELINE_STAGES = [
  "MarketData",
  "OpportunityScanner",
  "StrategyEnsemble",
  "InvestmentBrain",
  "InvestmentCommittee",
  "StatisticalValidation",
  "PortfolioImpact",
  "RiskEngine",
  "LiquidityEngine",
  "ExecutionPlan",
  "LiveOrder",
  "PositionManager",
  "Reconciliation",
  "MemoryAndPerformanceAttribution",
] as const;

export type AutonomousLivePipelineStage = (typeof AUTONOMOUS_LIVE_PIPELINE_STAGES)[number];

export type TradingModeName =
  | "paper"
  | "live"
  | "ANALYSIS_ONLY"
  | "AUTONOMOUS_LIVE";

export type AutonomousLiveLockState = "LOCKED" | "ACTIVE" | "HALTED";

export type TradeDecision = "TRADE" | "NO_TRADE" | "HALT_SYSTEM";

export type DataLiveOrDelayed = "live" | "delayed" | "unknown";

export type DataQuality = "high" | "medium" | "low" | "unusable";

/** Every market datum must carry provenance — delayed/stale/unsourced → NO_TRADE. */
export interface MarketDatumMeta {
  readonly source: string;
  readonly timestamp: string;
  readonly freshnessMs: number;
  readonly quality: DataQuality;
  readonly liveOrDelayed: DataLiveOrDelayed;
  readonly confidence: number;
}

export interface QualifiedMarketDatum<T> {
  readonly value: T;
  readonly meta: MarketDatumMeta;
}

export type EnsembleStrategyId =
  | "trend_following"
  | "momentum"
  | "breakout"
  | "mean_reversion"
  | "volatility_expansion"
  | "relative_strength"
  | "event_driven"
  | "portfolio_rebalancing";

export interface StrategyVote {
  readonly strategyId: EnsembleStrategyId;
  readonly side: "BUY" | "SELL" | "FLAT";
  readonly confidence: number;
  readonly expectedValueAfterCosts: number;
  readonly regimeCompatible: boolean;
  readonly rationale: string;
}

export interface EnsembleConsensusResult {
  readonly approved: boolean;
  readonly decision: TradeDecision;
  readonly side: "BUY" | "SELL" | "FLAT";
  readonly consensusRatio: number;
  readonly minConsensusRequired: number;
  readonly averageConfidence: number;
  readonly positiveEvAfterCosts: boolean;
  readonly votes: readonly StrategyVote[];
  readonly dissent: readonly StrategyVote[];
  readonly minorityReport: string;
  readonly reason: string;
}

export type CircuitBreakerCode =
  | "DAILY_MAX_LOSS"
  | "CONSECUTIVE_LOSSES"
  | "DELAYED_DATA"
  | "CONNECTION_LOSS"
  | "RECONCILIATION_ERROR"
  | "UNKNOWN_ORDER_OR_POSITION"
  | "ABNORMAL_SLIPPAGE"
  | "TOO_MANY_REJECTS"
  | "CLOCK_DESYNC"
  | "EXPOSURE_OVER_LIMIT"
  | "UNCLASSIFIED_ERROR"
  | "MANUAL_EMERGENCY";

export interface CircuitBreakerEvent {
  readonly code: CircuitBreakerCode;
  readonly at: string;
  readonly reason: string;
  readonly requiresHumanUnlock: true;
}

export type ExitReason =
  | "STOP"
  | "TAKE_PROFIT"
  | "TRAILING"
  | "THESIS_INVALIDATION"
  | "REGIME_CHANGE"
  | "LIQUIDITY_DETERIORATION"
  | "OPPOSITE_SIGNAL"
  | "DAILY_MAX_LOSS"
  | "MAX_TIME_IN_POSITION"
  | "CRITICAL_EVENT"
  | "EMERGENCY_CLOSE";

/** Absolute exit priority (lower index = higher priority). */
export const EXIT_PRIORITY: readonly ExitReason[] = [
  "EMERGENCY_CLOSE",
  "DAILY_MAX_LOSS",
  "CRITICAL_EVENT",
  "STOP",
  "THESIS_INVALIDATION",
  "REGIME_CHANGE",
  "LIQUIDITY_DETERIORATION",
  "OPPOSITE_SIGNAL",
  "MAX_TIME_IN_POSITION",
  "TRAILING",
  "TAKE_PROFIT",
] as const;

export interface ExitSignal {
  readonly reason: ExitReason;
  readonly symbol: string;
  readonly priority: number;
  readonly at: string;
  readonly duplicateOfOrderId?: string;
}

export interface EntryValidationFailure {
  readonly code: string;
  readonly message: string;
}

export interface AutonomousLiveLimits {
  readonly maxOrderNotionalEur: number;
  readonly maxNewExposureDailyEur: number;
  readonly maxRiskPerTradePct: number;
  readonly maxDailyLossPct: number;
  readonly maxWeeklyLossPct: number;
  readonly maxOpenPositions: number;
  readonly maxTradesPerDay: number;
  readonly maxConsecutiveLosses: number;
  readonly allowShort: boolean;
  readonly allowMargin: boolean;
  readonly allowOptions: boolean;
  readonly allowFutures: boolean;
  readonly allowForex: boolean;
  readonly allowCrypto: boolean;
  readonly allowOutsideRth: boolean;
  readonly limitOrdersOnly: boolean;
  readonly stopLossRequired: boolean;
  readonly liveDataRequired: boolean;
  readonly maxQuoteAgeMs: number;
  readonly maxSpreadBps: number;
  readonly minVolume: number;
  readonly minRewardRisk: number;
  readonly minConsensus: number;
  readonly minConfidence: number;
}

export interface TradeAttributionRecord {
  readonly tradeId: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly strategyVotes: readonly StrategyVote[];
  readonly consensusRatio: number;
  readonly entryReason: string;
  readonly exitReason: ExitReason | null;
  readonly expectedValue: number;
  readonly realizedPnl: number | null;
  readonly costs: number;
  readonly slippage: number | null;
  readonly riskPct: number;
  readonly regime: string;
  readonly dataQuality: DataQuality;
  readonly recordedAt: string;
  /** Learning never auto-modifies production strategies. */
  readonly autoStrategyMutationForbidden: true;
}

export interface PipelineStageResult {
  readonly stage: AutonomousLivePipelineStage;
  readonly status: "PASSED" | "NO_TRADE" | "HALT_SYSTEM" | "SKIPPED_FORBIDDEN" | "LOCKED_DRY_RUN";
  readonly detail: string;
  readonly at: string;
}

export interface AutonomousLiveCycleResult {
  readonly tradingMode: TradingModeName;
  readonly lockState: AutonomousLiveLockState;
  readonly decision: TradeDecision;
  readonly stages: readonly PipelineStageResult[];
  readonly ensemble: EnsembleConsensusResult | null;
  readonly entryFailures: readonly EntryValidationFailure[];
  readonly exitSignals: readonly ExitSignal[];
  readonly circuitBreaker: CircuitBreakerEvent | null;
  readonly orderSubmitted: false;
  readonly placeOrderInvoked: false;
  readonly submitOrderInvoked: false;
  readonly liveTradingEnabled: string;
  readonly ibkrReadOnly: string;
  readonly attribution: TradeAttributionRecord | null;
  readonly auditNote: string;
}

export interface AutonomousLiveRuntimeSnapshot {
  readonly tradingMode: TradingModeName;
  readonly lockState: AutonomousLiveLockState;
  readonly liveVsDelayed: DataLiveOrDelayed;
  readonly activeStrategies: readonly EnsembleStrategyId[];
  readonly opportunities: number;
  readonly decisions: readonly string[];
  readonly openOrders: number;
  readonly positions: number;
  readonly dailyPnl: number | null;
  readonly dailyRiskUsedPct: number | null;
  readonly limits: AutonomousLiveLimits;
  readonly circuitBreakers: readonly CircuitBreakerEvent[];
  readonly blockNewEntries: boolean;
  readonly halted: boolean;
  readonly realMoneyBanner: true;
  readonly ordersSubmittedLifetime: 0;
}
