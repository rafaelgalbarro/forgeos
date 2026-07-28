/** ForgeOS Skills Framework — main pipeline (RC4). */

import { runGovernedSkillRequest } from "@/lib/skills-governance/pipeline";
import type { SkillRequest, SkillResult } from "./types";

export async function runSkillRequest(request: SkillRequest): Promise<SkillResult> {
  const governed = await runGovernedSkillRequest(request);

  if (governed.skillResult) {
    return governed.skillResult;
  }

  return {
    executionId: governed.auditId,
    skillId: request.skillId,
    provider: "none",
    success: false,
    output: governed.blockedReason ?? "Governance blocked execution",
    mock: true,
    executionPlan: {
      steps: governed.stages.map((s) => `Stage: ${s}`),
      recoveryPlan: governed.rollbackPlan.recoveryPlan,
      rollbackSteps: governed.rollbackPlan.steps,
      estimatedDurationMs: governed.latencyMs,
    },
    costEstimate: 0,
    latencyMs: governed.latencyMs,
    confidence: 0,
    reasoning: governed.blockedReason ?? "Governance pipeline blocked",
    errors: [governed.blockedReason ?? "Governance blocked"],
    warnings: [],
    auditLogId: governed.auditId,
    telemetryId: governed.telemetryId,
  };
}
