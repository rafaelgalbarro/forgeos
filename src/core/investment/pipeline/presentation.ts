import type { RunDecisionPipelineResult } from "./application";
import type {
  DecisionAuditEvent,
  DecisionExplanation,
  DecisionPipelineStage,
  DecisionPipelineState,
  InstitutionalDecision,
  InvestmentReportArtifact,
  ReproducibilityKeys,
} from "./domain";

export interface DecisionPipelineTraceDto {
  readonly stage: DecisionPipelineStage;
  readonly sequence: number;
  readonly passed: boolean;
  readonly reason: string;
  readonly warnings: readonly string[];
  readonly artifact: Readonly<Record<string, unknown>>;
}

export interface DecisionPipelineResultDto {
  readonly pipelineId: string;
  readonly version: number;
  readonly finalState: DecisionPipelineState;
  readonly trace: readonly DecisionPipelineTraceDto[];
  readonly explanation?: DecisionExplanation;
  readonly decision?: InstitutionalDecision;
  readonly report?: InvestmentReportArtifact;
  readonly reproducibility: ReproducibilityKeys;
  readonly auditTrail: readonly DecisionAuditEvent[];
}

export function toDecisionPipelineResultDto(result: RunDecisionPipelineResult): DecisionPipelineResultDto {
  return {
    pipelineId: result.pipelineId,
    version: result.version,
    finalState: result.finalState,
    trace: result.trace.map((stage) => ({
      stage: stage.stage,
      sequence: stage.sequence,
      passed: stage.passed,
      reason: stage.reason,
      warnings: stage.warnings,
      artifact: stage.artifact as unknown as Readonly<Record<string, unknown>>,
    })),
    explanation: result.decision?.explanation,
    decision: result.decision,
    report: result.report,
    reproducibility: result.reproducibility,
    auditTrail: result.auditTrail,
  };
}
