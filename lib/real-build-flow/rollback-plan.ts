/** ForgeOS Real Build Flow — rollback plan (RC5.2). */

import type { ConnectionPlan } from "@/lib/connections/shared/types";
import type { BuildFlowExecutionPlan } from "./types";

function toPlanSteps(labels: string[]): ConnectionPlan["steps"] {
  return labels.map((label, i) => ({
    stepId: `rb-${i + 1}`,
    action: label,
    description: label,
    reversible: true,
    estimatedDurationMs: 5000,
  }));
}

export function buildBuildFlowRollbackPlan(plan: BuildFlowExecutionPlan): ConnectionPlan {
  const steps = toPlanSteps(plan.rollbackSteps);
  return {
    planId: `rollback-${plan.planId}`,
    provider: "github",
    operation: "rollback_build_flow",
    mode: "dry_run",
    steps,
    rollbackSteps: toPlanSteps(plan.recoverySteps),
    estimatedCost: 0,
    riskLevel: "low",
    requiresApproval: false,
    summary: `Rollback plan for ${plan.ventureName} (${plan.environment})`,
  };
}

export function validateBuildFlowRollback(
  plan: ConnectionPlan,
  executionPlan: BuildFlowExecutionPlan
): { valid: boolean; reason?: string } {
  if (!plan.rollbackSteps?.length) {
    return { valid: false, reason: "No rollback steps defined" };
  }
  if (!executionPlan.recoverySteps?.length) {
    return { valid: false, reason: "No recovery plan defined" };
  }
  return { valid: true };
}
