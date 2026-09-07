export const EXECUTION_PIPELINE_STAGES = [
  "OpportunityCandidate",
  "StrategyDecision",
  "InvestmentCommitteeDecision",
  "PortfolioImpact",
  "RiskDecision",
  "LiquidityDecision",
  "MarketSessionDecision",
  "PreTradeCheck",
  "ExecutionPlan",
  "ApprovalPolicy",
  "BrokerOrderDraft",
] as const;

export type ExecutionPipelineStage = (typeof EXECUTION_PIPELINE_STAGES)[number];

export const EXECUTION_PIPELINE_STATES = [
  "DETECTED",
  "ANALYZING",
  "REJECTED",
  "APPROVED_FOR_SIMULATION",
  "SIMULATED",
  "APPROVED_FOR_PAPER",
  "PAPER_SUBMITTED",
  "APPROVED_FOR_LIVE",
  "LIVE_BLOCKED",
  "LIVE_SUBMITTED",
  "PARTIALLY_FILLED",
  "FILLED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
  "RECONCILIATION_REQUIRED",
] as const;

export type ExecutionPipelineState = (typeof EXECUTION_PIPELINE_STATES)[number];
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type LiquidityBand = "DEEP" | "MEDIUM" | "SHALLOW";
export type MarketSession = "PRE_MARKET" | "REGULAR" | "AFTER_HOURS" | "CLOSED";

export interface OpportunityCandidateArtifact {
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly confidence: number;
  readonly thesis: string;
}

export interface StrategyDecisionArtifact {
  readonly strategyId: string;
  readonly accepted: boolean;
  readonly reasoning: string;
}

export interface CommitteeDecisionArtifact {
  readonly approved: boolean;
  readonly dissentingVotes: number;
  readonly reasoning: string;
}

export interface PortfolioImpactArtifact {
  readonly expectedExposureChangePct: number;
  readonly concentrationImpactPct: number;
}

export interface RiskDecisionArtifact {
  readonly approved: boolean;
  readonly level: RiskLevel;
  readonly monetaryRisk: number;
  readonly percentRisk: number;
  readonly reason: string;
}

export interface LiquidityDecisionArtifact {
  readonly approved: boolean;
  readonly band: LiquidityBand;
  readonly estimatedSlippageBps: number;
}

export interface MarketSessionDecisionArtifact {
  readonly approved: boolean;
  readonly session: MarketSession;
  readonly reason: string;
}

export interface PreTradeCheckArtifact {
  readonly approved: boolean;
  readonly checks: Readonly<Record<string, "PASS" | "FAIL">>;
  readonly reason: string;
}

export interface ExecutionPlanArtifact {
  readonly quantity: number;
  readonly price: number;
  readonly stop: number;
  readonly target: number;
  readonly duration: string;
  readonly estimatedCost: number;
  readonly cancellationConditions: readonly string[];
}

export interface ApprovalPolicyArtifact {
  readonly route: "SIMULATION" | "PAPER" | "LIVE";
  readonly policyVersion: string;
  readonly reason: string;
}

export interface BrokerOrderDraftArtifact {
  readonly venue: string;
  readonly tif: "DAY" | "GTC";
  readonly brokerPayload: Readonly<Record<string, unknown>>;
}

export interface StageArtifacts {
  readonly OpportunityCandidate: OpportunityCandidateArtifact;
  readonly StrategyDecision: StrategyDecisionArtifact;
  readonly InvestmentCommitteeDecision: CommitteeDecisionArtifact;
  readonly PortfolioImpact: PortfolioImpactArtifact;
  readonly RiskDecision: RiskDecisionArtifact;
  readonly LiquidityDecision: LiquidityDecisionArtifact;
  readonly MarketSessionDecision: MarketSessionDecisionArtifact;
  readonly PreTradeCheck: PreTradeCheckArtifact;
  readonly ExecutionPlan: ExecutionPlanArtifact;
  readonly ApprovalPolicy: ApprovalPolicyArtifact;
  readonly BrokerOrderDraft: BrokerOrderDraftArtifact;
}

export interface PipelineTransition {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly from: ExecutionPipelineState;
  readonly to: ExecutionPipelineState;
  readonly at: string;
  readonly reason: string;
}

export interface PipelineExplanation {
  readonly whyEnter: string;
  readonly whyNotEnter: string;
  readonly quantity: number;
  readonly price: number;
  readonly stop: number;
  readonly target: number;
  readonly duration: string;
  readonly monetaryRisk: number;
  readonly percentRisk: number;
  readonly portfolioImpact: string;
  readonly estimatedCost: number;
  readonly liquidity: string;
  readonly marketSession: string;
  readonly cancellationConditions: readonly string[];
}

export interface PipelineTraceRecord<S extends ExecutionPipelineStage = ExecutionPipelineStage> {
  readonly stage: S;
  readonly sequence: number;
  readonly passed: boolean;
  readonly reason: string;
  readonly artifact: StageArtifacts[S];
}

export interface ExecutionPipelineAggregate {
  readonly pipelineId: string;
  readonly symbol: string;
  state: ExecutionPipelineState;
  readonly stages: PipelineTraceRecord[];
  readonly transitions: PipelineTransition[];
  explanation?: PipelineExplanation;
}

export const REJECTION_REASON_CATALOG = {
  STRATEGY_REJECTED: "Strategy rejected the candidate.",
  COMMITTEE_REJECTED: "Investment committee rejected the trade.",
  RISK_REJECTED: "Risk policy rejected the trade.",
  LIQUIDITY_REJECTED: "Liquidity constraints rejected the trade.",
  SESSION_REJECTED: "Market session policy rejected the trade.",
  PRE_TRADE_REJECTED: "Pre-trade checks failed.",
} as const;

type TransitionRule = readonly ExecutionPipelineState[];

const TRANSITION_GRAPH: Readonly<Record<ExecutionPipelineState, TransitionRule>> = {
  DETECTED: ["ANALYZING", "FAILED"],
  ANALYZING: ["REJECTED", "APPROVED_FOR_SIMULATION", "APPROVED_FOR_PAPER", "APPROVED_FOR_LIVE", "FAILED"],
  REJECTED: ["RECONCILIATION_REQUIRED"],
  APPROVED_FOR_SIMULATION: ["SIMULATED", "FAILED"],
  SIMULATED: ["APPROVED_FOR_PAPER", "CANCELLED", "EXPIRED", "FAILED"],
  APPROVED_FOR_PAPER: ["PAPER_SUBMITTED", "CANCELLED", "FAILED"],
  PAPER_SUBMITTED: ["PARTIALLY_FILLED", "FILLED", "CANCELLED", "EXPIRED", "FAILED"],
  APPROVED_FOR_LIVE: ["LIVE_BLOCKED", "LIVE_SUBMITTED", "FAILED"],
  LIVE_BLOCKED: ["RECONCILIATION_REQUIRED", "CANCELLED"],
  LIVE_SUBMITTED: ["PARTIALLY_FILLED", "FILLED", "CANCELLED", "EXPIRED", "FAILED"],
  PARTIALLY_FILLED: ["FILLED", "CANCELLED", "EXPIRED", "RECONCILIATION_REQUIRED"],
  FILLED: ["RECONCILIATION_REQUIRED"],
  CANCELLED: ["RECONCILIATION_REQUIRED"],
  EXPIRED: ["RECONCILIATION_REQUIRED"],
  FAILED: ["RECONCILIATION_REQUIRED"],
  RECONCILIATION_REQUIRED: [],
};

export function assertValidTransition(from: ExecutionPipelineState, to: ExecutionPipelineState): void {
  const allowed = TRANSITION_GRAPH[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition ${from} -> ${to}`);
  }
}

export function assertCommand(commandId: string, idempotencyKey: string): void {
  if (!commandId || !idempotencyKey) {
    throw new Error("commandId and idempotencyKey are required.");
  }
}
