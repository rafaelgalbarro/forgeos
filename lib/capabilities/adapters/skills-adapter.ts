/** ForgeOS Capability Layer — adapters: skills (RC4.9). */

import { runSkillRequest } from "@/lib/skills/pipeline";
import type { SkillResult } from "@/lib/skills/types";
import type { CapabilityContext, CapabilityPlanStep, CapabilitySkillResult } from "../types";

export async function executeCapabilitySkillStep(
  step: CapabilityPlanStep,
  context: CapabilityContext
): Promise<CapabilitySkillResult> {
  const skillResult: SkillResult = await runSkillRequest({
    skillId: step.skillId,
    preferredProvider: step.provider,
    context: {
      ventureId: context.ventureId,
      requestedBy: context.requestedBy,
      approvedBy: context.approvedBy,
      action: step.action,
      payload: context.payload,
      metadata: {
        ...context.metadata,
        capabilityStep: step.stepId,
        provider: step.provider,
      },
    },
  });

  return {
    skillId: step.skillId,
    provider: skillResult.provider,
    success: skillResult.success,
    output: skillResult.output,
    latencyMs: skillResult.latencyMs,
    costEstimate: skillResult.costEstimate,
    executionId: skillResult.executionId,
  };
}

export async function executeCapabilitySkillPlan(
  steps: CapabilityPlanStep[],
  context: CapabilityContext
): Promise<CapabilitySkillResult[]> {
  const results: CapabilitySkillResult[] = [];

  for (const step of steps) {
    const depsOk = step.dependsOn.every((depId) => {
      const dep = results.find((_, i) => steps[i]?.stepId === depId);
      return dep ? dep.success : true;
    });

    if (!depsOk) {
      results.push({
        skillId: step.skillId,
        provider: step.provider,
        success: false,
        output: `Skipped — dependency failed for ${step.stepId}`,
        latencyMs: 0,
        costEstimate: 0,
        executionId: crypto.randomUUID(),
      });
      continue;
    }

    const result = await executeCapabilitySkillStep(step, context);
    results.push(result);
  }

  return results;
}
