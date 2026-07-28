/** ForgeOS Capability Layer — executor (RC4.9 + RC5 connections). */

import { executeCapabilitySkillPlan } from "./adapters/skills-adapter";
import { dispatchCapabilityToRuntime } from "./adapters/runtime-adapter";
import {
  writeCapabilityDecisionGraph,
  writeCapabilityTimeline,
} from "./adapters/memory-adapter";
import {
  executeCapabilityConnection,
  formatConnectionOutput,
  isRealConnectionCapability,
} from "@/lib/connections/adapters/capability-connection-adapter";
import type {
  CapabilityExecutionPlan,
  CapabilityRequest,
  CapabilityResolution,
  CapabilityResult,
  CapabilitySkillResult,
} from "./types";

export async function executeCapabilityPlan(
  request: CapabilityRequest,
  resolution: CapabilityResolution,
  plan: CapabilityExecutionPlan,
  requestId: string
): Promise<CapabilityResult> {
  const started = Date.now();
  const skillResults: CapabilitySkillResult[] = await executeCapabilitySkillPlan(
    plan.steps,
    request.context
  );

  const allSuccess = skillResults.every((r) => r.success);
  const totalCost = skillResults.reduce((sum, r) => sum + r.costEstimate, 0);

  let connectionOutput = "";
  if (isRealConnectionCapability(request.capabilityId)) {
    const connectionResult = await executeCapabilityConnection({
      capabilityId: request.capabilityId,
      context: request.context,
      resolution,
    });
    if (connectionResult) {
      connectionOutput = formatConnectionOutput(connectionResult);
    }
  }

  const output = connectionOutput
    ? connectionOutput
    : allSuccess
      ? `[MOCK] Capability ${request.capabilityId} executed ${plan.steps.length} step(s) in sandbox`
      : `Capability ${request.capabilityId} partially failed — see skill results`;

  const runtime = dispatchCapabilityToRuntime({
    capabilityId: request.capabilityId,
    ventureId: request.context.ventureId,
    requestId,
    action: request.context.action,
    skillIds: skillResults.map((r) => r.skillId),
  });

  const confidence = allSuccess ? 0.88 : 0.45;
  const memoryRecordId = writeCapabilityDecisionGraph({
    ventureId: request.context.ventureId,
    capabilityId: request.capabilityId,
    output,
    confidence,
  });
  writeCapabilityTimeline({
    ventureId: request.context.ventureId,
    capabilityId: request.capabilityId,
    output,
  });

  return {
    requestId,
    capabilityId: request.capabilityId,
    success: allSuccess,
    output,
    resolution,
    executionPlan: plan,
    skillResults,
    costEstimate: totalCost,
    latencyMs: Date.now() - started,
    confidence,
    reasoning: resolution.rationale,
    errors: skillResults.filter((r) => !r.success).map((r) => r.output),
    warnings: resolution.sandboxMode ? ["Sandbox mode — no real API calls"] : [],
    auditLogId: requestId,
    telemetryId: requestId,
    memoryRecordId,
    runtimeSessionId: runtime.runtimeSessionId,
    stages: [],
  };
}
