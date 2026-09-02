import {
  assertConfidence,
  assertNonEmpty,
  assertPercent,
  assertSerializable,
  type SerializableValue,
} from "./guards";

export type MarketRegime = "bullish" | "bearish" | "sideways" | "transition";
export type SignalDirection = "positive" | "negative" | "neutral";
export type PositionConviction = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type Recommendation = "accumulate" | "hold" | "de-risk" | "rebalance";

export interface PositionAnalysis {
  readonly symbol: string;
  readonly sector: string;
  readonly weightPct: number;
  readonly unrealizedPnlPct: number;
  readonly volatilityPct: number;
  readonly conviction: PositionConviction;
  readonly thesis: string;
}

export interface MarketSnapshot {
  readonly capturedAt: string;
  readonly regime: MarketRegime;
  readonly volatilityIndex: number;
  readonly liquidityIndex: number;
  readonly breadthIndex: number;
  readonly macroSignals: readonly string[];
  readonly sources: readonly string[];
}

export interface PortfolioSnapshot {
  readonly capturedAt: string;
  readonly baseCurrency: string;
  readonly totalValue: number;
  readonly cashRatioPct: number;
  readonly positions: readonly PositionAnalysis[];
  readonly constraints: {
    readonly maxSinglePositionPct: number;
    readonly maxDrawdownPct: number;
    readonly minCashPct: number;
  };
  readonly sources: readonly string[];
}

export interface MarketSignal {
  readonly id: string;
  readonly name: string;
  readonly direction: SignalDirection;
  readonly strength: number;
  readonly timeframe: string;
  readonly evidence: readonly string[];
  readonly source: string;
}

export interface RiskAssessment {
  readonly level: RiskLevel;
  readonly concentrationRiskPct: number;
  readonly liquidityRiskPct: number;
  readonly expectedDrawdownPct: number;
  readonly factors: readonly string[];
}

export interface AllocationProposal {
  readonly targetCashPct: number;
  readonly targetEquityPct: number;
  readonly targetDefensivePct: number;
  readonly adjustments: ReadonlyArray<{
    readonly symbol: string;
    readonly action: "increase" | "decrease" | "hold";
    readonly deltaPct: number;
    readonly rationale: string;
  }>;
}

export interface InvestmentDecision {
  readonly recommendation: Recommendation;
  readonly confidence: number;
  readonly reasoning: readonly string[];
  readonly risks: readonly string[];
  readonly evidence: readonly string[];
  readonly usedSources: readonly string[];
}

export interface InvestmentReport {
  readonly generatedAt: string;
  readonly marketSnapshot: MarketSnapshot;
  readonly portfolioSnapshot: PortfolioSnapshot;
  readonly signals: readonly MarketSignal[];
  readonly riskAssessment: RiskAssessment;
  readonly allocationProposal: AllocationProposal;
  readonly decision: InvestmentDecision;
}

export function ensureMarketSnapshot(snapshot: MarketSnapshot): MarketSnapshot {
  assertNonEmpty(snapshot.capturedAt, "MarketSnapshot.capturedAt");
  assertPercent(snapshot.volatilityIndex, "MarketSnapshot.volatilityIndex");
  assertPercent(snapshot.liquidityIndex, "MarketSnapshot.liquidityIndex");
  assertPercent(snapshot.breadthIndex, "MarketSnapshot.breadthIndex");
  assertSerializable(snapshot, "MarketSnapshot");
  return snapshot;
}

export function ensurePortfolioSnapshot(snapshot: PortfolioSnapshot): PortfolioSnapshot {
  assertNonEmpty(snapshot.capturedAt, "PortfolioSnapshot.capturedAt");
  assertNonEmpty(snapshot.baseCurrency, "PortfolioSnapshot.baseCurrency");
  if (!Number.isFinite(snapshot.totalValue) || snapshot.totalValue < 0) {
    throw new Error("PortfolioSnapshot.totalValue must be >= 0");
  }
  assertPercent(snapshot.cashRatioPct, "PortfolioSnapshot.cashRatioPct");
  assertPercent(
    snapshot.constraints.maxSinglePositionPct,
    "PortfolioSnapshot.constraints.maxSinglePositionPct",
  );
  assertPercent(
    snapshot.constraints.maxDrawdownPct,
    "PortfolioSnapshot.constraints.maxDrawdownPct",
  );
  assertPercent(snapshot.constraints.minCashPct, "PortfolioSnapshot.constraints.minCashPct");
  assertSerializable(snapshot, "PortfolioSnapshot");
  return snapshot;
}

export function ensureMarketSignal(signal: MarketSignal): MarketSignal {
  assertNonEmpty(signal.id, "MarketSignal.id");
  assertNonEmpty(signal.name, "MarketSignal.name");
  assertConfidence(signal.strength, "MarketSignal.strength");
  assertNonEmpty(signal.source, "MarketSignal.source");
  assertSerializable(signal, "MarketSignal");
  return signal;
}

export function ensureInvestmentDecision(decision: InvestmentDecision): InvestmentDecision {
  assertConfidence(decision.confidence, "InvestmentDecision.confidence");
  if (decision.reasoning.length === 0) {
    throw new Error("InvestmentDecision.reasoning cannot be empty");
  }
  assertSerializable(decision, "InvestmentDecision");
  return decision;
}

export function ensureInvestmentReport(report: InvestmentReport): InvestmentReport {
  assertNonEmpty(report.generatedAt, "InvestmentReport.generatedAt");
  ensureMarketSnapshot(report.marketSnapshot);
  ensurePortfolioSnapshot(report.portfolioSnapshot);
  report.signals.forEach(ensureMarketSignal);
  ensureInvestmentDecision(report.decision);
  assertSerializable(report, "InvestmentReport");
  return report;
}

export function asSerializable<T extends SerializableValue>(value: T): T {
  assertSerializable(value, "SerializableValue");
  return value;
}
