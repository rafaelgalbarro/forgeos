/** ForgeOS Real Execution — rollback plan validation (RC5.1). */

import type { ConnectionPlan } from "@/lib/connections/shared/types";
import { buildRollbackPlan } from "@/lib/skills-governance/rollback-engine";

export interface RollbackValidationResult {
  valid: boolean;
  actionable: boolean;
  steps: string[];
  rollbackPlan?: ConnectionPlan;
  governanceSteps: string[];
  reason: string;
}

export function validateRollbackPlan(
  plan: ConnectionPlan | undefined,
  skillId: string,
  operation: string
): RollbackValidationResult {
  const governance = buildRollbackPlan(skillId, operation);

  if (!plan) {
    return {
      valid: false,
      actionable: false,
      steps: [],
      governanceSteps: governance.steps,
      reason: "No dry-run plan provided — cannot validate rollback",
    };
  }

  const rollbackSteps = plan.rollbackSteps ?? [];
  if (rollbackSteps.length === 0) {
    return {
      valid: false,
      actionable: false,
      steps: [],
      governanceSteps: governance.steps,
      rollbackPlan: plan,
      reason: "Connection plan has no rollback steps defined",
    };
  }

  const actionable = rollbackSteps.some((s) => s.reversible || s.description.length > 0);
  const hasCompensation = governance.compensationActions.length > 0;

  if (!actionable && !hasCompensation) {
    return {
      valid: false,
      actionable: false,
      steps: rollbackSteps.map((s) => s.description),
      governanceSteps: governance.steps,
      rollbackPlan: plan,
      reason: "Rollback steps exist but are not actionable",
    };
  }

  return {
    valid: true,
    actionable: true,
    steps: rollbackSteps.map((s) => s.description),
    governanceSteps: governance.steps,
    rollbackPlan: plan,
    reason: "Rollback plan validated — compensating steps available",
  };
}
