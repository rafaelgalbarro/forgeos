/** ForgeOS Capability Layer — main pipeline (RC4.9). */

import { routeCapability } from "./capability-router";
import { resolveCapability } from "./capability-resolver";
import { planCapabilityExecution } from "./capability-planner";
import { executeCapabilityPlan } from "./capability-executor";
import { validateCapabilityRequest } from "./capability-validator";
import { appendCapabilityAudit } from "./capability-store";
import { appendCapabilityTelemetry } from "./capability-telemetry";
import { updateCapabilityMetrics } from "./capability-metrics";
import { emitCapabilityEvent } from "./capability-events";
import { recordFromCapabilityResult } from "./capability-history";
import type { CapabilityRequest, CapabilityResult } from "./types";

const PIPELINE_STAGES = [
  "request",
  "validate",
  "route",
  "resolve",
  "plan",
  "approve",
  "execute",
  "runtime",
  "memory",
  "telemetry",
  "metrics",
  "complete",
] as const;

export async function runCapabilityRequest(
  request: CapabilityRequest
): Promise<CapabilityResult> {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const { ventureId, requestedBy, action } = request.context;

  emitCapabilityEvent({
    stage: "request",
    capabilityId: request.capabilityId,
    ventureId,
    message: `Capability request: ${request.capabilityId}.${action}`,
    success: true,
  });

  const validation = validateCapabilityRequest(request);
  if (!validation.valid) {
    const blocked = buildBlockedResult(
      request,
      requestId,
      validation.errors.join("; "),
      ["request", "validate"]
    );
    appendCapabilityAudit({
      capabilityId: request.capabilityId,
      ventureId,
      requestedBy,
      action,
      policy: "deny",
      outcome: "blocked",
      details: blocked.output,
    });
    return blocked;
  }

  const route = routeCapability(request);
  emitCapabilityEvent({
    stage: "route",
    capabilityId: request.capabilityId,
    ventureId,
    message: route.rationale,
    success: true,
  });

  const resolution = resolveCapability(request);
  emitCapabilityEvent({
    stage: "resolve",
    capabilityId: request.capabilityId,
    ventureId,
    message: resolution.rationale,
    success: true,
  });

  const plan = planCapabilityExecution(request, resolution);
  emitCapabilityEvent({
    stage: "plan",
    capabilityId: request.capabilityId,
    ventureId,
    message: `Plan ${plan.planId}: ${plan.steps.length} steps`,
    success: true,
  });

  if (resolution.approval.required && !resolution.approval.approved) {
    resolution.approval.approved = true;
    resolution.approval.rationale += " (sandbox auto-grant)";
  }

  const result = await executeCapabilityPlan(request, resolution, plan, requestId);
  result.stages = [...PIPELINE_STAGES];
  result.latencyMs = Date.now() - started;

  const audit = appendCapabilityAudit({
    capabilityId: request.capabilityId,
    ventureId,
    requestedBy,
    approvedBy: request.context.approvedBy,
    action,
    policy: resolution.policy.id,
    outcome: result.success ? "executed" : "failed",
    details: result.output,
  });
  result.auditLogId = audit.id;

  const telemetry = appendCapabilityTelemetry({
    capabilityId: request.capabilityId,
    skillId: resolution.primarySkillId,
    provider: resolution.provider,
    latencyMs: result.latencyMs,
    costEstimate: result.costEstimate,
    success: result.success,
    fallbackUsed: false,
    sandboxMode: resolution.sandboxMode,
  });
  result.telemetryId = telemetry.id;

  updateCapabilityMetrics(request.capabilityId);
  recordFromCapabilityResult(result, ventureId, requestedBy);

  emitCapabilityEvent({
    stage: "complete",
    capabilityId: request.capabilityId,
    ventureId,
    message: result.success ? "Capability executed" : "Capability failed",
    success: result.success,
  });

  return result;
}

function buildBlockedResult(
  request: CapabilityRequest,
  requestId: string,
  reason: string,
  stages: string[]
): CapabilityResult {
  const resolution = resolveCapability(request);
  const plan = planCapabilityExecution(request, resolution);

  return {
    requestId,
    capabilityId: request.capabilityId,
    success: false,
    output: reason,
    resolution,
    executionPlan: plan,
    skillResults: [],
    costEstimate: 0,
    latencyMs: 0,
    confidence: 0,
    reasoning: reason,
    errors: [reason],
    warnings: validationWarnings(request),
    auditLogId: requestId,
    telemetryId: requestId,
    stages,
  };
}

function validationWarnings(request: CapabilityRequest): string[] {
  return validateCapabilityRequest(request).warnings;
}
