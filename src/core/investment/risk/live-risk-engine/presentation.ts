import type { LiveRiskEvaluationResult } from "./domain";

export interface LiveRiskCheckDto {
  readonly code: string;
  readonly category: string;
  readonly status: string;
  readonly value: number | string | boolean;
  readonly threshold: number | string | boolean;
  readonly explanation: string;
  readonly remediation: string;
}

export interface LiveRiskEvaluationDto {
  readonly requestId: string;
  readonly decision: string;
  readonly reducedQuantity?: number;
  readonly explanation: string;
  readonly remediation: string;
  readonly checks: readonly LiveRiskCheckDto[];
  readonly override?: {
    readonly applied: boolean;
    readonly by: string;
    readonly reason: string;
    readonly expiresAtUtc: string;
  };
}

export function toLiveRiskEvaluationDto(result: LiveRiskEvaluationResult): LiveRiskEvaluationDto {
  return {
    requestId: result.requestId,
    decision: result.decision,
    reducedQuantity: result.reducedQuantity,
    explanation: result.explanation,
    remediation: result.remediation,
    checks: result.checks.map((check) => ({
      code: check.code,
      category: check.category,
      status: check.status,
      value: check.value,
      threshold: check.threshold,
      explanation: check.explanation,
      remediation: check.remediation,
    })),
    override: result.overrideAudit
      ? {
          applied: result.overrideAudit.applied,
          by: result.overrideAudit.by,
          reason: result.overrideAudit.reason,
          expiresAtUtc: result.overrideAudit.expiresAtUtc,
        }
      : undefined,
  };
}
