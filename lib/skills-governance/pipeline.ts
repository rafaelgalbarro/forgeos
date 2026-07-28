/** ForgeOS Skills Governance — Governed Pipeline (RC4.1). */

import { executeSkillCore } from "@/lib/skills/adapters/governance-adapter";
import { validateSkillRequest } from "@/lib/skills/validator";
import { assessSkillRisk } from "./risk-engine";
import { checkDepartmentPermission } from "./permission-engine";
import { processApproval } from "./approval-engine";
import { evaluateAllPolicies } from "./policy-engine";
import { guardExecution } from "./execution-guard";
import { buildRollbackPlan } from "./rollback-engine";
import { auditBlockedExecution, auditSuccessfulExecution } from "./audit-engine";
import { appendGovernanceTelemetry } from "./governance-store";
import { recordFromGovernanceResult } from "./governance-history";
import { emitGovernanceEvent } from "./governance-events";
import type {
  GovernanceRequest,
  GovernanceResult,
  GovernanceStage,
} from "./types";

function blockedResult(
  request: GovernanceRequest,
  started: number,
  stages: GovernanceStage[],
  blockedReason: string,
  partial: Partial<GovernanceResult> = {}
): GovernanceResult {
  const risk = partial.risk ?? assessSkillRisk(request.skillId, request.context.action);
  const rollbackPlan = buildRollbackPlan(request.skillId, request.context.action);
  const audit = auditBlockedExecution({
    skillId: request.skillId,
    ventureId: request.context.ventureId,
    action: request.context.action,
    requestedBy: request.context.requestedBy,
    risk,
    reason: blockedReason,
    stage: stages[stages.length - 1] ?? "request",
  });
  const telemetry = appendGovernanceTelemetry({
    skillId: request.skillId,
    executionTimeMs: 0,
    approvalTimeMs: 0,
    riskLevel: risk.level,
    failures: 1,
    retries: 0,
    policyViolations: 0,
    costEstimate: 0,
    provider: "none",
    confidence: 0,
  });

  const result: GovernanceResult = {
    requestId: crypto.randomUUID(),
    governancePassed: false,
    risk,
    approval: partial.approval ?? {
      type: risk.requiresApproval,
      approved: false,
      approvers: [],
      signature: "",
      approvalTimeMs: 0,
      rationale: blockedReason,
    },
    policies: partial.policies ?? { passed: false, evaluations: [] },
    sandboxMode: partial.sandboxMode ?? risk.sandboxMode,
    rollbackPlan,
    auditId: audit.id,
    telemetryId: telemetry.id,
    blockedReason,
    stages,
    latencyMs: Date.now() - started,
    ...partial,
  };

  recordFromGovernanceResult(
    result,
    request.skillId,
    request.context.ventureId,
    request.context.action,
    request.context.requestedBy
  );
  return result;
}

export async function runGovernedSkillRequest(
  request: GovernanceRequest
): Promise<GovernanceResult> {
  const started = Date.now();
  const stages: GovernanceStage[] = ["request"];
  const { ventureId, requestedBy, action } = request.context;

  emitGovernanceEvent({
    stage: "request",
    skillId: request.skillId,
    ventureId,
    message: `Governance request: ${request.skillId}.${action}`,
    success: true,
  });

  const validation = validateSkillRequest(request);
  if (!validation.valid) {
    stages.push("risk");
    return blockedResult(request, started, stages, validation.errors.join("; "));
  }

  const risk = assessSkillRisk(request.skillId, action);
  stages.push("risk");
  emitGovernanceEvent({
    stage: "risk",
    skillId: request.skillId,
    ventureId,
    message: `Risk: ${risk.level} (score ${risk.score})`,
    success: true,
    metadata: { factors: risk.factors },
  });

  const permission = checkDepartmentPermission(
    requestedBy,
    request.skillId,
    request.preferredProvider ?? "default",
    ventureId,
    action
  );
  stages.push("permission");
  emitGovernanceEvent({
    stage: "permission",
    skillId: request.skillId,
    ventureId,
    message: permission.allowed ? permission.reason : `Denied: ${permission.reason}`,
    success: permission.allowed,
  });

  if (!permission.allowed) {
    return blockedResult(request, started, stages, permission.reason, { risk });
  }

  const approval = processApproval({
    skillId: request.skillId,
    ventureId,
    requestedBy,
    action,
    riskLevel: risk.level,
    emergency: request.emergency,
    preApprovedBy: request.context.approvedBy,
  });
  stages.push("approval");
  emitGovernanceEvent({
    stage: "approval",
    skillId: request.skillId,
    ventureId,
    message: `${approval.type} approval: ${approval.approved ? "granted" : "denied"}`,
    success: approval.approved,
    metadata: { approvers: approval.approvers },
  });

  if (!approval.approved) {
    return blockedResult(request, started, stages, "Approval denied", { risk, approval });
  }

  const sandboxMode = request.sandboxMode ?? risk.sandboxMode;
  const policies = evaluateAllPolicies(request.skillId, action, sandboxMode);
  stages.push("policy");
  emitGovernanceEvent({
    stage: "policy",
    skillId: request.skillId,
    ventureId,
    message: policies.passed ? "All policies passed" : `Blocked by ${policies.blockedBy}`,
    success: policies.passed,
  });

  if (!policies.passed) {
    return blockedResult(
      request,
      started,
      stages,
      `Policy violation: ${policies.blockedBy}`,
      { risk, approval, policies, sandboxMode }
    );
  }

  const guard = guardExecution(request, risk);
  stages.push("execution");
  emitGovernanceEvent({
    stage: "execution",
    skillId: request.skillId,
    ventureId,
    message: guard.allowed
      ? `Execution guard passed (sandbox: ${guard.sandboxMode})`
      : `Execution guard blocked: ${guard.reason}`,
    success: guard.allowed,
    metadata: { sandboxMode: guard.sandboxMode, securityScore: guard.securityScore },
  });

  if (!guard.allowed) {
    return blockedResult(request, started, stages, guard.reason ?? "Execution guard blocked", {
      risk,
      approval,
      policies,
      sandboxMode: guard.sandboxMode,
    });
  }

  const rollbackPlan = buildRollbackPlan(request.skillId, action);
  const skillResult = await executeSkillCore(request);

  stages.push("audit");
  const audit = skillResult.success
    ? auditSuccessfulExecution({
        skillId: request.skillId,
        ventureId,
        action,
        requestedBy,
        approval,
        risk,
        output: skillResult.output,
        costEstimate: skillResult.costEstimate,
        latencyMs: skillResult.latencyMs,
      })
    : auditBlockedExecution({
        skillId: request.skillId,
        ventureId,
        action,
        requestedBy,
        risk,
        reason: skillResult.errors.join("; ") || "Execution failed",
        stage: "execution",
      });

  emitGovernanceEvent({
    stage: "audit",
    skillId: request.skillId,
    ventureId,
    message: `Audit recorded: ${audit.outcome}`,
    success: skillResult.success,
    metadata: { auditId: audit.id },
  });

  stages.push("memory");
  emitGovernanceEvent({
    stage: "memory",
    skillId: request.skillId,
    ventureId,
    message: skillResult.memoryRecordId
      ? `Memory record: ${skillResult.memoryRecordId}`
      : "Memory skipped",
    success: !!skillResult.memoryRecordId,
  });

  stages.push("decision_graph");
  emitGovernanceEvent({
    stage: "decision_graph",
    skillId: request.skillId,
    ventureId,
    message: skillResult.success ? "Decision graph updated" : "Decision graph skipped",
    success: skillResult.success,
  });

  stages.push("telemetry");
  const telemetry = appendGovernanceTelemetry({
    skillId: request.skillId,
    executionTimeMs: skillResult.latencyMs,
    approvalTimeMs: approval.approvalTimeMs,
    riskLevel: risk.level,
    failures: skillResult.success ? 0 : 1,
    retries: 0,
    policyViolations: 0,
    costEstimate: skillResult.costEstimate,
    provider: skillResult.provider,
    confidence: skillResult.confidence,
  });

  emitGovernanceEvent({
    stage: "telemetry",
    skillId: request.skillId,
    ventureId,
    message: `Telemetry recorded: ${telemetry.id}`,
    success: true,
    metadata: { executionId: skillResult.executionId },
  });

  const result: GovernanceResult = {
    requestId: crypto.randomUUID(),
    governancePassed: skillResult.success,
    risk,
    approval,
    policies,
    sandboxMode: guard.sandboxMode,
    rollbackPlan,
    skillResult,
    auditId: audit.id,
    telemetryId: telemetry.id,
    blockedReason: skillResult.success ? undefined : skillResult.errors.join("; "),
    stages,
    latencyMs: Date.now() - started,
  };

  recordFromGovernanceResult(result, request.skillId, ventureId, action, requestedBy);
  return result;
}
