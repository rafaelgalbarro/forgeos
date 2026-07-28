/** ForgeOS Real Execution — pre-flight guard (RC5.1). */

import { checkProviderHealth } from "@/lib/connections/security/connection-health";
import { checkDepartmentPermission } from "@/lib/skills-governance/permission-engine";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { RiskLevel } from "@/lib/skills-governance/types";
import type { ExecutionGate, ExecutionRequest } from "./types";
import {
  isActionAllowed,
  isApprovalRequired,
  isEnvironmentPermitted,
  isForbiddenAction,
  isProviderAllowed,
  isRealExecutionEnabled,
} from "./execution-policy";
import { getApprovalSession, isSessionApproved } from "./approval-session";
import { validateRollbackPlan } from "./rollback-validator";

const PERMITTED_RISK_LEVELS: RiskLevel[] = ["LOW", "MEDIUM"];

export interface GuardCheckResult {
  gates: ExecutionGate[];
  allPassed: boolean;
  blockedReason?: string;
}

export async function runExecutionGuard(request: ExecutionRequest): Promise<GuardCheckResult> {
  const gates: ExecutionGate[] = [];

  const enableGate: ExecutionGate = {
    id: "enable_real_execution",
    name: "ENABLE_REAL_EXECUTION",
    passed: request.mode === "dry_run" || isRealExecutionEnabled(),
    reason:
      request.mode === "dry_run"
        ? "Dry-run mode — flag not required"
        : isRealExecutionEnabled()
          ? "Real execution enabled"
          : "ENABLE_REAL_EXECUTION=false — real execution blocked",
  };
  gates.push(enableGate);

  const providerGate: ExecutionGate = {
    id: "allowed_provider",
    name: "Allowed provider",
    passed: isProviderAllowed(request.provider),
    reason: isProviderAllowed(request.provider)
      ? `${request.provider} is allowed`
      : `Provider ${request.provider} not in REAL_EXECUTION_ALLOWED_PROVIDERS`,
  };
  gates.push(providerGate);

  const actionGate: ExecutionGate = {
    id: "allowed_action",
    name: "Allowed action",
    passed: isActionAllowed(request.capabilityId, request.operation),
    reason: isActionAllowed(request.capabilityId, request.operation)
      ? "Action in allowed list"
      : "Action not in allowed real actions list",
  };
  gates.push(actionGate);

  const forbidden = isForbiddenAction(request.operation, request.payload);
  const forbiddenGate: ExecutionGate = {
    id: "forbidden_check",
    name: "Forbidden action check",
    passed: !forbidden.forbidden,
    reason: forbidden.forbidden ? (forbidden.reason ?? "Forbidden") : "No forbidden patterns matched",
  };
  gates.push(forbiddenGate);

  const session = request.approvalSessionId
    ? getApprovalSession(request.approvalSessionId)
    : undefined;
  const approvalGate: ExecutionGate = {
    id: "human_approval",
    name: "Human approval",
    passed:
      request.mode === "dry_run" ||
      !isApprovalRequired() ||
      isSessionApproved(session),
    reason:
      request.mode === "dry_run"
        ? "Dry-run — approval not required"
        : !isApprovalRequired()
          ? "Approval not required by policy"
          : isSessionApproved(session)
            ? `Approved by ${session?.approvedBy ?? "unknown"}`
            : session
              ? `Session status: ${session.status}`
              : "No approval session — request approval first",
  };
  gates.push(approvalGate);

  const riskLevel = request.risk?.level ?? "MEDIUM";
  const riskGate: ExecutionGate = {
    id: "risk_permitted",
    name: "Risk permitted",
    passed: request.mode === "dry_run" || PERMITTED_RISK_LEVELS.includes(riskLevel),
    reason:
      request.mode === "dry_run"
        ? "Dry-run — risk check skipped"
        : PERMITTED_RISK_LEVELS.includes(riskLevel)
          ? `Risk level ${riskLevel} permitted`
          : `Risk level ${riskLevel} requires escalation — blocked`,
  };
  gates.push(riskGate);

  const envGate: ExecutionGate = {
    id: "environment_permitted",
    name: "Environment permitted",
    passed: isEnvironmentPermitted(request.mode),
    reason: isEnvironmentPermitted(request.mode)
      ? `${request.mode} mode permitted`
      : "Production / real environment blocked by policy",
  };
  gates.push(envGate);

  const rollback = validateRollbackPlan(
    request.dryRunPlan,
    request.provider,
    request.operation
  );
  const rollbackGate: ExecutionGate = {
    id: "rollback_exists",
    name: "Rollback plan exists",
    passed: request.mode === "dry_run" || rollback.valid,
    reason:
      request.mode === "dry_run"
        ? "Dry-run — rollback validation deferred"
        : rollback.reason,
  };
  gates.push(rollbackGate);

  const permission = checkDepartmentPermission(
    request.requestedBy as MeshDepartmentId,
    request.provider,
    request.provider,
    request.ventureId,
    request.operation
  );
  const permissionGate: ExecutionGate = {
    id: "permission_valid",
    name: "Permission valid",
    passed: permission.allowed,
    reason: permission.reason,
  };
  gates.push(permissionGate);

  const health = await checkProviderHealth(request.provider);
  const healthGate: ExecutionGate = {
    id: "provider_health",
    name: "Provider health",
    passed: request.mode === "dry_run" || health.healthy || health.configured,
    reason:
      request.mode === "dry_run"
        ? "Dry-run — health check informational"
        : health.message,
  };
  gates.push(healthGate);

  const allPassed = gates.every((g) => g.passed);
  const failed = gates.filter((g) => !g.passed);
  const blockedReason = allPassed
    ? undefined
    : failed.map((g) => `${g.name}: ${g.reason}`).join("; ");

  return { gates, allPassed, blockedReason };
}
