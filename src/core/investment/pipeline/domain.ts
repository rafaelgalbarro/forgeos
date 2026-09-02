import { createHash } from "node:crypto";
import { assertSerializable, type SerializableValue } from "../domain/guards";

/**
 * Institutional analytical decision pipeline stages (mandatory, no skip).
 * Analysis-only: never places or drafts broker orders.
 */
export const DECISION_PIPELINE_STAGES = [
  "MarketSnapshot",
  "InvestmentBrain",
  "Committee",
  "Research",
  "PortfolioAnalytics",
  "RiskEngine",
  "AllocationEngine",
  "InvestmentDecision",
  "InvestmentReport",
  "Memory",
] as const;

export type DecisionPipelineStage = (typeof DECISION_PIPELINE_STAGES)[number];

export const DECISION_PIPELINE_STATES = [
  "PENDING",
  "ANALYZING",
  "INSUFFICIENT_DATA",
  "WAITING_FOR_RESEARCH",
  "WAITING_FOR_RISK",
  "APPROVED",
  "APPROVED_WITH_WARNINGS",
  "REJECTED",
  "EXPIRED",
] as const;

export type DecisionPipelineState = (typeof DECISION_PIPELINE_STATES)[number];

export const DECISION_PIPELINE_SCHEMA_VERSION = "1.0.0";
export const DECISION_PIPELINE_NAME = "ForgeOS.Investment.DecisionPipeline";

export interface MarketSnapshotArtifact {
  readonly capturedAt: string;
  readonly regime: string;
  readonly volatilityIndex: number;
  readonly liquidityIndex: number;
  readonly breadthIndex: number;
  readonly macroSignals: readonly string[];
  readonly sources: readonly string[];
  readonly sufficient: boolean;
}

export interface InvestmentBrainArtifact {
  readonly recommendation: string;
  readonly confidence: number;
  readonly reasoning: readonly string[];
  readonly risks: readonly string[];
  readonly evidence: readonly string[];
  readonly usedSources: readonly string[];
}

export interface CommitteeArtifact {
  readonly consensus: string;
  readonly confidence: number;
  readonly dissent: number;
  readonly buyScore: number;
  readonly sellScore: number;
  readonly holdScore: number;
  readonly minorityReport: ReadonlyArray<{
    readonly agent: string;
    readonly stance: string;
    readonly reasoning: string;
  }>;
  readonly approved: boolean;
}

export interface ResearchArtifact {
  readonly researchId: string;
  readonly thesis: string;
  readonly findings: readonly string[];
  readonly confidence: number;
  readonly sources: readonly string[];
  readonly awaitingMore: boolean;
}

export interface PortfolioAnalyticsArtifact {
  readonly asOf: string;
  readonly concentrationPct: number | null;
  readonly volatilityPct: number | null;
  readonly sharpe: number | null;
  readonly totalRiskPct: number | null;
  readonly notes: readonly string[];
}

export interface RiskEngineArtifact {
  readonly level: "low" | "medium" | "high";
  readonly approved: boolean;
  readonly warnings: readonly string[];
  readonly concentrationRiskPct: number;
  readonly liquidityRiskPct: number;
  readonly expectedDrawdownPct: number;
  readonly factors: readonly string[];
  readonly awaitingExternal: boolean;
}

export interface AllocationEngineArtifact {
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

export interface InvestmentDecisionArtifact {
  readonly recommendation: string;
  readonly confidence: number;
  readonly reasoning: readonly string[];
  readonly risks: readonly string[];
  readonly evidence: readonly string[];
  readonly usedSources: readonly string[];
  readonly warnings: readonly string[];
}

export interface InvestmentReportArtifact {
  readonly generatedAt: string;
  readonly summary: string;
  readonly recommendation: string;
  readonly confidence: number;
  readonly riskLevel: string;
  readonly allocationSummary: string;
  readonly sections: Readonly<Record<string, string>>;
}

export interface MemoryArtifact {
  readonly recorded: boolean;
  readonly memoryRecordId: string | null;
  readonly correlationId: string;
  readonly note: string;
}

export interface StageArtifacts {
  readonly MarketSnapshot: MarketSnapshotArtifact;
  readonly InvestmentBrain: InvestmentBrainArtifact;
  readonly Committee: CommitteeArtifact;
  readonly Research: ResearchArtifact;
  readonly PortfolioAnalytics: PortfolioAnalyticsArtifact;
  readonly RiskEngine: RiskEngineArtifact;
  readonly AllocationEngine: AllocationEngineArtifact;
  readonly InvestmentDecision: InvestmentDecisionArtifact;
  readonly InvestmentReport: InvestmentReportArtifact;
  readonly Memory: MemoryArtifact;
}

export interface DecisionPipelineTransition {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly from: DecisionPipelineState;
  readonly to: DecisionPipelineState;
  readonly at: string;
  readonly reason: string;
}

export interface DecisionAuditEvent {
  readonly eventId: string;
  readonly kind:
    | "DECISION_PIPELINE_CREATED"
    | "DECISION_PIPELINE_TRANSITION"
    | "DECISION_PIPELINE_STAGE_COMPLETED"
    | "DECISION_PIPELINE_FINALIZED";
  readonly pipelineId: string;
  readonly at: string;
  readonly payload: Readonly<Record<string, SerializableValue>>;
}

export interface DecisionExplanation {
  readonly whyRecommend: string;
  readonly whyNotRecommend: string;
  readonly keyEvidence: readonly string[];
  readonly keyRisks: readonly string[];
  readonly committeeConsensus: string;
  readonly researchThesis: string;
  readonly riskLevel: string;
  readonly allocationSummary: string;
  readonly warnings: readonly string[];
}

export interface ReproducibilityKeys {
  readonly inputsHash: string;
  readonly seed: string;
  readonly reproducibilityKey: string;
  readonly schemaVersion: string;
}

export interface PipelineTraceRecord<S extends DecisionPipelineStage = DecisionPipelineStage> {
  readonly stage: S;
  readonly sequence: number;
  readonly passed: boolean;
  readonly reason: string;
  readonly artifact: StageArtifacts[S];
  readonly warnings: readonly string[];
}

export interface InstitutionalDecision {
  readonly decisionId: string;
  readonly pipelineId: string;
  readonly version: number;
  readonly schemaVersion: string;
  readonly state: DecisionPipelineState;
  readonly recommendation: string;
  readonly confidence: number;
  readonly reasoning: readonly string[];
  readonly risks: readonly string[];
  readonly evidence: readonly string[];
  readonly warnings: readonly string[];
  readonly explanation: DecisionExplanation;
  readonly reproducibility: ReproducibilityKeys;
  readonly stageTrace: readonly PipelineTraceRecord[];
  readonly createdAt: string;
  readonly finalizedAt: string;
}

export interface DecisionPipelineAggregate {
  readonly pipelineId: string;
  readonly symbol: string;
  readonly schemaVersion: string;
  version: number;
  state: DecisionPipelineState;
  readonly seed: string;
  readonly inputsHash: string;
  readonly reproducibilityKey: string;
  readonly createdAt: string;
  readonly stages: PipelineTraceRecord[];
  readonly transitions: DecisionPipelineTransition[];
  readonly auditTrail: DecisionAuditEvent[];
  decision?: InstitutionalDecision;
  report?: InvestmentReportArtifact;
}

type TransitionRule = readonly DecisionPipelineState[];

const TRANSITION_GRAPH: Readonly<Record<DecisionPipelineState, TransitionRule>> = {
  PENDING: ["ANALYZING", "EXPIRED"],
  ANALYZING: [
    "INSUFFICIENT_DATA",
    "WAITING_FOR_RESEARCH",
    "WAITING_FOR_RISK",
    "APPROVED",
    "APPROVED_WITH_WARNINGS",
    "REJECTED",
    "EXPIRED",
  ],
  INSUFFICIENT_DATA: ["ANALYZING", "REJECTED", "EXPIRED"],
  WAITING_FOR_RESEARCH: ["ANALYZING", "INSUFFICIENT_DATA", "REJECTED", "EXPIRED"],
  WAITING_FOR_RISK: ["ANALYZING", "INSUFFICIENT_DATA", "REJECTED", "EXPIRED"],
  APPROVED: ["EXPIRED"],
  APPROVED_WITH_WARNINGS: ["EXPIRED"],
  REJECTED: [],
  EXPIRED: [],
};

export function assertValidTransition(from: DecisionPipelineState, to: DecisionPipelineState): void {
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

export function assertStageOrder(
  completedStages: readonly DecisionPipelineStage[],
  nextStage: DecisionPipelineStage,
): void {
  const expectedSequence = completedStages.length;
  const expectedStage = DECISION_PIPELINE_STAGES[expectedSequence];
  if (expectedStage !== nextStage) {
    throw new Error(`Stage order violation: expected ${expectedStage}, got ${nextStage}`);
  }
  for (let i = 0; i < completedStages.length; i += 1) {
    if (completedStages[i] !== DECISION_PIPELINE_STAGES[i]) {
      throw new Error(
        `Stage order violation in history at index ${i}: expected ${DECISION_PIPELINE_STAGES[i]}, got ${completedStages[i]}`,
      );
    }
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export function hashInputs(inputs: unknown): string {
  return createHash("sha256").update(stableStringify(inputs)).digest("hex");
}

export function buildReproducibilityKey(inputsHash: string, seed: string, schemaVersion: string): string {
  return createHash("sha256")
    .update(`${schemaVersion}|${seed}|${inputsHash}`)
    .digest("hex");
}

export function ensureSerializableDecision(decision: InstitutionalDecision): InstitutionalDecision {
  assertSerializable(decision as unknown as SerializableValue, "InstitutionalDecision");
  return decision;
}

export function serializeDecision(decision: InstitutionalDecision): string {
  return JSON.stringify(ensureSerializableDecision(decision));
}

export function deserializeDecision(payload: string): InstitutionalDecision {
  const parsed = JSON.parse(payload) as InstitutionalDecision;
  return ensureSerializableDecision(parsed);
}

export function isTerminalState(state: DecisionPipelineState): boolean {
  return state === "APPROVED" || state === "APPROVED_WITH_WARNINGS" || state === "REJECTED" || state === "EXPIRED";
}
