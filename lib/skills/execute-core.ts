/** ForgeOS Skills — core execution (no governance, RC4.1). */

import { routeSkill } from "./router";
import { validateSkillRequest } from "./validator";
import { buildExecutionPlan, executeSkillMock } from "./executor";
import { appendAuditLog, appendSkillMemory, appendTelemetry } from "./store";
import { dispatchSkillToRuntime } from "./adapters/runtime-adapter";
import {
  writeSkillDecisionGraph,
  writeSkillTimeline,
} from "./adapters/memory-adapter";
import type { SkillRequest, SkillResult } from "./types";

export async function executeSkillCore(request: SkillRequest): Promise<SkillResult> {
  const started = Date.now();
  const validation = validateSkillRequest(request);
  const warnings = [...validation.warnings];
  const errors = [...validation.errors];

  if (!validation.valid) {
    const audit = appendAuditLog({
      skillId: request.skillId,
      ventureId: request.context.ventureId,
      requestedBy: request.context.requestedBy,
      action: request.context.action,
      scopes: [],
      policy: "deny",
      outcome: "failed",
      details: errors.join("; "),
    });

    return {
      executionId: audit.id,
      skillId: request.skillId,
      provider: "none",
      success: false,
      output: "",
      mock: true,
      executionPlan: { steps: [], recoveryPlan: [], rollbackSteps: [], estimatedDurationMs: 0 },
      costEstimate: 0,
      latencyMs: Date.now() - started,
      confidence: 0,
      reasoning: "Validation failed",
      errors,
      warnings,
      auditLogId: audit.id,
      telemetryId: "",
    };
  }

  const routing = routeSkill(request);
  const executionPlan = buildExecutionPlan(request.skillId, request.context.action, routing);
  const mockResult = executeSkillMock(request.skillId, request.context, routing);

  const latencyMs = Date.now() - started;
  const skill = routing.skillId;
  const costEstimate = 0;

  const audit = appendAuditLog({
    skillId: skill,
    ventureId: request.context.ventureId,
    requestedBy: request.context.requestedBy,
    approvedBy: request.context.approvedBy,
    action: request.context.action,
    scopes: routing.auditLevel === "full" ? ["full-audit"] : ["standard"],
    policy: routing.policy,
    outcome: mockResult.success ? "executed" : "failed",
    details: mockResult.output,
  });

  const telemetry = appendTelemetry({
    skillId: skill,
    provider: routing.provider,
    latencyMs,
    costEstimate,
    success: mockResult.success,
    fallbackUsed: false,
    rateLimitHit: false,
  });

  const runtime = dispatchSkillToRuntime({
    skillId: skill,
    ventureId: request.context.ventureId,
    executionId: audit.id,
    action: request.context.action,
  });

  const memory = appendSkillMemory({
    ventureId: request.context.ventureId,
    skillId: skill,
    requestedBy: request.context.requestedBy,
    approvedBy: request.context.approvedBy,
    executedBy: "skill-executor-sandbox",
    result: mockResult.output,
    errors: mockResult.success ? [] : [mockResult.output],
    costEstimate,
    latencyMs,
    reasoning: routing.rationale,
    confidence: mockResult.success ? 0.92 : 0.3,
  });

  if (mockResult.success) {
    writeSkillDecisionGraph({
      ventureId: request.context.ventureId,
      skillId: skill,
      output: mockResult.output,
      confidence: 0.92,
    });
    writeSkillTimeline({
      ventureId: request.context.ventureId,
      skillId: skill,
      output: mockResult.output,
    });
  }

  return {
    executionId: audit.id,
    skillId: skill,
    provider: routing.provider,
    success: mockResult.success,
    output: mockResult.output,
    mock: true,
    executionPlan,
    costEstimate,
    latencyMs,
    confidence: mockResult.success ? 0.92 : 0.3,
    reasoning: routing.rationale,
    errors: mockResult.success ? [] : [mockResult.output],
    warnings,
    auditLogId: audit.id,
    telemetryId: telemetry.id,
    memoryRecordId: memory.id,
    runtimeSessionId: runtime.runtimeSessionId,
  };
}
