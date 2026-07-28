/** ForgeOS Skills Governance — Audit Engine (RC4.1). */

import { getSkillById } from "@/lib/skills/registry";
import { appendGovernanceAudit } from "./governance-store";
import type {
  ApprovalDecision,
  ApprovalType,
  GovernanceAuditRecord,
  RiskAssessment,
  RiskLevel,
} from "./types";

export function recordGovernanceAudit(params: {
  who: string;
  what: string;
  why: string;
  skillId: string;
  ventureId: string;
  action: string;
  outcome: GovernanceAuditRecord["outcome"];
  result: string;
  costEstimate: number;
  latencyMs: number;
  approval: ApprovalType;
  signature: string;
  riskLevel: RiskLevel;
  rollback?: boolean;
}): GovernanceAuditRecord {
  const skill = getSkillById(params.skillId);
  return appendGovernanceAudit({
    who: params.who,
    what: params.what,
    why: params.why,
    skillId: params.skillId,
    provider: skill?.provider ?? "unknown",
    ventureId: params.ventureId,
    action: params.action,
    outcome: params.outcome,
    result: params.result,
    costEstimate: params.costEstimate,
    latencyMs: params.latencyMs,
    rollback: params.rollback,
    approval: params.approval,
    signature: params.signature,
    riskLevel: params.riskLevel,
  });
}

export function auditBlockedExecution(params: {
  skillId: string;
  ventureId: string;
  action: string;
  requestedBy: string;
  risk: RiskAssessment;
  reason: string;
  stage: string;
}): GovernanceAuditRecord {
  return recordGovernanceAudit({
    who: params.requestedBy,
    what: `Blocked at ${params.stage}`,
    why: params.reason,
    skillId: params.skillId,
    ventureId: params.ventureId,
    action: params.action,
    outcome: "denied",
    result: params.reason,
    costEstimate: 0,
    latencyMs: 0,
    approval: params.risk.requiresApproval,
    signature: `blocked-${params.stage}-${Date.now()}`,
    riskLevel: params.risk.level,
  });
}

export function auditSuccessfulExecution(params: {
  skillId: string;
  ventureId: string;
  action: string;
  requestedBy: string;
  approval: ApprovalDecision;
  risk: RiskAssessment;
  output: string;
  costEstimate: number;
  latencyMs: number;
}): GovernanceAuditRecord {
  return recordGovernanceAudit({
    who: params.requestedBy,
    what: `Executed ${params.skillId}.${params.action}`,
    why: params.approval.rationale,
    skillId: params.skillId,
    ventureId: params.ventureId,
    action: params.action,
    outcome: "executed",
    result: params.output,
    costEstimate: params.costEstimate,
    latencyMs: params.latencyMs,
    approval: params.approval.type,
    signature: params.approval.signature,
    riskLevel: params.risk.level,
  });
}
