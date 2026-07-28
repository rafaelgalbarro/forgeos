/** ForgeOS Build Pipeline — rollback plan (wraps real-build-flow). */

import {
  buildBuildFlowRollbackPlan,
  validateBuildFlowRollback,
} from "@/lib/real-build-flow/rollback-plan";
import type { BuildFlowDryRunResult } from "@/lib/real-build-flow/types";
import type { RollbackPlanSummary } from "./types";

export function generateRollbackPlan(dryRun: BuildFlowDryRunResult): RollbackPlanSummary {
  const plan = buildBuildFlowRollbackPlan(dryRun.executionPlan);
  const validation = validateBuildFlowRollback(plan, dryRun.executionPlan);

  return {
    planId: plan.planId,
    plan,
    ready: validation.valid,
    recoverySteps: dryRun.executionPlan.recoverySteps,
    summary: validation.valid
      ? plan.summary
      : `${plan.summary} — advertencia: ${validation.reason ?? "plan incompleto"}`,
  };
}
