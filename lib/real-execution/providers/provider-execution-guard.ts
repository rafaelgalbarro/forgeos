/** ForgeOS RC5.3 — provider execution guard. */

import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { checkDepartmentPermission } from "@/lib/skills-governance/permission-engine";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { ConnectionProvider } from "@/lib/connections/shared/types";
import { getApprovalSession, isSessionApproved } from "../approval-session";
import { isApprovalRequired } from "../execution-policy";
import type { ExecutionGate } from "../types";
import { canExecuteProviderReal, getExecutionFlagsSnapshot } from "@/lib/real-build-flow/execution-flags";
import { checkExecutionSafety } from "@/lib/real-build-flow/execution-safety";
import { isProviderReadyForReal } from "./provider-health-check";

export interface ProviderGuardInput {
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  approvalSessionId?: string;
  payload?: Record<string, unknown>;
  hasRollbackPlan: boolean;
}

export interface ProviderGuardResult {
  gates: ExecutionGate[];
  allPassed: boolean;
  blockedReason?: string;
  riskLevel: string;
}

export async function runProviderExecutionGuard(
  input: ProviderGuardInput
): Promise<ProviderGuardResult> {
  const gates: ExecutionGate[] = [];
  const flags = getExecutionFlagsSnapshot();

  gates.push({
    id: "global_real_execution",
    name: "ENABLE_REAL_EXECUTION",
    passed: flags.enableRealExecution,
    reason: flags.enableRealExecution ? "Global real execution enabled" : "ENABLE_REAL_EXECUTION=false",
  });

  gates.push({
    id: "provider_flag",
    name: `Provider flag (${input.provider})`,
    passed: canExecuteProviderReal(input.provider),
    reason: canExecuteProviderReal(input.provider)
      ? `${input.provider} real execution enabled`
      : `ENABLE_REAL_${input.provider.toUpperCase()}_EXECUTION=false`,
  });

  const safety = checkExecutionSafety(input.operation, input.payload);
  gates.push({
    id: "safety_check",
    name: "Execution safety",
    passed: safety.safe,
    reason: safety.safe ? "No blocked patterns" : (safety.blockedReason ?? "Unsafe"),
  });

  const risk = assessSkillRisk(input.provider, input.operation);
  gates.push({
    id: "risk_engine",
    name: "Risk Engine",
    passed: risk.level === "LOW" || risk.level === "MEDIUM",
    reason: `Risk: ${risk.level} (score ${risk.score})`,
  });

  const permission = checkDepartmentPermission(
    input.requestedBy as MeshDepartmentId,
    input.provider,
    input.provider,
    input.ventureId,
    input.operation
  );
  gates.push({
    id: "permission_engine",
    name: "Permission Engine",
    passed: permission.allowed,
    reason: permission.reason,
  });

  const session = input.approvalSessionId
    ? getApprovalSession(input.approvalSessionId)
    : undefined;
  gates.push({
    id: "human_approval",
    name: "Human approval",
    passed: !isApprovalRequired() || isSessionApproved(session),
    reason: isSessionApproved(session)
      ? `Approved by ${session?.approvedBy}`
      : session
        ? `Status: ${session.status}`
        : "Approval required",
  });

  gates.push({
    id: "rollback_plan",
    name: "Rollback plan",
    passed: input.hasRollbackPlan,
    reason: input.hasRollbackPlan ? "Rollback plan present" : "Rollback plan missing",
  });

  const health = await isProviderReadyForReal(input.provider);
  gates.push({
    id: "provider_health",
    name: "Provider health",
    passed: health.ready || !flags.enableRealExecution,
    reason: health.reason,
  });

  const allPassed = gates.every((g) => g.passed);
  return {
    gates,
    allPassed,
    blockedReason: allPassed
      ? undefined
      : gates
          .filter((g) => !g.passed)
          .map((g) => `${g.name}: ${g.reason}`)
          .join("; "),
    riskLevel: risk.level,
  };
}
